import { supabase } from './supabase'
import { logError } from './errors'
import { localDateKey } from './dates'
import { snapshotBeforeAssign, restoreSnapshots, type PlanRowSnapshot } from './planSnapshot'
import { programToPlanWeeks, workoutTemplateIds, type ProgramWeekLike } from './programPlan'
import { loadProgramTemplates } from './programTemplates'
import { DEMO_PLAN_MAP, DEMO_PLAN_TEMPLATES } from './demo-data'
import { isDemoTrainerId } from './demoIds'
import { buildWorkoutPlan, partitionByDraft, emptyResult, DRAFT_SKIP_REASON, type BulkResult, type PlanRowLite } from './bulkActions'
import type { TrainingPlan, WeekPlan } from '../types'

// Asignar un programa o un workout a varios clientes a la vez. Es el núcleo que comparten el modal
// "Asignar a varios" de Programas y la barra de acciones masivas de Clientes.
//
// Garantías (en este orden, y si una falla antes de escribir no se toca nada):
//  1. el programa necesita leer sus workouts: sin ellos se asignarían días vacíos;
//  2. se leen los planes actuales y, si se pide, se omiten los clientes con un borrador sin publicar;
//  3. se guarda una copia de lo que se va a sustituir en plan_history (y en memoria, para deshacer);
//  4. cada plan se escribe con updatedAt = ahora (es la versión que usa el cliente para detectar cambios).

export interface AssignOptions {
  /** true: los clientes con borrador sin publicar se omiten. false: el borrador se descarta (con copia y deshacer). */
  skipDrafts: boolean
}

export interface AssignOutcome {
  /** Si no se pudo ni empezar, por qué; en ese caso no se ha escrito nada. */
  aborted?: 'sin-semanas' | 'workouts' | 'lectura' | 'copia'
  result: BulkResult
  /** Workouts de un programa que ya no existen (esos días quedan sin ejercicios). */
  missing: string[]
  /** Lo que hay que restaurar para deshacer lo asignado. */
  undoable: PlanRowSnapshot[]
}

const ABORT_MESSAGE: Record<NonNullable<AssignOutcome['aborted']>, string> = {
  'sin-semanas': 'El workout no tiene semanas: no se ha asignado nada',
  workouts: 'No se pudieron leer los workouts del programa: no se ha asignado nada',
  lectura: 'No se pudieron leer los planes actuales: no se ha asignado nada',
  copia: 'No se pudo guardar una copia del plan anterior: no se ha asignado nada',
}
export const abortMessage = (a: NonNullable<AssignOutcome['aborted']>) => ABORT_MESSAGE[a]

const aborted = (why: NonNullable<AssignOutcome['aborted']>): AssignOutcome => ({ aborted: why, result: emptyResult(), missing: [], undoable: [] })

type PlanRow = PlanRowLite & { plan: { P?: TrainingPlan } | null }

async function readPlanRows(ids: string[]): Promise<PlanRow[] | null> {
  const { data, error } = await supabase.from('planes').select('clientId, plan, plan_borrador, borrador_activo').in('clientId', ids)
  if (error) { logError('bulkAssign:read', error); return null }
  return (data || []) as PlanRow[]
}

/** Núcleo común: decide a quién, deja copia, y escribe un plan por cliente construido por `planFor`. */
async function assign(
  name: string, targetIds: string[], demo: boolean, opts: AssignOptions,
  planFor: (clientId: string, existing: TrainingPlan | null) => TrainingPlan, missing: string[],
): Promise<AssignOutcome> {
  const result = emptyResult()
  let rows: PlanRow[] = []
  let assignable = targetIds
  if (!demo) {
    const read = await readPlanRows(targetIds)
    if (read === null) return aborted('lectura')
    rows = read
    if (opts.skipDrafts) {
      const part = partitionByDraft(targetIds, rows)
      assignable = part.assignable
      result.skipped = part.withDraft.map(id => ({ id, reason: DRAFT_SKIP_REASON }))
    }
  }
  if (assignable.length === 0) return { result, missing, undoable: [] }

  // Copia del plan (y del borrador que esta asignación descarta). Si no se puede leer, no se toca nada.
  const previous = demo ? [] : await snapshotBeforeAssign(assignable, name)
  if (previous === null) return aborted('copia')

  const byClient = new Map(rows.map(r => [r.clientId, r]))
  const outcomes = await Promise.all(assignable.map(async clientId => {
    const existing = demo ? (DEMO_PLAN_MAP[clientId] ?? null) : (byClient.get(clientId)?.plan?.P ?? null)
    const plan = planFor(clientId, existing)
    if (demo) { DEMO_PLAN_MAP[clientId] = plan; return null }
    const { error } = await supabase.from('planes').upsert(
      { clientId, plan: { P: plan }, borrador_activo: false, plan_borrador: null, updatedAt: Date.now() },
      { onConflict: 'clientId' },
    )
    if (error) logError('bulkAssign:write', error)
    return error ? 'No se pudo guardar el plan' : null
  }))
  assignable.forEach((id, i) => { outcomes[i] === null ? result.ok.push(id) : result.failed.push({ id, reason: outcomes[i]! }) })

  const okIds = new Set(result.ok)
  return { result, missing, undoable: previous.filter(r => okIds.has(r.clientId)) }
}

export interface ProgramLike { id: string; name: string; tipo: string; weeks: ProgramWeekLike[] }

export async function assignProgramToClients(program: ProgramLike, targetIds: string[], trainerId: string, opts: AssignOptions): Promise<AssignOutcome> {
  const demo = isDemoTrainerId(trainerId)
  // Los ejercicios de cada día vienen de los workouts del programa: sin leerlos se asignaría un plan de días vacíos.
  const templates = demo
    ? Object.fromEntries(DEMO_PLAN_TEMPLATES.map(t => [t.id, t]))
    : await loadProgramTemplates(trainerId, workoutTemplateIds(program.weeks))
  if (templates === null) return aborted('workouts')
  const { weeks, missing } = programToPlanWeeks(program.weeks, templates)
  const fechaInicio = localDateKey()
  return assign(program.name, targetIds, demo, opts, clientId => ({
    clientId, type: program.tipo, restMain: 180, restAcc: 90, restWarn: 30,
    weeks: JSON.parse(JSON.stringify(weeks)) as WeekPlan[],
    programId: program.id, programName: program.name, fechaInicio,
  }), missing)
}

export interface WorkoutLike { id: string; name: string; type: string; weeks: WeekPlan[] }

export async function assignWorkoutToClients(workout: WorkoutLike, targetIds: string[], trainerId: string, opts: AssignOptions): Promise<AssignOutcome> {
  if (!workout.weeks?.length) return aborted('sin-semanas')
  const fechaInicio = localDateKey()
  return assign(workout.name, targetIds, isDemoTrainerId(trainerId), opts,
    (clientId, existing) => buildWorkoutPlan(clientId, workout, existing, fechaInicio), [])
}

export { restoreSnapshots }
