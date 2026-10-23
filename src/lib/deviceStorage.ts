// Copia local de datos de salud del cliente (modo sin conexión) con tres garantías:
//  · caduca: lo cacheado se ignora y se borra pasados 30 días;
//  · se borra al cerrar sesión (sin perder entrenos pendientes de subir);
//  · el cliente puede desactivarla ("no guardar datos en este dispositivo").
// Las preferencias de interfaz (modo oscuro, etc.) no se tocan.

const PREF_KEY = 'pf_device_cache' // '0' = el usuario no quiere guardar datos en este dispositivo
export const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000

const keys = {
  client: (token: string) => `pf_client_cache_${token}`,
  plan: (clientId: string) => `pf_plan_cache_${clientId}`,
  logs: (clientId: string) => `pf_logs_${clientId}`,
  pending: (clientId: string) => `pf_logs_pending_${clientId}`,
}

interface Wrapped<T> { t: number; v: T }

function isWrapped(x: unknown): x is Wrapped<unknown> {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false
  const k = Object.keys(x as object)
  return k.length === 2 && typeof (x as Wrapped<unknown>).t === 'number' && 'v' in (x as object)
}

export function isDeviceCacheEnabled(): boolean {
  try { return localStorage.getItem(PREF_KEY) !== '0' } catch { return true }
}

export function setDeviceCacheEnabled(on: boolean): void {
  try { if (on) localStorage.removeItem(PREF_KEY); else localStorage.setItem(PREF_KEY, '0') } catch {}
}

/** Guarda `value` con marca de tiempo; no hace nada si el cliente desactivó la copia local. */
export function cacheSet(key: string, value: unknown): boolean {
  if (!isDeviceCacheEnabled()) return false
  try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value } satisfies Wrapped<unknown>)); return true }
  catch { return false }
}

/**
 * Lee un valor cacheado. Devuelve null si no existe, está corrupto o ha caducado
 * (en ese caso lo borra). Acepta también el formato antiguo, sin marca de tiempo:
 * se devuelve tal cual y se rescribirá con marca en la próxima escritura.
 * `ignoreTtl` es para datos que aún no se han subido al servidor: no deben caducar.
 */
export function cacheGet<T>(key: string, opts: { ignoreTtl?: boolean } = {}): T | null {
  let raw: string | null = null
  try { raw = localStorage.getItem(key) } catch { return null }
  if (!raw) return null
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return null }
  if (!isWrapped(parsed)) return parsed as T
  if (!opts.ignoreTtl && Date.now() - parsed.t > CACHE_TTL_MS) {
    try { localStorage.removeItem(key) } catch {}
    return null
  }
  return parsed.v as T
}

export const hasPendingLogs = (clientId: string): boolean => {
  try { return !!localStorage.getItem(keys.pending(clientId)) } catch { return false }
}

// Qué ejercicios (claves de los entrenos) cambiaron en este dispositivo y aún no están en el
// servidor. Solo esas claves se suben (lib/serverSync.ts): así no se pisa lo que haya escrito
// otro dispositivo o el entrenador. El formato antiguo guardaba solo "1": se desconoce qué
// cambió y se trata como "todo".
export type PendingKeys = string[] | 'all'

export function getPendingKeys(clientId: string): PendingKeys | null {
  let raw: string | null = null
  try { raw = localStorage.getItem(keys.pending(clientId)) } catch { return null }
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((k): k is string => typeof k === 'string')
  } catch {}
  return 'all'
}

export function addPendingKeys(clientId: string, add: string[]): void {
  const cur = getPendingKeys(clientId)
  if (cur === 'all') return
  const next = [...new Set([...(cur ?? []), ...add])]
  if (next.length === 0) return
  try { localStorage.setItem(keys.pending(clientId), JSON.stringify(next)) } catch {}
}

/** Quita lo ya subido (`synced`); lo que se haya añadido mientras tanto sigue pendiente. */
export function clearPendingKeys(clientId: string, synced?: string[]): void {
  const cur = getPendingKeys(clientId)
  if (cur === null) return
  try {
    if (cur === 'all' || !synced) { localStorage.removeItem(keys.pending(clientId)); return }
    const rest = cur.filter(k => !synced.includes(k))
    if (rest.length) localStorage.setItem(keys.pending(clientId), JSON.stringify(rest))
    else localStorage.removeItem(keys.pending(clientId))
  } catch {}
}

/**
 * Borra de este dispositivo lo guardado de un cliente: ficha, plan y entrenos.
 * Con `keepPending` conserva los entrenos que aún no se han subido (los borraría
 * para siempre); sin él, se borra todo.
 */
export function clearClientDeviceData(clientId: string, token: string | undefined, opts: { keepPending?: boolean } = {}): void {
  const keepLogs = !!opts.keepPending && hasPendingLogs(clientId)
  const toRemove = [keys.plan(clientId)]
  if (token) toRemove.push(keys.client(token))
  if (!keepLogs) toRemove.push(keys.logs(clientId), keys.pending(clientId))
  for (const k of toRemove) { try { localStorage.removeItem(k) } catch {} }
}

/** Elimina las copias de ficha y plan que hayan caducado (de cualquier cliente). */
export function sweepExpiredCaches(): void {
  try {
    const now = Date.now()
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (!k || !(k.startsWith('pf_client_cache_') || k.startsWith('pf_plan_cache_'))) continue
      try {
        const parsed = JSON.parse(localStorage.getItem(k) || 'null')
        if (isWrapped(parsed) && now - parsed.t > CACHE_TTL_MS) localStorage.removeItem(k)
      } catch { localStorage.removeItem(k) }
    }
  } catch {}
}

/** Al cerrar sesión el entrenador: la nota rápida es texto libre y puede hablar de clientes. */
export function clearTrainerDeviceData(): void {
  try { localStorage.removeItem('pf_quick_note') } catch {}
}

export const deviceKeys = keys
