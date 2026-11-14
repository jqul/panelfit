import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

test('si el plan termina pronto y no hay siguiente, el plan trae el mensaje listo y la Bandeja pide renovar', async ({ page, fake }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  seedWorld(fake) // su plan es de una semana desde hoy: termina en menos de 14 días
  fake.rows('clientes').find(c => c.id === ids.client)!.phone = '+34 600 111 222'

  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Plan/ }).first().click()
  const siguiente = page.getByRole('region', { name: 'Cuando termine este plan' })
  await expect(siguiente).toContainText('buen momento para proponerle seguir')
  await expect(siguiente.getByRole('link', { name: 'Proponer por WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/34600111222\?text=Hola%20Mar%C3%ADa/)

  await page.reload()
  await page.getByRole('button', { name: /^Bandeja/ }).first().click()
  await expect(page.getByText(/🔄 Renovar: su plan termina/)).toBeVisible()

  // Con el siguiente preparado ya no toca
  fake.rows('planes').find(p => p.clientId === ids.client)!.siguiente = { nombre: 'Bloque 2', weeks: [{ days: [] }] }
  await page.reload()
  await page.getByRole('button', { name: /^Bandeja/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Bandeja', level: 2 })).toBeVisible()
  await expect(page.getByText(/🔄 Renovar/)).toHaveCount(0)
})
