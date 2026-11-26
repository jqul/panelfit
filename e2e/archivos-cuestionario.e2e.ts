import type { Page } from '@playwright/test'
import { test, expect as expectBase } from './support/test'
import { seedWorld, ids, TOKEN, CLIENT_LOGIN } from './support/seed'
import { entrarComoEntrenador, abrirFichaDelCliente } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'
import type { Pregunta } from '../src/lib/cuestionarios'

// Archivos en los cuestionarios: el cliente sube su rutina (PDF, captura, Excel…) como respuesta a una pregunta, se comprueba en el servidor, y su entrenador la ve y la descarga.
// Las reglas de seguridad (permisos entre clientes, triggers, retención) las prueba PGlite (supabase/hardening/tests/bloque50_archivos.sql) y los validadores de bytes y la
// función de borde, vitest; aquí, lo que ve y hace la gente con el simulador, que usa el MANEJADOR y el VALIDADOR REALES de la función de borde con el contenido real subido.

test.setTimeout(150_000) // la primera carga compila los trozos diferidos
const expect = expectBase.configure({ timeout: 30_000 })

const PREGUNTAS: Pregunta[] = [
  { id: 'rutina', type: 'archivos', label: 'Sube tu rutina actual (PDF, captura, Excel…)', required: true },
  { id: 'comentario', type: 'short', label: 'Algo que quieras contarme' },
]
const enc = (s: string) => Buffer.from(s)
const PDF = enc('%PDF-1.4\n1 0 obj <</Type/Catalog>> endobj\ntrailer <<>>\n%%EOF\n')
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), enc('datos'), enc('IEND'), Buffer.from([0xae, 0x42, 0x60, 0x82])])
const CSV = enc('dia;ejercicio;series\nlunes;sentadilla;5\n')

function sembrar(fake: FakeSupabase, preguntas: Pregunta[] = PREGUNTAS) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('survey_templates', { id: 'tmpl-c', trainer_id: ids.trainer, name: 'Tu rutina', questions: preguntas, created_at: 1, auto_nuevos_desde: null })
  fake.seed('survey_schedules', { id: 'sched-c', trainer_id: ids.trainer, template_id: 'tmpl-c', client_id: ids.client, frequency: 'once', day_of_week: 0, active: true, last_sent_at: null })
}
async function entrar(page: Page) {
  await page.goto(`/?c=${TOKEN}`)
  await page.getByPlaceholder('tu@email.com').fill(CLIENT_LOGIN.email)
  await page.getByPlaceholder('Mínimo 6 caracteres').fill(CLIENT_LOGIN.password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  // El primer test de una ejecución compila en frío los trozos diferidos de la app del cliente: más margen que el resto
  await expect(page.getByRole('heading', { name: 'Tu rutina' })).toBeVisible({ timeout: 90_000 })
}
const subir = (page: Page, ...archivos: { name: string; mimeType: string; buffer: Buffer }[]) => page.getByLabel('Elegir archivos').setInputFiles(archivos)
const lista = (page: Page) => page.getByRole('group', { name: /Sube tu rutina actual/ })
const enviar = (page: Page) => page.getByRole('button', { name: /Enviar respuestas/ }).click()
const filas = (fake: FakeSupabase) => fake.rows('archivos_cliente')

test('el cliente sube su rutina en PDF: se comprueba, aparece en la lista y se envía con el cuestionario', async ({ page, fake }) => {
  sembrar(fake)
  await entrar(page)
  await expect(lista(page).getByText('0 de 5')).toBeVisible()
  await subir(page, { name: 'Rutina junio.pdf', mimeType: 'application/pdf', buffer: PDF })
  await expect(lista(page).getByText('Rutina junio.pdf')).toBeVisible()
  await expect(lista(page).getByText('1 de 5')).toBeVisible()
  // En el servidor: la fila está verificada, con el tamaño REAL y el tipo que fijó el servidor, y el objeto está en el depósito privado
  expect(filas(fake)).toHaveLength(1)
  expect(filas(fake)[0]).toMatchObject({ estado: 'verificado', nombre: 'Rutina junio.pdf', tipo: 'application/pdf', tamano: PDF.length, question_id: 'rutina', template_id: 'tmpl-c' })
  expect(Object.keys(fake.blobs)).toEqual([`cuestionario-archivos/${filas(fake)[0].ruta}`])
  expect(fake.publicReads).toEqual([]) // nunca por una URL pública

  await enviar(page)
  await expect(page.getByRole('heading', { name: '¡Enviado!' })).toBeVisible()
  const resp = fake.rows('survey_responses')
  expect(resp).toHaveLength(1)
  // La respuesta lleva el archivo con los datos que puso el servidor
  expect(resp[0].answers.rutina).toEqual([{ id: filas(fake)[0].id, nombre: 'Rutina junio.pdf', tamano: PDF.length, tipo: 'application/pdf' }])
  expect(filas(fake)[0]).toMatchObject({ estado: 'enviado', response_id: resp[0].id })
})

test('sube varios a la vez, de varios tipos, y los quita antes de enviar (se borran de verdad)', async ({ page, fake }) => {
  sembrar(fake)
  await entrar(page)
  await subir(page,
    { name: 'foto.png', mimeType: 'image/png', buffer: PNG },
    { name: 'plan.csv', mimeType: 'text/csv', buffer: CSV },
    { name: 'rutina.pdf', mimeType: 'application/pdf', buffer: PDF })
  await expect(lista(page).getByText('3 de 5')).toBeVisible()
  expect(filas(fake).map(f => f.nombre).sort()).toEqual(['foto.png', 'plan.csv', 'rutina.pdf'])

  await lista(page).getByRole('button', { name: 'Quitar plan.csv' }).click()
  await expect(lista(page).getByText('plan.csv')).toHaveCount(0)
  await expect(lista(page).getByText('2 de 5')).toBeVisible()
  expect(filas(fake).map(f => f.nombre).sort()).toEqual(['foto.png', 'rutina.pdf'])
  // El objeto físico también se borró (no solo la fila)
  expect(Object.keys(fake.blobs).some(k => k.endsWith('.csv'))).toBe(false)
  expect(fake.removedFiles.some(r => r.bucket === 'cuestionario-archivos' && r.paths.some(p => p.endsWith('.csv')))).toBe(true)
})

test('el navegador no sabe el tipo de todo: un .heic sin tipo y un .csv que Windows llama ms-excel suben igual (el depósito recibe el tipo que fija el servidor)', async ({ page, fake }) => {
  sembrar(fake)
  await entrar(page)
  const HEIC = Buffer.concat([Buffer.from([0, 0, 0, 24]), enc('ftypheic'), Buffer.from([0, 0, 0, 0]), enc('mif1'), enc('heic'), Buffer.alloc(40)])
  await subir(page, { name: 'foto.heic', mimeType: '', buffer: HEIC }, { name: 'plan.csv', mimeType: 'application/vnd.ms-excel', buffer: CSV })
  await expect(lista(page).getByText('2 de 5')).toBeVisible()
  expect(filas(fake).map(f => [f.nombre, f.tipo, f.estado]).sort()).toEqual([['foto.heic', 'image/heic', 'verificado'], ['plan.csv', 'text/csv', 'verificado']])
  expect(page.getByRole('alert')).toHaveCount(0)
})

test('un archivo que no es lo que dice ser se rechaza con su motivo y no deja nada (ni fila ni objeto)', async ({ page, fake }) => {
  sembrar(fake)
  await entrar(page)
  await subir(page, { name: 'rutina.pdf', mimeType: 'application/pdf', buffer: PNG }) // una imagen con extensión de PDF
  await expect(page.getByRole('alert').filter({ hasText: 'no es realmente un PDF' })).toBeVisible()
  await expect(lista(page).getByText('0 de 5')).toBeVisible()
  expect(filas(fake)).toEqual([])
  expect(fake.blobs).toEqual({})
  // Y como es obligatoria, no se puede enviar sin ningún archivo válido
  await enviar(page)
  await expect(page.getByText('Esta pregunta es obligatoria')).toBeVisible()
  expect(fake.rows('survey_responses')).toHaveLength(0)
})

test('Excel con macros, ejecutables y archivos que pasan de 20 MB no entran', async ({ page, fake }) => {
  sembrar(fake)
  await entrar(page)
  await subir(page, { name: 'virus.exe', mimeType: 'application/x-msdownload', buffer: enc('MZ') })
  await expect(page.getByRole('alert').filter({ hasText: 'no se admite' })).toBeVisible()
  await subir(page, { name: 'macros.xlsm', mimeType: 'application/vnd.ms-excel.sheet.macroEnabled.12', buffer: enc('PK') })
  await expect(page.getByRole('alert').filter({ hasText: 'macros.xlsm' })).toBeVisible()
  await subir(page, { name: 'enorme.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(20 * 1024 * 1024 + 1, 0x61) })
  await expect(page.getByRole('alert').filter({ hasText: 'pasa de 20 MB' })).toBeVisible()
  // Los filtros del móvil lo paran antes de reservar nada en el servidor
  expect(filas(fake)).toEqual([])
  expect(fake.uploads).toEqual([])
})

test('un Excel de verdad pasa y uno con macros dentro se rechaza aunque se llame .xlsx', async ({ page, fake }) => {
  sembrar(fake)
  await entrar(page)
  const zip = (nombres: string[]) => {
    const u16 = (n: number) => Buffer.from([n & 255, (n >> 8) & 255]), u32 = (n: number) => Buffer.from([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255])
    const locales: Buffer[] = [], centrales: Buffer[] = []; let pos = 0
    for (const nombre of nombres) {
      const n = Buffer.from(nombre), c = Buffer.from('x')
      const local = Buffer.concat([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(0), u32(1), u32(1), u16(n.length), u16(0), n, c])
      centrales.push(Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(0), u32(1), u32(1), u16(n.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(pos), n]))
      locales.push(local); pos += local.length
    }
    const cd = Buffer.concat(centrales)
    return Buffer.concat([...locales, cd, u32(0x06054b50), u16(0), u16(0), u16(nombres.length), u16(nombres.length), u32(cd.length), u32(pos), u16(0)])
  }
  const base = ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml']
  const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  await subir(page, { name: 'bueno.xlsx', mimeType: XLSX, buffer: zip(base) })
  await expect(lista(page).getByText('bueno.xlsx')).toBeVisible()
  await subir(page, { name: 'trampa.xlsx', mimeType: XLSX, buffer: zip([...base, 'xl/vbaProject.bin']) })
  await expect(page.getByRole('alert').filter({ hasText: 'macros' })).toBeVisible()
  expect(filas(fake).map(f => f.nombre)).toEqual(['bueno.xlsx'])
  expect(Object.keys(fake.blobs)).toHaveLength(1)
})

test('como mucho 5 archivos por pregunta: el sexto no entra y se avisa', async ({ page, fake }) => {
  sembrar(fake)
  await entrar(page)
  const seis = Array.from({ length: 6 }, (_, i) => ({ name: `f${i + 1}.txt`, mimeType: 'text/plain', buffer: enc(`texto ${i + 1}\n`) }))
  await subir(page, ...seis)
  await expect(lista(page).getByText('5 de 5')).toBeVisible()
  await expect(page.getByRole('alert').filter({ hasText: 'Solo caben 5' })).toBeVisible()
  expect(filas(fake)).toHaveLength(5)
  await expect(page.getByRole('button', { name: 'Añadir otro archivo' })).toBeDisabled()
  // Quitando uno, vuelve a haber sitio
  await lista(page).getByRole('button', { name: 'Quitar f1.txt' }).click()
  await expect(page.getByRole('button', { name: 'Añadir otro archivo' })).toBeEnabled()
})

test('lo ya subido (desde otro dispositivo o antes de cerrar la app) reaparece solo, y un borrador con archivos que ya no existen se limpia', async ({ page, fake }) => {
  sembrar(fake)
  const id = 'a0000000-0000-0000-0000-000000000001'
  fake.seed('archivos_cliente', { id, client_id: ids.client, template_id: 'tmpl-c', question_id: 'rutina', ruta: `${ids.client}/${id}.pdf`, nombre: 'ya-subido.pdf', ext: 'pdf', tipo: 'application/pdf', tamano: 4000, estado: 'verificado', response_id: null, created_at: new Date().toISOString() })
  // Un borrador local que cita un archivo que el servidor ya no tiene
  await page.addInitScript(([clave, valor]) => localStorage.setItem(clave, valor), [`pf_cuestionario_avance_${ids.client}_tmpl-c`, JSON.stringify({ rutina: [{ id: 'b0000000-0000-0000-0000-000000000002', nombre: 'fantasma.pdf', tamano: 1, tipo: 'application/pdf' }] })])
  await entrar(page)
  await expect(lista(page).getByText('ya-subido.pdf')).toBeVisible()
  await expect(lista(page).getByText('fantasma.pdf')).toHaveCount(0)
  await expect(lista(page).getByText('1 de 5')).toBeVisible()
})

test('un cuestionario sin preguntas de archivos funciona igual que siempre (no baja nada de subida)', async ({ page, fake }) => {
  sembrar(fake, [{ id: 'x', type: 'short', label: 'Tu objetivo', required: true }])
  await entrar(page)
  await page.getByRole('textbox', { name: 'Tu objetivo' }).fill('Ganar fuerza')
  await enviar(page)
  await expect(page.getByRole('heading', { name: '¡Enviado!' })).toBeVisible()
  expect(fake.rows('survey_responses')[0].answers).toEqual({ x: 'Ganar fuerza' })
  expect(filas(fake)).toEqual([])
})

// ── El entrenador ──

function sembrarRespuestaConArchivos(fake: FakeSupabase, estado: 'enviado' | 'caducado' = 'enviado') {
  sembrar(fake)
  const id = 'a0000000-0000-0000-0000-000000000001'
  const ruta = `${ids.client}/${id}.pdf`
  fake.seed('archivos_cliente', { id, client_id: ids.client, template_id: 'tmpl-c', question_id: 'rutina', ruta, nombre: 'rutina-maria.pdf', ext: 'pdf', tipo: 'application/pdf', tamano: PDF.length, estado, response_id: 'r1', created_at: new Date().toISOString() })
  if (estado === 'enviado') fake.blobs[`cuestionario-archivos/${ruta}`] = PDF
  fake.seed('survey_responses', { id: 'r1', template_id: 'tmpl-c', client_id: ids.client, trainer_id: ids.trainer, schedule_id: null, completed_at: Date.UTC(2026, 10, 20, 10), answers: { rutina: [{ id, nombre: 'rutina-maria.pdf', tamano: PDF.length, tipo: 'application/pdf' }], comentario: 'Sin molestias' } })
}
async function abrirRespuestas(page: Page) {
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Encuestas')
  await page.getByRole('option', { name: 'Ir a Encuestas' }).click()
  await page.getByRole('button', { name: /^Respuestas/ }).click()
  await page.getByText('20 de noviembre de 2026').click()
}

test('el entrenador ve los archivos de la respuesta y los descarga como archivo adjunto con su nombre', async ({ page, fake }) => {
  sembrarRespuestaConArchivos(fake)
  await abrirRespuestas(page)
  await expect(page.getByText('rutina-maria.pdf')).toBeVisible()
  await expect(page.getByText('Sin molestias')).toBeVisible()
  await expect(page.getByText(/ábrelo con tu propio programa/)).toBeVisible()
  const bajada = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar rutina-maria.pdf' }).click()
  const descarga = await bajada
  expect(descarga.suggestedFilename()).toBe('rutina-maria.pdf')
  expect((await import('node:fs')).readFileSync((await descarga.path())!)).toEqual(PDF)
  // Siempre con un enlace firmado, nunca público
  expect(fake.signedReads).toEqual([`cuestionario-archivos/${ids.client}/a0000000-0000-0000-0000-000000000001.pdf`])
  expect(fake.publicReads).toEqual([])
})

test('un archivo borrado por caducidad se indica y ya no se puede descargar', async ({ page, fake }) => {
  sembrarRespuestaConArchivos(fake, 'caducado')
  await abrirRespuestas(page)
  await expect(page.getByText('rutina-maria.pdf')).toBeVisible()
  await expect(page.getByText(/borrado por caducidad/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Descargar rutina-maria.pdf' })).toHaveCount(0)
})

test('el entrenador puede añadir una pregunta de archivos a sus encuestas', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Encuestas')
  await page.getByRole('option', { name: 'Ir a Encuestas' }).click()
  await page.getByRole('button', { name: 'Nueva encuesta' }).click()
  await page.getByRole('button', { name: /Archivos/ }).click()
  await expect(page.getByText(/hasta 5 archivos de 20 MB/)).toBeVisible()
})

// ── RGPD ──

test('al borrar a un cliente, sus archivos de cuestionarios se borran ANTES que sus datos (los suyos y no los de otro)', async ({ page, fake }) => {
  sembrarRespuestaConArchivos(fake)
  const OTRO = '44444444-4444-4444-8444-444444444444'
  fake.seed('clientes', { id: OTRO, trainerId: ids.trainer, name: 'Pedro', surname: 'Ruiz', token: 'tokenpedro', metricas_cliente: [], createdAt: Date.now() })
  const idOtro = 'b0000000-0000-0000-0000-000000000009'
  fake.seed('archivos_cliente', { id: idOtro, client_id: OTRO, template_id: 'tmpl-c', question_id: 'rutina', ruta: `${OTRO}/${idOtro}.pdf`, nombre: 'de-pedro.pdf', ext: 'pdf', tipo: 'application/pdf', tamano: 10, estado: 'verificado', response_id: null, created_at: new Date().toISOString() })
  fake.blobs[`cuestionario-archivos/${OTRO}/${idOtro}.pdf`] = PDF
  // Un objeto suelto en su carpeta, sin fila (un resto): también se borra
  fake.blobs[`cuestionario-archivos/${ids.client}/suelto.pdf`] = PDF

  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)
  await page.getByRole('button', { name: /^Configuración/ }).click()
  await page.getByRole('button', { name: /Borrar todos sus datos/ }).click()
  await page.getByLabel('Nombre completo para confirmar el borrado').fill('María García')
  await page.getByRole('button', { name: 'Borrar definitivamente' }).click()
  await expect(page.getByText(/Cliente borrado con todos sus datos/)).toBeVisible()

  expect(Object.keys(fake.blobs)).toEqual([`cuestionario-archivos/${OTRO}/${idOtro}.pdf`])
  expect(fake.removedFiles.find(r => r.bucket === 'cuestionario-archivos')!.paths.sort()).toEqual([`${ids.client}/a0000000-0000-0000-0000-000000000001.pdf`, `${ids.client}/suelto.pdf`])
  expect(filas(fake).map(f => f.client_id)).toEqual([OTRO])
  expect(fake.rows('clientes').map(c => c.id)).toEqual([OTRO])
})

test('si no se pueden borrar los archivos, NO se borran los datos del cliente', async ({ page, fake }) => {
  sembrarRespuestaConArchivos(fake)
  // La función de borde «falla» al borrar: no se puede quitar nada del depósito
  await page.route('**/functions/v1/archivos-cliente', route => route.fulfill({ status: 500, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":false,"codigo":"storage"}' }))
  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)
  await page.getByRole('button', { name: /^Configuración/ }).click()
  await page.getByRole('button', { name: /Borrar todos sus datos/ }).click()
  await page.getByLabel('Nombre completo para confirmar el borrado').fill('María García')
  await page.getByRole('button', { name: 'Borrar definitivamente' }).click()
  await expect(page.getByText(/No se pudieron borrar los archivos de sus cuestionarios/)).toBeVisible()
  expect(fake.rows('clientes').some(c => c.id === ids.client)).toBe(true)
  expect(filas(fake)).toHaveLength(1)
  expect(fake.rows('registro_borrados')).toEqual([])
})
