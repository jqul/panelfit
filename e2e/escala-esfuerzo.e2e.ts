import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'

test('con RPE elegido en Más, el entreno pregunta en RPE y guarda el RIR equivalente', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Más', exact: true }).click()
  await page.getByRole('radiogroup', { name: 'Cómo apuntas el esfuerzo' }).getByRole('radio', { name: /RPE/ }).click()
  await expect(page.getByRole('radio', { name: /RPE/ })).toHaveAttribute('aria-checked', 'true')

  await page.getByRole('button', { name: 'Hoy', exact: true }).click()
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  await expect(page.getByText('¿Cuánto te ha costado? (RPE 1-10)')).toBeVisible()
  await page.getByRole('button', { name: '8', exact: true }).click() // RPE 8 = RIR 2
  await page.getByRole('button', { name: 'HECHO' }).click()

  await expect.poll(() => fake.rows('registros').find(r => r.clientId === ids.client)?.logs?.ex_w0_d0_r0?.sets?.[0])
    .toMatchObject({ rir: 2 })
})
