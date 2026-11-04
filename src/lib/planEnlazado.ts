import type { TrainingPlan, TrainingTemplate, WeekPlan } from '../types'
import { supabase } from './supabase'
import { logError } from './errors'
import { localDateKey } from './dates'
import { DEMO_TRAINER_ID } from './demoIds'

// Programas enlazados: lo que viene después del plan actual. Se guarda una copia de las semanas del workout en
// planes.siguiente (cambiar la plantilla después no cambia lo preparado) y la tarea de cada noche del servidor
// (empezar_planes_enlazados, migración 20261104000002) lo pone cuando el plan termina, empezando el lunes siguiente,
// con copia del anterior en el historial. Sin fecha de inicio no se sabe cuándo termina: no se puede preparar.

export interface PlanSiguiente { nombre: string; templateId?: string; type?: string; weeks: WeekPlan[] }

/** Lo que se guarda al preparar un workout como siguiente plan. */
export function siguienteDesdeWorkout(t: Pick<TrainingTemplate, 'id' | 'name' | 'type' | 'weeks'>): PlanSiguiente {
  return { nombre: t.name || 'Workout', templateId: t.id, type: t.type, weeks: JSON.parse(JSON.stringify(t.weeks)) }
}

/** Lunes en que empieza el siguiente: el día después del domingo de la última semana. Null sin fecha o sin semanas. */
export function empiezaSiguiente(plan: Pick<TrainingPlan, 'fechaInicio' | 'weeks'>): string | null {
  if (!plan.fechaInicio || !plan.weeks?.length) return null
  const [y, m, d] = plan.fechaInicio.split('-').map(Number)
  const f = new Date(y, m - 1, d)
  f.setDate(f.getDate() - ((f.getDay() + 6) % 7) + 7 * plan.weeks.length)
  return localDateKey(f)
}

// En la demo no hay filas reales: lo preparado vive en memoria mientras dura la visita.
const DEMO_SIGUIENTE: Record<string, PlanSiguiente | null> = {}

export async function leerSiguiente(clientId: string, trainerId: string): Promise<PlanSiguiente | null> {
  if (trainerId === DEMO_TRAINER_ID) return DEMO_SIGUIENTE[clientId] ?? null
  const { data, error } = await supabase.from('planes').select('siguiente').eq('clientId', clientId).maybeSingle()
  if (error) { logError('planEnlazado:leer', error); return null }
  return ((data as { siguiente?: PlanSiguiente | null } | null)?.siguiente) ?? null
}

/** Guarda (o quita, con null) el siguiente plan. Solo toca esa columna: el plan y el borrador siguen como estaban. */
export async function guardarSiguiente(clientId: string, trainerId: string, s: PlanSiguiente | null): Promise<boolean> {
  if (trainerId === DEMO_TRAINER_ID) { DEMO_SIGUIENTE[clientId] = s; return true }
  const { error } = await supabase.from('planes').update({ siguiente: s }).eq('clientId', clientId)
  if (error) { logError('planEnlazado:guardar', error); return false }
  return true
}
