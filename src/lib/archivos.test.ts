import { describe, expect, it, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: {} }))

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  FORMATOS, TIPOS_ADMITIDOS, ACEPTA, MAX_ARCHIVOS, MAX_BYTES, MAX_PENDIENTES_CLIENTE, MAX_NOMBRE, BUCKET_ARCHIVOS,
  extensionDe, mimeDe, nombreVisible, problemaArchivo, archivosDe, esArchivoRef, esUuid, quedan, tamanoLegible, mensajeReserva,
} from './archivos'
import { FORMATOS as FORMATOS_SERVIDOR, MAX_BYTES as MAX_SERVIDOR } from '../../supabase/functions/archivos-cliente/validar'
import { TIPOS, TIPO, nuevaPregunta, textoRespuesta, textoSuelto, respondida, faltan, hojaImprimible, type Pregunta } from './cuestionarios'
import { TODOS_LOS_MODELOS } from './modelosProgramacion'
import { MODELO_PROGRAMACION_INICIAL } from './modelosEncuesta'
import { collectFileRefs } from './clientData'

const leer = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')
const migracion = leer('supabase/migrations/20261125000010_archivos_cuestionario.sql')

const A1 = 'a0000000-0000-0000-0000-000000000001'
const ref = (nombre: string, tamano = 1000) => ({ id: A1, nombre, tamano, tipo: 'application/pdf' })

describe('límites y formatos', () => {
  it('son los acordados: 5 archivos por pregunta, 20 MB cada uno y los 9 formatos', () => {
    expect(MAX_ARCHIVOS).toBe(5)
    expect(MAX_BYTES).toBe(20 * 1024 * 1024)
    expect([...new Set(FORMATOS.map(f => f.ext))].sort()).toEqual(['csv', 'heic', 'heif', 'jpeg', 'jpg', 'pdf', 'png', 'txt', 'webp', 'xlsx'])
    for (const nunca of ['exe', 'zip', 'rar', 'xlsm', 'docx', 'pptx', 'xls', 'html', 'svg', 'js', 'bat', 'sh', 'dmg', 'apk']) expect(mimeDe(nunca), nunca).toBeNull()
  })
  it('el selector de archivos del móvil acepta exactamente esas extensiones', () => {
    expect(ACEPTA.split(',').sort()).toEqual(FORMATOS.map(f => `.${f.ext}`).sort())
  })
})

describe('el cliente, el servidor y la base de datos dicen lo mismo', () => {
  it('extensión → tipo: la app y la función de borde', () => {
    expect(Object.fromEntries(FORMATOS.map(f => [f.ext, f.mime]))).toEqual(Object.fromEntries(Object.entries(FORMATOS_SERVIDOR).map(([ext, f]) => [ext, f.mime])))
    expect(MAX_SERVIDOR).toBe(MAX_BYTES)
  })
  it('extensión → tipo: la migración (archivo_reservar)', () => {
    const cuerpo = migracion.slice(migracion.indexOf('v_mime := case v_ext'), migracion.indexOf('else null end;'))
    const sql = Object.fromEntries([...cuerpo.matchAll(/when '(\w+)' then '([^']+)'/g)].map(m => [m[1], m[2]]))
    expect(sql).toEqual(Object.fromEntries(FORMATOS.map(f => [f.ext, f.mime])))
  })
  it('el depósito: privado, 20 MB y justo los tipos admitidos', () => {
    const bloque = migracion.slice(migracion.indexOf("insert into storage.buckets"), migracion.indexOf('on conflict (id) do update'))
    expect(bloque).toContain(`'${BUCKET_ARCHIVOS}', '${BUCKET_ARCHIVOS}', false, ${MAX_BYTES}`)
    expect([...bloque.matchAll(/'([a-z]+\/[a-z0-9.+-]+)'/g)].map(m => m[1]).sort()).toEqual([...TIPOS_ADMITIDOS].sort())
  })
  it('los topes de la base de datos: 5 por pregunta y 25 sin enviar por cliente', () => {
    expect(migracion).toContain(`if v_n >= ${MAX_ARCHIVOS} then return`)
    expect(migracion).toContain(`jsonb_array_length(v_val) > ${MAX_ARCHIVOS}`)
    expect(migracion).toContain(`if v_n >= ${MAX_PENDIENTES_CLIENTE} then return`)
    expect(migracion).toContain(`length(nombre) between 1 and ${MAX_NOMBRE}`)
    expect(migracion).toContain(`tamano between 1 and ${MAX_BYTES}`)
  })
  it('el RGPD de la app borra y exporta del mismo depósito', () => {
    const refs = collectFileRefs({ archivos_cliente: [{ estado: 'enviado', ruta: 'c/a.pdf' }, { estado: 'verificado', ruta: 'c/b.pdf' }, { estado: 'reservado', ruta: 'c/c.pdf' }, { estado: 'caducado', ruta: 'c/d.pdf' }, { estado: 'rechazado', ruta: 'c/e.pdf' }] })
    expect(refs).toEqual([{ bucket: BUCKET_ARCHIVOS, path: 'c/a.pdf' }, { bucket: BUCKET_ARCHIVOS, path: 'c/b.pdf' }])
  })
})

describe('Coach IA y el formulario público no usan archivos', () => {
  it('ninguna función ni migración de Coach IA menciona los archivos de los cuestionarios', () => {
    const dir = join(process.cwd(), 'supabase/migrations')
    const coach = readdirSync(dir).filter(f => /coach_ia/.test(f))
    expect(coach.length).toBeGreaterThanOrEqual(3)
    for (const f of coach) expect(readFileSync(join(dir, f), 'utf8'), f).not.toMatch(/archivos_cliente|cuestionario-archivos|archivo_reservar/)
  })
  it('el modelo del formulario público (anónimo, sin cuenta) no tiene preguntas de archivos: nadie anónimo puede subir', () => {
    expect(MODELO_PROGRAMACION_INICIAL.questions.some(q => q.type === 'archivos')).toBe(false)
  })
  it('la migración no da ningún permiso de archivos a anon', () => {
    expect(migracion).toMatch(/revoke all on public\.archivos_cliente from anon, authenticated/)
    expect(migracion).not.toMatch(/grant [^;]*to anon/i)
    expect(migracion).not.toMatch(/to public;/i)
    // sin políticas de UPDATE ni DELETE en el depósito (todo borrado pasa por la función de borde)
    expect(migracion).not.toMatch(/create policy \w+ on storage\.objects for (update|delete|all)/i)
  })
})

describe('extensión y nombre', () => {
  it('extensionDe: minúsculas, la última, vacía si no hay', () => {
    expect(extensionDe('Rutina.PDF')).toBe('pdf')
    expect(extensionDe('a.b.c.xlsx')).toBe('xlsx')
    expect(extensionDe('sin')).toBe('')
    expect(extensionDe('termina.')).toBe('')
    expect(extensionDe('foto.jpg ')).toBe('jpg')
  })
  it('nombreVisible: sin rutas, sin caracteres de control ni marcas de dirección, y de 120 como mucho conservando la extensión', () => {
    expect(nombreVisible('C:\\Users\\ana\\rutina.pdf')).toBe('rutina.pdf')
    expect(nombreVisible('../../etc/passwd.txt')).toBe('passwd.txt')
    expect(nombreVisible('rut\u0000ina\n.pdf')).toBe('rutina.pdf')
    expect(nombreVisible('gpj.\u202etxt.exe')).toBe('gpj.txt.exe')
    expect(nombreVisible('  Mi   rutina  .pdf ')).toBe('Mi rutina .pdf')
    expect(nombreVisible('')).toBe('archivo')
    expect(nombreVisible('///')).toBe('archivo')
    const largo = nombreVisible(`${'x'.repeat(300)}.xlsx`)
    expect(largo.length).toBeLessThanOrEqual(MAX_NOMBRE)
    expect(largo.endsWith('.xlsx')).toBe(true)
  })
  it('nombreVisible quita cada una de las marcas de dirección de texto (las que harían leer «rutina.exe» como otra cosa)', () => {
    for (const cp of [0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069]) expect(nombreVisible(`rut${String.fromCodePoint(cp)}ina.pdf`), cp.toString(16)).toBe('rutina.pdf')
  })
  it('un nombre con HTML se queda como texto (React lo escapa al pintarlo)', () => {
    expect(nombreVisible('<img src=x onerror=alert(1)>.pdf')).toBe('<img src=x onerror=alert(1)>.pdf')
  })
})

describe('problemaArchivo (primer filtro en el móvil)', () => {
  it.each(['a.pdf', 'a.JPG', 'a.heic', 'a.xlsx', 'a.csv', 'a.txt'])('%s vale', n => expect(problemaArchivo({ name: n, size: 1000 })).toBeNull())
  it.each(['a.exe', 'a.xlsm', 'a.docx', 'a.zip', 'a', 'a.pdf.exe'])('%s no vale por su tipo', n => expect(problemaArchivo({ name: n, size: 1000 })).toMatch(/no se admite/))
  it('vacío y de más de 20 MB no valen; justo 20 MB sí', () => {
    expect(problemaArchivo({ name: 'a.pdf', size: 0 })).toMatch(/vacío/)
    expect(problemaArchivo({ name: 'a.pdf', size: MAX_BYTES + 1 })).toMatch(/20 MB/)
    expect(problemaArchivo({ name: 'a.pdf', size: MAX_BYTES })).toBeNull()
  })
})

describe('respuesta de archivos', () => {
  it('archivosDe: solo lo que tiene la forma esperada (un borrador raro o una versión antigua no rompen nada)', () => {
    expect(archivosDe([ref('a.pdf'), { id: 'no-uuid', nombre: 'x', tamano: 1, tipo: 'y' }, 'texto', null, { id: A1 }])).toEqual([ref('a.pdf')])
    expect(archivosDe('a.pdf')).toEqual([]); expect(archivosDe(undefined)).toEqual([]); expect(archivosDe({})).toEqual([])
  })
  it('esUuid y esArchivoRef', () => {
    expect(esUuid(A1)).toBe(true); expect(esUuid('1')).toBe(false); expect(esUuid(5)).toBe(false)
    expect(esArchivoRef(ref('a.pdf'))).toBe(true); expect(esArchivoRef({ ...ref('a.pdf'), tamano: '1' })).toBe(false)
  })
  it('quedan: hasta 5 y nunca negativo', () => {
    expect([0, 3, 5, 7].map(quedan)).toEqual([5, 2, 0, 0])
  })
  it('tamanoLegible', () => {
    expect(tamanoLegible(500)).toBe('500 B'); expect(tamanoLegible(2048)).toBe('2 KB'); expect(tamanoLegible(1.5 * 1024 * 1024)).toBe('1,5 MB')
  })
  it('mensajeReserva: un texto claro para cada motivo y uno genérico para lo demás', () => {
    for (const c of ['formato', 'tamano', 'limite_pregunta', 'limite_cliente', 'archivado']) expect(mensajeReserva(c).length).toBeGreaterThan(20)
    expect(mensajeReserva('limite_pregunta')).toContain('5')
    expect(mensajeReserva('loquesea')).toMatch(/Inténtalo de nuevo/)
    expect(mensajeReserva(undefined)).toMatch(/Inténtalo de nuevo/)
  })
})

describe('el tipo «archivos» en el motor de cuestionarios', () => {
  const q: Pregunta = { id: 'rutina', type: 'archivos', label: 'Sube tu rutina', required: true }
  it('está en el editor, con su icono y su nombre, y una pregunta nueva sale sin opciones', () => {
    expect(TIPOS.some(t => t.id === 'archivos')).toBe(true)
    expect(TIPO.archivos.nombre).toBe('Archivos')
    expect(nuevaPregunta('archivos')).toMatchObject({ type: 'archivos', required: false })
    expect(nuevaPregunta('archivos').options).toBeUndefined()
  })
  it('obligatoria: sin archivos falta; con uno, no', () => {
    expect(faltan([q], {}).map(p => p.id)).toEqual(['rutina'])
    expect(faltan([q], { rutina: [] }).map(p => p.id)).toEqual(['rutina'])
    expect(faltan([q], { rutina: [ref('a.pdf')] })).toEqual([])
    expect(respondida([ref('a.pdf')])).toBe(true)
  })
  it('como texto: los nombres, separados por comas (en la hoja impresa, WhatsApp y el resumen)', () => {
    expect(textoRespuesta(q, [ref('a.pdf'), ref('b.xlsx')])).toBe('a.pdf, b.xlsx')
    expect(textoRespuesta(q, [])).toBe('—')
    expect(textoRespuesta(q, [{ lo: 'raro' }])).toBe('—')
    expect(textoSuelto([ref('a.pdf'), ref('b.pdf')])).toBe('a.pdf, b.pdf')
  })
  it('la hoja impresa lleva los nombres (escapados), no los archivos', () => {
    const html = hojaImprimible('Cuestionario', [q], [{ cliente: 'Ana', fecha: 0, answers: { rutina: [ref('<b>rutina</b>.pdf')] } }])
    expect(html).toContain('&lt;b&gt;rutina&lt;/b&gt;.pdf')
    expect(html).not.toContain('<b>rutina</b>')
  })
  it('ningún modelo de programación usa todavía preguntas de archivos (el rediseño de los cuestionarios es el Bloque 3)', () => {
    for (const m of TODOS_LOS_MODELOS) expect(m.questions.some(p => p.type === 'archivos'), m.id).toBe(false)
  })
})
