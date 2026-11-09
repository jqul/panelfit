import { test, expect } from './support/test'

// Carlos (demo) tiene el peso muerto al 80 % de su marca (210 kg): lo de "la última vez" y lo recomendado van en kilos
// reales, nunca "80% kg" ni "80-82 kg"
test('demo: un ejercicio por % muestra la última vez y lo recomendado en kilos', async ({ page }) => {
  await page.goto('/?c=demo-carlos-002')
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  await expect(page.getByText('Peso muerto convencional').first()).toBeVisible()
  await expect(page.getByText(/La última vez: 16\d(,5)? kg × 3/)).toBeVisible()
  await expect(page.getByText(/80% kg/)).toHaveCount(0)
  await expect(page.getByText(/Recomendado hoy: 80-/)).toHaveCount(0)
})
