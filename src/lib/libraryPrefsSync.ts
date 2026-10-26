// Sincroniza con Supabase los favoritos y las listas propias de la biblioteca (ver lib/libraryPrefs.ts para la regla de
// qué copia gana). localStorage sigue siendo la copia de trabajo: las pantallas leen y escriben ahí, de forma síncrona,
// y esto solo reconcilia con el servidor al abrir la biblioteca y, tras un cambio, poco después (sin saturar al escribir).
// Sin conexión o ante un error no pasa nada: lo local manda y se reintenta en el siguiente cambio o al volver a abrir.

import { supabase } from './supabase'
import { DEMO_TRAINER_ID } from './demoIds'
import { PREF_FIELDS, mergePrefs, parsePrefKey, prefKey, stampsKey, type PrefStamps, type PrefValues } from './libraryPrefs'

function readLocal(uid: string): { valores: PrefValues; ts: PrefStamps } {
  const valores: PrefValues = {}
  for (const f of PREF_FIELDS) {
    try { const raw = localStorage.getItem(prefKey(f, uid)); if (raw !== null) valores[f] = JSON.parse(raw) } catch { /* valor corrupto: se ignora */ }
  }
  let ts: PrefStamps = {}
  try { ts = JSON.parse(localStorage.getItem(stampsKey(uid)) || '{}') ?? {} } catch { ts = {} }
  return { valores, ts }
}

function writeLocal(uid: string, valores: PrefValues, ts: PrefStamps) {
  try {
    for (const [f, v] of Object.entries(valores)) localStorage.setItem(prefKey(f as (typeof PREF_FIELDS)[number], uid), JSON.stringify(v))
    const all = { ...readLocal(uid).ts, ...ts }
    localStorage.setItem(stampsKey(uid), JSON.stringify(all))
  } catch { /* sin almacenamiento */ }
}

/**
 * Reconcilia este dispositivo con el servidor. Devuelve true si se ha escrito algo NUEVO en este dispositivo (para que
 * la pantalla vuelva a leerlo). Nunca lanza: ante cualquier fallo deja todo como estaba.
 */
export async function syncLibraryPrefs(uid: string): Promise<boolean> {
  if (!uid || uid === DEMO_TRAINER_ID) return false
  try {
    const { data, error } = await supabase.from('exercise_library_prefs').select('valores, ts').eq('trainer_id', uid).maybeSingle()
    if (error) return false
    const local = readLocal(uid)
    const r = mergePrefs(local, data ? { valores: (data.valores ?? {}) as PrefValues, ts: (data.ts ?? {}) as PrefStamps } : null)

    const adoptado = Object.keys(r.adopt).length > 0
    if (adoptado) writeLocal(uid, r.adopt, r.adoptStamps)

    if (r.upload) {
      const { error: upErr } = await supabase.from('exercise_library_prefs')
        .upsert({ trainer_id: uid, valores: r.merged.valores, ts: r.merged.ts, updated_at: Date.now() }, { onConflict: 'trainer_id' })
      if (upErr) return adoptado
      // Lo subido ya es la verdad común: se deja la marca de este dispositivo alineada con la del servidor.
      writeLocal(uid, {}, r.merged.ts)
    }
    return adoptado
  } catch { return false }
}

const pendientes = new Map<string, ReturnType<typeof setTimeout>>()

/** Avisa de que se ha guardado una de las listas: sella su hora y programa la sincronización. Otras claves se ignoran. */
export function notePrefChanged(key: string): void {
  const p = parsePrefKey(key)
  if (!p || p.uid === DEMO_TRAINER_ID) return
  try {
    const ts = readLocal(p.uid).ts
    ts[p.field] = Date.now()
    localStorage.setItem(stampsKey(p.uid), JSON.stringify(ts))
  } catch { /* sin almacenamiento */ }
  const previo = pendientes.get(p.uid)
  if (previo) clearTimeout(previo)
  pendientes.set(p.uid, setTimeout(() => { pendientes.delete(p.uid); void syncLibraryPrefs(p.uid) }, 800))
}
