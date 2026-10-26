import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'

// "Hoy": el entreno es lo primero, la semana dice cómo vas y cada métrica trae una frase.

test('el entreno de hoy va primero, y la semana y las métricas se explican con frases', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)

  // Orden: el botón de empezar (la acción principal) está por encima de las métricas
  const empezar = await page.getByRole('button', { name: 'Empezar entrenamiento' }).boundingBox()
  const metricas = await page.getByText('Adherencia', { exact: true }).boundingBox()
  expect(empezar!.y).toBeLessThan(metricas!.y)

  await expect(page.getByText('Hoy · Semana 1')).toBeVisible()
  await expect(page.getByText('Una sesión esta semana')).toBeVisible() // 1 día con ejercicios, ninguno hecho
  await expect(page.getByText('Empieza hoy')).toBeVisible() // racha 0, sin reproche
  await expect(page.getByText('Aún sin datos').first()).toBeVisible()
})

test('al terminar el entreno, la tarjeta y la semana lo celebran con una frase', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)

  await page.getByRole('button', { name: /Ya lo hiciste/ }).click()
  await page.getByRole('dialog', { name: 'Registrar entreno ya hecho' }).getByRole('button', { name: /Guardar entreno/ }).click()

  await expect(page.getByText('Entreno de hoy hecho. Buen trabajo.')).toBeVisible()
  await expect(page.getByText('Semana completada. Buen trabajo.')).toBeVisible()
  await expect(page.getByText('1 día', { exact: true })).toBeVisible() // racha de 1
})

test('la nota de bienvenida dice quién la deja', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const fila = fake.rows('planes').find(p => p.clientId === ids.client)!
  fila.plan.P.message = 'Vamos con todo esta semana'
  await entrarComoCliente(page)

  await expect(page.getByText('Nota de Alex')).toBeVisible() // el nombre de pila del entrenador ("Alex Trainer")
  await expect(page.getByText('"Vamos con todo esta semana"')).toBeVisible()
})

test('en el modo foco, "Serie X de Y" va en grande y al acabar las series avisa de que el ejercicio está completo', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()

  await expect(page.getByText('Serie 1 de 3', { exact: true })).toBeVisible() // el primer ejercicio es de 3x5
  for (let i = 1; i <= 3; i++) {
    await expect(page.getByText(`Serie ${i} de 3`, { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'HECHO' }).click()
    const saltar = page.getByRole('button', { name: /Listo, siguiente serie/ })
    if (await saltar.isVisible().catch(() => false)) await saltar.click()
  }

  // Al terminar la última serie salta al siguiente ejercicio; al volver, el primero se ve completo
  await page.getByRole('button', { name: 'Ir al ejercicio 1' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Ejercicio completado' })).toBeVisible()
})

test('al terminar la sesión que cierra la semana, la pantalla final lo celebra con frases', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()

  // El día de la semilla es 3x5 + 3x8 + 2x12: ocho series
  for (let i = 0; i < 8; i++) {
    await page.getByRole('button', { name: 'HECHO' }).click()
    const saltar = page.getByRole('button', { name: /Listo, siguiente serie/ })
    if (await saltar.isVisible().catch(() => false)) await saltar.click()
  }
  await page.getByRole('button', { name: /Terminar entrenamiento/ }).click()
  await page.getByRole('button', { name: /Guardar y terminar/ }).click()

  const final = page.locator('div.fixed').filter({ has: page.getByRole('heading', { name: '¡Buen trabajo!' }) })
  await expect(final.getByText('Semana completada. Buen trabajo.')).toBeVisible()
  await expect(final.getByText('Racha de', { exact: false })).toHaveCount(0) // primera sesión: aún sin racha
})
