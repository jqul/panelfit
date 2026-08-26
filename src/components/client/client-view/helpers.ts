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
  const { error: updateErr } = await supabase.from('registros')
    .update({ logs: newLogs, updatedAt: Date.now() }).eq('clientId', clientId)
  if (updateErr) {
    const { error: insertErr } = await supabase.from('registros')
      .insert({ clientId, logs: newLogs, updatedAt: Date.now() })
    if (insertErr) { logError('ClientView:saveLogs', insertErr); return false }
  }
  return true
}
