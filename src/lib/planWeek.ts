import { TrainingPlan, TrainingLogs, WeekPlan } from '../types'

function isDayDone(logs: TrainingLogs, weekIdx: number, dayIdx: number, week: WeekPlan): boolean {
  if (logs[`finished_w${weekIdx}_d${dayIdx}`]?.sessionFinished) return true
  const exs = week.days[dayIdx]?.exercises || []
  if (!exs.length) return true
  return exs.every((_, ri) => logs[`ex_w${weekIdx}_d${dayIdx}_r${ri}`]?.done)
}

function isWeekDone(logs: TrainingLogs, weekIdx: number, week: WeekPlan): boolean {
  return !week.days?.length || week.days.every((_, di) => isDayDone(logs, weekIdx, di, week))
}

/**
 * Semana según fecha de inicio del plan — periodización real: una semana
 * natural = una semana del plan, así que avanza sola por calendario, NO por
 * si se completaron los N días programados. Si un cliente solo entrena 3 de
 * 4 días una semana, la semana siguiente toca igual: no tiene sentido
 * repetirle las cargas de la semana 3 en la 4 solo porque le faltó un día
 * (esto es justo lo que le pasaba al plan de powerlifting de 13 semanas de
 * Javi — isCurrent se quedaba clavado en la semana 1 en la base de datos, un
 * flag estático que nadie recalculaba).
 *
 * Las semanas van de lunes a domingo: la semana 1 es la que contiene la fecha
 * de inicio. Contar 7 días desde la fecha de inicio partía la semana del
 * cliente a mitad (plan iniciado en miércoles → cambiaba de semana cada
 * miércoles y los días ya entrenados el lunes y martes se quedaban en la
 * semana anterior).
 */
function mondayOf(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  m.setDate(m.getDate() - (m.getDay() === 0 ? 6 : m.getDay() - 1))
  return m
}

export function weekIdxFromStart(fechaInicio: string, numWeeks: number, now: Date = new Date()): number {
  const [y, mo, d] = fechaInicio.split('-').map(Number)
  const start = mondayOf(new Date(y, mo - 1, d))
  const semanas = Math.round((mondayOf(now).getTime() - start.getTime()) / (7 * 86400000))
  return Math.max(0, Math.min(semanas, numWeeks - 1))
}

function getDateBasedWeekIdx(plan: TrainingPlan, now: Date): number | null {
  if (!plan.fechaInicio || !plan.weeks?.length) return null
  return weekIdxFromStart(plan.fechaInicio, plan.weeks.length, now)
}

/**
 * Índice de la semana que el cliente/entrenador debería ver como "actual".
 * Con fecha de inicio, siempre por calendario (getDateBasedWeekIdx) — ignora
 * el flag isCurrent guardado, que no se recalcula solo y con el tiempo queda
 * desfasado. Sin fecha de inicio no hay calendario del que tirar: de
 * respaldo, empieza en la semana marcada isCurrent (o la primera) y avanza
 * cuando esa semana está completa del todo, en vez de quedarse fija ahí para
 * siempre.
 */
export function getEffectiveWeekIdx(plan: TrainingPlan, logs: TrainingLogs, now: Date = new Date()): number {
  if (!plan.weeks?.length) return 0
  const dateIdx = getDateBasedWeekIdx(plan, now)
  if (dateIdx !== null) return dateIdx

  let idx = plan.weeks.findIndex(w => w.isCurrent)
  if (idx === -1) idx = 0
  while (idx < plan.weeks.length - 1 && isWeekDone(logs, idx, plan.weeks[idx])) idx++
  return idx
}
