import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'

test('en Progreso › Entrenos el cliente ve la evolución de cada ejercicio', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const sets = (...s: [string, string][]) => Object.fromEntries(s.map(([weight, reps], i) => [i, { weight, reps }]))
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    // Semanas fuera del plan (el entreno de hoy sigue pendiente): cuentan por el nombre del ejercicio hecho
    ex_w7_d0_r0: { done: true, dateDone: '2026-10-01', substituteName: 'Press banca', sets: sets(['80', '5'], ['80', '5']) },
    ex_w7_d0_r1: { done: true, dateDone: '2026-10-01', substituteName: 'Remo con barra', sets: sets(['60', '8']) },
    ex_w8_d0_r0: { done: true, dateDone: '2026-10-08', substituteName: 'Press banca', sets: sets(['85', '5'], ['82,5', '5']) },
  } })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Progreso', exact: true }).click()
  await page.getByRole('tab', { name: 'Entrenos' }).click()

  await page.getByRole('button', { name: 'Por ejercicio' }).click()
  const press = page.getByRole('button', { name: /Press banca/ })
  await expect(press).toContainText('85×5')
  await expect(press).toContainText('2 sesiones')
  await expect(press).toContainText('+5,9 kg 1RM') // 99,2 − 93,3

  await press.click()
  await expect(page.getByRole('img', { name: 'Evolución del 1RM estimado de Press banca' })).toBeVisible()
  await expect(page.getByText('82,5×5')).toBeVisible()

  // Se recuerda la elección
  await page.reload()
  await page.getByRole('button', { name: 'Progreso', exact: true }).click()
  await page.getByRole('tab', { name: 'Entrenos' }).click()
  await expect(page.getByRole('button', { name: 'Por ejercicio' })).toHaveAttribute('aria-pressed', 'true')
})
