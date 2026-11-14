import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'

test('las mejores marcas por repeticiones están en la ficha del ejercicio, plegadas', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const sets = (...s: [string, string][]) => Object.fromEntries(s.map(([weight, reps], i) => [i, { weight, reps }]))
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    ex_w7_d0_r0: { done: true, dateDone: '2026-10-01', substituteName: 'Sentadilla', sets: sets(['120', '1'], ['90', '8']) },
    ex_w8_d0_r0: { done: true, dateDone: '2026-10-08', substituteName: 'Sentadilla', sets: sets(['100', '5'], ['110', '2']) },
  } })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Progreso', exact: true }).click()
  await page.getByRole('tab', { name: 'Entrenos' }).click()
  await page.getByRole('button', { name: 'Por ejercicio' }).click()
  await page.getByRole('button', { name: /^Sentadilla/ }).click()

  // Plegadas: no cargan la ficha hasta que se abren
  const lista = page.getByRole('list', { name: 'Mejores marcas por repeticiones de Sentadilla' })
  await expect(lista).toBeHidden()
  await page.getByText('Mejores marcas por repeticiones').click()
  await expect(lista).toBeVisible()
  await expect(lista.getByRole('listitem')).toHaveCount(8) // de 1 a 8 reps
  await expect(lista.getByRole('listitem').nth(0)).toContainText('1 rep120 kg')
  await expect(lista.getByRole('listitem').nth(2)).toContainText('3 reps100 kg')
  await expect(lista.getByRole('listitem').nth(7)).toContainText('8 reps90 kg')
})
