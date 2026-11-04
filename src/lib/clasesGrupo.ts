import { supabase } from './supabase'
import { logError } from './errors'
import { DEMO_TRAINER_ID } from './demoIds'

// Sesiones de grupo con aforo y lista de espera (migración 20261104000004). El entrenador programa la clase con sus
// plazas; sus clientes reservan desde la app y, si está llena, entran en la espera por orden de llegada. La base de
// datos garantiza que nunca hay más reservadas que plazas y mueve la espera cuando alguien cancela, el entrenador
// quita a alguien o sube el aforo.

export type EstadoPlaza = 'reservada' | 'espera'

export interface Clase {
  id: string; trainer_id: string; titulo: string; start_at: string; end_at: string
  aforo: number; notas: string; cancelada: boolean
}
export interface Plaza { clase_id: string; client_id: string; estado: EstadoPlaza; created_at: string }
export interface ClaseConPlazas extends Clase { plazas: Plaza[] }

/** Lo que ve el cliente de cada clase (clases_cliente): sin saber quién más va. */
export interface ClaseCliente {
  id: string; titulo: string; start_at: string; end_at: string; notas: string
  aforo: number; ocupadas: number; en_espera: number
  mi_estado: EstadoPlaza | null; mi_puesto: number | null; cancelar_horas: number
}

export const libres = (c: { aforo: number; ocupadas: number }) => Math.max(0, c.aforo - c.ocupadas)

/** "3 de 10 plazas · 2 en espera" */
export function resumenPlazas(c: { aforo: number; ocupadas: number; en_espera: number }): string {
  const base = `${c.ocupadas} de ${c.aforo} plaza${c.aforo === 1 ? '' : 's'}`
  return c.en_espera ? `${base} · ${c.en_espera} en espera` : base
}

/** Lo que le pone al cliente cada clase: su estado o cuántas plazas quedan. */
export function estadoParaCliente(c: ClaseCliente): string {
  if (c.mi_estado === 'reservada') return 'Tienes plaza'
  if (c.mi_estado === 'espera') return `En lista de espera (${c.mi_puesto ?? '?'}º)`
  const l = libres(c)
  if (l === 0) return c.en_espera ? `Completa · ${c.en_espera} en espera` : 'Completa'
  return l === 1 ? 'Queda 1 plaza' : `Quedan ${l} plazas`
}

/** ¿Puede cancelar su plaza aún? (salir de la espera siempre se puede) */
export function puedeCancelar(c: Pick<ClaseCliente, 'mi_estado' | 'start_at' | 'cancelar_horas'>, ahora: Date = new Date()): boolean {
  if (c.mi_estado !== 'reservada' || !c.cancelar_horas) return true
  return new Date(c.start_at).getTime() - c.cancelar_horas * 3600000 >= ahora.getTime()
}

/** Mensaje para el cliente de un error de reservar o cancelar. */
export function mensajeError(e: { message?: string; hint?: string | null } | null): string {
  const m = e?.message || ''
  if (m.includes('demasiado_lejos')) return 'Aún no se puede reservar tan adelante'
  if (m.includes('clase_no_disponible')) return 'Esa clase ya no está disponible'
  if (m.includes('plazo_cancelacion')) return `${e?.hint || 'Ya no se puede cancelar'}: habla con tu entrenador`
  return 'No se pudo hacer, inténtalo de nuevo'
}

// ── Entrenador ── (en la demo, en memoria)
const DEMO: ClaseConPlazas[] = []
const esDemo = (t: string) => t === DEMO_TRAINER_ID

export async function listarClases(trainerId: string, desde: Date = new Date()): Promise<ClaseConPlazas[] | null> {
  if (esDemo(trainerId)) return DEMO.filter(c => !c.cancelada && new Date(c.end_at) >= desde).sort((a, b) => a.start_at.localeCompare(b.start_at))
  const { data, error } = await supabase.from('clases').select('*')
    .eq('trainer_id', trainerId).eq('cancelada', false).gte('end_at', desde.toISOString()).order('start_at')
  if (error) { logError('clases:listar', error); return null }
  const clases = (data || []) as Clase[]
  if (!clases.length) return []
  const { data: pl, error: errPlazas } = await supabase.from('clase_plazas').select('clase_id, client_id, estado, created_at').in('clase_id', clases.map(c => c.id))
  if (errPlazas) { logError('clases:plazas', errPlazas); return null }
  const plazas = ((pl || []) as Plaza[]).sort((a, b) => a.created_at.localeCompare(b.created_at))
  return clases.map(c => ({ ...c, plazas: plazas.filter(p => p.clase_id === c.id) }))
}

export async function crearClase(trainerId: string, c: Pick<Clase, 'titulo' | 'start_at' | 'end_at' | 'aforo' | 'notas'>): Promise<ClaseConPlazas | null> {
  if (esDemo(trainerId)) {
    const nueva = { ...c, id: crypto.randomUUID(), trainer_id: trainerId, cancelada: false, plazas: [] }
    DEMO.push(nueva); return nueva
  }
  const { data, error } = await supabase.from('clases').insert({ ...c, trainer_id: trainerId }).select('*').single()
  if (error) { logError('clases:crear', error); return null }
  return { ...(data as Clase), plazas: [] }
}

export async function cambiarAforo(trainerId: string, id: string, aforo: number): Promise<boolean> {
  if (esDemo(trainerId)) {
    const c = DEMO.find(x => x.id === id); if (!c) return false
    c.aforo = aforo
    let sitio = aforo - c.plazas.filter(p => p.estado === 'reservada').length
    for (const p of c.plazas) if (sitio > 0 && p.estado === 'espera') { p.estado = 'reservada'; sitio-- }
    return true
  }
  const { error } = await supabase.from('clases').update({ aforo }).eq('id', id)
  if (error) { logError('clases:aforo', error); return false }
  return true
}

export async function cancelarClaseEntera(trainerId: string, id: string): Promise<boolean> {
  if (esDemo(trainerId)) { const c = DEMO.find(x => x.id === id); if (c) c.cancelada = true; return true }
  const { error } = await supabase.from('clases').update({ cancelada: true }).eq('id', id)
  if (error) { logError('clases:cancelar', error); return false }
  return true
}

/** Apunta a un cliente: con plaza si queda, si no a la espera (lo decide la base de datos). */
export async function apuntar(trainerId: string, claseId: string, clientId: string): Promise<boolean> {
  if (esDemo(trainerId)) {
    const c = DEMO.find(x => x.id === claseId); if (!c || c.plazas.some(p => p.client_id === clientId)) return false
    const llena = c.plazas.filter(p => p.estado === 'reservada').length >= c.aforo
    c.plazas.push({ clase_id: claseId, client_id: clientId, estado: llena ? 'espera' : 'reservada', created_at: new Date().toISOString() })
    return true
  }
  const { error } = await supabase.from('clase_plazas').insert({ clase_id: claseId, client_id: clientId, estado: 'reservada' })
  if (error) { logError('clases:apuntar', error); return false }
  return true
}

/** Quita a un cliente; si tenía plaza, entra el primero de la espera. */
export async function quitar(trainerId: string, claseId: string, clientId: string): Promise<boolean> {
  if (esDemo(trainerId)) {
    const c = DEMO.find(x => x.id === claseId); if (!c) return false
    const p = c.plazas.find(x => x.client_id === clientId)
    c.plazas = c.plazas.filter(x => x.client_id !== clientId)
    const primero = c.plazas.find(x => x.estado === 'espera')
    if (p?.estado === 'reservada' && primero) primero.estado = 'reservada'
    return true
  }
  const { error } = await supabase.from('clase_plazas').delete().eq('clase_id', claseId).eq('client_id', clientId)
  if (error) { logError('clases:quitar', error); return false }
  return true
}

// ── Cliente ──
export async function clasesDelCliente(): Promise<ClaseCliente[]> {
  const { data, error } = await supabase.rpc('clases_cliente', { p_dias: 21 })
  if (error) { logError('clases:cliente', error); return [] }
  return (data || []) as ClaseCliente[]
}

export async function reservarClase(id: string): Promise<{ estado: EstadoPlaza } | { error: string }> {
  const { data, error } = await supabase.rpc('reservar_clase', { p_clase: id })
  if (error) return { error: mensajeError(error) }
  return { estado: data as EstadoPlaza }
}

export async function cancelarMiPlaza(id: string): Promise<{ ok: true } | { error: string }> {
  const { error } = await supabase.rpc('cancelar_clase', { p_clase: id })
  if (error) return { error: mensajeError(error) }
  return { ok: true }
}
