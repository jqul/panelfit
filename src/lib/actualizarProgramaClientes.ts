import { supabase } from './supabase'
import { logError } from './errors'
import { localDateKey } from './dates'
import { programToPlanWeeks, workoutTemplateIds } from './programPlan'
import { loadProgramTemplates } from './programTemplates'
import { isDemoTrainerId } from './demoIds'
import { assign, readPlanRows, type AssignOutcome, type ProgramLike } from './bulkAssign'
import { mezclarPrograma, tieneCambiosPropios } from './actualizarPrograma'
import { tareasDePrograma } from './tareasPrograma'
import { sincronizarTareasPrograma } from './sincronizarTareasPrograma'
import type { TrainingLogs, WeekPlan } from '../types'

// Actualizar un programa ya asignado.
// Al guardar un programa editado: a quién le llega el cambio (clientes cuyo plan viene de ese programa) y
// escribirlo. Solo cambia lo que está por venir (lib/actualizarPrograma.ts), con copia en el historial y deshacer.

export interface ClienteDelPrograma {
  id: string
  nombre: string
  /** Tiene un borrador sin publicar: no se le toca (se vería pisado al publicarlo). */
  borrador: boolean
  /** Lo por venir no coincide con lo que daba el programa antes: el entrenador lo cambió a mano. */
  cambiosPropios: boolean
}

export interface Destinatarios {
  clientes: ClienteDelPrograma[]
  /** Semanas nuevas del programa ya convertidas en plan. */
  nuevas: WeekPlan[]
  missing: string[]
  logs: Record<string, TrainingLogs | null>
}

const sinDestinatarios = (): Destinatarios => ({ clientes: [], nuevas: [], missing: [], logs: {} })

/** Clientes activos que tienen asignado el programa. null si falla alguna lectura. */
export async function clientesDelPrograma(antes: ProgramLike, ahora: ProgramLike, trainerId: string, hoy = localDateKey()): Promise<Destinatarios | null> {
  if (isDemoTrainerId(trainerId)) return sinDestinatarios()
  const { data: cli, error } = await supabase.from('clientes').select('id, name, surname, archived_at').eq('trainerId', trainerId)
  if (error) { logError('clientesDelPrograma:clientes', error); return null }
  const activos = ((cli || []) as { id: string; name: string; surname?: string; archived_at?: string | null }[]).filter(c => !c.archived_at)
  if (!activos.length) return sinDestinatarios()
  const filas = await readPlanRows(activos.map(c => c.id))
  if (filas === null) return null
  const conPrograma = filas.filter(f => f.plan?.P?.programId === ahora.id)
  if (!conPrograma.length) return sinDestinatarios()

  const [tpl, reg] = await Promise.all([
    loadProgramTemplates(trainerId, [...new Set([...workoutTemplateIds(antes.weeks), ...workoutTemplateIds(ahora.weeks)])]),
    supabase.from('registros').select('clientId, logs').in('clientId', conPrograma.map(f => f.clientId)),
  ])
  if (tpl === null) return null
  if (reg.error) { logError('clientesDelPrograma:registros', reg.error); return null }
  const logs: Record<string, TrainingLogs | null> = Object.fromEntries(((reg.data || []) as { clientId: string; logs: TrainingLogs | null }[]).map(r => [r.clientId, r.logs]))
  const previas = programToPlanWeeks(antes.weeks, tpl).weeks
  const { weeks: nuevas, missing } = programToPlanWeeks(ahora.weeks, tpl)
  const nombre = Object.fromEntries(activos.map(c => [c.id, `${c.name} ${c.surname || ''}`.trim()]))
  const clientes = conPrograma.map(f => ({
    id: f.clientId,
    nombre: nombre[f.clientId] || f.clientId,
    borrador: !!f.borrador_activo,
    cambiosPropios: tieneCambiosPropios(f.plan!.P!, logs[f.clientId], previas, hoy),
  })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  return { clientes, nuevas, missing, logs }
}

/** Escribe el programa actualizado a los clientes elegidos (los que tienen borrador se omiten). */
export async function actualizarProgramaEnClientes(program: ProgramLike, d: Destinatarios, ids: string[], trainerId: string, hoy = localDateKey()): Promise<AssignOutcome> {
  const inicio: Record<string, string> = {} // fecha de inicio de cada cliente, para fechar sus tareas
  const demo = isDemoTrainerId(trainerId)
  const out = await assign(`${program.name} (actualizado)`, ids, demo, { skipDrafts: true }, (clientId, existing) => {
    inicio[clientId] = existing?.fechaInicio || hoy
    if (!existing) return { clientId, type: program.tipo, restMain: 180, restAcc: 90, restWarn: 30, weeks: JSON.parse(JSON.stringify(d.nuevas)) as WeekPlan[], programId: program.id, programName: program.name, fechaInicio: hoy }
    return mezclarPrograma(existing, d.nuevas, d.logs[clientId], hoy, program.name).plan
  }, d.missing)
  // Las tareas con fecha del programa por venir se rehacen con el programa nuevo (las hechas o pasadas no se tocan).
  if (!demo && out.result.ok.length) {
    out.deshacerTareas = await sincronizarTareasPrograma(out.result.ok.map(clientId => ({ clientId, tareas: tareasDePrograma(program.weeks, inicio[clientId] || hoy, program.id) })), hoy)
  }
  return out
}
