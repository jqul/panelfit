import { supabase } from './supabase'
import { logError } from './errors'

// Asignar un programa sustituye el plan del cliente al instante (y el masivo además descarta un
// borrador abierto). Antes de hacerlo se guarda una copia en `plan_history` y se conserva la fila
// anterior para poder deshacerlo desde el aviso.

export interface PlanRowSnapshot {
  clientId: string
  plan: { P?: { weeks?: unknown[] } } | null
  plan_borrador: { P?: { weeks?: unknown[] } } | null
  borrador_activo: boolean | null
  borrador_started_at: string | null
}

type PlanBox = { P?: { weeks?: unknown[] } } | null | undefined

/** Un plan "vale la pena guardar" si tiene al menos una semana (un plan vacío no se pierde nada). */
export const hasPlanContent = (box: PlanBox): boolean => !!box?.P?.weeks?.length

export const snapshotNote = (programName: string, kind: 'plan' | 'borrador' = 'plan') =>
  kind === 'plan'
    ? `Copia automática antes de asignar "${programName}"`
    : `Borrador descartado al asignar "${programName}"`

export interface HistoryInsert { clientId: string; plan: NonNullable<PlanBox>; note: string; published_by: string }

/** Filas de historial a insertar: el plan vivo y, si había un borrador con contenido, el borrador. */
export function buildHistoryRows(rows: PlanRowSnapshot[], programName: string): HistoryInsert[] {
  const out: HistoryInsert[] = []
  for (const r of rows) {
    if (hasPlanContent(r.plan)) out.push({ clientId: r.clientId, plan: r.plan!, note: snapshotNote(programName), published_by: 'Copia automática' })
    if (r.borrador_activo && hasPlanContent(r.plan_borrador)) out.push({ clientId: r.clientId, plan: r.plan_borrador!, note: snapshotNote(programName, 'borrador'), published_by: 'Copia automática' })
  }
  return out
}

/** Filas que habría que restaurar: solo las que tenían algo que perder. */
export const rowsToRestore = (rows: PlanRowSnapshot[]): PlanRowSnapshot[] =>
  rows.filter(r => hasPlanContent(r.plan) || (r.borrador_activo && hasPlanContent(r.plan_borrador)))

export function buildRestorePayload(r: PlanRowSnapshot, now = Date.now()) {
  return {
    clientId: r.clientId,
    plan: r.plan,
    plan_borrador: r.plan_borrador,
    borrador_activo: !!r.borrador_activo,
    borrador_started_at: r.borrador_started_at,
    updatedAt: now,
  }
}

/** Guarda en el historial una copia de un plan concreto (el que el entrenador tiene en pantalla). */
export async function saveHistoryCopy(clientId: string, plan: NonNullable<PlanBox>, programName: string): Promise<boolean> {
  if (!hasPlanContent(plan)) return true
  const { error } = await supabase.from('plan_history').insert({ clientId, plan, note: snapshotNote(programName), published_by: 'Copia automática' })
  if (error) { logError('saveHistoryCopy', error); return false }
  return true
}

/**
 * Lee el estado actual de los planes de esos clientes y deja copia en el historial.
 * Devuelve las filas anteriores (para deshacer) o null si no se pudieron leer: en ese caso
 * quien llama NO debe sobrescribir nada. Si solo falla escribir el historial se sigue
 * adelante, porque el deshacer en memoria sigue funcionando.
 */
export async function snapshotBeforeAssign(clientIds: string[], programName: string): Promise<PlanRowSnapshot[] | null> {
  if (clientIds.length === 0) return []
  const { data, error } = await supabase.from('planes')
    .select('clientId, plan, plan_borrador, borrador_activo, borrador_started_at')
    .in('clientId', clientIds)
  if (error) { logError('snapshotBeforeAssign', error); return null }
  const rows = (data || []) as PlanRowSnapshot[]
  const inserts = buildHistoryRows(rows, programName)
  if (inserts.length) {
    const { error: hErr } = await supabase.from('plan_history').insert(inserts)
    if (hErr) logError('snapshotBeforeAssign:history', hErr)
  }
  return rowsToRestore(rows)
}

/** Deshace una asignación: vuelve a dejar plan y borrador como estaban. Devuelve cuántos clientes se restauraron. */
export async function restoreSnapshots(rows: PlanRowSnapshot[]): Promise<number> {
  const results = await Promise.all(rows.map(async r => {
    const { error } = await supabase.from('planes').upsert(buildRestorePayload(r), { onConflict: 'clientId' })
    if (error) logError('restoreSnapshots', error)
    return !error
  }))
  return results.filter(Boolean).length
}
