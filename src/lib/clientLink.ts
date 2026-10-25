// Acceso directo / app instalada del cliente. El enlace del cliente es `/?c=<token>`, pero un acceso directo
// arranca en `start_url` del manifiesto ("/", sin el token) y entonces salía la pantalla de entrenadores en vez de
// su panel: el cliente "se salía de su enlace" y cada recarga de la app instalada lo dejaba en "/". Dos arreglos:
//  1. Al entrar con un enlace válido se recuerda en este dispositivo, y la app INSTALADA (modo standalone) que
//     arranca en la raíz sin enlace vuelve a abrir el del cliente. En el navegador normal no se hace nada (un
//     entrenador que prueba su vista de cliente en el móvil no debe quedar atrapado en ella).
//  2. Mientras se ve el panel del cliente, el manifiesto se sustituye por uno que sirve el servidor (api/manifest.js) y
//     cuyo `start_url` lleva su enlace, para que "Instalar / Añadir a pantalla de inicio" guarde el acceso directo a SU
//     panel (Chrome en Android y Safari en iPhone; en iPhone la app instalada tiene su propio almacenamiento y solo
//     el manifiesto le llega).
// El enlace solo da acceso a la pantalla de entrada; los datos de salud exigen además su sesión.

const KEY = 'pf_client_link'
const PLAUSIBLE = /^[A-Za-z0-9_-]{8,128}$/

/** Un token válido solo tiene letras, números, guion y guion bajo: así nunca se cuela texto raro en una dirección. */
export const isPlausibleToken = (t: unknown): t is string => typeof t === 'string' && PLAUSIBLE.test(t)

export function rememberClientLink(token: string): void {
  if (!isPlausibleToken(token)) return
  try { localStorage.setItem(KEY, token) } catch { /* sin almacenamiento: el acceso directo no recordará el enlace */ }
}

export function recalledClientLink(): string | null {
  try { const t = localStorage.getItem(KEY); return isPlausibleToken(t) ? t : null } catch { return null }
}

/** Olvida el enlace recordado. Con `onlyIf` solo si es ese (un enlace que ya no existe no borra el de otro cliente). */
export function forgetClientLink(onlyIf?: string): void {
  try { if (onlyIf === undefined || localStorage.getItem(KEY) === onlyIf) localStorage.removeItem(KEY) } catch { /* nada que olvidar */ }
}

/** ¿La app está abierta como app instalada / acceso directo (sin barra del navegador)? */
export function isStandaloneDisplay(): boolean {
  try {
    return window.matchMedia?.('(display-mode: standalone)').matches === true || (navigator as { standalone?: boolean }).standalone === true
  } catch { return false }
}

/**
 * Qué enlace de cliente abrir al arrancar. El de la dirección (?c=) manda siempre. Sin él, solo la app instalada
 * que arranca exactamente en la raíz recupera el recordado. Devuelve null en cualquier otro caso.
 */
export function tokenAtStart(i: { pathname: string; search: string; standalone: boolean; recalled: string | null }): string | null {
  const fromUrl = new URLSearchParams(i.search).get('c')
  if (fromUrl) return fromUrl
  if (i.standalone && i.pathname === '/' && isPlausibleToken(i.recalled)) return i.recalled
  return null
}

/** Sustituye el <link rel="manifest"> por el del cliente, que sirve el servidor (api/manifest.js) con su enlace como start_url. */
export function installClientManifest(token: string): void {
  if (typeof document === 'undefined' || !isPlausibleToken(token)) return
  try {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    if (link) link.href = `/api/manifest?c=${token}`
  } catch { /* si falla, queda el manifiesto general: la app instalada recordará el enlace igualmente */ }
}
