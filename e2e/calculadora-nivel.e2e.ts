import { test, expect } from './support/test'

test('la calculadora pública da el 1RM y, con el peso corporal, el nivel de fuerza', async ({ page }) => {
  await page.goto('/calculadora-1rm')
  await page.getByPlaceholder('ej. 100').fill('100')
  await page.getByPlaceholder('ej. 5').fill('5')
  await page.getByRole('button', { name: 'Calcular 1RM' }).click()
  await expect(page.getByText('115.1', { exact: false }).first()).toBeVisible() // media de las 4 fórmulas

  const nivel = page.getByLabel('Tu nivel de fuerza')
  await nivel.getByLabel('Ejercicio').selectOption({ label: 'Press banca' })
  await nivel.getByLabel('Tu peso corporal (kg)').fill('80')
  // 115,1 / 80 = 1,44 veces el peso: intermedio (desde 80 kg), y el avanzado empieza en 120 kg
  await expect(nivel).toContainText('Nivel intermedio')
  await expect(nivel).toContainText('1,44 veces')
  await expect(nivel).toContainText('Te faltan unos 4,9 kg')
  await expect(nivel).toContainText('desde 120 kg')

  // Mujer, mismo peso: otro estándar (en press banca, 1,25 veces el peso ya es élite)
  await nivel.getByRole('radio', { name: 'Mujer' }).click()
  await expect(nivel).toContainText('Nivel élite')
  await expect(nivel).toContainText('Con 115,1 kg en press banca')
})
