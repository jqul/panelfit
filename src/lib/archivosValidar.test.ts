import { describe, expect, it } from 'vitest'
import { validarArchivo, extensionDe, FORMATOS, MAX_BYTES } from '../../supabase/functions/archivos-cliente/validar'

// Archivos sintéticos: lo justo para que tengan la firma y la estructura que mira el validador.
const enc = (s: string) => new TextEncoder().encode(s)
const junta = (...partes: Uint8Array[]) => { const o = new Uint8Array(partes.reduce((n, p) => n + p.length, 0)); let i = 0; for (const p of partes) { o.set(p, i); i += p.length } return o }
const bytes = (...n: number[]) => Uint8Array.from(n)
const relleno = (n: number, v = 0x61) => new Uint8Array(n).fill(v)

const pdf = (cuerpo = '1 0 obj <</Type/Catalog>> endobj') => enc(`%PDF-1.4\n${cuerpo}\ntrailer <<>>\n%%EOF\n`)
const jpg = () => junta(bytes(0xff, 0xd8, 0xff, 0xe0), relleno(64), bytes(0xff, 0xd9))
const png = () => junta(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), relleno(40), enc('IEND'), bytes(0xae, 0x42, 0x60, 0x82))
const webp = (largo = 40) => junta(enc('RIFF'), bytes(largo & 255, (largo >> 8) & 255, 0, 0), enc('WEBP'), relleno(largo - 4))
const heic = (marca = 'heic') => junta(bytes(0, 0, 0, 24), enc('ftyp'), enc(marca), bytes(0, 0, 0, 0), enc('mif1'), enc('heic'), relleno(100))

/** Un zip mínimo (entradas sin comprimir) con el nombre y el tamaño descomprimido declarado de cada entrada. */
function zip(entradas: { nombre: string; tam?: number }[], opciones: { sinEocd?: boolean; total?: number } = {}) {
  const locales: Uint8Array[] = [], centrales: Uint8Array[] = []
  let pos = 0
  const u16 = (n: number) => bytes(n & 255, (n >> 8) & 255)
  const u32 = (n: number) => bytes(n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255)
  for (const e of entradas) {
    const nombre = enc(e.nombre), contenido = enc('x'), tam = e.tam ?? contenido.length
    const local = junta(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(0), u32(contenido.length), u32(tam), u16(nombre.length), u16(0), nombre, contenido)
    centrales.push(junta(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(0), u32(contenido.length), u32(tam), u16(nombre.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(pos), nombre))
    locales.push(local); pos += local.length
  }
  const cd = junta(...centrales)
  const eocd = junta(u32(0x06054b50), u16(0), u16(0), u16(opciones.total ?? entradas.length), u16(opciones.total ?? entradas.length), u32(cd.length), u32(pos), u16(0))
  return junta(...locales, cd, ...(opciones.sinEocd ? [] : [eocd]))
}
const BASE_XLSX = [{ nombre: '[Content_Types].xml' }, { nombre: '_rels/.rels' }, { nombre: 'xl/workbook.xml' }, { nombre: 'xl/worksheets/sheet1.xml' }]
const xlsx = (extra: { nombre: string; tam?: number }[] = []) => zip([...BASE_XLSX, ...extra])

const codigo = (b: Uint8Array, nombre: string) => { const r = validarArchivo(b, nombre); return r.ok ? 'ok' : r.codigo }

describe('extensión', () => {
  it('en minúsculas, sin punto, y vacía si no hay', () => {
    expect(extensionDe('Rutina.PDF')).toBe('pdf')
    expect(extensionDe('mi.rutina.final.xlsx')).toBe('xlsx')
    expect(extensionDe('sin_extension')).toBe('')
    expect(extensionDe('foto.jpg ')).toBe('jpg')
  })
})

describe('formatos válidos (uno de cada)', () => {
  it.each([
    ['rutina.pdf', pdf(), 'application/pdf'],
    ['foto.jpg', jpg(), 'image/jpeg'],
    ['foto.JPEG', jpg(), 'image/jpeg'],
    ['captura.png', png(), 'image/png'],
    ['captura.webp', webp(), 'image/webp'],
    ['foto.heic', heic(), 'image/heic'],
    ['foto.heif', heic('mif1'), 'image/heif'],
    ['rutina.xlsx', xlsx(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['rutina.csv', enc('dia;ejercicio;series\nlunes;sentadilla;5\n'), 'text/csv'],
    ['notas.txt', enc('Lunes: pierna\nMartes: torso\n'), 'text/plain'],
  ])('%s se acepta con su tipo', (nombre, contenido, mime) => {
    const r = validarArchivo(contenido, nombre)
    expect(r).toEqual({ ok: true, mime })
  })

  it('un CSV en latin1/Windows-1252 (ñ y tildes de Excel en español) vale, y UTF-8 con acentos también', () => {
    expect(codigo(bytes(...[...'dia;ejercicio\nmi'].map(c => c.charCodeAt(0)), 0xe9, 0xf1), 'a.csv')).toBe('ok')
    expect(codigo(enc('día;ejercicio\nmiércoles;sentadilla\n'), 'a.csv')).toBe('ok')
  })
})

describe('formato no admitido', () => {
  it.each(['virus.exe', 'macros.xlsm', 'todo.zip', 'web.html', 'imagen.svg', 'doc.docx', 'diapos.pptx', 'viejo.xls', 'sin_extension', 'raro.pdf.exe', 'script.js'])('%s', nombre => {
    expect(codigo(pdf(), nombre)).toBe('formato')
  })
})

describe('tamaño', () => {
  it('vacío se rechaza', () => expect(codigo(new Uint8Array(0), 'a.txt')).toBe('vacio'))
  it('pasar de 20 MB se rechaza y exactamente 20 MB (de texto) se acepta', () => {
    expect(codigo(new Uint8Array(MAX_BYTES + 1).fill(0x61), 'a.txt')).toBe('tamano')
    expect(codigo(new Uint8Array(MAX_BYTES).fill(0x61), 'a.txt')).toBe('ok')
  })
})

describe('el contenido tiene que ser lo que dice la extensión', () => {
  it('un ejecutable de Windows con extensión pdf, jpg, png, xlsx, csv', () => {
    const exe = junta(enc('MZ'), bytes(0x90, 0, 3, 0), relleno(200, 0))
    for (const n of ['a.pdf', 'a.jpg', 'a.png', 'a.webp', 'a.heic', 'a.xlsx', 'a.csv', 'a.txt']) expect(codigo(exe, n), n).not.toBe('ok')
  })
  it('una imagen con extensión de PDF y un PDF con extensión de imagen', () => {
    expect(codigo(png(), 'a.pdf')).toBe('contenido')
    expect(codigo(pdf(), 'a.png')).toBe('contenido')
    expect(codigo(pdf(), 'a.jpg')).toBe('contenido')
    expect(codigo(jpg(), 'a.png')).toBe('contenido')
    expect(codigo(png(), 'a.webp')).toBe('contenido')
  })
  it('un zip cualquiera con extensión xlsx (sin las partes de un Excel)', () => {
    expect(codigo(zip([{ nombre: 'hola.txt' }]), 'a.xlsx')).toBe('contenido')
  })
  it('un binario con extensión csv o txt (bytes de control)', () => {
    expect(codigo(junta(enc('hola'), bytes(0, 1, 2), enc('mundo')), 'a.csv')).toBe('contenido')
    expect(codigo(bytes(0x7f, 0x45, 0x4c, 0x46), 'a.txt')).toBe('contenido')
  })
  it('un HEIC sin marca de HEIF (un MP4 con ftyp)', () => {
    expect(codigo(heic('isom').map((x, i) => (i >= 16 && i < 24 ? 0x20 : x)), 'a.heic')).toBe('contenido')
  })
})

describe('archivos incompletos o dañados', () => {
  it('PDF sin %%EOF, PNG sin IEND, WEBP más corto de lo que dice, zip sin directorio central', () => {
    expect(codigo(enc('%PDF-1.4\n1 0 obj <<>> endobj'), 'a.pdf')).toBe('corrupto')
    expect(codigo(junta(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), relleno(40)), 'a.png')).toBe('corrupto')
    expect(codigo(webp(40).subarray(0, 30), 'a.webp')).toBe('corrupto')
    expect(codigo(xlsx().subarray(0, 60), 'a.xlsx')).toBe('corrupto')
    expect(codigo(zip(BASE_XLSX, { sinEocd: true }), 'a.xlsx')).toBe('corrupto')
  })
})

describe('PDF con elementos activos', () => {
  it.each(['/Launch', '/EmbeddedFile', '/JavaScript', '/JS'])('%s se rechaza', clave => {
    expect(codigo(pdf(`1 0 obj <</S ${clave} /F (cmd.exe)>> endobj`), 'a.pdf')).toBe('activo')
  })
  it('un PDF normal con palabras parecidas (/JSON, /Javascripty) no se confunde', () => {
    expect(codigo(pdf('1 0 obj <</Title (JavaScript para todos) /JSONish true>> endobj'), 'a.pdf')).toBe('ok')
  })
})

describe('Excel con macros, incrustados o conexiones', () => {
  it.each([
    'xl/vbaProject.bin', 'xl/vbaProjectSignature.bin', 'xl/vbaData.xml', 'xl/macrosheets/sheet1.xml', 'xl/activeX/activeX1.xml',
    'xl/embeddings/oleObject1.bin', 'xl/connections.xml', 'customUI/customUI.xml', 'xl/ctrlProps/ctrlProp1.xml', 'xl/payload.exe', 'xl/run.js', 'xl/a.ps1',
  ])('%s se rechaza', nombre => {
    expect(codigo(xlsx([{ nombre }]), 'a.xlsx')).toBe('activo')
  })
  it('un Excel normal con hojas, estilos, tablas y gráficos pasa', () => {
    const r = xlsx([{ nombre: 'xl/styles.xml' }, { nombre: 'xl/sharedStrings.xml' }, { nombre: 'xl/tables/table1.xml' }, { nombre: 'xl/charts/chart1.xml' }, { nombre: 'docProps/core.xml' }])
    expect(codigo(r, 'a.xlsx')).toBe('ok')
  })
})

describe('zip malicioso', () => {
  it('rutas que se salen de la carpeta', () => {
    expect(codigo(xlsx([{ nombre: '../../etc/passwd' }]), 'a.xlsx')).toBe('contenido')
    expect(codigo(xlsx([{ nombre: '/abs/ruta.xml' }]), 'a.xlsx')).toBe('contenido')
  })
  it('bomba de compresión: tamaño descomprimido declarado enorme (no se descomprime nada)', () => {
    expect(codigo(xlsx([{ nombre: 'xl/sheet2.xml', tam: 600 * 1024 * 1024 }]), 'a.xlsx')).toBe('contenido')
  })
  it('demasiadas entradas', () => {
    const muchas = Array.from({ length: 2100 }, (_, i) => ({ nombre: `xl/w${i}.xml` }))
    expect(codigo(zip([...BASE_XLSX, ...muchas]), 'a.xlsx')).toBe('contenido')
  })
  it('un directorio central que miente sobre cuántas entradas hay', () => {
    expect(codigo(zip(BASE_XLSX, { total: 50 }), 'a.xlsx')).toBe('corrupto')
  })
})

describe('tabla de formatos', () => {
  it('cada extensión del servidor tiene su grupo y un tipo', () => {
    for (const [ext, f] of Object.entries(FORMATOS)) { expect(ext).toMatch(/^[a-z0-9]+$/); expect(f.mime).toContain('/') }
  })
})
