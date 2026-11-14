import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

test('el entrenador guarda un programa de la galería y lo encuentra en «Guardados»', async ({ page, fake }) => {
  seedWorld(fake)
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Workouts')
  await page.getByRole('option', { name: 'Ir a Workouts' }).click()
  await page.getByRole('button', { name: 'Más herramientas' }).click()
  await page.getByRole('button', { name: /Galería de workouts/ }).click()

  const programas = page.getByRole('region', { name: 'Programas de PanelFit' })
  await expect(programas.getByRole('button', { name: /^★ Guardados/ })).toHaveCount(0) // sin guardados, sin filtro
  await programas.getByRole('button', { name: 'Guardar Fuerza básica 4 días' }).click()
  await expect(programas.getByRole('button', { name: 'Quitar Fuerza básica 4 días de guardados' })).toHaveAttribute('aria-pressed', 'true')

  const perfil = () => fake.rows('entrenadores').find(e => e.uid === ids.trainer)!.profile
  await expect.poll(() => perfil().programasGuardados?.length).toBe(1)
  expect(perfil().programasGuardados[0]).toMatch(/^pf:/)
  expect(perfil().brandName).toBe('AlexFit')

  await programas.getByRole('button', { name: '★ Guardados (1)' }).click()
  await expect(programas.getByRole('button', { name: /^Añadir .* a mi librería$/ })).toHaveCount(1)
  await expect(programas.getByRole('button', { name: 'Añadir Fuerza básica 4 días a mi librería' })).toBeVisible()
})
