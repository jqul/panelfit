import { supabase } from './supabase'
import { logError } from './errors'
import type { TemplatesById } from './programPlan'

/**
 * Carga los workouts (plan_templates) que usa un programa. Devuelve null si falla la lectura:
 * quien llama decide si aborta (asignar sin ejercicios sería peor que no asignar) o sigue.
 */
export async function loadProgramTemplates(trainerId: string, ids: string[]): Promise<TemplatesById | null> {
  if (ids.length === 0) return {}
  const { data, error } = await supabase.from('plan_templates').select('id, plan').eq('trainer_id', trainerId).in('id', ids)
  if (error) { logError('loadProgramTemplates', error); return null }
  const out: TemplatesById = {}
  for (const r of (data || []) as { id: string; plan: { weeks?: unknown[] } | null }[]) out[r.id] = r.plan as TemplatesById[string]
  return out
}
