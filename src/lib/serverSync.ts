import { supabase } from './supabase'
import { logError } from './errors'
import { TrainingLogs } from '../types'

// Sincronización de los entrenos entre el dispositivo del cliente, el servidor y el entrenador.
// Reglas (docs/sincronizacion.md):
//  · La unidad es el registro de un ejercicio (una clave de `logs`): nunca se sobrescribe el
//    objeto entero, solo las claves que cambiaron. Lo que haya escrito otro dispositivo o el
//    entrenador en otras claves se conserva.
//  · Si dos personas cambian la MISMA clave a la vez, gana la última que sube.
//  · Para que la lectura-fusión-escritura no pierda cambios intermedios se usa `updatedAt`
//    como versión: la escritura solo se aplica si nadie ha escrito desde que se leyó, y si no,
//    se vuelve a leer, fusionar y escribir.

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** Claves de `next` que son nuevas o han cambiado respecto a `prev`. */
export function diffKeys(prev: TrainingLogs, next: TrainingLogs): string[] {
  return Object.keys(next).filter(k => !sameJson(prev[k], next[k]))
}

/** El servidor manda en lo que no se tocó; lo tocado aquí (`keys`) manda sobre el servidor. */
export function mergeLogs(server: TrainingLogs, local: TrainingLogs, keys: string[]): TrainingLogs {
  const merged: TrainingLogs = { ...server }
  for (const k of keys) if (k in local) merged[k] = local[k]
  return merged
}

/**
 * Tras subir, la pantalla adopta lo que ya había en el servidor para las claves que no se han
 * tocado desde que empezó la subida (comparación por identidad), sin pisar lo que el cliente
 * haya marcado mientras tanto.
 */
export function adoptRemote(current: TrainingLogs, snapshot: TrainingLogs, merged: TrainingLogs): TrainingLogs {
  let next: TrainingLogs | null = null
  for (const k of Object.keys(merged)) {
    if (current[k] === snapshot[k] && !sameJson(current[k], merged[k])) (next ||= { ...current })[k] = merged[k]
  }
  return next ?? current
}

export interface Versioned<T> { value: T | null; version: number | null; exists: boolean }
type WriteResult = 'ok' | 'conflict' | 'error'

/** Lectura-fusión-escritura con versión: reintenta si alguien escribió entre la lectura y la escritura. */
export async function casUpdate<T>(opts: {
  read: () => Promise<Versioned<T> | null>
  merge: (current: T | null) => T
  write: (merged: T, version: number | null, exists: boolean) => Promise<WriteResult>
  tries?: number
}): Promise<{ ok: true; merged: T } | { ok: false }> {
  for (let i = 0; i < (opts.tries ?? 4); i++) {
    const cur = await opts.read()
    if (!cur) return { ok: false }
    const merged = opts.merge(cur.value)
    const res = await opts.write(merged, cur.version, cur.exists)
    if (res === 'ok') return { ok: true, merged }
    if (res === 'error') return { ok: false }
  }
  return { ok: false }
}

// La versión nueva siempre es mayor que la anterior, aunque dos escrituras caigan en el mismo milisegundo.
const nextVersion = (prev: number | null) => Math.max(Date.now(), (prev ?? 0) + 1)

/** Sube los cambios de `local` (solo las claves `keys`) a `registros`, fusionando con lo que hay en el servidor. */
export async function saveLogsMerged(clientId: string, local: TrainingLogs, keys: string[]): Promise<{ ok: true; merged: TrainingLogs } | { ok: false }> {
  return casUpdate<TrainingLogs>({
    read: async () => {
      const { data, error } = await supabase.from('registros').select('logs, updatedAt').eq('clientId', clientId).maybeSingle()
      if (error) { logError('serverSync:readLogs', error); return null }
      return { value: (data?.logs as TrainingLogs | null) ?? null, version: (data?.updatedAt as number | null) ?? null, exists: !!data }
    },
    merge: server => mergeLogs(server ?? {}, local, keys),
    write: async (merged, version, exists) => {
      if (!exists) {
        const { error } = await supabase.from('registros').insert({ clientId, logs: merged, updatedAt: nextVersion(null) })
        if (!error) return 'ok'
        if (error.code === '23505') return 'conflict' // otro la creó entre medias
        logError('serverSync:insertLogs', error); return 'error'
      }
      let q = supabase.from('registros').update({ logs: merged, updatedAt: nextVersion(version) }).eq('clientId', clientId)
      q = version === null ? q.is('updatedAt', null) : q.eq('updatedAt', version)
      const { data, error } = await q.select('clientId')
      if (error) { logError('serverSync:writeLogs', error); return 'error' }
      return data && data.length > 0 ? 'ok' : 'conflict'
    },
  })
}

/**
 * El cliente solo cambia `diasElegidos` del plan. Se lee el plan actual, se cambia ese campo y se
 * escribe con versión: así no pisa lo que el entrenador haya publicado desde que el cliente abrió la app.
 */
export async function savePlanDiasMerged(clientId: string, dias: number[]): Promise<{ ok: true; plan: unknown } | { ok: false }> {
  const res = await casUpdate<{ P: Record<string, unknown> }>({
    read: async () => {
      const { data, error } = await supabase.from('planes').select('plan, updatedAt').eq('clientId', clientId).maybeSingle()
      if (error || !data?.plan) { if (error) logError('serverSync:readPlan', error); return null }
      return { value: data.plan as { P: Record<string, unknown> }, version: (data.updatedAt as number | null) ?? null, exists: true }
    },
    merge: plan => ({ ...plan!, P: { ...plan!.P, diasElegidos: dias } }),
    write: async (merged, version) => {
      let q = supabase.from('planes').update({ plan: merged, updatedAt: nextVersion(version) }).eq('clientId', clientId)
      q = version === null ? q.is('updatedAt', null) : q.eq('updatedAt', version)
      const { data, error } = await q.select('clientId')
      if (error) { logError('serverSync:writePlan', error); return 'error' }
      return data && data.length > 0 ? 'ok' : 'conflict'
    },
  })
  return res.ok ? { ok: true, plan: res.merged.P } : { ok: false }
}
