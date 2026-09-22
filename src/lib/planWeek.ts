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
 */
function getDateBasedWeekIdx(plan: TrainingPlan): number | null {
  if (!plan.fechaInicio || !plan.weeks?.length) return null
  const inicio = new Date(plan.fechaInicio + 'T00:00:00')
  const dias = Math.max(0, Math.floor((Date.now() - inicio.getTime()) / 86400000))
  return Math.min(Math.floor(dias / 7), plan.weeks.length - 1)
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
export function getEffectiveWeekIdx(plan: TrainingPlan, logs: TrainingLogs): number {
  if (!plan.weeks?.length) return 0
  const dateIdx = getDateBasedWeekIdx(plan)
  if (dateIdx !== null) return dateIdx

  let idx = plan.weeks.findIndex(w => w.isCurrent)
  if (idx === -1) idx = 0
  while (idx < plan.weeks.length - 1 && isWeekDone(logs, idx, plan.weeks[idx])) idx++
  return idx
}
