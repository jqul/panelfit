import { test, expect } from './support/test'
import { seedWorld } from './support/seed'
import { entrarComoCliente } from './support/flows'

test('al salir del entreno queda una barra en todas las pestañas y al volver sigue donde estaba', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()

  // Una serie hecha (de un ejercicio a medias) y fuera
  await page.getByRole('button', { name: 'HECHO' }).click()
  const saltar = page.getByRole('button', { name: /Listo, siguiente serie/ })
  if (await saltar.isVisible().catch(() => false)) await saltar.click()
  await expect(page.getByText('Serie 2 de 3', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Volver' }).first().click()

  const barra = page.getByRole('region', { name: 'Entreno en curso' })
  await expect(barra).toContainText('DÍA A — EMPUJE')
  await expect(barra).toContainText('1/8 series') // 3x5 + 3x8 + 2x12

  // Sigue en otra pestaña
  await page.getByRole('button', { name: 'Progreso', exact: true }).click()
  await expect(barra).toBeVisible()

  // Al volver no se ha perdido la serie marcada del ejercicio a medias
  await barra.getByRole('button', { name: /Volver al entreno/ }).click()
  await expect(page.getByText('Serie 2 de 3', { exact: true })).toBeVisible()
  await expect(barra).toHaveCount(0)

  // «Terminar» desde la barra abre el cierre de la sesión
  await page.getByRole('button', { name: 'Volver' }).first().click()
  await barra.getByRole('button', { name: 'Terminar' }).click()
  await expect(page.getByRole('heading', { name: '¿Terminar entrenamiento?' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Terminar igual' })).toBeVisible()
})
