import { supabase } from '../../../lib/supabase'
import { TrainingLogs } from '../../../types'
import { logError } from '../../../lib/errors'

export const PENDING_LOGS_KEY = (clientId: string) => `pf_logs_pending_${clientId}`

// Copia local del cliente y del plan del día — permite un arranque en frío sin
// conexión (ej. sótano de gimnasio) mostrando la última versión conocida en vez
// de un enlace "no válido" o una pantalla en blanco.
export const CLIENT_CACHE_KEY = (token: string) => `pf_client_cache_${token}`
export const PLAN_CACHE_KEY = (clientId: string) => `pf_plan_cache_${clientId}`

export async function pushLogsToServer(clientId: string, newLogs: TrainingLogs): Promise<boolean> {
  // OJO: antes esto era un .update() y solo se hacía .insert() si ese update
  // devolvía error — pero un .update() que no encuentra ninguna fila (cliente
  // que aún no tiene registro en `registros`, p.ej. su primer entreno) NO
  // devuelve error en Supabase, simplemente no toca nada. El resultado: el
  // entreno se marcaba como guardado en el cliente (se borraba el pendiente)
  // sin haberse escrito nunca en el servidor, y el entrenador nunca lo veía.
  // upsert() con onConflict evita depender de si la fila ya existe.
  const { error } = await supabase.from('registros')
    .upsert({ clientId, logs: newLogs, updatedAt: Date.now() }, { onConflict: 'clientId' })
  if (error) { logError('ClientView:saveLogs', error); return false }
  return true
}
