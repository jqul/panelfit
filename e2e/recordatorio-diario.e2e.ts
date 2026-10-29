import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'

test('el cliente apaga y vuelve a encender el aviso de lo pendiente', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Más', exact: true }).click()

  const interruptor = page.getByRole('switch', { name: 'Recordarme lo pendiente' })
  await expect(interruptor).toHaveAttribute('aria-checked', 'true') // encendido por defecto
  await interruptor.click()
  await expect(interruptor).toHaveAttribute('aria-checked', 'false')
  await expect.poll(() => fake.rows('clientes').find(c => c.id === ids.client)?.recordatorio_diario).toBe(false)
  await interruptor.click()
  await expect.poll(() => fake.rows('clientes').find(c => c.id === ids.client)?.recordatorio_diario).toBe(true)
})
