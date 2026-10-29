import { test, expect } from './support/test'
import { seedWorld, samplePlan, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import { programToPlanWeeks } from '../src/lib/programPlan'
import type { FakeSupabase } from './support/fakeSupabase'
import type { Page } from '@playwright/test'

const PEDRO = '44444444-4444-4444-8444-444444444444'

const WORKOUT = {
  type: 'Fuerza',
  weeks: [{ label: 'Semana 1', rpe: '', isCurrent: false, days: [
    { title: 'Día 1', focus: '', exercises: [{ name: 'Sentadilla', sets: '3x5', weight: '', comment: '', isMain: true }] },
    { title: 'Día 2', focus: '', exercises: [{ name: 'Peso muerto', sets: '3x5', weight: '', comment: '', isMain: true }] },
  ] }],
}
const tarea = (id: string) => ({ id, type: 'workout', title: 'Fuerza 5x3', data: { templateId: 'tmpl-1', templateName: 'Fuerza 5x3' } })
// Una semana: el workout el lunes y el miércoles.
const PROGRAMA_WEEKS = [{ label: 'Semana 1', days: Array.from({ length: 7 }, (_, i) => ({ tasks: i === 0 ? [tarea('t1')] : i === 2 ? [tarea('t2')] : [] })) }]

const lunesQueViene = () => {
  const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** María y Pedro tienen el programa asignado (Pedro con un borrador sin publicar); empieza el lunes que viene. */
function sembrar(fake: FakeSupabase) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('plan_templates', { id: 'tmpl-1', trainer_id: ids.trainer, name: 'Fuerza 5x3', description: '', created_at: 1, updated_at: 1, label_ids: [], plan: WORKOUT })
  fake.seed('programs', { id: 'prog-1', trainer_id: ids.trainer, name: 'Bloque de fuerza', tipo: 'Fuerza', label_ids: [], weeks: PROGRAMA_WEEKS, created_at: 1, updated_at: 1 })
  fake.seed('programs', { id: 'prog-2', trainer_id: ids.trainer, name: 'Sin asignar', tipo: 'Fuerza', label_ids: [], weeks: PROGRAMA_WEEKS, created_at: 2, updated_at: 2 })
  const weeks = programToPlanWeeks(PROGRAMA_WEEKS, { 'tmpl-1': WORKOUT as any }).weeks
  const plan = (clientId: string) => ({ ...samplePlan(), clientId, fechaInicio: lunesQueViene(), programId: 'prog-1', programName: 'Bloque de fuerza', weeks })
  fake.rows('planes').find(r => r.clientId === ids.client)!.plan = { P: plan(ids.client) }
  fake.seed('clientes', { id: PEDRO, trainerId: ids.trainer, name: 'Pedro', surname: 'Ruiz', token: 'tokenpedro', metricas_cliente: [], createdAt: Date.now() })
  fake.seed('planes', { clientId: PEDRO, plan: { P: plan(PEDRO) }, updatedAt: 1000, borrador_activo: true, plan_borrador: { P: plan(PEDRO) } })
}

const diasDe = (fake: FakeSupabase, id: string) => fake.rows('planes').find(r => r.clientId === id)!.plan.P.weeks[0].days as { exercises: { name: string }[] }[]

async function editarPrograma(page: Page, nombre: string) {
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Programas')
  await page.getByRole('option', { name: 'Ir a Programas' }).click()
  await page.getByText(nombre, { exact: true }).click()
  // Quita el workout del miércoles y guarda
  await page.getByRole('button', { name: 'Quitar la tarea "Fuerza 5x3"' }).nth(1).click()
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
}

test('al editar un programa asignado se lleva el cambio a quien se elija, con copia y deshacer', async ({ page, fake }) => {
  sembrar(fake)
  await editarPrograma(page, 'Bloque de fuerza')

  const hoja = page.getByRole('dialog', { name: '¿Llevas el cambio a tus clientes?' })
  await expect(hoja).toBeVisible()
  await expect(hoja.getByRole('checkbox', { name: /María García/ })).toBeChecked()
  // Pedro tiene un borrador abierto: no se le puede tocar
  await expect(hoja.getByRole('checkbox', { name: /Pedro Ruiz/ })).toBeDisabled()
  await expect(hoja.getByText('Tiene un borrador sin publicar: no se toca')).toBeVisible()

  await hoja.getByRole('button', { name: 'Actualizar a 1 cliente' }).click()
  await expect(hoja.getByRole('button', { name: 'Deshacer' })).toBeVisible()

  // María: el miércoles ya no tiene el workout; sigue siendo el mismo programa. Pedro, intacto.
  expect(diasDe(fake, ids.client)[2].exercises).toHaveLength(0)
  expect(diasDe(fake, ids.client)[0].exercises[0].name).toBe('Sentadilla')
  expect(fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P.programId).toBe('prog-1')
  expect(diasDe(fake, PEDRO)[2].exercises[0].name).toBe('Peso muerto')
  expect(fake.rows('plan_history').filter(r => r.clientId === ids.client)).toHaveLength(1)

  await hoja.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByText(/Plan anterior restaurado en 1 cliente/)).toBeVisible()
  expect(diasDe(fake, ids.client)[2].exercises[0].name).toBe('Peso muerto')
})

test('«Solo el programa» no toca a nadie, y un programa sin clientes no pregunta', async ({ page, fake }) => {
  sembrar(fake)
  const antes = JSON.stringify(fake.rows('planes'))
  await editarPrograma(page, 'Bloque de fuerza')
  await page.getByRole('dialog', { name: '¿Llevas el cambio a tus clientes?' }).getByRole('button', { name: 'Solo el programa' }).click()
  await expect(page.getByRole('dialog', { name: '¿Llevas el cambio a tus clientes?' })).toHaveCount(0)
  expect(JSON.stringify(fake.rows('planes'))).toBe(antes)

  await page.getByText('Sin asignar', { exact: true }).click()
  await page.getByRole('button', { name: 'Quitar la tarea "Fuerza 5x3"' }).first().click()
  const mirado = page.waitForResponse(r => r.url().includes('/rest/v1/planes')) // mira si alguien lo tiene
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await mirado
  await expect(page.getByRole('dialog', { name: '¿Llevas el cambio a tus clientes?' })).toHaveCount(0)
})
