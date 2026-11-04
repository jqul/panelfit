import { localDateKey } from './dates'

// En qué punto del plan está cada cliente, para filtrar la lista: sin plan, empieza pronto (su fecha de inicio aún no
// ha llegado), en curso, termina pronto (en las próximas 2 semanas) o plan terminado. Sin fecha de inicio no se sabe
// cuándo empieza ni acaba: cuenta como en curso.

export type EstadoPlan = 'sin-plan' | 'empieza' | 'en-curso' | 'termina' | 'terminado'

export const DIAS_TERMINA_PRONTO = 14

/** `planEndDate` es el día siguiente al último del plan (inicio + semanas × 7). */
export function estadoPlan(c: { hasPlan?: boolean; planStartDate?: string; planEndDate?: string }, hoy: Date = new Date()): EstadoPlan {
  if (!c.hasPlan) return 'sin-plan'
  const h = localDateKey(hoy)
  if (c.planStartDate && h < c.planStartDate) return 'empieza'
  if (!c.planEndDate) return 'en-curso'
  if (h >= c.planEndDate) return 'terminado'
  const fin = new Date(c.planEndDate + 'T00:00:00'), d = new Date(h + 'T00:00:00')
  return Math.round((fin.getTime() - d.getTime()) / 86400000) <= DIAS_TERMINA_PRONTO ? 'termina' : 'en-curso'
}
