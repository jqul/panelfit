import { test, expect } from './support/test'
import { seedWorld } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

async function irAWorkouts(page: import('@playwright/test').Page) {
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Workouts')
  await page.getByRole('option', { name: 'Ir a Workouts' }).click()
}

test('la galería tiene botón propio en Workouts, también para empezar sin ningún workout', async ({ page, fake }) => {
  seedWorld(fake)
  await irAWorkouts(page)
  await expect(page.getByText('Crea tu primer workout')).toBeVisible()
  await page.getByRole('button', { name: /Empezar con un programa hecho/ }).click()
  await expect(page.getByRole('region', { name: 'Programas de PanelFit' })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar' }).first().click()

  await page.getByRole('button', { name: 'Galería', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Programas de PanelFit' })).toBeVisible()
})

test('un menú de acciones no se cierra por un scroll justo al abrirlo (la página aún colocándose)', async ({ page, fake }) => {
  seedWorld(fake)
  await irAWorkouts(page)
  await page.getByRole('button', { name: 'Más herramientas' }).click()
  await page.evaluate(() => window.dispatchEvent(new Event('scroll')))
  await expect(page.getByRole('button', { name: /Galería de workouts/ })).toBeVisible()
  // Un scroll de verdad, más tarde, sí lo cierra (como siempre)
  await page.waitForTimeout(600)
  await page.evaluate(() => window.dispatchEvent(new Event('scroll')))
  await expect(page.getByRole('button', { name: /Galería de workouts/ })).toHaveCount(0)
})
