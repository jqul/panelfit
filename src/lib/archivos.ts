// Archivos que el cliente sube como respuesta a una pregunta de un cuestionario (tipo `archivos`): su rutina actual, programas anteriores, un Excel…
// Todo puro (sin React ni red). Las llamadas a Supabase están en archivosCliente.ts y el diseño completo en docs/archivos-cuestionarios.md.
//
// Los formatos, los límites y la tabla extensión → tipo están repetidos a propósito en tres sitios (aquí, en supabase/functions/archivos-cliente/validar.ts y en la migración
// 20261125000010) porque cada uno corre en un entorno distinto; archivos.test.ts comprueba que dicen lo mismo.

/** El depósito privado de Storage donde viven. */
export const BUCKET_ARCHIVOS = 'cuestionario-archivos'

/** Como mucho, por pregunta. */
export const MAX_ARCHIVOS = 5
/** Como mucho, cada archivo: 20 MB. */
export const MAX_BYTES = 20 * 1024 * 1024
/** Como mucho, sin enviar todavía y entre todas las preguntas de un cliente (freno a quien sube sin parar). */
export const MAX_PENDIENTES_CLIENTE = 25
/** Longitud máxima del nombre que se guarda y se enseña. */
export const MAX_NOMBRE = 120

export interface Formato { ext: string; mime: string; nombre: string }

/** Lo que se admite. La extensión es lo que escribe el cliente; el tipo, lo que se envía a Storage (el depósito solo deja pasar estos). */
export const FORMATOS: Formato[] = [
  { ext: 'pdf',  mime: 'application/pdf', nombre: 'PDF' },
  { ext: 'jpg',  mime: 'image/jpeg', nombre: 'imagen JPG' },
  { ext: 'jpeg', mime: 'image/jpeg', nombre: 'imagen JPG' },
  { ext: 'png',  mime: 'image/png', nombre: 'imagen PNG' },
  { ext: 'webp', mime: 'image/webp', nombre: 'imagen WEBP' },
  { ext: 'heic', mime: 'image/heic', nombre: 'foto HEIC' },
  { ext: 'heif', mime: 'image/heif', nombre: 'foto HEIC' },
  { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', nombre: 'Excel (.xlsx)' },
  { ext: 'csv',  mime: 'text/csv', nombre: 'CSV' },
  { ext: 'txt',  mime: 'text/plain', nombre: 'texto' },
]

/** Los tipos que admite el depósito (sin repetir). */
export const TIPOS_ADMITIDOS = [...new Set(FORMATOS.map(f => f.mime))]

/** Para el `accept` del selector de archivos. */
export const ACEPTA = FORMATOS.map(f => `.${f.ext}`).join(',')

/** Frase para decir qué se puede subir. */
export const FORMATOS_LEGIBLES = 'PDF, imagen (JPG, PNG, WEBP, HEIC), Excel (.xlsx), CSV o texto'

/** Extensión en minúsculas, sin el punto ('' si no hay). */
export function extensionDe(nombre: string): string {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(nombre.trim())
  return m ? m[1].toLowerCase() : ''
}

/** El tipo con el que se sube un archivo con esa extensión, o null si no se admite. */
export const mimeDe = (ext: string): string | null => FORMATOS.find(f => f.ext === ext.toLowerCase())?.mime ?? null

/**
 * El nombre tal como se guarda y se enseña: sin rutas, sin caracteres de control ni marcas de dirección de texto, sin espacios sobrantes y de 120 caracteres como mucho
 * (conservando la extensión). Nunca se usa para la ruta del depósito; solo para mostrarlo.
 */
export function nombreVisible(nombre: string): string {
  // eslint-disable-next-line no-control-regex
  const limpio = nombre.normalize('NFC').split(/[\\/]/).pop()!.replace(/[\u0000-\u001f\u007f‎‏‪-‮⁦-⁩]+/g, '').replace(/\s+/g, ' ').trim()
  if (!limpio) return 'archivo'
  if (limpio.length <= MAX_NOMBRE) return limpio
  const ext = extensionDe(limpio)
  const cola = ext ? `.${ext}` : ''
  return limpio.slice(0, MAX_NOMBRE - cola.length - 1).trimEnd() + '…' + cola
}

/** Por qué no se puede subir este archivo (con el texto para el cliente), o null si se puede. Es solo un primer filtro en el móvil: el servidor lo vuelve a comprobar. */
export function problemaArchivo(f: { name: string; size: number }): string | null {
  const ext = extensionDe(f.name)
  if (!ext || !mimeDe(ext)) return `Ese tipo de archivo no se admite. Sube ${FORMATOS_LEGIBLES}`
  if (f.size <= 0) return 'El archivo está vacío'
  if (f.size > MAX_BYTES) return 'El archivo pasa de 20 MB'
  return null
}

/** Un archivo ya subido, tal como va en la respuesta y lo reescribe el servidor. */
export interface ArchivoRef { id: string; nombre: string; tamano: number; tipo: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const esUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)

export function esArchivoRef(v: unknown): v is ArchivoRef {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return esUuid(o.id) && typeof o.nombre === 'string' && typeof o.tamano === 'number' && typeof o.tipo === 'string'
}

/** Los archivos de una respuesta (ignora lo que no tenga la forma esperada, por si llega algo raro de una versión antigua o de un borrador). */
export const archivosDe = (v: unknown): ArchivoRef[] => (Array.isArray(v) ? v.filter(esArchivoRef) : [])

/** Cuántos más se pueden añadir. */
export const quedan = (actuales: number): number => Math.max(0, MAX_ARCHIVOS - actuales)

export function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

/** Mensaje claro para un fallo de la reserva en el servidor (los códigos los pone la función archivo_reservar). */
export function mensajeReserva(codigo: string | undefined): string {
  switch (codigo) {
    case 'formato': return `Ese tipo de archivo no se admite. Sube ${FORMATOS_LEGIBLES}`
    case 'tamano': return 'El archivo pasa de 20 MB o está vacío'
    case 'limite_pregunta': return `Ya has subido ${MAX_ARCHIVOS} archivos en esta pregunta. Quita alguno para añadir otro`
    case 'limite_cliente': return 'Tienes demasiados archivos sin enviar. Envía el cuestionario o quita alguno'
    case 'archivado': return 'Tu ficha está archivada: no se pueden subir archivos'
    default: return 'No se pudo preparar la subida. Inténtalo de nuevo'
  }
}
