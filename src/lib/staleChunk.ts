// Tras un despliegue, una pestaña que lleva abierta desde antes pide archivos
// con hash que ya no existen (el servidor devuelve index.html en su lugar) y la
// app se queda en blanco o con "Algo ha ido mal". Recargar trae la versión nueva.

const KEY = 'pf_stale_reload_at'
// Si ya se recargó hace menos de esto, no se vuelve a hacer: el archivo falta de
// verdad (o no hay red) y recargar en bucle sería peor que mostrar el error.
const MIN_GAP_MS = 30_000

const STALE_RE = /dynamically imported module|importing a module script failed|loading chunk|loading css chunk|failed to fetch dynamically|error loading dynamically/i

export function isStaleChunkError(error: unknown): boolean {
  const msg = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '')
  return STALE_RE.test(msg)
}

type Store = Pick<Storage, 'getItem' | 'setItem'>

export function reloadOnceForNewVersion(
  now = Date.now(),
  store: Store | null = safeSession(),
  reload: () => void = () => window.location.reload(),
): boolean {
  try {
    const last = Number(store?.getItem(KEY) || 0)
    if (last && now - last < MIN_GAP_MS) return false
    store?.setItem(KEY, String(now))
  } catch {
    // sin sessionStorage no podemos frenar el bucle: mejor no recargar
    return false
  }
  reload()
  return true
}

function safeSession(): Store | null {
  try { return window.sessionStorage } catch { return null }
}
