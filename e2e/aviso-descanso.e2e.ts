import { test, expect } from './support/test'
import { seedWorld } from './support/seed'
import { entrarComoCliente } from './support/flows'

test('al empezar un descanso se pide el aviso de fin (para el móvil bloqueado) y al saltarlo se anula', async ({ page, context, fake }) => {
  await context.grantPermissions(['notifications'])
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const pedidos: { token?: string; cuerpo?: string }[] = []
  await page.route('**/functions/v1/fin-descanso', async route => {
    pedidos.push(JSON.parse(route.request().postData() || '{}'))
    await route.fulfill({ status: 202, contentType: 'application/json', body: '{"ok":true}' })
  })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  await page.getByRole('button', { name: 'HECHO' }).click()
  await expect(page.getByText('Descanso', { exact: true })).toBeVisible()

  // Se marca el descanso con un token y se pide el aviso con ese mismo token y la siguiente serie
  await expect.poll(() => fake.rows('descansos').length).toBe(1)
  const fila = fake.rows('descansos')[0]
  expect(fila.segundos).toBeGreaterThan(60)
  await expect.poll(() => pedidos.length).toBeGreaterThan(0)
  expect(pedidos.slice(-1)[0].token).toBe(fila.token)
  expect(pedidos.slice(-1)[0].cuerpo).toMatch(/^Press banca · serie 2 de 3/)

  // Al alargarlo, token nuevo (el aviso anterior ya no saldrá)
  await page.getByRole('button', { name: '+30s' }).click()
  await expect.poll(() => fake.rows('descansos')[0]?.token).not.toBe(fila.token)

  // Al saltarlo, se anula
  await page.getByRole('button', { name: /Listo, siguiente serie/ }).click()
  await expect.poll(() => fake.rows('descansos').length).toBe(0)
})
