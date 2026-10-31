import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'

test('al tocar el nombre del ejercicio se abre su ficha: cómo se hace e historial', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('exercise_library', { id: 'lib-1', trainer_id: ids.trainer, name: 'Press banca', category: 'Pecho', description: 'Escápulas juntas y la barra baja hasta el pecho.', deleted_at: null })
  const sets = (...s: [string, string][]) => Object.fromEntries(s.map(([weight, reps], i) => [i, { weight, reps }]))
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    // Sesiones de otras semanas (el entreno de hoy sigue pendiente)
    ex_w7_d0_r0: { done: true, dateDone: '2026-10-01', substituteName: 'Press banca', sets: sets(['75', '5'], ['75', '5']) },
    ex_w8_d0_r0: { done: true, dateDone: '2026-10-08', substituteName: 'Press banca', sets: sets(['77,5', '5'], ['77,5', '4']) },
  } })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()

  // Desde la vista de foco
  await page.getByRole('button', { name: 'Ficha de Press banca' }).click()
  const ficha = page.getByRole('dialog', { name: 'Press banca' })
  await expect(ficha.getByText('3x5')).toBeVisible()
  await expect(ficha.getByText('80kg')).toBeVisible()
  await expect(ficha.getByText('Pecho', { exact: true })).toBeVisible()
  await expect(ficha.getByText(/Escápulas juntas/)).toBeVisible()

  await ficha.getByRole('tab', { name: 'Historial' }).click()
  await expect(ficha.getByRole('img', { name: 'Evolución del 1RM estimado de Press banca' })).toBeVisible()
  await expect(ficha.getByText('77,5×5').first()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(ficha).toHaveCount(0)

  // Y desde la lista: un ejercicio sin historial lo dice
  await page.getByRole('button', { name: 'Ver todos los ejercicios en lista' }).click()
  await page.getByRole('button', { name: 'Ficha de Remo con barra' }).click()
  const remo = page.getByRole('dialog', { name: 'Remo con barra' })
  await remo.getByRole('tab', { name: 'Historial' }).click()
  await expect(remo.getByText(/primera vez que haces este ejercicio/)).toBeVisible()
})
