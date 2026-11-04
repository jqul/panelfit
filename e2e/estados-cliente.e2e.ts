import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const enDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

async function irAClientes(page: import('@playwright/test').Page) {
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a clientes')
  await page.keyboard.press('Enter')
}

test('el plan de una semana que empieza hoy sale en «Termina pronto»', async ({ page, fake }) => {
  seedWorld(fake) // plan de una semana con fecha de inicio hoy
  await irAClientes(page)
  const filtro = page.getByRole('button', { name: /^Termina pronto/ })
  await expect(filtro).toContainText('1')
  await filtro.click()
  await expect(filtro).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /María García/ }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /^Empieza pronto/ })).toHaveCount(0) // sin nadie, el filtro no sale
})

test('con la fecha de inicio por llegar, sale en «Empieza pronto»', async ({ page, fake }) => {
  seedWorld(fake)
  fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P.fechaInicio = enDias(10)
  await irAClientes(page)
  await page.getByRole('button', { name: /^Empieza pronto/ }).click()
  await expect(page.getByRole('button', { name: /María García/ }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /^Termina pronto/ })).toHaveCount(0)
})
