// Sesiones online: una cita o una clase de grupo con enlace de videollamada (Meet, Zoom, Teams...). Sin enlace es
// presencial. El cliente ve "Online" siempre y el botón "Unirse" desde un rato antes hasta que acaba; en una clase, el
// enlace solo llega a quien tiene plaza (clases_cliente, migración 20261105000002).

export const MINUTOS_ANTES = 15
export const MAX_ENLACE = 500

/** El enlace limpio si vale (https y sin espacios), o null. */
export function limpiarEnlace(raw?: string | null): string | null {
  const s = (raw || '').trim()
  if (!s || s.length > MAX_ENLACE || /\s/.test(s)) return null
  try {
    const u = new URL(s)
    return u.protocol === 'https:' && u.hostname.includes('.') ? s : null
  } catch { return null }
}

/** Por qué no vale, para el formulario (null si vale o está vacío). */
export function problemaEnlace(raw?: string | null): string | null {
  if (!(raw || '').trim()) return null
  return limpiarEnlace(raw) ? null : 'Pega el enlace completo de la videollamada (empieza por https://)'
}

/** "Meet", "Zoom", "Teams"... para que el cliente sepa con qué se va a conectar. */
export function plataforma(enlace: string): string {
  const h = (() => { try { return new URL(enlace).hostname } catch { return '' } })()
  if (h.endsWith('meet.google.com')) return 'Google Meet'
  if (h.includes('zoom.')) return 'Zoom'
  if (h.includes('teams.microsoft') || h.includes('teams.live')) return 'Teams'
  if (h.endsWith('whereby.com')) return 'Whereby'
  if (h.includes('jit.si')) return 'Jitsi'
  return 'videollamada'
}

/** ¿Se puede entrar ya? Desde MINUTOS_ANTES antes del inicio hasta el final. */
export function puedeUnirse(startAt: string, endAt: string, ahora: Date = new Date()): boolean {
  const t = ahora.getTime()
  return t >= new Date(startAt).getTime() - MINUTOS_ANTES * 60_000 && t <= new Date(endAt).getTime()
}
