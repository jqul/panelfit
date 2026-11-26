// Validación en el SERVIDOR de un archivo subido por un cliente a un cuestionario (docs/archivos-cuestionarios.md). Pura y sin dependencias: corre en la función de borde
// (Deno) y en las pruebas (vitest, src/lib/archivosValidar.test.ts).
//
// No basta el tipo que declara el navegador: se miran los primeros bytes (la «firma») y la estructura, y se comprueba que dicen lo mismo que la extensión. No es un antivirus:
// descarta lo que no es lo que dice ser y lo que lleva macros, scripts o adjuntos ejecutables CONOCIDOS; lo que se esconda en objetos comprimidos no se ve. Los archivos se
// descargan como adjunto y nunca se abren dentro de la app.

export const MAX_BYTES = 20 * 1024 * 1024

/** extensión → { grupo de contenido, tipo con el que se guarda }. Es la misma tabla que src/lib/archivos.ts y la migración (lo comprueba una prueba). */
export const FORMATOS: Record<string, { grupo: Grupo; mime: string }> = {
  pdf:  { grupo: 'pdf',   mime: 'application/pdf' },
  jpg:  { grupo: 'jpeg',  mime: 'image/jpeg' },
  jpeg: { grupo: 'jpeg',  mime: 'image/jpeg' },
  png:  { grupo: 'png',   mime: 'image/png' },
  webp: { grupo: 'webp',  mime: 'image/webp' },
  heic: { grupo: 'heic',  mime: 'image/heic' },
  heif: { grupo: 'heic',  mime: 'image/heif' },
  xlsx: { grupo: 'xlsx',  mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  csv:  { grupo: 'texto', mime: 'text/csv' },
  txt:  { grupo: 'texto', mime: 'text/plain' },
}
export type Grupo = 'pdf' | 'jpeg' | 'png' | 'webp' | 'heic' | 'xlsx' | 'texto'

export type Resultado = { ok: true; mime: string } | { ok: false; codigo: 'formato' | 'vacio' | 'tamano' | 'contenido' | 'activo' | 'corrupto'; motivo: string }
const no = (codigo: Extract<Resultado, { ok: false }>['codigo'], motivo: string): Resultado => ({ ok: false, codigo, motivo })

export const extensionDe = (nombre: string): string => /\.([A-Za-z0-9]{1,8})$/.exec(nombre.trim())?.[1].toLowerCase() ?? ''

const empieza = (b: Uint8Array, firma: number[], desde = 0) => b.length >= desde + firma.length && firma.every((x, i) => b[desde + i] === x)
const ascii = (b: Uint8Array, desde: number, hasta: number) => { let s = ''; for (let i = desde; i < Math.min(hasta, b.length); i++) s += String.fromCharCode(b[i]); return s }
const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8)
const u32 = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0

// ── PDF ──
// Un PDF «normal» no lleva scripts ni adjuntos ni lanzadores. Se buscan sus claves en los bytes (latin1): si van dentro de un flujo comprimido no se ven.
const PDF_ACTIVO = /\/(Launch|EmbeddedFile|JavaScript|JS)(?![A-Za-z0-9])/

function validarPdf(b: Uint8Array): Resultado {
  if (!ascii(b, 0, 1024).includes('%PDF-')) return no('contenido', 'El archivo no es realmente un PDF')
  if (!ascii(b, Math.max(0, b.length - 2048), b.length).includes('%%EOF')) return no('corrupto', 'El PDF está incompleto o dañado')
  if (PDF_ACTIVO.test(ascii(b, 0, b.length))) return no('activo', 'Este PDF lleva scripts o archivos adjuntos. Expórtalo de nuevo como PDF normal o sube una captura')
  return { ok: true, mime: 'application/pdf' }
}

// ── Imágenes ──
const validarJpeg = (b: Uint8Array): Resultado => empieza(b, [0xff, 0xd8, 0xff]) ? { ok: true, mime: 'image/jpeg' } : no('contenido', 'El archivo no es realmente una imagen JPG')

function validarPng(b: Uint8Array): Resultado {
  if (!empieza(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return no('contenido', 'El archivo no es realmente una imagen PNG')
  if (!ascii(b, Math.max(0, b.length - 12), b.length).includes('IEND')) return no('corrupto', 'La imagen PNG está incompleta o dañada')
  return { ok: true, mime: 'image/png' }
}

function validarWebp(b: Uint8Array): Resultado {
  if (b.length < 12 || ascii(b, 0, 4) !== 'RIFF' || ascii(b, 8, 12) !== 'WEBP') return no('contenido', 'El archivo no es realmente una imagen WEBP')
  if (u32(b, 4) + 8 > b.length) return no('corrupto', 'La imagen WEBP está incompleta o dañada')
  return { ok: true, mime: 'image/webp' }
}

// HEIC/HEIF: una caja `ftyp` con una marca de HEIF. Solo se valida la cabecera (no hay decodificador): se descarga, no se previsualiza.
const MARCAS_HEIF = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1'])
function validarHeic(b: Uint8Array, mime: string): Resultado {
  if (b.length < 16 || ascii(b, 4, 8) !== 'ftyp') return no('contenido', 'El archivo no es realmente una foto HEIC')
  const tam = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0
  if (tam < 16 || tam > Math.min(b.length, 4096)) return no('corrupto', 'La foto HEIC está incompleta o dañada')
  const marcas = [ascii(b, 8, 12)]
  for (let o = 16; o + 4 <= tam; o += 4) marcas.push(ascii(b, o, o + 4))
  return marcas.some(m => MARCAS_HEIF.has(m)) ? { ok: true, mime } : no('contenido', 'El archivo no es realmente una foto HEIC')
}

// ── Excel (.xlsx = zip) ──
// Se lee solo el directorio central del zip (los nombres y los tamaños declarados), sin descomprimir nada: así no hay bomba de compresión posible.
const MAX_ENTRADAS = 2000
const MAX_DESCOMPRIMIDO = 500 * 1024 * 1024
// Macros (VBA, XLM), controles ActiveX, objetos incrustados (OLE), conexiones a datos, cintas personalizadas y cualquier ejecutable o script dentro del zip
const XLSX_PROHIBIDO = /(^|\/)(vbaproject[^/]*|vbadata\.xml|connections\.xml)$|(^|\/)(macrosheets|activex|embeddings|customui|ctrlprops)\/|\.(exe|dll|bat|cmd|com|scr|msi|js|jse|vbs|vbe|wsf|ps1|jar|lnk|hta|class|sh|so|dylib)$/i

function validarXlsx(b: Uint8Array): Resultado {
  if (!empieza(b, [0x50, 0x4b, 0x03, 0x04])) return no('contenido', 'El archivo no es realmente un Excel (.xlsx)')
  // Fin del directorio central: firma PK\x05\x06 en los últimos 65 557 bytes
  let eocd = -1
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 65535); i--) if (b[i] === 0x50 && b[i + 1] === 0x4b && b[i + 2] === 0x05 && b[i + 3] === 0x06) { eocd = i; break }
  if (eocd < 0) return no('corrupto', 'El Excel está incompleto o dañado')
  const total = u16(b, eocd + 10), tamCd = u32(b, eocd + 12), posCd = u32(b, eocd + 16)
  if (total === 0xffff || tamCd === 0xffffffff || posCd === 0xffffffff) return no('contenido', 'El archivo no es realmente un Excel (.xlsx)') // zip64: no es un xlsx normal
  if (total === 0 || total > MAX_ENTRADAS) return no('contenido', 'El archivo no es realmente un Excel (.xlsx)')
  if (posCd + tamCd > b.length) return no('corrupto', 'El Excel está incompleto o dañado')

  const nombres: string[] = []
  let o = posCd, descomprimido = 0
  for (let n = 0; n < total; n++) {
    if (o + 46 > posCd + tamCd || u32(b, o) !== 0x02014b50) return no('corrupto', 'El Excel está incompleto o dañado')
    const flags = u16(b, o + 8), sinComprimir = u32(b, o + 24), lNombre = u16(b, o + 28), lExtra = u16(b, o + 30), lComentario = u16(b, o + 32)
    if (o + 46 + lNombre > b.length) return no('corrupto', 'El Excel está incompleto o dañado')
    // Bit 11 = nombre en UTF-8; si no, se lee como latin1 (basta para reconocer nombres de ruta)
    const bruto = b.subarray(o + 46, o + 46 + lNombre)
    nombres.push(flags & 0x800 ? new TextDecoder('utf-8').decode(bruto) : ascii(bruto, 0, bruto.length))
    descomprimido += sinComprimir
    o += 46 + lNombre + lExtra + lComentario
  }
  if (descomprimido > MAX_DESCOMPRIMIDO) return no('contenido', 'El Excel es demasiado grande una vez abierto')
  if (nombres.some(n => n.includes('..') || n.startsWith('/') || n.includes('\\'))) return no('contenido', 'El archivo no es realmente un Excel (.xlsx)')
  if (!nombres.includes('[Content_Types].xml') || !nombres.includes('xl/workbook.xml')) return no('contenido', 'El archivo no es realmente un Excel (.xlsx)')
  if (nombres.some(n => XLSX_PROHIBIDO.test(n))) return no('activo', 'Este Excel lleva macros, objetos incrustados o conexiones. Guárdalo como .xlsx normal (sin macros) o como CSV')
  return { ok: true, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
}

// ── CSV y texto ──
// Texto de verdad: ni un solo byte de control (salvo tabulador y saltos de línea). Sirve para UTF-8 y para el latin1/Windows-1252 de los CSV de Excel en español.
function validarTexto(b: Uint8Array, mime: string): Resultado {
  for (let i = 0; i < b.length; i++) {
    const x = b[i]
    if (x < 0x20 && x !== 0x09 && x !== 0x0a && x !== 0x0d) return no('contenido', 'El archivo no es realmente un texto o un CSV')
    if (x === 0x7f) return no('contenido', 'El archivo no es realmente un texto o un CSV')
  }
  return { ok: true, mime }
}

/**
 * ¿Es de verdad lo que dice su extensión? `nombre` es el original que dio el cliente (solo se mira su extensión).
 * Devuelve el tipo con el que se guarda, o por qué se rechaza (con un texto para el cliente).
 */
export function validarArchivo(bytes: Uint8Array, nombre: string): Resultado {
  const f = FORMATOS[extensionDe(nombre)]
  if (!f) return no('formato', 'Ese tipo de archivo no se admite. Sube PDF, imagen (JPG, PNG, WEBP, HEIC), Excel (.xlsx), CSV o texto')
  if (bytes.length === 0) return no('vacio', 'El archivo está vacío')
  if (bytes.length > MAX_BYTES) return no('tamano', 'El archivo pasa de 20 MB')
  switch (f.grupo) {
    case 'pdf': return validarPdf(bytes)
    case 'jpeg': return validarJpeg(bytes)
    case 'png': return validarPng(bytes)
    case 'webp': return validarWebp(bytes)
    case 'heic': return validarHeic(bytes, f.mime)
    case 'xlsx': return validarXlsx(bytes)
    case 'texto': return validarTexto(bytes, f.mime)
  }
}
