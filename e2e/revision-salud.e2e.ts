import type { Page } from '@playwright/test'
import { test, expect as expectBase } from './support/test'
import { seedWorld, ids, TOKEN, CLIENT_LOGIN } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'
import { PARQ_QUESTIONS, respuestasDeAdmision } from '../src/lib/intakeQuestions'

// No todos los «sí» del cuestionario de salud pesan igual (lib/intakeQuestions: alarma, revisar, aclarar). Una señal de ALARMA retiene el cuestionario de programación
// del cliente (ni se abre solo, ni sale en Hoy, ni en su pestaña) hasta que el entrenador marca la ficha como revisada, y le sale una fila en «Decisión de hoy».
// Revisar y aclarar no retienen nada, solo piden al entrenador que lo mire. Los niveles y el estado de la revisión los prueban las unitarias; aquí, lo que se ve y se hace.

test.setTimeout(150_000) // la primera carga compila los trozos diferidos
const expect = expectBase.configure({ timeout: 30_000 })

const dia = (atras: number) => { const d = new Date(); d.setDate(d.getDate() - atras); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const PLAN_SIN_NADA_MAS = (fake: FakeSupabase) => { fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P.fechaInicio = dia(0) } // sin semanas completas, nada más entra en la lista

/** Una ficha de admisión ya rellenada con un «sí» en la pregunta `indice` del cuestionario de salud, con la fecha dada. */
function sembrarAdmision(fake: FakeSupabase, indice: number, createdAt = 1000) {
  const parq = Object.fromEntries(PARQ_QUESTIONS.map((_, i) => [i, i === indice]))
  fake.seed('checkins', { id: `intake-${createdAt}`, clientId: ids.client, tipo: 'intake', createdAt, respuestas: respuestasDeAdmision(parq, {}) })
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
  expect(fake.rows('checkins').filter(c => c.tipo === 'parq_revisado')).toMatchObject([{ clientId: ids.client, respuestas: [] }])

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

  // El entrenador la marca como revisada (una fila posterior a la ficha): ahora sí
  fake.seed('checkins', { id: 'rev-1', clientId: ids.client, tipo: 'parq_revisado', createdAt: 5000, respuestas: [] })
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

test('CLIENTE: si vuelve a rellenar la ficha después de una revisión, hay que volver a revisarla y queda en espera otra vez', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  sembrarCuestionarioPendiente(fake)
  sembrarAdmision(fake, 0, 3000)  // ficha nueva con un problema cardíaco…
  fake.seed('checkins', { id: 'rev-vieja', clientId: ids.client, tipo: 'parq_revisado', createdAt: 2000, respuestas: [] }) // …y una revisión ANTERIOR
  await entrarComoClienteSinEsperarEntreno(page)
  await expect(page.getByText('Tu entrenador está revisando tus respuestas de salud')).toBeVisible()
  await expect(page.getByRole('button', { name: /Tienes un cuestionario pendiente/ })).toHaveCount(0)
})
