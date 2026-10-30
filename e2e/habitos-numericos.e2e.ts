import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'

// Hábitos con meta numérica: el cliente escribe el valor del día y el hábito se marca solo al llegar a ella.

test('un hábito con meta se marca solo al llegar a ella y guarda el valor del día; una casilla sigue igual', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('habitos', { id: 'h1', clientId: ids.client, text: 'Pasos', sub: '', order: 0, meta: 10000, unidad: 'pasos' })
  fake.seed('habitos', { id: 'h2', clientId: ids.client, text: 'Beber agua', sub: '', order: 1, meta: null, unidad: null })
  await entrarComoCliente(page)

  await expect(page.getByText('Hábitos de hoy')).toBeVisible()
  await expect(page.getByText('0/2', { exact: true })).toBeVisible()
  await expect(page.getByText('/ 10.000 pasos')).toBeVisible()

  const campo = page.getByRole('textbox', { name: 'Pasos: valor de hoy' })
  await campo.fill('9.000')
  await campo.press('Enter')
  await expect(page.getByText('0/2', { exact: true })).toBeVisible() // 9.000 no llega a 10.000

  await campo.fill('10.450')
  await campo.press('Enter')
  await expect(page.getByText('1/2', { exact: true })).toBeVisible() // ya cumple: se marca solo

  await expect.poll(() => fake.rows('registros_habitos').find(r => r.clientId === ids.client)?.valores).toEqual({ h1: 10450 })
  expect(fake.rows('registros_habitos').find(r => r.clientId === ids.client)?.completedHabitIds).toEqual(['h1'])

  // La casilla de siempre sigue siendo una casilla. Está al fondo de la página: antes el botón flotante "Entrenar
  // ahora" la tapaba y no se podía pulsar (ClientDashboard deja ahora margen bajo el contenido cuando está visible).
  await page.getByRole('button', { name: 'Beber agua' }).click()
  await expect(page.getByText('2/2', { exact: true })).toBeVisible()
  await expect.poll(() => fake.rows('registros_habitos').find(r => r.clientId === ids.client)?.completedHabitIds).toEqual(['h1', 'h2'])
})

test('si el valor baja de la meta, el hábito se desmarca solo', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('habitos', { id: 'h1', clientId: ids.client, text: 'Dormir', sub: '', order: 0, meta: 7, unidad: 'h' })
  await entrarComoCliente(page)

  const campo = page.getByRole('textbox', { name: 'Dormir: valor de hoy' })
  await campo.fill('7,5')
  await campo.press('Enter')
  await expect(page.getByText('1/1', { exact: true })).toBeVisible()

  await campo.fill('6')
  await campo.press('Enter')
  await expect(page.getByText('0/1', { exact: true })).toBeVisible()
  await expect.poll(() => fake.rows('registros_habitos').find(r => r.clientId === ids.client)?.completedHabitIds).toEqual([])
})
