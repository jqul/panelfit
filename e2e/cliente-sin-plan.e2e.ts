import type { Page } from '@playwright/test'
import { test, expect as expectBase } from './support/test'
import { seedWorld, ids, TOKEN, CLIENT_LOGIN } from './support/seed'
import type { FakeSupabase } from './support/fakeSupabase'
import { PARQ_QUESTIONS, respuestasDeAdmision } from '../src/lib/intakeQuestions'
import { respuestasDeRevision } from '../src/lib/retencionParq'
import { huellaAdmision } from './support/huellaServidor'

// Un cliente recién creado todavía NO tiene plan, y es justo quien tiene pendiente lo del registro: su cuestionario de programación (que se abre solo la primera vez),
// la espera por una señal de alarma y los datos básicos sin guardar. Esos avisos no dependen de que haya plan: aquí se prueba lo mismo CON plan y SIN plan.

test.setTimeout(150_000) // la primera carga compila los trozos diferidos
const expect = expectBase.configure({ timeout: 30_000 })

const sinAlarma = () => respuestasDeAdmision(Object.fromEntries(PARQ_QUESTIONS.map((_, i) => [i, false])), {})
const conAlarma = () => respuestasDeAdmision(Object.fromEntries(PARQ_QUESTIONS.map((_, i) => [i, i === 2])), {}) // dolor en el pecho en reposo

/** La ficha de admisión de María (la huella de una ficha la pone el SERVIDOR al guardarla: aquí, que se siembra sin pasar por él, se pone como lo haría). */
function sembrarAdmision(fake: FakeSupabase, respuestas: ReturnType<typeof sinAlarma>, createdAt = 1000) {
  fake.seed('checkins', { id: `intake-${createdAt}`, clientId: ids.client, tipo: 'intake', createdAt, respuestas, huella: huellaAdmision(respuestas) })
}
function sembrarRevision(fake: FakeSupabase, id: string, createdAt: number, deAdmisionEn: number) {
  const ficha = fake.rows('checkins').find(c => c.id === `intake-${deAdmisionEn}`)!
  fake.seed('checkins', { id, clientId: ids.client, tipo: 'parq_revisado', createdAt, respuestas: respuestasDeRevision(ficha.id), huella: huellaAdmision(ficha.respuestas) })
}
function sembrarCuestionarioPendiente(fake: FakeSupabase) {
  fake.seed('survey_templates', { id: 'tmpl-x', trainer_id: ids.trainer, name: 'Programación inicial: general', questions: [{ id: 'objetivo', type: 'short', label: 'Tu objetivo', required: true }], created_at: 1, auto_nuevos_desde: null })
  fake.seed('survey_schedules', { id: 'sched-x', trainer_id: ids.trainer, template_id: 'tmpl-x', client_id: ids.client, frequency: 'once', day_of_week: 0, active: true, last_sent_at: null })
}
/** María con su cuenta y, si no tiene plan, sin el plan que siembra `seedWorld`. */
function sembrarMundo(fake: FakeSupabase, conPlan: boolean) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  if (!conPlan) fake.rows('planes').length = 0
}
async function entrarComoCliente(page: Page, url = `/?c=${TOKEN}`) {
  await page.goto(url)
  await page.getByPlaceholder('tu@email.com').fill(CLIENT_LOGIN.email)
  await page.getByPlaceholder('Mínimo 6 caracteres').fill(CLIENT_LOGIN.password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
}
/** Lo que se ve en Hoy cuando no se abre ningún cuestionario: su entreno si tiene plan, y «Sin plan asignado» si no. */
const pantallaBaseDeHoy = (page: Page, conPlan: boolean) => conPlan ? page.getByRole('button', { name: 'Empezar entrenamiento' }) : page.getByText('Sin plan asignado')

for (const conPlan of [true, false]) {
  const quien = conPlan ? 'CON plan' : 'SIN plan'

  test(`${quien}: su cuestionario de programación se abre solo la primera vez y después queda el aviso en Hoy`, async ({ page, fake }) => {
    sembrarMundo(fake, conPlan)
    sembrarCuestionarioPendiente(fake)
    sembrarAdmision(fake, sinAlarma())
    await entrarComoCliente(page)
    // La primera vez, lo primero que ve es el cuestionario
    await expect(page.getByRole('heading', { name: 'Programación inicial: general' })).toBeVisible()

    // La segunda ya no se abre solo (una vez por dispositivo): Hoy, con el aviso para volver a él
    await page.goto(`/?c=${TOKEN}`)
    await expect(pantallaBaseDeHoy(page, conPlan)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Programación inicial: general' })).toHaveCount(0)
    const aviso = page.getByRole('button', { name: /Tienes un cuestionario pendiente/ })
    await expect(aviso).toBeVisible()
    await aviso.click()
    await expect(page.getByRole('heading', { name: 'Programación inicial: general' })).toBeVisible()
  })

  test(`${quien}: con una señal de alarma sin revisar su cuestionario queda en espera (con un texto tranquilo); al revisarla, se abre`, async ({ page, fake }) => {
    sembrarMundo(fake, conPlan)
    sembrarCuestionarioPendiente(fake)
    sembrarAdmision(fake, conAlarma())
    await entrarComoCliente(page)

    await expect(pantallaBaseDeHoy(page, conPlan)).toBeVisible()
    await expect(page.getByText('Tu entrenador está revisando tus respuestas de salud')).toBeVisible()
    await expect(page.getByRole('button', { name: /Tienes un cuestionario pendiente/ })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Programación inicial: general' })).toHaveCount(0)

    // El entrenador marca la ficha como leída (con la huella de ESA ficha): ahora sí se abre
    sembrarRevision(fake, 'rev-1', 5000, 1000)
    await page.goto(`/?c=${TOKEN}`)
    await expect(page.getByRole('heading', { name: 'Programación inicial: general' })).toBeVisible()
  })

  test(`${quien}: los datos básicos que no se pudieron guardar siguen a la vista en Hoy y se pueden reintentar`, async ({ page, fake }) => {
    sembrarMundo(fake, conPlan)
    // Lo que deja el registro cuando la función de la base de datos no respondió
    await page.addInitScript(([clave, valores]) => localStorage.setItem(clave, valores), [
      `pf_datos_basicos_pendientes_${ids.client}`,
      JSON.stringify({ genero: 'm', nacimiento: '1995-03-10', altura: 168, peso: 64, guardadoEn: Date.now() }),
    ])
    await entrarComoCliente(page)

    await expect(pantallaBaseDeHoy(page, conPlan)).toBeVisible()
    const tarjeta = page.getByRole('status').filter({ hasText: 'Tus datos básicos están pendientes de guardar' })
    await expect(tarjeta).toBeVisible()
    await tarjeta.getByRole('button', { name: 'Reintentar' }).click()
    await expect(tarjeta).toHaveCount(0)
    expect(fake.rows('clientes').find(c => c.id === ids.client)).toMatchObject({ genero: 'm', fechanacimiento: '1995-03-10', altura: 168, weight: 64 })
    expect(fake.rows('registros_peso')).toHaveLength(1)
  })
}
