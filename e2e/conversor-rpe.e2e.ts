import { test, expect } from './support/test'

test('el conversor público pasa de RPE a RIR y a %1RM, y con el 1RM da los kilos', async ({ page }) => {
  await page.goto('/calculadora-rpe-rir')
  await expect(page.getByRole('heading', { name: 'Conversor RPE, RIR y %1RM', level: 1 })).toBeVisible()

  const conversor = page.getByRole('region', { name: 'Conversor' })
  await conversor.getByLabel('Repeticiones').fill('5')
  await conversor.getByRole('radio', { name: 'RPE 8', exact: true }).click()
  const resultado = conversor.getByTestId('resultado-rpe')
  await expect(resultado).toContainText('83,3 %') // 5 + 2 en reserva = 7 posibles
  await expect(conversor).toContainText('te quedaban 2 repeticiones en reserva')

  await conversor.getByLabel('Tu 1RM (kg, opcional)').fill('140')
  await expect(conversor.getByTestId('kilos-rpe')).toHaveText('5 × 117,5 kg @ RPE 8')

  // La tabla: 1 repetición a RPE 10 es el 100 %
  await expect(page.getByRole('table').getByRole('row').nth(1)).toContainText('100 %')
})

test('la calculadora de 1RM enlaza al conversor', async ({ page }) => {
  await page.goto('/calculadora-1rm')
  await page.getByRole('link', { name: /Conversor RPE, RIR y %1RM/ }).click()
  await expect(page).toHaveURL(/\/calculadora-rpe-rir$/)
  await expect(page.getByRole('heading', { name: 'Conversor RPE, RIR y %1RM', level: 1 })).toBeVisible()
})
