import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'

test('el cliente marca una serie como calentamiento: se ve con su letra, se guarda y no cuenta para el volumen', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()

  // Modo foco: la primera serie, de calentamiento
  await page.getByRole('radiogroup', { name: 'Tipo de serie' }).getByRole('radio', { name: 'Calentamiento' }).click()
  await expect(page.getByRole('radio', { name: 'Calentamiento' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'HECHO' }).click()
  const saltar = page.getByRole('button', { name: /Listo, siguiente serie/ })
  if (await saltar.isVisible().catch(() => false)) await saltar.click()
  await expect.poll(() => fake.rows('registros').find(r => r.clientId === ids.client)?.logs?.ex_w0_d0_r0?.sets?.[0])
    .toMatchObject({ tipo: 'calentamiento' })

  // En la lista: la serie sale con «C» y el resumen no la cuenta
  await page.getByRole('button', { name: 'Ver todos los ejercicios en lista' }).click()
  await expect(page.getByRole('button', { name: 'Ajustes de la serie 1' }).first()).toContainText('C')
  await expect(page.getByLabel('Hoy frente a la última vez').first()).not.toContainText('5')

  // Una serie normal sí cuenta; y en la lista también se puede marcar el tipo
  await page.getByLabel('Peso serie 2').first().fill('80')
  await page.getByRole('button', { name: 'Marcar serie 2 como hecha' }).first().click()
  await expect(page.getByLabel('Hoy frente a la última vez').first()).toContainText('400') // 80 × 5
  if (await saltar.isVisible().catch(() => false)) await saltar.click() // el descanso que salta al marcarla
  await page.getByRole('button', { name: 'Ajustes de la serie 2' }).first().click()
  await page.getByRole('radiogroup', { name: 'Tipo de serie' }).getByRole('radio', { name: 'Al fallo' }).click()
  await expect.poll(() => fake.rows('registros').find(r => r.clientId === ids.client)?.logs?.ex_w0_d0_r0?.sets?.[1])
    .toMatchObject({ tipo: 'fallo', weight: '80' })
})
