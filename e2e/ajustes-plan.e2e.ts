import { test, expect } from './support/test'
import { seedWorld, samplePlan, ids } from './support/seed'
import { entrarComoEntrenador, abrirFichaDelCliente } from './support/flows'

// En la pestaña Plan, el plan va primero: programa, revisión del bloque, siguiente plan, progresión, marcas y competición
// quedan plegados en «Ajustes del plan», con su estado resumido en una línea.
test('el plan va primero y los ajustes se despliegan desde una barra que resume su estado', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.rows('planes').find(r => r.clientId === ids.client)!.plan = { P: { ...samplePlan(), programId: 'prog-1', programName: 'Bloque de fuerza', progresion: { defecto: { tipo: 'lineal' } } } }
  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)
  await page.getByRole('button', { name: /Abrir menú|Menú/i }).first().click().catch(() => {})
  await page.getByRole('button', { name: /^Plan/ }).first().click()

  // Plegado por defecto: ninguna tarjeta de ajustes ocupa la pantalla y el editor del plan está a la vista
  const barra = page.getByRole('button', { name: 'Ajustes del plan' })
  await expect(barra).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('#ajustes-plan')).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Progresión automática' })).toHaveCount(0)
  await expect(page.getByText('Programa: Bloque de fuerza')).toBeVisible()
  await expect(page.getByText('· Progresión automática')).toBeVisible()
  await expect(page.getByRole('tablist', { name: 'Vista del plan' })).toBeVisible()

  // Se despliega, enseña las tarjetas y se recuerda al volver a abrir la ficha
  await barra.click()
  await expect(barra).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#ajustes-plan')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Progresión automática' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('pf_plan_ajustes'))).toBe('1')

  await barra.click()
  await expect(barra).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('#ajustes-plan')).toHaveCount(0)
})
