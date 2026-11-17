import { test, expect } from './support/test'
import { seedWorld } from './support/seed'
import { entrarComoEntrenador, abrirFichaDelCliente } from './support/flows'

// «Añadir» en la cabecera de la ficha: un solo botón, opciones agrupadas y lo relevante primero según la pestaña;
// cada opción lleva al sitio donde ya se hace.
test('el menú agrupa las opciones, pone primero lo de la pestaña y cada opción lleva a su sitio', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)
  const cabecera = page.getByRole('banner').getByRole('button', { name: 'Añadir' })

  // En el Resumen: Seguimiento primero, y dentro, Recordatorio
  await cabecera.click()
  const menu = page.getByRole('menu', { name: 'Añadir' })
  await expect(menu.getByRole('group')).toHaveCount(4)
  await expect(menu.getByRole('group').first()).toHaveAccessibleName('Seguimiento')
  await expect(menu.getByRole('menuitem').first()).toHaveText('Recordatorio')
  for (const g of ['Entrenamiento', 'Seguimiento', 'Comunicación', 'Gestión']) await expect(menu.getByRole('group', { name: g })).toBeVisible()

  // Peso → Progreso, ya en la sección de peso
  await menu.getByRole('menuitem', { name: 'Peso' }).click()
  await expect(page.getByText('Progreso de María')).toBeVisible()
  await expect(page.getByRole('button', { name: /Peso/ }).first()).toHaveClass(/bg-ink/)

  // Desde Progreso lo relevante cambia: Seguimiento sigue primero y empieza por Peso, Foto
  await cabecera.click()
  await expect(page.getByRole('menu', { name: 'Añadir' }).getByRole('menuitem').first()).toHaveText('Peso')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu', { name: 'Añadir' })).toHaveCount(0)

  // Valoración → vuelve al Resumen y despliega la ficha de valoración
  await cabecera.click()
  await page.getByRole('menuitem', { name: 'Valoración' }).click()
  await expect(page.getByRole('button', { name: /^Valoración/ })).toHaveAttribute('aria-expanded', 'true')

  // Programa → Plan, con los ajustes del plan desplegados
  await cabecera.click()
  await page.getByRole('menuitem', { name: 'Programa' }).click()
  await expect(page.getByRole('button', { name: 'Ajustes del plan' })).toHaveAttribute('aria-expanded', 'true')

  // En Plan, lo primero es Entrenamiento
  await cabecera.click()
  const enPlan = page.getByRole('menu', { name: 'Añadir' })
  await expect(enPlan.getByRole('group').first()).toHaveAccessibleName('Entrenamiento')
  await expect(enPlan.getByRole('menuitem').first()).toHaveText('Asignar workout')
})
