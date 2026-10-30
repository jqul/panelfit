import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

test('el entrenador crea un tipo de cita y lo usa: pone título, duración y color', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir al Calendario')
  await page.getByRole('option', { name: 'Ir al Calendario' }).click()

  await page.getByRole('button', { name: '+ Tipos de cita con color' }).click()
  await page.getByLabel('Nombre del tipo').fill('Valoración')
  await page.getByLabel('Duración del tipo').selectOption('45')
  await page.getByRole('radio', { name: 'Color 3' }).click()
  await page.getByRole('button', { name: 'Añadir', exact: true }).click()
  await page.getByRole('button', { name: 'Guardar tipos' }).click()
  await expect(page.getByText('Tipos de cita guardados ✓')).toBeVisible()
  const tipos = fake.rows('entrenadores').find(e => e.uid === ids.trainer)!.profile.tiposCita
  expect(tipos).toMatchObject([{ nombre: 'Valoración', duracion: 45, color: '#3b5b92' }])

  await page.getByRole('button', { name: /^Añadir sesión el / }).first().click()
  await page.getByRole('radio', { name: 'Valoración' }).click()
  await expect(page.getByRole('dialog').locator('input').first()).toHaveValue('Valoración')
  await page.getByRole('button', { name: 'Crear sesión' }).click()

  await expect.poll(() => fake.rows('citas').length).toBe(1)
  const cita = fake.rows('citas')[0]
  expect(cita).toMatchObject({ title: 'Valoración', tipo_id: tipos[0].id })
  expect((new Date(cita.end_at).getTime() - new Date(cita.start_at).getTime()) / 60000).toBe(45)
})
