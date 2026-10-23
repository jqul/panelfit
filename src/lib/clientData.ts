import { supabase } from './supabase'
import { getSignedUrl } from './signedMedia'

// Exportación (art. 15 y 20) y borrado completo (art. 17) de los datos de un cliente.
// La parte de base de datos vive en las funciones export_client_data y
// delete_client_data (supabase/hardening/20261023_rgpd.sql); los ficheros de Storage
// se leen y se borran desde aquí porque Supabase no deja borrarlos por SQL.

export interface FileRef { bucket: string; path: string }

const VALID_DAYS = 7
const strings = (...v: unknown[]) => v.filter((x): x is string => typeof x === 'string' && x.length > 0)

// Ficheros que cuelgan de los datos exportados (el JSON solo trae rutas).
export function collectFileRefs(data: Record<string, any>): FileRef[] {
  const refs: FileRef[] = []
  const add = (bucket: string, values: string[]) => values.forEach(path => refs.push({ bucket, path }))
  for (const r of data.foto_sessions ?? []) add('media', strings(r.front_url, r.side_url, r.back_url))
  for (const r of data.progress_photos ?? []) add('media', strings(r.frontUrl, r.sideUrl, r.backUrl))
  for (const r of data.fotos ?? []) add('media', strings(r.url_frente, r.url_lateral, r.url_espalda))
  for (const r of data.video_feedback ?? []) add('client-videos', strings(r.video_url, r.trainer_comment_video_url))
  for (const reg of data.registros ?? []) {
    for (const log of Object.values<any>(reg?.logs ?? {})) add('exercise-videos', strings(log?.videoEjecucion))
  }
  return refs
}

export async function fetchClientExport(clientId: string): Promise<{ data?: Record<string, any>; error?: string }> {
  const { data, error } = await supabase.rpc('export_client_data', { p_client_id: clientId })
  if (error || !data) return { error: error?.message || 'No se pudieron obtener los datos' }
  const archivos: { bucket: string; ruta: string; enlace: string | null }[] = []
  for (const ref of collectFileRefs(data)) {
    archivos.push({ bucket: ref.bucket, ruta: ref.path, enlace: await getSignedUrl(ref.bucket, ref.path, VALID_DAYS * 86400) })
  }
  return { data: { ...data, archivos, nota_archivos: `Los enlaces de "archivos" (fotos y vídeos) son privados y caducan a los ${VALID_DAYS} días: descárgalos antes.` } }
}

export function downloadJson(filename: string, obj: unknown) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ── Borrado ──
type StorageLike = {
  from(bucket: string): {
    list(path: string, opts: { limit: number; offset: number }): Promise<{ data: { name: string; id: string | null }[] | null; error: { message: string } | null }>
    remove(paths: string[]): Promise<{ error: { message: string } | null }>
  }
}

const PAGE = 1000
async function listAll(storage: StorageLike, bucket: string, prefix: string): Promise<string[]> {
  const out: string[] = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await storage.from(bucket).list(prefix, { limit: PAGE, offset })
    if (error) throw new Error(error.message)
    for (const e of data ?? []) {
      // Las carpetas vienen sin id: se recorren; lo demás son ficheros.
      if (e.id === null) out.push(...await listAll(storage, bucket, `${prefix}/${e.name}`))
      else out.push(`${prefix}/${e.name}`)
    }
    if ((data?.length ?? 0) < PAGE) return out
  }
}

// Dónde guarda la app los ficheros de un cliente (ver los upload de cada bucket).
export const clientFilePrefixes = (clientId: string): FileRef[] => [
  { bucket: 'media', path: `fotos/${clientId}` },
  { bucket: 'client-videos', path: clientId },
  { bucket: 'exercise-videos', path: clientId },
]

export async function eraseClientFiles(storage: StorageLike, clientId: string): Promise<number> {
  let total = 0
  for (const { bucket, path } of clientFilePrefixes(clientId)) {
    const files = await listAll(storage, bucket, path)
    for (let i = 0; i < files.length; i += 100) {
      const { error } = await storage.from(bucket).remove(files.slice(i, i + 100))
      if (error) throw new Error(error.message)
    }
    total += files.length
  }
  return total
}

// Borra primero los ficheros y, si todo fue bien, los datos y la cuenta del cliente.
export async function eraseClient(clientId: string): Promise<{ ok: true; archivos: number; filas: Record<string, number> } | { ok: false; error: string }> {
  let archivos = 0
  try { archivos = await eraseClientFiles(supabase.storage as unknown as StorageLike, clientId) }
  catch (e) { return { ok: false, error: `No se pudieron borrar los ficheros: ${(e as Error).message}. No se ha borrado nada más.` } }
  const { data, error } = await supabase.rpc('delete_client_data', { p_client_id: clientId })
  if (error) return { ok: false, error: `Se borraron ${archivos} ficheros pero fallaron los datos: ${error.message}. Vuelve a intentarlo.` }
  return { ok: true, archivos, filas: data as Record<string, number> }
}
