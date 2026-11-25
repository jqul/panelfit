import type { Page } from '@playwright/test'
import { test, expect as expectBase } from './support/test'
import { seedWorld, ids, TOKEN, CLIENT_LOGIN } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'
import { MODELOS_PROGRAMACION } from '../src/lib/modelosProgramacion'

// El flujo: se crea el cliente con solo nombre (y teléfono), el entrenador elige qué cuestionario de programación recibe, y la primera vez que el cliente entra se le abre solo.
// El contenido de los cuestionarios y sus reglas los prueba la unitaria (lib/modelosProgramacion.test); aquí, que se crean y se envían, y que el cliente los recibe y los contesta.

test.setTimeout(150_000) // la primera carga compila los trozos diferidos
const expect = expectBase.configure({ timeout: 30_000 })

const modelo = (id: string) => MODELOS_PROGRAMACION.find(m => m.id === id)!

async function crearCliente(page: Page, nombre: string, cuestionario?: string) {
  await page.getByRole('button', { name: 'Nuevo cliente', exact: true }).first().click()
  await page.getByPlaceholder('Nombre', { exact: true }).fill(nombre)
  if (cuestionario !== undefined) await page.getByLabel('Cuestionario de programación').selectOption(cuestionario)
  await page.getByRole('button', { name: 'Crear cliente' }).click()
}

test('un cliente nuevo recibe por defecto el cuestionario general: se crea la plantilla del entrenador y un envío único para él', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: 'Nuevo cliente', exact: true }).first().click()
  await expect(page.getByLabel('Cuestionario de programación')).toHaveValue('programacion-general')
  await page.getByPlaceholder('Nombre', { exact: true }).fill('Pedro')
  await page.getByRole('button', { name: 'Crear cliente' }).click()
  await expect.poll(() => fake.rows('survey_schedules').length).toBe(1)

  const pedro = fake.rows('clientes').find(c => c.name === 'Pedro')!
  const plantilla = fake.rows('survey_templates')[0]
  expect(plantilla).toMatchObject({ trainer_id: ids.trainer, name: 'Programación inicial: general' })
  expect(plantilla.questions).toHaveLength(modelo('programacion-general').questions.length)
  expect(fake.rows('survey_schedules')[0]).toMatchObject({ trainer_id: ids.trainer, template_id: plantilla.id, client_id: pedro.id, frequency: 'once', active: true })
})

test('se puede elegir el enfoque (rehabilitación) y, con «No enviar», no se crea nada', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoEntrenador(page)
  await crearCliente(page, 'Rosa', 'programacion-rehabilitacion')
  await expect.poll(() => fake.rows('survey_schedules').length).toBe(1)
  expect(fake.rows('survey_templates').map(t => t.name)).toEqual(['Programación inicial: rehabilitación'])
  // Al crear el cliente se abre el asistente «Primer cliente» (carga diferida), y aparece DESPUÉS de que el servidor reciba el envío. Hay que esperar a que exista para cerrarlo: un
  // Escape suelto puede llegar antes, no cerrar nada, y el asistente aparecer justo después y tapar el siguiente «Nuevo cliente» (el clic se queda esperando hasta el límite del test).
  const asistente = page.getByRole('dialog', { name: 'Primer cliente' })
  await expect(asistente).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(asistente).toHaveCount(0)

  await crearCliente(page, 'Luis', '')
  await expect.poll(() => fake.rows('clientes').some(c => c.name === 'Luis')).toBe(true)
  expect(fake.rows('survey_schedules')).toHaveLength(1) // solo el de Rosa
})

test('si el entrenador ya tiene (y editó) esa plantilla, se reutiliza tal cual: solo se programa el envío', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('survey_templates', { id: 'tmpl-fuerza', trainer_id: ids.trainer, name: 'Programación inicial: fuerza', questions: [{ id: 'objetivo', type: 'short', label: 'Mi pregunta editada', required: true }], created_at: 1, auto_nuevos_desde: null })
  await entrarComoEntrenador(page)
  await crearCliente(page, 'Marcos', 'programacion-fuerza')
  await expect.poll(() => fake.rows('survey_schedules').length).toBe(1)
  expect(fake.rows('survey_templates')).toHaveLength(1)
  expect(fake.rows('survey_templates')[0].questions).toEqual([{ id: 'objetivo', type: 'short', label: 'Mi pregunta editada', required: true }])
  expect(fake.rows('survey_schedules')[0]).toMatchObject({ template_id: 'tmpl-fuerza', frequency: 'once' })
})

// ── El cliente ──
async function entrarYVerElCuestionario(page: Page) {
  await page.goto(`/?c=${TOKEN}`)
  await page.getByPlaceholder('tu@email.com').fill(CLIENT_LOGIN.email)
  await page.getByPlaceholder('Mínimo 6 caracteres').fill(CLIENT_LOGIN.password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
}

function sembrarEnvioPendiente(fake: FakeSupabase) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const m = modelo('programacion-general')
  fake.seed('survey_templates', { id: 'tmpl-gen', trainer_id: ids.trainer, name: m.name, questions: m.questions, created_at: 1, auto_nuevos_desde: null })
  fake.seed('survey_schedules', { id: 'sched-1', trainer_id: ids.trainer, template_id: 'tmpl-gen', client_id: ids.client, frequency: 'once', day_of_week: 0, active: true, last_sent_at: null })
}

test('la primera vez que el cliente entra, el cuestionario se abre solo; el avance se guarda y al enviarlo se borra', async ({ page, fake }) => {
  sembrarEnvioPendiente(fake)
  await entrarYVerElCuestionario(page)
  // Lo primero que ve es el cuestionario, no su entreno
  await expect(page.getByRole('heading', { name: 'Programación inicial: general' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Empezar entrenamiento' })).toHaveCount(0)

  // Contesta una pregunta y recarga: la segunda vez ya no se abre solo, pero el aviso lo recupera tal como lo dejó
  await page.getByRole('radiogroup', { name: /cuál es tu objetivo principal/i }).getByRole('radio', { name: 'Ganar músculo' }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Empezar entrenamiento' })).toBeVisible()
  await page.getByRole('button', { name: /Tienes un cuestionario pendiente/ }).click()
  await expect(page.getByRole('radiogroup', { name: /cuál es tu objetivo principal/i }).getByRole('radio', { name: 'Ganar músculo' })).toHaveAttribute('aria-checked', 'true')

  // Responde lo obligatorio y lo envía
  const g = (nombre: RegExp, opcion: string) => page.getByRole('radiogroup', { name: nombre }).getByRole('radio', { name: opcion, exact: true }).click()
  await g(/cuánto tiempo llevas entrenando/i, 'De 6 meses a 2 años')
  await g(/como mínimo/i, '3')
  await g(/como máximo/i, '4')
  await g(/cuánto tiempo tienes por sesión/i, '60-75 min')
  await g(/dónde vas a entrenar/i, 'Gimnasio completo')
  await page.getByRole('group', { name: /con qué material cuentas/i }).getByRole('checkbox', { name: 'Mancuernas' }).click()
  await g(/molestia o dolor/i, 'No')
  await g(/qué quieres hacer con tu peso/i, 'Mantenerlo')
  await page.getByRole('button', { name: /Enviar respuestas/ }).click()
  await expect(page.getByRole('heading', { name: '¡Enviado!' })).toBeVisible()

  expect(fake.rows('survey_responses')).toHaveLength(1)
  expect(fake.rows('survey_responses')[0]).toMatchObject({ client_id: ids.client, template_id: 'tmpl-gen', schedule_id: 'sched-1' })
  expect(fake.rows('survey_responses')[0].answers).toMatchObject({ objetivo: 'Ganar músculo', dias_min: '3', dias_max: '4', cambio_peso: 'Mantenerlo', molestias: false })
  // Ya no queda el avance guardado en el dispositivo
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('pf_cuestionario_avance_')))).toEqual([])
})

test('sin ningún cuestionario pendiente el cliente entra como siempre, a su entreno', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarYVerElCuestionario(page)
  await expect(page.getByRole('button', { name: 'Empezar entrenamiento' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Programación inicial/ })).toHaveCount(0)
})
