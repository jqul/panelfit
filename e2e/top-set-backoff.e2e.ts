import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, entrarComoEntrenador } from './support/flows'

const conBackoff = (fake: Parameters<typeof seedWorld>[0]) => {
  const plan = fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P
  plan.weeks[0].days[0].exercises[0] = { ...plan.weeks[0].days[0].exercises[0], name: 'Sentadilla', sets: '3x3', weight: '', rir: '1', backoff: { pct: 85, reps: '5' } }
}

test('vista de lista: al hacer el top set, las bajadas salen al 85 % de lo que ha movido', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  conBackoff(fake)
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  await page.getByRole('button', { name: 'Ver todos los ejercicios en lista' }).click()

  await expect(page.getByText('Top 3 @1', { exact: true })).toBeVisible()
  await expect(page.getByText('5 · 85%', { exact: true }).first()).toBeVisible()

  await page.getByLabel('Peso serie 1').first().fill('180')
  await page.getByLabel('Repeticiones serie 1').first().fill('3')
  await page.getByRole('button', { name: 'Marcar serie 1 como hecha' }).first().click()

  await expect(page.getByLabel('Peso serie 2').first()).toHaveValue('152.5')
  await expect(page.getByLabel('Repeticiones serie 2').first()).toHaveValue('5')
  await expect(page.getByLabel('Peso serie 3').first()).toHaveValue('152.5')
})

test('vista de foco: el top set y la bajada con su peso calculado', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  conBackoff(fake)
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()

  await expect(page.getByText('Top set de 3 + 2 bajadas de 5 al 85 %')).toBeVisible()
  await expect(page.getByTestId('tipo-backoff')).toHaveText('Top set')
  await page.getByLabel('Peso serie 1').fill('200')
  await page.getByLabel('Repeticiones serie 1').fill('3')
  await page.getByRole('button', { name: /HECHO/ }).first().click()
  const listo = page.getByRole('button', { name: 'Listo, siguiente serie' })
  if (await listo.isVisible().catch(() => false)) await listo.click()

  await expect(page.getByTestId('tipo-backoff')).toHaveText('Bajada · 85 % del top set')
  await expect(page.getByLabel('Peso serie 2')).toHaveValue('170')
  await expect(page.getByLabel('Repeticiones serie 2')).toHaveValue('5')
})

test('el entrenador pone top set + back-off en un ejercicio del plan', async ({ page, fake }) => {
  await page.setViewportSize({ width: 1280, height: 900 }) // el editor del plan, en escritorio
  seedWorld(fake)
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Plan/ }).first().click()

  await page.locator('.plan-grid').nth(1).click({ position: { x: 8, y: 8 } }) // la 1ª es la cabecera; pulsar la fila abre las opciones
  const activar = page.getByRole('button', { name: /Top set \+ back-off/ }).first()
  await activar.scrollIntoViewIfNeeded()
  await activar.click()
  const grupo = page.getByRole('group', { name: /^Back-off de/ }).first()
  await grupo.getByLabel('Porcentaje del top set').fill('80')
  await grupo.getByLabel('Repeticiones de las bajadas').fill('6')
  await expect(grupo).toContainText('al 80 % del peso que mueva en ella')

  const ej = () => fake.rows('planes').find(r => r.clientId === ids.client)?.plan?.P?.weeks?.[0]?.days?.[0]?.exercises?.[0]
  await expect.poll(() => ej()?.backoff, { timeout: 10000 }).toEqual({ pct: 80, reps: '6' })
})
