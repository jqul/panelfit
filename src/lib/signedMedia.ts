import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// exercise-videos, client-videos y media pasaron de públicos a privados
// (contenido de salud: vídeos de técnica y fotos de progreso) — antes se
// guardaba la URL pública entera y quedaba accesible para siempre sin
// autenticación con solo conocerla; ahora cada vista pide una URL firmada
// de corta duración.
//
// Lo que ya había guardado en la base de datos es la URL pública antigua
// (https://.../storage/v1/object/public/<bucket>/<path>), así que hay que
// poder sacarle el path tanto de eso como de lo nuevo (que guarda solo el
// path) sin romper lo que ya existe.
function extractStoragePath(bucket: string, stored: string): string {
  const marker = `/object/public/${bucket}/`
  const i = stored.indexOf(marker)
  return i >= 0 ? stored.slice(i + marker.length) : stored
}

const cache = new Map<string, { url: string; expires: number }>()

export async function getSignedUrl(bucket: string, pathOrUrl: string | null | undefined, expiresIn = 3600): Promise<string | null> {
  if (!pathOrUrl) return null
  const path = extractStoragePath(bucket, pathOrUrl)
  // Si no se encontró el marcador del bucket y ya es una URL absoluta, es un
  // vídeo externo (p.ej. los de ejemplo del modo demo) — no vive en nuestro
  // Storage y no se puede firmar, así que se muestra tal cual.
  if (path === pathOrUrl && /^https?:\/\//.test(path)) return path
  const key = `${bucket}/${path}`
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now() + 10_000) return cached.url
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error || !data) return null
  cache.set(key, { url: data.signedUrl, expires: Date.now() + expiresIn * 1000 })
  return data.signedUrl
}

/** Resuelve una URL firmada para mostrar un vídeo/foto — null mientras carga o si no hay nada que mostrar. */
export function useSignedUrl(bucket: string, pathOrUrl: string | null | undefined, expiresIn = 3600): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    setUrl(null)
    if (!pathOrUrl) return
    getSignedUrl(bucket, pathOrUrl, expiresIn).then(u => { if (active) setUrl(u) })
    return () => { active = false }
  }, [bucket, pathOrUrl, expiresIn])
  return url
}
