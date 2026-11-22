import type { Page } from '@playwright/test'
import { test, expect as expectBase } from './support/test'
import { seedWorld, ids, TOKEN, CLIENT_LOGIN } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'
import { PARQ_QUESTIONS, respuestasDeAdmision } from '../src/lib/intakeQuestions'
import { respuestasDeRevision } from '../src/lib/retencionParq'
import { huellaAdmision } from './support/huellaServidor'

// No todos los «sí» del cuestionario de salud pesan igual (lib/intakeQuestions: alarma, revisar, aclarar). Una señal de ALARMA retiene el cuestionario de programación
// del cliente (ni se abre solo, ni sale en Hoy, ni en su pestaña) hasta que el entrenador marca la ficha como revisada, y le sale una fila en «Decisión de hoy».
// Revisar y aclarar no retienen nada, solo piden al entrenador que lo mire. Los niveles y el estado de la revisión los prueban las unitarias; aquí, lo que se ve y se hace.

test.setTimeout(150_000) // la primera carga compila los trozos diferidos
const expect = expectBase.configure({ timeout: 30_000 })

const dia = (atras: number) => { const d = new Date(); d.setDate(d.getDate() - atras); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const PLAN_SIN_NADA_MAS = (fake: FakeSupabase) => { fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P.fechaInicio = dia(0) } // sin semanas completas, nada más entra en la lista

/** Las respuestas de una ficha de admisión con un «sí» en cada pregunta de `indices` del cuestionario de salud. */
const respuestasCon = (...indices: number[]) => respuestasDeAdmision(Object.fromEntries(PARQ_QUESTIONS.map((_, i) => [i, indices.includes(i)])), {})
/** Una ficha de admisión ya rellenada con un «sí» en la pregunta `indice` del cuestionario de salud, con la fecha dada. */
function sembrarAdmision(fake: FakeSupabase, indice: number, createdAt = 1000, ...masIndices: number[]) {
  const respuestas = respuestasCon(indice, ...masIndices)
  // La huella de una ficha la pone el SERVIDOR al guardarla (trigger de checkins): aquí, que se siembra sin pasar por él, se pone como lo haría
  fake.seed('checkins', { id: `intake-${createdAt}`, clientId: ids.client, tipo: 'intake', createdAt, respuestas, huella: huellaAdmision(respuestas) })
}
/** La revisión que deja el entrenador de la ficha `intake-<deAdmisionEn>`: indica su id y el servidor le pone la huella que esa ficha tenía al leerla. */
function sembrarRevision(fake: FakeSupabase, id: string, createdAt: number, deAdmisionEn: number) {
  const ficha = fake.rows('checkins').find(c => c.id === `intake-${deAdmisionEn}`)!
  fake.seed('checkins', { id, clientId: ids.client, tipo: 'parq_revisado', createdAt, respuestas: respuestasDeRevision(ficha.id), huella: huellaAdmision(ficha.respuestas) })
}
function sembrarCuestionarioPendiente(fake: FakeSupabase) {
  fake.seed('survey_templates', { id: 'tmpl-x', trainer_id: ids.trainer, name: 'Programación inicial: general', questions: [{ id: 'objetivo', type: 'short', label: 'Tu objetivo', required: true }], created_at: 1, auto_nuevos_desde: null })
  fake.seed('survey_schedules', { id: 'sched-x', trainer_id: ids.trainer, template_id: 'tmpl-x', client_id: ids.client, frequency: 'once', day_of_week: 0, active: true, last_sent_at: null })
}
async function entrarComoClienteSinEsperarEntreno(page: Page, url = `/?c=${TOKEN}`) {
  await page.goto(url)
  await page.getByPlaceholder('tu@email.com').fill(CLIENT_LOGIN.email)
  await page.getByPlaceholder('Mínimo 6 caracteres').fill(CLIENT_LOGIN.password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
}

test('ENTRENADOR: una señal de alarma sale la primera en «Decisión de hoy», la ficha explica la espera y «Marcar como revisado» la quita', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  PLAN_SIN_NADA_MAS(fake)
  sembrarAdmision(fake, 1) // dolor en el pecho al hacer actividad
  await entrarComoEntrenador(page)

  const seccion = page.getByRole('region', { name: 'Decisión de hoy' })
  const filas = seccion.getByRole('listitem')
  await expect(filas).toHaveCount(1)
  await expect(filas.nth(0)).toContainText('María García')
  await expect(filas.nth(0)).toContainText('Revisar su cuestionario de salud: puede necesitar una valoración antes de entrenar')
  await expect(filas.nth(0)).toContainText('su cuestionario de programación queda en espera')
  await expect(filas.nth(0).getByRole('img', { name: 'Atender' })).toBeVisible()

  await seccion.getByRole('button', { name: 'Abrir su ficha de admisión' }).click()
  const revision = page.getByRole('group', { name: 'Revisión del cuestionario de salud' })
  await expect(revision).toContainText('Posible contraindicación: que lo valore un profesional sanitario antes de entrenar')
  await expect(revision).toContainText('Su cuestionario de programación está en espera hasta que lo marques como revisado')
  await revision.getByRole('button', { name: 'Marcar como revisado' }).click()

  await expect(revision.getByText(/Revisado el/)).toBeVisible()
  await expect(revision.getByRole('button', { name: 'Marcar como revisado' })).toHaveCount(0)
  // La app solo manda el id de la ficha que tiene delante; la huella (SHA-256 del contenido) la pone el servidor, y la revisión queda atada a esa versión exacta, no a una fecha
  expect(fake.rows('checkins').filter(c => c.tipo === 'parq_revisado')).toMatchObject([{ clientId: ids.client, respuestas: respuestasDeRevision('intake-1000'), huella: huellaAdmision(respuestasCon(1)) }])
  expect(fake.writes.filter(w => w.table === 'checkins' && w.method === 'POST').map(w => w.body)).toEqual([expect.objectContaining({ tipo: 'parq_revisado', respuestas: respuestasDeRevision('intake-1000') })])
  expect(JSON.stringify(fake.writes.filter(w => w.table === 'checkins'))).not.toContain('huella') // la app no manda ninguna huella

  // Ya revisada: no vuelve a salir en la lista
  await page.reload()
  await expect(page.getByRole('region', { name: 'Decisión de hoy' })).toContainText('Nada pide tu atención hoy')
})

test('ENTRENADOR: un problema articular o medicación pide revisar, pero no retiene nada; la fila va a «revisar»', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  PLAN_SIN_NADA_MAS(fake)
  sembrarAdmision(fake, 4) // problema óseo o articular
  await entrarComoEntrenador(page)
  const fila = page.getByRole('region', { name: 'Decisión de hoy' }).getByRole('listitem')
  await expect(fila).toHaveCount(1)
  await expect(fila).toContainText('Revisar su cuestionario de salud')
  await expect(fila).toContainText('conviene adaptar el plan')
  await expect(fila).not.toContainText('en espera')
  await expect(fila.getByRole('img', { name: 'Revisar' })).toBeVisible()
})

test('CLIENTE: con alarma sin revisar su cuestionario queda en espera (ni se abre solo, ni en Hoy, ni en su pestaña); al revisarlo, se abre', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  sembrarCuestionarioPendiente(fake)
  sembrarAdmision(fake, 2) // dolor en el pecho en reposo
  await entrarComoClienteSinEsperarEntreno(page)

  // Entra a su entreno, no al cuestionario; en Hoy, un texto tranquilo y ningún aviso del cuestionario
  await expect(page.getByRole('button', { name: 'Empezar entrenamiento' })).toBeVisible()
  await expect(page.getByText('Tu entrenador está revisando tus respuestas de salud')).toBeVisible()
  await expect(page.getByRole('button', { name: /Tienes un cuestionario pendiente/ })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Programación inicial: general' })).toHaveCount(0)

  // Tampoco por la puerta de atrás: su pestaña de cuestionarios dice lo mismo
  await page.goto(`/?c=${TOKEN}&encuesta=1`)
  await expect(page.getByRole('heading', { name: 'Tu entrenador está revisando tus respuestas de salud' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Programación inicial: general' })).toHaveCount(0)

  // El entrenador la marca como revisada (con la huella de ESA ficha): ahora sí
  sembrarRevision(fake, 'rev-1', 5000, 1000)
  await page.goto(`/?c=${TOKEN}`)
  await expect(page.getByRole('heading', { name: 'Programación inicial: general' })).toBeVisible()
})

test('CLIENTE: con un problema articular (revisar) NO se retiene: su cuestionario de programación se abre solo', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  sembrarCuestionarioPendiente(fake)
  sembrarAdmision(fake, 4)
  await entrarComoClienteSinEsperarEntreno(page)
  await expect(page.getByRole('heading', { name: 'Programación inicial: general' })).toBeVisible()
})

test('CLIENTE: si vuelve a rellenar la ficha con otras respuestas después de una revisión, hay que volver a revisarla y queda en espera otra vez', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  sembrarCuestionarioPendiente(fake)
  sembrarAdmision(fake, 1, 1000)   // la ficha de antes, con una señal de alarma…
  sembrarRevision(fake, 'rev-vieja', 2000, 1000) // …que el entrenador revisó
  sembrarAdmision(fake, 0, 3000)   // ficha nueva con otra señal de alarma: la revisión de antes es de OTRAS respuestas
  await entrarComoClienteSinEsperarEntreno(page)
  await expect(page.getByText('Tu entrenador está revisando tus respuestas de salud')).toBeVisible()
  await expect(page.getByRole('button', { name: /Tienes un cuestionario pendiente/ })).toHaveCount(0)
})

test('CLIENTE: una «revisión» sin la huella de su ficha (por ejemplo, una que se hubiera escrito a mano) no suelta la espera', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  sembrarCuestionarioPendiente(fake)
  sembrarAdmision(fake, 1, 1000)
  fake.seed('checkins', { id: 'rev-falsa', clientId: ids.client, tipo: 'parq_revisado', createdAt: 9000, respuestas: respuestasDeRevision('intake-1000') }) // sin huella: no la puso el servidor
  fake.seed('checkins', { id: 'rev-otra', clientId: ids.client, tipo: 'parq_revisado', createdAt: 9500, respuestas: respuestasDeRevision('intake-1000'), huella: '0'.repeat(64) }) // con una huella que no es la de la ficha
  fake.seed('checkins', { id: 'rev-copia', clientId: ids.client, tipo: 'parq_revisado', createdAt: 9600, respuestas: [{ pregunta: 'huella', respuesta: huellaAdmision(respuestasCon(1)) }] }) // la huella «dentro» de las respuestas no vale: solo la columna del servidor
  await entrarComoClienteSinEsperarEntreno(page)
  await expect(page.getByText('Tu entrenador está revisando tus respuestas de salud')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Programación inicial: general' })).toHaveCount(0)
})

// La secuencia completa, de punta a punta: alarma → el entrenador revisa → el cliente cambia sus respuestas → vuelve a estar pendiente → la revisión vieja no vale
test('SECUENCIA: alarma, revisión del entrenador, el cliente cambia sus respuestas: vuelve a pendiente (en Decisión de hoy, en la ficha y en la espera del cliente)', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  PLAN_SIN_NADA_MAS(fake)
  sembrarCuestionarioPendiente(fake)
  // 1. El cliente respondió que sí a una pregunta de alarma
  sembrarAdmision(fake, 1, 1000)
  await entrarComoEntrenador(page)
  const seccion = page.getByRole('region', { name: 'Decisión de hoy' })
  await expect(seccion.getByRole('listitem')).toHaveCount(1)

  // 2. El entrenador la marca como revisada
  await seccion.getByRole('button', { name: 'Abrir su ficha de admisión' }).click()
  const revision = page.getByRole('group', { name: 'Revisión del cuestionario de salud' })
  await revision.getByRole('button', { name: 'Marcar como revisado' }).click()
  await expect(revision.getByText(/Revisado el/)).toBeVisible()
  await expect(revision).toContainText('no certifica que pueda hacer cualquier entrenamiento')
  expect(fake.rows('checkins').filter(c => c.tipo === 'parq_revisado')).toHaveLength(1)

  // 3. El cliente vuelve a modificar sus respuestas (una ficha nueva, posterior, con otro «sí» más)
  const nuevas = respuestasCon(1, 4)
  fake.seed('checkins', { id: 'intake-nueva', clientId: ids.client, tipo: 'intake', createdAt: Date.now() + 60_000, respuestas: nuevas, huella: huellaAdmision(nuevas) })

  // 4. La admisión vuelve a aparecer como pendiente: en Decisión de hoy y en la ficha (con su botón)
  await page.reload()
  const filas = page.getByRole('region', { name: 'Decisión de hoy' }).getByRole('listitem')
  await expect(filas).toHaveCount(1)
  await expect(filas.nth(0)).toContainText('Revisar su cuestionario de salud')
  await page.getByRole('region', { name: 'Decisión de hoy' }).getByRole('button', { name: 'Abrir su ficha de admisión' }).click()
  const revision2 = page.getByRole('group', { name: 'Revisión del cuestionario de salud' })
  await expect(revision2.getByRole('button', { name: 'Marcar como revisado' })).toBeVisible()
  await expect(revision2.getByText(/Revisado el/)).toHaveCount(0)

  // 5. La revisión anterior no vale para las respuestas nuevas: el cliente vuelve a quedar en espera
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await entrarComoClienteSinEsperarEntreno(page)
  await expect(page.getByText('Tu entrenador está revisando tus respuestas de salud')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Programación inicial: general' })).toHaveCount(0)
  // …y la revisión vieja sigue ahí, sin haberse reutilizado
  expect(fake.rows('checkins').filter(c => c.tipo === 'parq_revisado')).toHaveLength(1)
})

test('CLIENTE: si edita su ficha EN EL SITIO (cambia las respuestas de la misma fila) la revisión anterior tampoco vale: el servidor recalcula la huella', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  sembrarCuestionarioPendiente(fake)
  sembrarAdmision(fake, 1, 1000)
  sembrarRevision(fake, 'rev-1', 5000, 1000)
  await entrarComoClienteSinEsperarEntreno(page)
  await expect(page.getByRole('heading', { name: 'Programación inicial: general' })).toBeVisible() // revisada: su cuestionario se abre

  // Cambia el contenido de la MISMA fila (como un UPDATE del cliente, que el trigger deja pasar para su ficha) y el servidor recalcula la huella
  const ficha = fake.rows('checkins').find(c => c.id === 'intake-1000')!
  ficha.respuestas = respuestasCon(1, 2)
  ficha.huella = huellaAdmision(ficha.respuestas)
  await page.goto(`/?c=${TOKEN}`)
  await expect(page.getByText('Tu entrenador está revisando tus respuestas de salud')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Programación inicial: general' })).toHaveCount(0)
})
