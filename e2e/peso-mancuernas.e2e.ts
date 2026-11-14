import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, entrarComoEntrenador } from './support/flows'

const planDe = (fake: Parameters<typeof seedWorld>[0]) => fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P

test('el entrenador decide que con mancuernas se apunta el peso de una', async ({ page, fake }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  seedWorld(fake)
  planDe(fake).weeks[0].days[0].exercises[0].name = 'Press banca con mancuernas'

  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Plan/ }).first().click()

  const tarjeta = page.getByRole('region', { name: 'Peso con mancuernas' })
  await expect(tarjeta).toContainText('1 ejercicio con mancuernas')
  await expect(tarjeta.getByRole('radio', { name: /El total/ })).toHaveAttribute('aria-checked', 'true')
  await tarjeta.getByRole('radio', { name: /Una mancuerna/ }).click()
  await expect.poll(() => planDe(fake).pesoMancuernas, { timeout: 15_000 }).toBe('por_mancuerna')
})

test('el cliente ve cómo apuntar el peso con mancuernas y el registro lo guarda', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const plan = planDe(fake)
  plan.weeks[0].days[0].exercises[0].name = 'Press banca con mancuernas'
  plan.weeks[0].days[0].exercises[0].weight = '20kg'
  plan.pesoMancuernas = 'por_mancuerna'

  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  await expect(page.getByText('kg por mancuerna', { exact: true })).toBeVisible()
  await expect(page.getByText(/Apunta el peso de UNA mancuerna: si coges dos de 20 kg, pon 20/)).toBeVisible()

  await page.getByRole('button', { name: 'HECHO' }).click()
  const registro = () => fake.rows('registros').find(r => r.clientId === ids.client)?.logs?.ex_w0_d0_r0
  await expect.poll(() => registro()?.porLado, { timeout: 15_000 }).toBe(true)
})
