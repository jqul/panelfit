import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

test('el entrenador apunta una reunión y un recordatorio sin cliente; el recordatorio no dura', async ({ page, fake }) => {
  seedWorld(fake)
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir al Calendario')
  await page.getByRole('option', { name: 'Ir al Calendario' }).click()

  // Reunión: sin cliente ni tipo, con su duración
  await page.getByRole('button', { name: /^Añadir sesión el/ }).first().click()
  const qué = page.getByRole('radiogroup', { name: 'Qué es' })
  await qué.getByRole('radio', { name: /Reunión/ }).click()
  await expect(page.getByText('Ocupa el hueco: nadie puede reservar a esa hora')).toBeVisible()
  await expect(page.getByText('Cliente (opcional)')).toHaveCount(0)
  await page.getByRole('button', { name: 'Crear reunión' }).click()

  const reunion = () => fake.rows('citas').find(c => c.evento === 'reunion')
  await expect.poll(() => reunion()?.title).toBe('Reunión')
  expect(reunion()).toMatchObject({ client_id: null, tipo_id: null, trainer_id: ids.trainer })
  expect(new Date(reunion()!.end_at).getTime() - new Date(reunion()!.start_at).getTime()).toBe(60 * 60000)

  // Recordatorio: sin duración
  await page.getByRole('button', { name: /^Añadir sesión el/ }).first().click()
  await page.getByRole('radiogroup', { name: 'Qué es' }).getByRole('radio', { name: /Recordatorio/ }).click()
  await expect(page.getByText('Duración (min)')).toHaveCount(0)
  await page.getByLabel('Título').fill('Llamar al proveedor')
  await page.getByRole('button', { name: 'Crear recordatorio' }).click()

  const recordatorio = () => fake.rows('citas').find(c => c.evento === 'recordatorio')
  await expect.poll(() => recordatorio()?.title).toBe('Llamar al proveedor')
  expect(recordatorio()!.end_at).toBe(recordatorio()!.start_at)
})
