import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'

test('vista de lista: una fila por serie, ajustes solo en la activa y resumen del ejercicio', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  await page.getByRole('button', { name: 'Ver todos los ejercicios en lista' }).click()

  // Las tres series del primer ejercicio, y solo la primera (la que toca) con ajustes rápidos
  await expect(page.getByLabel('Peso serie 1')).toHaveCount(3) // una por ejercicio
  await expect(page.getByRole('group', { name: 'Ajustes rápidos de la serie 1' })).toHaveCount(1)
  await expect(page.getByRole('group', { name: /Ajustes rápidos de la serie [23]/ })).toHaveCount(0)

  const ajustes = page.getByRole('group', { name: 'Ajustes rápidos de la serie 1' })
  await page.getByLabel('Peso serie 1').first().fill('80')
  await ajustes.getByRole('button', { name: 'Añadir 2,5 kg' }).click()
  await expect(page.getByLabel('Peso serie 1').first()).toHaveValue('82.5')
  await page.getByLabel('Repeticiones serie 1').first().fill('5')
  await page.getByRole('button', { name: 'Marcar serie 1 como hecha' }).first().click()

  // Resumen del ejercicio con lo hecho hoy
  const resumen = page.getByLabel('Hoy frente a la última vez').first()
  await expect(resumen).toContainText('5')
  await expect(resumen).toContainText('412,5')
  await expect(resumen).toContainText('82,5')

  await page.getByRole('button', { name: /Listo, siguiente serie/ }).click() // el descanso que salta al marcarla
  // Tocar otra serie la convierte en la activa
  await page.getByRole('button', { name: 'Ajustes de la serie 3' }).first().click()
  await expect(page.getByRole('group', { name: 'Ajustes rápidos de la serie 3' })).toHaveCount(1)

  // Lo apuntado se guarda igual que en la vista de foco
  await expect.poll(() => fake.rows('registros').find(r => r.clientId === ids.client)?.logs?.ex_w0_d0_r0?.sets?.[0])
    .toMatchObject({ weight: '82.5', reps: '5' })
})

test('en Más se elige que el entreno se abra en lista', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Más', exact: true }).click()
  await page.getByRole('radio', { name: /Toda la rutina/ }).click()
  await expect(page.getByRole('radio', { name: /Toda la rutina/ })).toHaveAttribute('aria-checked', 'true')

  await page.getByRole('button', { name: 'Hoy', exact: true }).click()
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  await expect(page.getByRole('button', { name: 'Modo foco: una serie a la vez' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'HECHO' })).toHaveCount(0)
})
