import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador, abrirFichaDelCliente, entrarComoCliente } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'

const OTRO = '44444444-4444-4444-8444-444444444444'

/** Datos de salud del cliente en tablas con id uuid y con id text, ficheros en Storage, y un segundo cliente que NO debe tocarse. */
function sembrarDatosDeSalud(fake: FakeSupabase) {
  fake.seed('clientes', { id: OTRO, trainerId: ids.trainer, name: 'Pedro', surname: 'Ruiz', token: 'tokenpedro', metricas_cliente: [], createdAt: Date.now() })
  for (const c of [ids.client, OTRO]) {
    fake.seed('registros_dolor', { id: `d-${c}`, clientId: c, date: '2026-10-20', zona: 'lumbar', intensidad: 3, created_at: 1 })
    fake.seed('valoraciones', { id: `v-${c}`, client_id: c, trainer_id: ids.trainer, fecha: '2026-10-01' })
    fake.seed('foto_sessions', { id: `f-${c}`, client_id: c, date: '2026-10-01', front_url: `fotos/${c}/s1/front.jpg` })
    fake.seed('registros_peso', { id: `p-${c}`, clientId: c, weight: 76, date: '2026-10-20' })
  }
  fake.seed('registros', { clientId: ids.client, logs: { ex_w9_d0_r0: { done: true, sets: {} } }, updatedAt: 1 })
  fake.seed('registros', { clientId: OTRO, logs: { ex_w9_d0_r0: { done: true, sets: {} } }, updatedAt: 1 })
  fake.storage.media = [`fotos/${ids.client}/s1/front.jpg`, `fotos/${ids.client}/s1/back.jpg`, `fotos/${OTRO}/s1/front.jpg`]
  fake.storage['client-videos'] = [`${ids.client}/v1.mp4`, `${ids.client}/reply/r1.mp4`]
  fake.storage['exercise-videos'] = [`${ids.client}/w0_d0/r0_1.mp4`]
}

const tablasConDatosDeCliente: [string, (r: Record<string, any>) => string][] = [
  ['registros_dolor', r => r.clientId], ['valoraciones', r => r.client_id], ['foto_sessions', r => r.client_id],
  ['registros_peso', r => r.clientId], ['registros', r => r.clientId], ['planes', r => r.clientId], ['consentimientos', r => r.clientId],
]

test('el entrenador borra todos los datos de un cliente: ficheros, filas de todas las tablas y solo las suyas', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  sembrarDatosDeSalud(fake)

  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)
  await page.getByRole('button', { name: /^Configuración/ }).click()
  await expect(page.getByRole('heading', { name: 'Datos personales (RGPD)' })).toBeVisible()
  await expect(page.getByText('Salud ✓ · Fotos ✗')).toBeVisible() // ve el estado del consentimiento del cliente

  // Hay que confirmar escribiendo el nombre completo
  await page.getByRole('button', { name: /Borrar todos sus datos/ }).click()
  const borrar = page.getByRole('button', { name: 'Borrar definitivamente' })
  await expect(borrar).toBeDisabled()
  await page.getByLabel('Nombre completo para confirmar el borrado').fill('María')
  await expect(borrar).toBeDisabled()
  await page.getByLabel('Nombre completo para confirmar el borrado').fill('María García')
  await expect(borrar).toBeEnabled()
  await borrar.click()
  await expect(page.getByText(/Cliente borrado con todos sus datos \(5 ficheros\)/)).toBeVisible()

  // Primero se borraron los ficheros de Storage del cliente (los de otro cliente no)
  const quitados = Object.fromEntries(fake.removedFiles.map(f => [f.bucket, f.paths.sort()]))
  expect(quitados).toEqual({
    media: [`fotos/${ids.client}/s1/back.jpg`, `fotos/${ids.client}/s1/front.jpg`],
    'client-videos': [`${ids.client}/reply/r1.mp4`, `${ids.client}/v1.mp4`],
    'exercise-videos': [`${ids.client}/w0_d0/r0_1.mp4`],
  })
  expect(fake.storage.media).toEqual([`fotos/${OTRO}/s1/front.jpg`])

  // Después, todas las filas del cliente y su ficha; las del otro cliente intactas
  for (const [tabla, idDe] of tablasConDatosDeCliente) {
    expect(fake.rows(tabla).filter(r => idDe(r) === ids.client), `quedan filas de ${tabla}`).toEqual([])
  }
  expect(fake.rows('clientes').map(c => c.id)).toEqual([OTRO])
  expect(fake.rows('registros_dolor').map(r => r.clientId)).toEqual([OTRO])
  expect(fake.rows('registros').map(r => r.clientId)).toEqual([OTRO])
  expect(fake.rows('registro_borrados')).toMatchObject([{ client_id: ids.client, trainer_id: ids.trainer }])

  // Y la app recarga y ya no lo muestra
  await expect(page.getByText('Pedro Ruiz').first()).toBeVisible()
  await expect(page.getByText('María García')).toHaveCount(0)
})

test('si falla el borrado de los ficheros, no se borra nada más', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  sembrarDatosDeSalud(fake)
  // El almacenamiento rechaza borrar
  await page.route('https://e2e-supabase.test/storage/v1/object/media', route => route.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: '{"message":"fallo"}' }))

  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)
  await page.getByRole('button', { name: /^Configuración/ }).click()
  await page.getByRole('button', { name: /Borrar todos sus datos/ }).click()
  await page.getByLabel('Nombre completo para confirmar el borrado').fill('María García')
  await page.getByRole('button', { name: 'Borrar definitivamente' }).click()

  await expect(page.getByText(/No se pudieron borrar los ficheros/)).toBeVisible()
  // Ni una fila borrada: se puede reintentar sin haber perdido nada
  expect(fake.rows('clientes').map(c => c.id).sort()).toEqual([ids.client, OTRO].sort())
  expect(fake.rows('registros_dolor')).toHaveLength(2)
  expect(fake.rows('registro_borrados')).toEqual([])
})

test('el cliente pide que se borren sus datos: se retira su consentimiento, se avisa al entrenador y no se borra nada solo', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  sembrarDatosDeSalud(fake)
  page.on('dialog', d => d.accept()) // "¿Continuar?" de la petición de borrado

  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Más', exact: true }).click()
  await page.getByRole('button', { name: 'Pedir que se borren mis datos' }).click()

  // La app lo trata como retirada del consentimiento: no se enseña ni se guarda nada
  await expect(page.getByRole('heading', { name: 'Has retirado tu consentimiento' })).toBeVisible()
  expect(fake.rows('notificaciones')).toMatchObject([{ tipo: 'solicitud_borrado', trainer_id: ids.trainer, client_id: ids.client }])
  const consentimientos = fake.rows('consentimientos').filter(r => r.clientId === ids.client)
  expect(consentimientos).toHaveLength(2) // el original se conserva: es la prueba de lo que se aceptó
  expect(consentimientos.some(c => c.salud === false)).toBe(true)
  // El borrado lo ejecuta el entrenador, no el cliente: todo sigue ahí
  expect(fake.rows('clientes').map(c => c.id).sort()).toEqual([ids.client, OTRO].sort())
  expect(fake.rows('registros_dolor')).toHaveLength(2)
})
