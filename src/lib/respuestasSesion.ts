import { supabase } from './supabase'
import { logError } from './errors'
import { sendPush } from './usePushNotifications'
import { isDemoClientId, isDemoTrainerId } from './demoIds'

// Respuesta rápida del entrenador a una sesión (migración 20261114000004): una frase o un emoji desde la Bandeja que le
// llega al cliente con push y que ve en Hoy hasta marcarla como leída. En la demo vive en memoria.

export interface RespuestaSesion { id: string; client_id: string; trainer_id: string; fecha: string; texto: string; created_at: string; leida_at: string | null }

export const RESPUESTAS_RAPIDAS = ['💪 ¡Buen trabajo!', '🔥 ¡Vaya sesión!', '👏 Sigue así', '✅ Visto, todo bien']

const demo: RespuestaSesion[] = []
export const claveRespuesta = (clientId: string, fecha: string) => `${clientId}:${fecha}`

export async function responderSesion(trainerId: string, clientId: string, fecha: string, texto: string): Promise<boolean> {
  const t = texto.trim().slice(0, 500)
  if (!t) return false
  if (isDemoTrainerId(trainerId) || isDemoClientId(clientId)) {
    demo.push({ id: crypto.randomUUID(), client_id: clientId, trainer_id: trainerId, fecha, texto: t, created_at: new Date().toISOString(), leida_at: null })
    return true
  }
  const { error } = await supabase.from('respuestas_sesion').insert({ client_id: clientId, trainer_id: trainerId, fecha, texto: t })
  if (error) { logError('respuestas:responder', error); return false }
  sendPush({ clientId }, 'Tu entrenador ha visto tu sesión', t)
  return true
}

/** Sesiones ya respondidas (cliente:fecha) desde `desde`. */
export async function sesionesRespondidas(trainerId: string, desde: string): Promise<Set<string>> {
  if (isDemoTrainerId(trainerId)) return new Set(demo.map(r => claveRespuesta(r.client_id, r.fecha)))
  const { data, error } = await supabase.from('respuestas_sesion').select('client_id, fecha').eq('trainer_id', trainerId).gte('fecha', desde)
  if (error) { logError('respuestas:listar', error); return new Set() }
  return new Set((data || []).map((r: { client_id: string; fecha: string }) => claveRespuesta(r.client_id, r.fecha)))
}

/** Las que el cliente aún no ha leído. */
export async function respuestasSinLeer(clientId: string): Promise<RespuestaSesion[]> {
  if (isDemoClientId(clientId)) return demo.filter(r => r.client_id === clientId && !r.leida_at)
  const { data, error } = await supabase.from('respuestas_sesion').select('*').eq('client_id', clientId).is('leida_at', null).order('created_at', { ascending: false }).limit(5)
  if (error) { logError('respuestas:cliente', error); return [] }
  return (data || []) as RespuestaSesion[]
}

export async function marcarRespuestaLeida(id: string, clientId: string): Promise<void> {
  if (isDemoClientId(clientId)) { const r = demo.find(x => x.id === id); if (r) r.leida_at = new Date().toISOString(); return }
  const { error } = await supabase.rpc('marcar_respuesta_leida', { p_id: id })
  if (error) logError('respuestas:leida', error)
}
