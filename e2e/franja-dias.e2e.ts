import type { Page } from '@playwright/test'
import { test, expect as expectBase } from './support/test'
import { seedWorld, ids, TOKEN, CLIENT_LOGIN } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'
import type { Pregunta } from '../src/lib/cuestionarios'
import { MODELOS_PROGRAMACION } from '../src/lib/modelosProgramacion'

// Los días por semana son una FRANJA: dos preguntas obligatorias (mínimo y máximo, de 1 a 7) y el máximo no puede ser menor que el mínimo. La regla la prueban las unitarias
// (lib/cuestionarios y lib/modelosProgramacion); aquí, lo que ve y envía el cliente con la plantilla real del modelo, una plantilla antigua que todavía tiene la cifra única, y
// cómo ve el entrenador una respuesta antigua (con `dias`) en una plantilla que ya tiene la franja.

test.setTimeout(150_000) // la primera carga compila los trozos diferidos
const expect = expectBase.configure({ timeout: 30_000 })

const modelo = MODELOS_PROGRAMACION.find(m => m.id === 'programacion-general')!
const MENSAJE = 'El máximo no puede ser menor que el mínimo'

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
const minimo = (page: Page, v: string) => elegir(page, /como mínimo/i, v)
const maximo = (page: Page, v: string) => elegir(page, /como máximo/i, v)
const enviar = (page: Page) => page.getByRole('button', { name: /Enviar respuestas/ }).click()

/** Las obligatorias del modelo salvo los días (cada prueba contesta la franja como quiere). */
async function rellenarSinDias(page: Page) {
  await elegir(page, /cuál es tu objetivo principal/i, 'Ganar músculo')
  await elegir(page, /cuánto tiempo llevas entrenando/i, 'De 6 meses a 2 años')
  await elegir(page, /cuánto tiempo tienes por sesión/i, '60-75 min')
  await elegir(page, /dónde vas a entrenar/i, 'Gimnasio completo')
  await page.getByRole('group', { name: /con qué material cuentas/i }).getByRole('checkbox', { name: 'Mancuernas' }).click()
  await elegir(page, /molestia o dolor/i, 'No')
  await elegir(page, /qué quieres hacer con tu peso/i, 'Mantenerlo')
}
const respuesta = (fake: FakeSupabase) => fake.rows('survey_responses')[0].answers as Record<string, unknown>

test('son dos preguntas, de 1 a 7 cada una, obligatorias y contestables por separado', async ({ page, fake }) => {
  sembrar(fake, modelo.questions)
  await entrar(page)
  await expect(grupo(page, /como mínimo/i)).toBeVisible()
  await expect(grupo(page, /como máximo/i)).toBeVisible()
  for (const g of [/como mínimo/i, /como máximo/i]) {
    await expect(grupo(page, g).getByRole('radio')).toHaveText(['1', '2', '3', '4', '5', '6', '7'])
  }
  // Ya no hay la pregunta de una sola cifra
  await expect(page.getByText('¿Cuántos días por semana puedes entrenar de verdad?')).toHaveCount(0)
  // Sin contestar ninguna de las dos, no se envía
  await rellenarSinDias(page)
  await enviar(page)
  await expect(page.getByText('Esta pregunta es obligatoria').first()).toBeVisible()
  expect(fake.rows('survey_responses')).toHaveLength(0)
  // Contestar solo el mínimo tampoco basta
  await minimo(page, '3')
  await enviar(page)
  await expect(page.getByText('Esta pregunta es obligatoria')).toHaveCount(1)
  expect(fake.rows('survey_responses')).toHaveLength(0)
})

test('máximo menor que el mínimo: se avisa en la pregunta, no se envía, y al corregirlo se envía', async ({ page, fake }) => {
  sembrar(fake, modelo.questions)
  await entrar(page)
  await rellenarSinDias(page)
  await minimo(page, '4')
  await maximo(page, '3')
  await enviar(page)
  await expect(page.getByRole('alert').filter({ hasText: MENSAJE })).toBeVisible()
  expect(fake.rows('survey_responses')).toHaveLength(0)
  // Corrige el máximo
  await maximo(page, '5')
  await expect(page.getByRole('alert').filter({ hasText: MENSAJE })).toHaveCount(0)
  await enviar(page)
  await expect(page.getByRole('heading', { name: '¡Enviado!' })).toBeVisible()
  expect(respuesta(fake)).toMatchObject({ dias_min: '4', dias_max: '5' })
  expect(respuesta(fake)).not.toHaveProperty('dias')
})

test('también se corrige cambiando el mínimo: bajarlo por debajo del máximo quita el aviso', async ({ page, fake }) => {
  sembrar(fake, modelo.questions)
  await entrar(page)
  await rellenarSinDias(page)
  await minimo(page, '6')
  await maximo(page, '3')
  await enviar(page)
  await expect(page.getByRole('alert').filter({ hasText: MENSAJE })).toBeVisible()
  await minimo(page, '2')
  await expect(page.getByRole('alert').filter({ hasText: MENSAJE })).toHaveCount(0)
  await enviar(page)
  await expect(page.getByRole('heading', { name: '¡Enviado!' })).toBeVisible()
  expect(respuesta(fake)).toMatchObject({ dias_min: '2', dias_max: '3' })
})

test('los extremos valen: de 1 a 7', async ({ page, fake }) => {
  sembrar(fake, modelo.questions)
  await entrar(page)
  await rellenarSinDias(page)
  await minimo(page, '1')
  await maximo(page, '7')
  await enviar(page)
  await expect(page.getByRole('heading', { name: '¡Enviado!' })).toBeVisible()
  expect(respuesta(fake)).toMatchObject({ dias_min: '1', dias_max: '7' })
})

test('mínimo igual al máximo (siempre los mismos días) se envía sin aviso', async ({ page, fake }) => {
  sembrar(fake, modelo.questions)
  await entrar(page)
  await rellenarSinDias(page)
  await minimo(page, '4')
  await maximo(page, '4')
  await expect(page.getByRole('alert').filter({ hasText: MENSAJE })).toHaveCount(0)
  await enviar(page)
  await expect(page.getByRole('heading', { name: '¡Enviado!' })).toBeVisible()
  expect(respuesta(fake)).toMatchObject({ dias_min: '4', dias_max: '4' })
})

test('una plantilla antigua, con la cifra única de días, sigue funcionando y guarda `dias` (no se rompe nada de antes)', async ({ page, fake }) => {
  const antigua: Pregunta[] = modelo.questions.flatMap(q => q.id === 'dias_min'
    ? [{ id: 'dias', type: 'choice', label: '¿Cuántos días por semana puedes entrenar de verdad?', required: true, options: ['2', '3', '4', '5', '6'] } as Pregunta]
    : q.id === 'dias_max' ? [] : [q])
  expect(antigua.some(q => q.id === 'dias_min' || q.id === 'dias_max')).toBe(false)
  sembrar(fake, antigua, 'Plantilla de antes')
  await entrar(page)
  await expect(grupo(page, /cuántos días por semana/i)).toBeVisible()
  await expect(grupo(page, /como mínimo/i)).toHaveCount(0)
  await rellenarSinDias(page)
  await elegir(page, /cuántos días por semana/i, '3')
  await enviar(page)
  await expect(page.getByRole('heading', { name: '¡Enviado!' })).toBeVisible()
  expect(respuesta(fake)).toMatchObject({ dias: '3' })
  expect(respuesta(fake)).not.toHaveProperty('dias_min')
})

test('el entrenador ve la respuesta antigua (`dias`) aunque la plantilla ya tenga la franja, y la nueva en sus dos preguntas', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('survey_templates', { id: 'tmpl-c', trainer_id: ids.trainer, name: modelo.name, questions: modelo.questions, created_at: 1, auto_nuevos_desde: null })
  fake.seed('survey_responses', { id: 'r-vieja', trainer_id: ids.trainer, client_id: ids.client, template_id: 'tmpl-c', schedule_id: null, completed_at: Date.UTC(2026, 10, 1, 10), answers: { objetivo: 'Perder grasa', dias: '4' } })
  fake.seed('survey_responses', { id: 'r-nueva', trainer_id: ids.trainer, client_id: ids.client, template_id: 'tmpl-c', schedule_id: null, completed_at: Date.UTC(2026, 10, 20, 10), answers: { objetivo: 'Ganar músculo', dias_min: '3', dias_max: '5' } })
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Encuestas')
  await page.getByRole('option', { name: 'Ir a Encuestas' }).click()
  await page.getByRole('button', { name: /^Respuestas/ }).click()
  // La antigua: su cifra sigue a la vista, con el enunciado de entonces y marcada como pregunta que ya no está
  await page.getByText('1 de noviembre de 2026').click()
  await expect(page.getByText('¿Cuántos días por semana puedes entrenar de verdad? (pregunta anterior: una sola cifra)')).toBeVisible()
  await expect(page.getByText('ya no está en este cuestionario')).toBeVisible()
  // La nueva: en sus dos preguntas
  await page.getByText('20 de noviembre de 2026').click()
  // (el resumen de resultados de arriba también lista las preguntas: se mira solo la tarjeta de esa respuesta)
  const nueva = page.locator('div.rounded-xl.overflow-hidden').filter({ has: page.getByRole('button', { name: /Imprimir la respuesta de/ }) }).filter({ hasText: '20 de noviembre de 2026' })
  await expect(nueva).toContainText(/como MÍNIMO/)
  await expect(nueva).toContainText(/como MÁXIMO/)
  await expect(nueva.locator('p.font-semibold')).toContainText(['Ganar músculo', '3', '5'])
  await expect(nueva).not.toContainText('ya no está en este cuestionario')
})
