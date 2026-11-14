import type { TrainingPlan } from '../types'
import { localDateKey } from './dates'

/** Lunes en que termina el plan (y empieza el siguiente): el día después del domingo de su última semana. Null sin
 * fecha o sin semanas. Puro (lib/planEnlazado lo usa para los programas enlazados y lib/revisionBloque para la revisión). */
export function finDelPlan(plan: Pick<TrainingPlan, 'fechaInicio' | 'weeks'>): string | null {
  if (!plan.fechaInicio || !plan.weeks?.length) return null
  const [y, m, d] = plan.fechaInicio.split('-').map(Number)
  const f = new Date(y, m - 1, d)
  f.setDate(f.getDate() - ((f.getDay() + 6) % 7) + 7 * plan.weeks.length)
  return localDateKey(f)
}
