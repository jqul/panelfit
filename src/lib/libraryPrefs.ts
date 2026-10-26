// Preferencias de la biblioteca de ejercicios que antes vivían solo en el navegador (favoritos y las listas propias de
// grupos musculares, especialidades y etiquetas) y ahora se sincronizan entre dispositivos (tabla
// exercise_library_prefs). Aquí está la parte pura: qué clave guarda qué y, sobre todo, CUÁL de las dos copias gana.
//
// Regla: cada lista tiene su propia marca de tiempo (ms de su última modificación) y gana la más reciente, lista a
// lista. Así, favoritos editados en el móvil y etiquetas editadas en el ordenador no se pisan entre sí.

export const PREF_FIELDS = ['fav', 'cats', 'esps', 'tags'] as const
export type PrefField = typeof PREF_FIELDS[number]

const PREFIX: Record<PrefField, string> = { fav: 'pf_fav_', cats: 'pf_cats_', esps: 'pf_esps_', tags: 'pf_tags_' }
export const prefKey = (field: PrefField, uid: string) => PREFIX[field] + uid
export const stampsKey = (uid: string) => `pf_prefs_ts_${uid}`

/** "pf_cats_<uid>" → { field: 'cats', uid }. Cualquier otra clave → null. */
export function parsePrefKey(key: string): { field: PrefField; uid: string } | null {
  for (const field of PREF_FIELDS) {
    if (key.startsWith(PREFIX[field]) && key.length > PREFIX[field].length) return { field, uid: key.slice(PREFIX[field].length) }
  }
  return null
}

export type PrefValues = Partial<Record<PrefField, unknown>>
export type PrefStamps = Partial<Record<PrefField, number>>
export interface PrefsSide { valores: PrefValues; ts: PrefStamps }

const isStr = (x: unknown): x is string => typeof x === 'string'
const isObjWith = (x: unknown, ...keys: string[]) => !!x && typeof x === 'object' && keys.every(k => isStr((x as Record<string, unknown>)[k]))

/** Valida lo que llega del servidor (o de otro dispositivo): una lista con la forma esperada, o undefined. */
export function sanitizePref(field: PrefField, value: unknown): unknown {
  if (!Array.isArray(value)) return undefined
  if (value.length > 500) return undefined
  if (field === 'fav' || field === 'cats') return value.every(isStr) ? value : undefined
  if (field === 'esps') return value.every(v => isObjWith(v, 'id', 'label')) ? value : undefined
  return value.every(v => isObjWith(v, 'id', 'label')) ? value : undefined // tags
}

const stamp = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0)

export interface MergeResult {
  /** Listas que hay que escribir en ESTE dispositivo (vienen del servidor y son más recientes). */
  adopt: PrefValues
  adoptStamps: PrefStamps
  /** ¿Hay algo en este dispositivo más reciente o desconocido para el servidor? Entonces hay que subir `merged`. */
  upload: boolean
  /** Lo que debe quedar en el servidor: lo mejor de ambos lados, lista a lista. */
  merged: PrefsSide
}

export function mergePrefs(local: PrefsSide, server: PrefsSide | null): MergeResult {
  const adopt: PrefValues = {}, adoptStamps: PrefStamps = {}
  const merged: PrefsSide = { valores: {}, ts: {} }
  let upload = false
  for (const f of PREF_FIELDS) {
    const lv = local.valores[f] !== undefined ? sanitizePref(f, local.valores[f]) : undefined
    const lt = lv === undefined ? 0 : stamp(local.ts[f]) || 1 // un valor local sin marca (anterior a esta función) cuenta como el más antiguo posible
    const sv = server ? sanitizePref(f, server.valores[f]) : undefined
    const st = sv === undefined ? 0 : stamp(server?.ts[f]) || 1

    if (sv !== undefined && st > lt) { adopt[f] = sv; adoptStamps[f] = st; merged.valores[f] = sv; merged.ts[f] = st; continue }
    if (lv !== undefined && (lt > st || sv === undefined)) { merged.valores[f] = lv; merged.ts[f] = lt; upload = true; continue }
    if (sv !== undefined) { merged.valores[f] = sv; merged.ts[f] = st } // empate: ya coinciden
  }
  return { adopt, adoptStamps, upload, merged }
}
