import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'

const LAURA = '66666666-6666-4666-8666-666666666666' // compañera del equipo
const PEDRO = '44444444-4444-4444-8444-444444444444'

function sembrar(fake: FakeSupabase) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('entrenadores', { uid: LAURA, email: 'laura@e2e.test', displayName: 'Laura Coach', approved: true, rol: 'trainer', role: 'trainer', profile: {} })
  fake.seed('team_members', { id: 'tm-1', owner_id: ids.trainer, member_uid: LAURA, role: 'coach', created_at: 1 })
  fake.seed('clientes', { id: PEDRO, trainerId: ids.trainer, name: 'Pedro', surname: 'Ruiz', token: 'tokenpedro', metricas_cliente: [], createdAt: Date.now() })
}

test('con equipo: asignar clientes a una compañera y filtrar por profesional', async ({ page, fake }) => {
  sembrar(fake)
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: 'Ver todos →' }).first().click()
  await page.getByRole('button', { name: 'Seleccionar', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Seleccionar a Pedro Ruiz' }).check()

  await page.getByRole('region', { name: /Acciones para/ }).getByRole('button', { name: 'Profesional' }).click()
  const hoja = page.getByRole('dialog', { name: 'Asignar profesional' })
  await hoja.getByRole('radio', { name: 'Laura Coach' }).check()
  await hoja.getByRole('button', { name: 'Dejar 1 cliente con Laura Coach' }).click()
  await expect(hoja.getByText(/Profesional asignado/)).toBeVisible()
  expect(fake.rows('clientes').find(c => c.id === PEDRO)!.profesional_id).toBe(LAURA)
  await hoja.getByRole('button', { name: 'Cerrar' }).last().click() // el de abajo (el otro es la X)
  await page.getByRole('button', { name: 'Cancelar selección' }).first().click()

  const filtro = page.getByLabel('Filtrar por profesional')
  await filtro.selectOption(LAURA)
  await expect(page.getByRole('button', { name: 'Abrir a Pedro Ruiz' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Abrir a María García' })).toHaveCount(0)
  await filtro.selectOption('')
  await expect(page.getByRole('button', { name: 'Abrir a María García' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Abrir a Pedro Ruiz' })).toHaveCount(0)
})

test('sin equipo no aparece nada de profesionales', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: 'Ver todos →' }).first().click()
  await expect(page.getByRole('button', { name: 'Abrir a María García' })).toBeVisible()
  await expect(page.getByLabel('Filtrar por profesional')).toHaveCount(0)
})
