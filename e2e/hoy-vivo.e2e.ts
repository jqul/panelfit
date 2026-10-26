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
