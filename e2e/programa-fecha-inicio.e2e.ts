import { test, expect } from './support/test'
import { seedWorld, samplePlan, ids, TOKEN, CLIENT_LOGIN } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'

const PEDRO = '44444444-4444-4444-8444-444444444444'

const fecha = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const lunesQueViene = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 7); return fecha(d) }

/** María lleva la etiqueta VIP; Pedro no. Un programa de una semana con un workout el lunes. */
function sembrar(fake: FakeSupabase) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('labels', { id: 'lab-vip', trainer_id: ids.trainer, name: 'VIP', color: '#a0522d', emoji: '⭐', survey_template_id: null, created_at: 1 })
  fake.rows('clientes').find(c => c.id === ids.client)!.label_ids = ['lab-vip']
  fake.seed('clientes', { id: PEDRO, trainerId: ids.trainer, name: 'Pedro', surname: 'Ruiz', token: 'tokenpedro', metricas_cliente: [], createdAt: Date.now() })
  fake.seed('plan_templates', {
    id: 'tmpl-1', trainer_id: ids.trainer, name: 'Fuerza 5x3', description: '', created_at: 1, updated_at: 1, label_ids: [],
    plan: { type: 'Fuerza', weeks: [{ label: 'Semana 1', rpe: '', isCurrent: false, days: [{ title: 'Día 1', focus: '', exercises: [{ name: 'Sentadilla', sets: '3x5', weight: '', comment: '', isMain: true }] }] }] },
  })
  fake.seed('programs', {
    id: 'prog-1', trainer_id: ids.trainer, name: 'Bloque de fuerza', tipo: 'Fuerza', label_ids: [], created_at: 1, updated_at: 1,
    weeks: [{ label: 'Semana 1', days: Array.from({ length: 7 }, (_, i) => ({ tasks: i === 0 ? [{ id: 't1', type: 'workout', title: 'Fuerza 5x3', data: { templateId: 'tmpl-1', templateName: 'Fuerza 5x3' } }] : [] })) }],
  })
}

test('asignar un programa a una etiqueta, empezando el lunes que viene', async ({ page, fake }) => {
  sembrar(fake)
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Programas')
  await page.getByRole('option', { name: 'Ir a Programas' }).click()
  await page.getByRole('button', { name: 'Asignar', exact: true }).click()

  const hoja = page.getByRole('dialog', { name: 'Asignar a varios' })
  await hoja.getByRole('button', { name: 'Por etiqueta' }).click()
  await hoja.getByRole('radio', { name: /VIP/ }).check()
  await expect(hoja.getByText('1 cliente', { exact: true })).toBeVisible()
  await hoja.getByRole('button', { name: 'El lunes que viene' }).click()
  await expect(hoja.getByLabel('Fecha de inicio')).toHaveValue(lunesQueViene())
  await hoja.getByRole('button', { name: 'Asignar a 1 cliente' }).click()
  await expect(page.getByText(/Programa asignado a 1\/1 cliente/)).toBeVisible()

  const plan = fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P
  expect(plan.programId).toBe('prog-1')
  expect(plan.fechaInicio).toBe(lunesQueViene())
  expect(fake.rows('planes').find(r => r.clientId === PEDRO)).toBeUndefined()
})

test('antes de la fecha de inicio el cliente ve cuándo empieza, no una sesión', async ({ page, fake }) => {
  sembrar(fake)
  fake.rows('planes').find(r => r.clientId === ids.client)!.plan = { P: { ...samplePlan(), fechaInicio: lunesQueViene() } }
  await page.goto(`/?c=${TOKEN}`)
  await page.getByPlaceholder('tu@email.com').fill(CLIENT_LOGIN.email)
  await page.getByPlaceholder('Mínimo 6 caracteres').fill(CLIENT_LOGIN.password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page.getByRole('heading', { name: /^Tu plan empieza el lunes/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Empezar entrenamiento' })).toHaveCount(0)
})
