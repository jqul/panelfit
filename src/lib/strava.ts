import { supabase } from './supabase'

// Strava en la app del cliente (función de Edge `strava`): conectar (ir a Strava y volver con un código), ver si está
// conectado, sincronizar y desconectar. Solo con cuenta de cliente. Los entrenos llegan a `actividades`.

const CLAVE_STATE = 'pf_strava_state'

export interface EstadoStrava { cuenta: boolean; conectado: boolean; ultimaSync: string | null }

/** ¿Tiene cuenta (sesión) y está conectado? */
export async function estadoStrava(): Promise<EstadoStrava> {
  const { data: s } = await supabase.auth.getSession()
  if (!s.session) return { cuenta: false, conectado: false, ultimaSync: null }
  const { data } = await supabase.rpc('strava_estado')
  const fila = Array.isArray(data) ? data[0] : data
  return { cuenta: true, conectado: !!fila?.conectado, ultimaSync: fila?.ultima_sync ?? null }
}

/** La dirección de vuelta: la de ahora sin los parámetros de Strava. */
export function vueltaLimpia(href: string = window.location.href): string {
  const u = new URL(href)
  for (const p of ['code', 'state', 'scope', 'error', 'strava']) u.searchParams.delete(p)
  u.searchParams.set('strava', '1')
  return u.toString()
}

/** Lleva a Strava a autorizar. Devuelve un texto de error si no se puede. */
export async function irAConectar(): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('strava', { body: { accion: 'url', vuelta: vueltaLimpia() } })
  if (error || !data?.url) return (await textoError(error)) || 'No se pudo abrir Strava'
  try { localStorage.setItem(CLAVE_STATE, data.state) } catch { /* sin almacenamiento: no se podrá comprobar la vuelta */ }
  window.location.assign(data.url)
  return null
}

async function textoError(error: unknown): Promise<string | null> {
  const ctx = (error as { context?: Response } | null)?.context
  try {
    const b = ctx ? await ctx.json() : null
    if (b?.configurado === false) return 'Strava aún no está activado en PanelFit. Avisa a tu entrenador.'
    if (b?.permiso === false) return 'Para traer tus entrenos, marca la casilla de ver tus actividades al autorizar.'
    return b?.error ? String(b.error) : null
  } catch { return null }
}

/**
 * Si se acaba de volver de Strava (?strava=1&code=…&state=…), termina la conexión y limpia la dirección.
 * null si no venía de Strava; si no, el resultado para enseñarlo.
 */
export async function completarConexion(href: string = window.location.href): Promise<{ ok: boolean; texto: string } | null> {
  const u = new URL(href)
  if (u.searchParams.get('strava') !== '1') return null
  const code = u.searchParams.get('code'), state = u.searchParams.get('state'), err = u.searchParams.get('error')
  let guardado: string | null = null
  try { guardado = localStorage.getItem(CLAVE_STATE); localStorage.removeItem(CLAVE_STATE) } catch { /* */ }
  for (const p of ['code', 'state', 'scope', 'error', 'strava']) u.searchParams.delete(p)
  window.history.replaceState(null, '', u.toString())
  if (err) return { ok: false, texto: 'No has dado permiso en Strava' }
  if (!code || !state || state !== guardado) return { ok: false, texto: 'La conexión con Strava no se ha podido comprobar. Vuelve a intentarlo.' }
  const { data, error } = await supabase.functions.invoke('strava', { body: { accion: 'conectar', code } })
  if (error || !data?.ok) return { ok: false, texto: (await textoError(error)) || 'No se pudo conectar con Strava' }
  return { ok: true, texto: data.nuevas ? `Strava conectado: ${data.nuevas} entreno${data.nuevas === 1 ? '' : 's'} de los últimos 30 días` : 'Strava conectado' }
}

/** Trae los entrenos nuevos (la función lo limita a una vez cada 10 minutos). Cuántos nuevos. */
export async function sincronizarStrava(): Promise<number> {
  const { data, error } = await supabase.functions.invoke('strava', { body: { accion: 'sincronizar' } })
  return error ? 0 : Number(data?.nuevas) || 0
}

export async function desconectarStrava(): Promise<boolean> {
  const { error } = await supabase.functions.invoke('strava', { body: { accion: 'desconectar' } })
  return !error
}
