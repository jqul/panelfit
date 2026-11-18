import { supabase } from './supabase'
import { logError } from './errors'
import { localDateKey } from './dates'
import type { Decision } from './diarioDecisiones'

// Diario de decisiones en Supabase (tabla decisiones_entrenador: solo el entrenador o su equipo; el cliente no la ve). En demo vive
// en el navegador, igual que el dolor o el peso de los clientes demo.
const COLUMNAS = 'id, fecha, ejercicio, hipotesis, tipo, intervencion, revisar_el, revisada_el, resultado'
const claveDemo = (clientId: string) => `pf_decisiones_${clientId}`
const esDemo = (clientId: string) => clientId.startsWith('demo-client-')

export async function listarDecisiones(clientId: string): Promise<Decision[]> {
  if (esDemo(clientId)) {
    try { return JSON.parse(localStorage.getItem(claveDemo(clientId)) || '[]') } catch { return [] }
  }
  const { data, error } = await supabase.from('decisiones_entrenador').select(COLUMNAS).eq('client_id', clientId).order('fecha', { ascending: false })
  if (error) { logError('decisiones_entrenador.list', error); return [] }
  return (data || []) as Decision[]
}

export async function crearDecision(trainerId: string, clientId: string, d: Omit<Decision, 'id'>): Promise<Decision | null> {
  if (esDemo(clientId)) {
    const nueva: Decision = { ...d, id: crypto.randomUUID() }
    const todas = [nueva, ...(await listarDecisiones(clientId))]
    try { localStorage.setItem(claveDemo(clientId), JSON.stringify(todas)) } catch { /* sin almacenamiento: no se recuerda */ }
    return nueva
  }
  const { data, error } = await supabase.from('decisiones_entrenador').insert({ trainer_id: trainerId, client_id: clientId, ...d }).select(COLUMNAS).single()
  if (error) { logError('decisiones_entrenador.insert', error); return null }
  return data as Decision
}

/** Cierra una decisión: cuándo se revisó y qué pasó. */
export async function revisarDecision(clientId: string, id: string, resultado: string): Promise<boolean> {
  const cambios = { revisada_el: localDateKey(), resultado: resultado.trim() || null }
  if (esDemo(clientId)) {
    const todas = (await listarDecisiones(clientId)).map(d => d.id === id ? { ...d, ...cambios } : d)
    try { localStorage.setItem(claveDemo(clientId), JSON.stringify(todas)) } catch { /* sin almacenamiento */ }
    return true
  }
  const { error } = await supabase.from('decisiones_entrenador').update(cambios).eq('id', id)
  if (error) { logError('decisiones_entrenador.update', error); return false }
  return true
}
