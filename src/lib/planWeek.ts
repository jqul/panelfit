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
 * Índice de la semana que el cliente debería ver como "actual". Empieza en la
 * semana marcada isCurrent (o la primera si no hay ninguna marcada), pero si
 * esa semana YA está completa del todo, sigue avanzando a la siguiente sin
 * terminar — antes, al acabar la semana marcada como actual, "Hoy" y "Plan"
 * se quedaban pegados ahí para siempre (solo "Repetir"), porque isCurrent es
 * un flag estático que nadie actualiza salvo que el entrenador entre al
 * editor y lo cambie a mano. Con esto, una rutina de varias semanas —aunque
 * repita los mismos ejercicios semana a semana— avanza sola en cuanto el
 * cliente termina la semana en curso.
 */
export function getEffectiveWeekIdx(plan: TrainingPlan, logs: TrainingLogs): number {
  if (!plan.weeks?.length) return 0
  let idx = plan.weeks.findIndex(w => w.isCurrent)
  if (idx === -1) idx = 0
  while (idx < plan.weeks.length - 1 && isWeekDone(logs, idx, plan.weeks[idx])) idx++
  return idx
}
