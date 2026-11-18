import { supabase } from './supabase'
import { logError } from './errors'
import { DEMO_NOTAS_PRIVADAS, DEMO_OBSERVACIONES } from './demoNotasPrivadas'

// Lo que el entrenador guarda en privado sobre un cliente, en Supabase (tabla notas_privadas_cliente: una fila por cliente, solo el
// entrenador o su equipo; el cliente no la ve). Tres campos, que se guardan por separado (un upsert solo toca el suyo):
//   notas          la sección «Notas privadas» de la ficha
//   observaciones  la caja «Notas privadas» del Perfil (antes clientes.notas_privadas)
//   alertas        recordatorios sobre el cliente (antes clientes.alerts); su demo vive en demo-data-extra
// En demo viven en el navegador, con las de ejemplo de demoNotasPrivadas como punto de partida.
export type CampoPrivado = 'notas' | 'observaciones'

const claveDemo = (campo: CampoPrivado, clientId: string) => campo === 'notas' ? `pf_notas_privadas_${clientId}` : `pf_observaciones_${clientId}`
const ejemploDemo = (campo: CampoPrivado, clientId: string) => (campo === 'notas' ? DEMO_NOTAS_PRIVADAS : DEMO_OBSERVACIONES)[clientId] ?? ''
const esDemo = (clientId: string) => clientId.startsWith('demo-client-')

async function cargarTexto(campo: CampoPrivado, clientId: string): Promise<string> {
  if (esDemo(clientId)) {
    try {
      const guardadas = localStorage.getItem(claveDemo(campo, clientId))
      if (guardadas !== null) return guardadas
    } catch { /* sin almacenamiento: se usan las de ejemplo */ }
    return ejemploDemo(campo, clientId)
  }
  const { data, error } = await supabase.from('notas_privadas_cliente').select(campo).eq('client_id', clientId).maybeSingle()
  if (error) { logError(`notas_privadas_cliente.get.${campo}`, error); return '' }
  return ((data as Record<string, string> | null)?.[campo]) ?? ''
}

async function guardarTexto(campo: CampoPrivado, trainerId: string, clientId: string, texto: string): Promise<boolean> {
  if (esDemo(clientId)) {
    try { localStorage.setItem(claveDemo(campo, clientId), texto) } catch { /* sin almacenamiento: no se recuerda */ }
    return true
  }
  const { error } = await supabase.from('notas_privadas_cliente')
    .upsert({ client_id: clientId, trainer_id: trainerId, [campo]: texto, updated_at: new Date().toISOString() }, { onConflict: 'client_id' })
  if (error) { logError(`notas_privadas_cliente.upsert.${campo}`, error); return false }
  return true
}

export const cargarNotas = (clientId: string) => cargarTexto('notas', clientId)
export const guardarNotas = (trainerId: string, clientId: string, notas: string) => guardarTexto('notas', trainerId, clientId, notas)
export const cargarObservaciones = (clientId: string) => cargarTexto('observaciones', clientId)
export const guardarObservaciones = (trainerId: string, clientId: string, texto: string) => guardarTexto('observaciones', trainerId, clientId, texto)

// ── Alertas (solo datos reales: el demo las guarda en memoria, en demo-data-extra) ──
/** Las alertas de un cliente. */
export async function cargarAlertas<T>(clientId: string): Promise<T[]> {
  const { data, error } = await supabase.from('notas_privadas_cliente').select('alertas').eq('client_id', clientId).maybeSingle()
  if (error) { logError('notas_privadas_cliente.get.alertas', error); return [] }
  return ((data as { alertas: T[] } | null)?.alertas) ?? []
}

/** Las alertas de varios clientes a la vez (solo las de los que tienen alguna), por id de cliente. */
export async function cargarAlertasDe<T>(clientIds: string[]): Promise<Record<string, T[]>> {
  const { data, error } = await supabase.from('notas_privadas_cliente').select('client_id, alertas').in('client_id', clientIds)
  if (error) { logError('notas_privadas_cliente.list.alertas', error); return {} }
  const mapa: Record<string, T[]> = {}
  ;(data as { client_id: string; alertas: T[] }[] | null)?.forEach(r => { if (r.alertas?.length) mapa[r.client_id] = r.alertas })
  return mapa
}

export async function guardarAlertas<T>(trainerId: string, clientId: string, alertas: T[]): Promise<boolean> {
  const { error } = await supabase.from('notas_privadas_cliente')
    .upsert({ client_id: clientId, trainer_id: trainerId, alertas, updated_at: new Date().toISOString() }, { onConflict: 'client_id' })
  if (error) { logError('notas_privadas_cliente.upsert.alertas', error); return false }
  return true
}
