import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, verEjerciciosDelDia } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'

// El día de María lleva vuelta a la calma (la pone el entrenador en el editor, como el calentamiento).
function sembrar(fake: FakeSupabase) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const plan = fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P
  plan.weeks[0].days[0].cooldownExercises = [{ name: 'Estiramiento de pectoral', sets: '2x30s', weight: '', comment: '', isMain: false }]
}

test('antes de empezar, el cliente cuenta cómo llega y se guarda para su entrenador', async ({ page, fake }) => {
  sembrar(fake)
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  await page.getByRole('button', { name: /Antes de empezar/ }).click()
  await page.getByRole('button', { name: '¿Cómo llegas hoy? (opcional)' }).click()
  await page.getByLabel('¿Cómo llegas hoy?').fill('He dormido 5 horas')
  await page.getByRole('button', { name: 'Enviar a mi entrenador' }).click()
  await expect(page.getByText('Tu entrenador lo verá ✓')).toBeVisible()
  await expect(page.getByRole('button', { name: /Hoy llegas: He dormido 5 horas/ })).toBeVisible()

  const notas = fake.rows('notas_antes_sesion')
  expect(notas).toHaveLength(1)
  expect(notas[0]).toMatchObject({ client_id: ids.client, nota: 'He dormido 5 horas', dia: 'DÍA A — EMPUJE' })
})

test('la vuelta a la calma sale en el día, en su pestaña Entreno', async ({ page, fake }) => {
  sembrar(fake)
  await entrarComoCliente(page)
  await verEjerciciosDelDia(page)
  const calma = page.getByRole('region', { name: 'Vuelta a la calma' })
  await expect(calma).toContainText('Estiramiento de pectoral')
  await expect(calma).toContainText('2x30s')
})
