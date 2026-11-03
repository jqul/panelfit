import type { TrainingPlan, TrainingTemplate } from '../types'
import { supabase } from './supabase'
import { logError } from './errors'
import { planDesdeWorkout } from './planDesdeWorkout'
import { snapshotBeforeAssign } from './planSnapshot'
import { DEMO_TRAINER_ID, DEMO_PLAN_MAP } from './demo-data'

// Asignar un workout de la librería a un cliente desde Workouts, sin entrar en su ficha. Hace lo mismo que «Cargar
// workout» en la ficha: las semanas del workout con la fecha de inicio, conservando el resto de su plan (mensajes,
// días elegidos, avisos...). Antes de sustituir nada se guarda copia en el historial (planSnapshot); si el cliente
// tiene un borrador abierto, va al borrador y no lo ve hasta que se publique.

export type ResultadoAsignar = { ok: true; enBorrador: boolean } | { ok: false; motivo: string }

export async function asignarWorkout(tmpl: TrainingTemplate, clientId: string, fechaInicio: string, trainerId: string): Promise<ResultadoAsignar> {
  // En la demo no hay filas reales: se cambia el plan en memoria y se ve al abrir la ficha del cliente
  if (trainerId === DEMO_TRAINER_ID) {
    DEMO_PLAN_MAP[clientId] = planDesdeWorkout(tmpl, clientId, fechaInicio, DEMO_PLAN_MAP[clientId])
    return { ok: true, enBorrador: false }
  }
  // Copia del plan actual en el historial; si no se puede leer lo que hay, no se toca nada
  const previas = await snapshotBeforeAssign([clientId], tmpl.name)
  if (previas === null) return { ok: false, motivo: 'No se pudo leer su plan actual' }
  const { data, error: errLeer } = await supabase.from('planes').select('plan, plan_borrador, borrador_activo').eq('clientId', clientId).maybeSingle()
  if (errLeer) { logError('asignarWorkout:leer', errLeer); return { ok: false, motivo: 'No se pudo leer su plan actual' } }
  const fila = data as { plan?: { P?: TrainingPlan }; plan_borrador?: { P?: TrainingPlan }; borrador_activo?: boolean } | null
  const enBorrador = !!fila?.borrador_activo
  const actual = (enBorrador ? fila?.plan_borrador?.P : fila?.plan?.P) ?? null
  const plan = planDesdeWorkout(tmpl, clientId, fechaInicio, actual)
  const update: Record<string, unknown> = { clientId, updatedAt: Date.now() }
  if (enBorrador) update.plan_borrador = { P: plan }
  else update.plan = { P: plan }
  const { error } = await supabase.from('planes').upsert(update, { onConflict: 'clientId' })
  if (error) { logError('asignarWorkout', error); return { ok: false, motivo: 'No se pudo guardar el plan' } }
  return { ok: true, enBorrador }
}
