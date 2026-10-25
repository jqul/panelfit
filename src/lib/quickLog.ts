// Registrar un entreno YA HECHO sin repetirlo serie a serie: se parte de lo programado (series, repeticiones y
// peso del plan) y el cliente solo desmarca lo que no hizo o corrige lo que cambió. Es lo que hace falta cuando
// se olvidó abrir la app en el gimnasio. Lógica pura: la hoja de la interfaz solo la pinta.

import type { DayPlan, Exercise, ExerciseLog, TrainingLogs } from '../types'

export type QuickRowState = 'editable' | 'ya-hecho' | 'pista'

export interface QuickRow {
  ri: number
  name: string
  numSets: number
  weight: string
  reps: string
  /** Se marcará como hecho al guardar. */
  included: boolean
  /** editable = se puede incluir y corregir; ya-hecho = ya tiene registro, no se toca; pista = la carrera se registra desde el entreno (tiempos y distancias). */
  state: QuickRowState
}

/** "80kg", "80 kg", "82,5" → "80" / "82.5". Un porcentaje, vacío o texto libre ("al fallo") no se puede prerrellenar: "". */
export function plannedWeight(w: string | undefined): string {
  const m = (w ?? '').match(/^\s*(\d+(?:[.,]\d+)?)\s*(?:kg)?\s*$/i)
  return m ? m[1].replace(',', '.') : ''
}

/** "3x10", "3×10 @7", "2x5 @5" → series y repeticiones; sin formato reconocible, 3×10 como en el resto de la app. */
export function parseSets(sets: string | undefined) {
  const m = sets?.match(/(\d+)\s*[×x]\s*(\d+)/)
  return { numSets: m ? parseInt(m[1]) : 3, numReps: m ? parseInt(m[2]) : 10 }
}

const keyOf = (dayKey: string, ri: number) => `ex_${dayKey}_r${ri}`

export function buildRows(day: Pick<DayPlan, 'exercises'>, dayKey: string, logs: TrainingLogs): QuickRow[] {
  return day.exercises.map((ex: Exercise, ri) => {
    const { numSets, numReps } = parseSets(ex.sets)
    const done = !!logs[keyOf(dayKey, ri)]?.done
    const state: QuickRowState = done ? 'ya-hecho' : ex.kind === 'run' ? 'pista' : 'editable'
    return { ri, name: ex.name, numSets, weight: plannedWeight(ex.weight), reps: String(numReps), included: state === 'editable', state }
  })
}

/** Repeticiones y peso válidos: números positivos (el peso puede quedar vacío: peso corporal o sin dato). */
export const validReps = (r: string) => /^\d{1,3}$/.test(r.trim()) && parseInt(r) > 0
export const validWeight = (w: string) => w.trim() === '' || (/^\d{1,3}(?:[.,]\d{1,2})?$/.test(w.trim()))

export function rowsAreValid(rows: QuickRow[]): boolean {
  return rows.filter(r => r.included && r.state === 'editable').every(r => validReps(r.reps) && validWeight(r.weight))
}

/**
 * Devuelve los registros con la sesión añadida. No pisa lo que ya estaba hecho ni toca otros días; conserva lo que
 * ya hubiera en cada ejercicio (nota, sustitución, vídeo). Si algún ejercicio del día queda sin hacer, deja la marca
 * `finished_<día>` igual que al terminar una sesión a medias (así el día cuenta como cerrado y no sale "pendiente").
 */
export function applyQuickLog(logs: TrainingLogs, dayKey: string, rows: QuickRow[], date: string): TrainingLogs {
  const out: TrainingLogs = { ...logs }
  let sinHacer = 0
  for (const r of rows) {
    if (r.state === 'ya-hecho') continue
    if (!r.included || r.state !== 'editable') { sinHacer++; continue }
    const sets: ExerciseLog['sets'] = {}
    for (let i = 0; i < r.numSets; i++) sets[i] = { weight: r.weight.trim().replace(',', '.'), reps: r.reps.trim() }
    const prev = logs[keyOf(dayKey, r.ri)]
    out[keyOf(dayKey, r.ri)] = { ...prev, sets, done: true, dateDone: date }
  }
  if (sinHacer > 0) out[`finished_${dayKey}`] = { sets: {}, done: false, sessionFinished: true }
  return out
}

export const addDays = (dateKey: string, delta: number): string => {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(y, m - 1, d + delta)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
