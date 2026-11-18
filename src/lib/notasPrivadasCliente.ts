import { supabase } from './supabase'
import { logError } from './errors'
import { DEMO_NOTAS_PRIVADAS } from './demoNotasPrivadas'

// Notas privadas en Supabase (tabla notas_privadas_cliente: una fila por cliente, solo el entrenador o su equipo; el cliente no la
// ve). En demo viven en el navegador, con las de ejemplo de demo-data como punto de partida.
const claveDemo = (clientId: string) => `pf_notas_privadas_${clientId}`
const esDemo = (clientId: string) => clientId.startsWith('demo-client-')

export async function cargarNotas(clientId: string): Promise<string> {
  if (esDemo(clientId)) {
    try {
      const guardadas = localStorage.getItem(claveDemo(clientId))
      if (guardadas !== null) return guardadas
    } catch { /* sin almacenamiento: se usan las de ejemplo */ }
    return DEMO_NOTAS_PRIVADAS[clientId] ?? ''
  }
  const { data, error } = await supabase.from('notas_privadas_cliente').select('notas').eq('client_id', clientId).maybeSingle()
  if (error) { logError('notas_privadas_cliente.get', error); return '' }
  return (data as { notas: string } | null)?.notas ?? ''
}

/** Guarda (crea o actualiza) las notas del cliente. Devuelve si se pudo. */
export async function guardarNotas(trainerId: string, clientId: string, notas: string): Promise<boolean> {
  if (esDemo(clientId)) {
    try { localStorage.setItem(claveDemo(clientId), notas) } catch { /* sin almacenamiento: no se recuerda */ }
    return true
  }
  const { error } = await supabase.from('notas_privadas_cliente')
    .upsert({ client_id: clientId, trainer_id: trainerId, notas, updated_at: new Date().toISOString() }, { onConflict: 'client_id' })
  if (error) { logError('notas_privadas_cliente.upsert', error); return false }
  return true
}
