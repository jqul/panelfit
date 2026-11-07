import { supabase } from './supabase'
import { logError } from './errors'
import { DEMO_TRAINER_ID } from './demoIds'

// Documentos para el cliente: el entrenador sube archivos (PDF, imágenes, Word...) y elige quién los ve: nadie
// ('oculto'), todos sus clientes o solo los de ciertas etiquetas. El archivo va al bucket privado `documentos`
// (<uid del entrenador>/<id>-<nombre>) y la tabla `documentos` decide quién puede leerlo: el cliente solo recibe por RLS
// los que le tocan, y solo esos se pueden firmar para descargar (migración 20261104000003).
// También vídeos por enlace (YouTube, Vimeo...): sin archivo, con la misma visibilidad (migración 20261107000001).

export type Visibilidad = 'oculto' | 'todos' | 'etiquetas'

export interface Documento {
  id: string; trainer_id: string; titulo: string; descripcion: string
  /** Archivo del bucket; null en un vídeo por enlace. */
  ruta: string | null
  /** Enlace del vídeo (YouTube, Vimeo...); null en un archivo. */
  url?: string | null
  nombre: string; tipo: string; tamano: number
  visibilidad: Visibilidad; etiquetas: string[]; created_at: string
}

export const TAMANO_MAXIMO = 20 * 1024 * 1024
export const TIPOS_ADMITIDOS = [
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]
export const ACEPTA = '.pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.pptx,.txt'

/** Por qué no se puede subir este archivo, o null si se puede. */
export function problemaArchivo(f: { size: number; type: string }): string | null {
  if (!TIPOS_ADMITIDOS.includes(f.type)) return 'Ese tipo de archivo no se admite: sube PDF, imagen, Word, Excel, PowerPoint o texto'
  if (f.size > TAMANO_MAXIMO) return 'El archivo pasa de 20 MB'
  return null
}

/** Nombre seguro para la ruta del bucket: sin acentos, espacios ni símbolos raros. */
export function nombreSeguro(nombre: string): string {
  const limpio = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return (limpio || 'archivo').slice(-80)
}

/** Título por defecto: el nombre del archivo sin la extensión. */
export const tituloDesdeNombre = (nombre: string) => nombre.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 120) || 'Documento'

export function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

/** Quién lo ve, en una frase corta para la lista del entrenador. */
export function quienLoVe(d: Pick<Documento, 'visibilidad' | 'etiquetas'>, etiquetas: { id: string; name: string }[]): string {
  if (d.visibilidad === 'oculto') return 'Oculto: solo tú'
  if (d.visibilidad === 'todos') return 'Todos tus clientes'
  const nombres = d.etiquetas.map(id => etiquetas.find(l => l.id === id)?.name).filter(Boolean)
  return nombres.length ? `Clientes con ${nombres.join(', ')}` : 'Nadie (no has elegido etiquetas)'
}

// En la demo no hay bucket ni filas: los documentos viven en memoria mientras dura la visita.
const DEMO: Documento[] = []
const DEMO_URLS: Record<string, string> = {}
// Una sola siembra aunque se pida dos veces a la vez (todos esperan a la misma)
let semilla: Promise<void> | null = null
const sembrarDemo = () => (semilla ??= (async () => {
  const { demoDocumentosIniciales, DEMO_DOCUMENTO_URL } = await import('./demo-data-extra')
  for (const d of demoDocumentosIniciales()) { DEMO.push(d); if (d.ruta) DEMO_URLS[d.ruta] = DEMO_DOCUMENTO_URL }
})())
// logError es para errores de PostgREST; los de Storage traen solo el mensaje.
const logStorage = (ctx: string, e: { message: string } | null) => { if (e) console.error(`[${ctx}]`, e.message) }
const esDemo = (trainerId: string) => trainerId === DEMO_TRAINER_ID

export async function listarDocumentos(trainerId: string): Promise<Documento[] | null> {
  if (esDemo(trainerId)) { await sembrarDemo(); return [...DEMO] }
  const { data, error } = await supabase.from('documentos').select('*').eq('trainer_id', trainerId).order('created_at', { ascending: false })
  if (error) { logError('documentos:listar', error); return null }
  return (data || []) as Documento[]
}

/** Los que ve el cliente: los filtra la base de datos (RLS) según la visibilidad y sus etiquetas. */
export async function documentosDelCliente(trainerId: string): Promise<Documento[]> {
  const { data, error } = await supabase.from('documentos').select('*').eq('trainer_id', trainerId).neq('visibilidad', 'oculto').order('created_at', { ascending: false })
  if (error) { logError('documentos:cliente', error); return [] }
  return (data || []) as Documento[]
}

export async function subirDocumento(trainerId: string, file: File, datos: Pick<Documento, 'titulo' | 'descripcion' | 'visibilidad' | 'etiquetas'>): Promise<Documento | null> {
  const id = crypto.randomUUID()
  const ruta = `${trainerId}/${id}-${nombreSeguro(file.name)}`
  const doc: Documento = {
    id, trainer_id: trainerId, ...datos, ruta,
    nombre: file.name, tipo: file.type, tamano: file.size, created_at: new Date().toISOString(),
  }
  if (esDemo(trainerId)) { DEMO.unshift(doc); DEMO_URLS[ruta] = URL.createObjectURL(file); return doc }
  const { error: errSubir } = await supabase.storage.from('documentos').upload(ruta, file, { contentType: file.type })
  if (errSubir) { logStorage('documentos:subir', errSubir); return null }
  const { error } = await supabase.from('documentos').insert({ ...doc, created_at: undefined })
  if (error) {
    logError('documentos:guardar', error)
    await supabase.storage.from('documentos').remove([ruta])
    return null
  }
  return doc
}

// ── Vídeos por enlace ──

export const esVideo = (d: Pick<Documento, 'url'>) => !!d.url

/** El enlace limpio si vale (https, sin espacios, como mucho 500 caracteres), o null. */
export function limpiarVideo(raw?: string | null): string | null {
  const s = (raw || '').trim()
  if (!s || s.length > 500 || /\s/.test(s)) return null
  try { const u = new URL(s); return u.protocol === 'https:' && u.hostname.includes('.') ? s : null } catch { return null }
}

/** "YouTube", "Vimeo" o "Vídeo". */
export function plataformaVideo(url: string): string {
  const h = (() => { try { return new URL(url).hostname } catch { return '' } })()
  if (h.includes('youtube.') || h === 'youtu.be') return 'YouTube'
  if (h.includes('vimeo.')) return 'Vimeo'
  return 'Vídeo'
}

/** Miniatura de un vídeo de YouTube (los demás no la dan sin pedirla a su servidor). */
export function miniaturaVideo(url: string): string | null {
  const id = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/)?.[1]
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null
}

export async function anadirVideo(trainerId: string, url: string, datos: Pick<Documento, 'titulo' | 'descripcion' | 'visibilidad' | 'etiquetas'>): Promise<Documento | null> {
  const enlace = limpiarVideo(url)
  if (!enlace) return null
  const doc: Documento = {
    id: crypto.randomUUID(), trainer_id: trainerId, ...datos, ruta: null, url: enlace,
    nombre: datos.titulo, tipo: 'video', tamano: 0, created_at: new Date().toISOString(),
  }
  if (esDemo(trainerId)) { DEMO.unshift(doc); return doc }
  const { error } = await supabase.from('documentos').insert({ ...doc, created_at: undefined })
  if (error) { logError('documentos:video', error); return null }
  return doc
}

export async function cambiarVisibilidad(trainerId: string, id: string, visibilidad: Visibilidad, etiquetas: string[]): Promise<boolean> {
  if (esDemo(trainerId)) { const d = DEMO.find(x => x.id === id); if (d) Object.assign(d, { visibilidad, etiquetas }); return true }
  const { error } = await supabase.from('documentos').update({ visibilidad, etiquetas }).eq('id', id)
  if (error) { logError('documentos:visibilidad', error); return false }
  return true
}

export async function borrarDocumento(trainerId: string, d: Pick<Documento, 'id' | 'ruta'>): Promise<boolean> {
  if (esDemo(trainerId)) { const i = DEMO.findIndex(x => x.id === d.id); if (i >= 0) DEMO.splice(i, 1); return true }
  const { error } = await supabase.from('documentos').delete().eq('id', d.id)
  if (error) { logError('documentos:borrar', error); return false }
  if (!d.ruta) return true // un vídeo por enlace no tiene archivo
  const { error: errArchivo } = await supabase.storage.from('documentos').remove([d.ruta])
  if (errArchivo) logStorage('documentos:borrarArchivo', errArchivo) // la fila ya no está: nadie más puede descargarlo
  return true
}

/** Lo que se abre al pulsarlo: el enlace del vídeo, o el archivo con una URL firmada. */
export async function enlaceDe(d: Pick<Documento, 'ruta' | 'url'>): Promise<string | null> {
  if (d.url) return d.url
  return d.ruta ? urlDocumento(d.ruta) : null
}

/** URL firmada para abrir el archivo (una hora). */
export async function urlDocumento(ruta: string): Promise<string | null> {
  if (DEMO_URLS[ruta]) return DEMO_URLS[ruta]
  const { data, error } = await supabase.storage.from('documentos').createSignedUrl(ruta, 3600)
  if (error || !data?.signedUrl) { logStorage('documentos:url', error); return null }
  return data.signedUrl
}
