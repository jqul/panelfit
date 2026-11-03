import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

test('en la galería, los programas de PanelFit se filtran por días, nivel y objetivo y se añaden a la librería', async ({ page, fake }) => {
  seedWorld(fake)
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Workouts')
  await page.getByRole('option', { name: 'Ir a Workouts' }).click()
  await page.getByRole('button', { name: 'Más herramientas' }).click()
  await page.getByRole('button', { name: /Galería de workouts/ }).click()

  const programas = page.getByRole('region', { name: 'Programas de PanelFit' })
  const anadir = programas.getByRole('button', { name: /^Añadir .* a mi librería$/ })
  await expect(anadir).toHaveCount(8)

  await programas.getByRole('group', { name: 'Nivel' }).getByRole('button', { name: 'Avanzado' }).click()
  await expect(anadir).toHaveCount(2)
  await programas.getByRole('group', { name: 'Objetivo' }).getByRole('button', { name: 'Fuerza' }).click()
  await expect(anadir).toHaveCount(1)
  await programas.getByRole('group', { name: 'Días' }).getByRole('button', { name: '5 días' }).click()
  await expect(programas.getByText('Ningún programa con esos filtros.')).toBeVisible()
  await programas.getByRole('group', { name: 'Días' }).getByRole('button', { name: '5 días' }).click() // quitarlo

  // La de la comunidad sigue en su pestaña
  await page.getByRole('tab', { name: 'De la comunidad' }).click()
  await expect(page.getByText(/otros entrenadores han compartido/)).toBeVisible()
  await page.getByRole('tab', { name: 'Programas de PanelFit' }).click()

  // Añadir uno lo copia a la librería (y la galería se cierra, como al añadir uno de la comunidad)
  await page.getByRole('button', { name: 'Añadir Fuerza básica 4 días a mi librería' }).click()
  await expect.poll(() => fake.rows('plan_templates').filter(r => r.trainer_id === ids.trainer).map(r => r.name)).toContain('Fuerza básica 4 días')
})
