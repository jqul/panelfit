import type { Page } from '@playwright/test'
import { test, expect as expectBase } from './support/test'
import { seedWorld, ids, TOKEN, CLIENT_LOGIN } from './support/seed'
import type { FakeSupabase } from './support/fakeSupabase'
import type { Pregunta } from '../src/lib/cuestionarios'
import { MODELOS_PROGRAMACION } from '../src/lib/modelosProgramacion'

// «¿Tienes ahora alguna molestia o dolor…?» (Sí/No): con «No» no se enseña nada más; con «Sí» se abre el seguimiento (dónde, desde cuándo, qué la empeora y qué movimientos evitas);
// si cambia de «Sí» a «No» el seguimiento se esconde y lo que hubiera escrito no se envía ni estorba a las obligatorias. La lógica la prueban las unitarias (lib/cuestionarios);
// aquí, lo que ve y envía el cliente, con la plantilla real del modelo y con una plantilla antigua que no tiene la condición.

test.setTimeout(150_000) // la primera carga compila los trozos diferidos
const expect = expectBase.configure({ timeout: 30_000 })

const modelo = MODELOS_PROGRAMACION.find(m => m.id === 'programacion-general')!
const DETALLE = /Si has contestado que sí/

function sembrar(fake: FakeSupabase, preguntas: Pregunta[], nombre = modelo.name) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('survey_templates', { id: 'tmpl-c', trainer_id: ids.trainer, name: nombre, questions: preguntas, created_at: 1, auto_nuevos_desde: null })
  fake.seed('survey_schedules', { id: 'sched-c', trainer_id: ids.trainer, template_id: 'tmpl-c', client_id: ids.client, frequency: 'once', day_of_week: 0, active: true, last_sent_at: null })
}
async function entrar(page: Page) {
  await page.goto(`/?c=${TOKEN}`)
  await page.getByPlaceholder('tu@email.com').fill(CLIENT_LOGIN.email)
  await page.getByPlaceholder('Mínimo 6 caracteres').fill(CLIENT_LOGIN.password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
}
const grupo = (page: Page, nombre: RegExp) => page.getByRole('radiogroup', { name: nombre })
const elegir = (page: Page, nombre: RegExp, opcion: string) => grupo(page, nombre).getByRole('radio', { name: opcion, exact: true }).click()
const seguimiento = (page: Page) => page.getByRole('textbox', { name: DETALLE })

/** Las obligatorias del modelo, salvo la de molestias (que cada prueba contesta como quiere). */
async function rellenarObligatorias(page: Page) {
  await elegir(page, /cuál es tu objetivo principal/i, 'Ganar músculo')
  await elegir(page, /cuánto tiempo llevas entrenando/i, 'De 6 meses a 2 años')
  await elegir(page, /como mínimo/i, '3')
  await elegir(page, /como máximo/i, '4')
  await elegir(page, /cuánto tiempo tienes por sesión/i, '60-75 min')
  await elegir(page, /dónde vas a entrenar/i, 'Gimnasio completo')
  await page.getByRole('group', { name: /con qué material cuentas/i }).getByRole('checkbox', { name: 'Mancuernas' }).click()
  await elegir(page, /qué quieres hacer con tu peso/i, 'Mantenerlo')
}
const molestias = (page: Page, opcion: 'Sí' | 'No') => elegir(page, /molestia o dolor/i, opcion)
const enviar = (page: Page) => page.getByRole('button', { name: /Enviar respuestas/ }).click()

test('«No» (o sin contestar) no enseña el seguimiento; «Sí» lo abre justo debajo y se puede escribir', async ({ page, fake }) => {
  sembrar(fake, modelo.questions)
  await entrar(page)
  await expect(page.getByRole('heading', { name: 'Programación inicial: general' })).toBeVisible()
  // Todavía sin contestar: no está
  await expect(grupo(page, /molestia o dolor/i)).toBeVisible()
  await expect(seguimiento(page)).toHaveCount(0)
  // «No»: sigue sin estar
  await molestias(page, 'No')
  await expect(seguimiento(page)).toHaveCount(0)
  // «Sí»: se abre el seguimiento, y se puede escribir
  await molestias(page, 'Sí')
  await expect(seguimiento(page)).toBeVisible()
  await seguimiento(page).fill('Hombro derecho, desde hace dos semanas; me duele al empujar y evito el press militar')
  await expect(seguimiento(page)).toHaveValue(/Hombro derecho/)
})

test('con «Sí» y el seguimiento escrito, se envía con su respuesta', async ({ page, fake }) => {
  sembrar(fake, modelo.questions)
  await entrar(page)
  await rellenarObligatorias(page)
  await molestias(page, 'Sí')
  await seguimiento(page).fill('Rodilla izquierda, hace un mes; me duele al bajar escaleras')
  await enviar(page)
  await expect(page.getByRole('heading', { name: '¡Enviado!' })).toBeVisible()
  expect(fake.rows('survey_responses')).toHaveLength(1)
  expect(fake.rows('survey_responses')[0].answers).toMatchObject({ molestias: true, molestias_detalle: 'Rodilla izquierda, hace un mes; me duele al bajar escaleras' })
})

test('de «Sí» a «No»: el seguimiento se esconde y lo escrito NO se envía; si vuelve a «Sí», reaparece tal como lo dejó', async ({ page, fake }) => {
  sembrar(fake, modelo.questions)
  await entrar(page)
  await rellenarObligatorias(page)
  await molestias(page, 'Sí')
  await seguimiento(page).fill('Lo escribí pensando que sí')
  // Cambia de idea
  await molestias(page, 'No')
  await expect(seguimiento(page)).toHaveCount(0)
  // Mientras no lo envíe, no se pierde por un clic de más: al volver a «Sí» está como lo dejó
  await molestias(page, 'Sí')
  await expect(seguimiento(page)).toHaveValue('Lo escribí pensando que sí')
  await molestias(page, 'No')
  await expect(seguimiento(page)).toHaveCount(0)
  // Y al enviar con «No», lo escondido no va
  await enviar(page)
  await expect(page.getByRole('heading', { name: '¡Enviado!' })).toBeVisible()
  const respuestas = fake.rows('survey_responses')[0].answers as Record<string, unknown>
  expect(respuestas.molestias).toBe(false)
  expect(respuestas).not.toHaveProperty('molestias_detalle')
  expect(JSON.stringify(respuestas)).not.toContain('pensando que sí')
})

test('las preguntas se numeran seguidas: sin el seguimiento no queda un hueco, con él se cuenta', async ({ page, fake }) => {
  sembrar(fake, modelo.questions)
  await entrar(page)
  await expect(grupo(page, /molestia o dolor/i)).toBeVisible()
  const numeros = async () => (await page.locator('[id^="preg-"] > p').allTextContents()).map(t => Number(t.match(/^(\d+)\./)?.[1]))
  const sinSeguimiento = await numeros()
  expect(sinSeguimiento).toHaveLength(modelo.questions.length - 1)
  expect(sinSeguimiento).toEqual(sinSeguimiento.map((_, i) => i + 1))
  await molestias(page, 'Sí')
  await expect(seguimiento(page)).toBeVisible()
  const conSeguimiento = await numeros()
  expect(conSeguimiento).toHaveLength(modelo.questions.length)
  expect(conSeguimiento).toEqual(conSeguimiento.map((_, i) => i + 1))
})

test('una plantilla antigua, sin la condición, sigue enseñando siempre el seguimiento y guarda lo que se escriba (no se rompe nada de antes)', async ({ page, fake }) => {
  const antigua = modelo.questions.map(({ mostrarSi: _quitada, ...q }) => q as Pregunta)
  expect(antigua.some(q => 'mostrarSi' in q)).toBe(false)
  sembrar(fake, antigua)
  await entrar(page)
  await expect(grupo(page, /molestia o dolor/i)).toBeVisible()
  await expect(seguimiento(page)).toBeVisible() // como siempre: está desde el principio
  await rellenarObligatorias(page)
  await molestias(page, 'No')
  await expect(seguimiento(page)).toBeVisible() // y con «No» tampoco se esconde
  await seguimiento(page).fill('Texto escrito en una plantilla de antes')
  await enviar(page)
  await expect(page.getByRole('heading', { name: '¡Enviado!' })).toBeVisible()
  expect(fake.rows('survey_responses')[0].answers).toMatchObject({ molestias: false, molestias_detalle: 'Texto escrito en una plantilla de antes' })
})

const CON_OBLIGATORIA: Pregunta[] = [
  { id: 'dolor', type: 'yesno', label: '¿Te duele algo ahora mismo?', required: true },
  { id: 'donde', type: 'text', label: 'Cuéntanos dónde te duele', required: true, mostrarSi: { id: 'dolor', es: true } },
]

test('un seguimiento obligatorio que está escondido no bloquea el envío', async ({ page, fake }) => {
  sembrar(fake, CON_OBLIGATORIA, 'Con seguimiento obligatorio')
  await entrar(page)
  await elegir(page, /te duele algo/i, 'No')
  await expect(page.getByRole('textbox', { name: /dónde te duele/ })).toHaveCount(0)
  await enviar(page)
  await expect(page.getByRole('heading', { name: '¡Enviado!' })).toBeVisible()
  expect(fake.rows('survey_responses')[0].answers).toEqual({ dolor: false })
})

test('y cuando aparece con «Sí», sí se exige: no se envía hasta contestarlo', async ({ page, fake }) => {
  sembrar(fake, CON_OBLIGATORIA, 'Con seguimiento obligatorio')
  await entrar(page)
  await elegir(page, /te duele algo/i, 'Sí')
  await expect(page.getByRole('textbox', { name: /dónde te duele/ })).toBeVisible()
  await enviar(page)
  await expect(page.getByText('Esta pregunta es obligatoria')).toBeVisible()
  expect(fake.rows('survey_responses')).toHaveLength(0)
  await page.getByRole('textbox', { name: /dónde te duele/ }).fill('El hombro')
  await enviar(page)
  await expect(page.getByRole('heading', { name: '¡Enviado!' })).toBeVisible()
  expect(fake.rows('survey_responses')[0].answers).toEqual({ dolor: true, donde: 'El hombro' })
})
