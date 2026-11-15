import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

test('al archivar a un cliente se marca por qué se va y Negocio enseña el reparto', async ({ page, fake }) => {
  seedWorld(fake)
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: 'Ver todos →' }).first().click()
  await page.getByRole('button', { name: 'Archivar a María' }).click()

  const modal = page.getByRole('dialog', { name: 'Archivar a María García' })
  await modal.getByRole('radio', { name: '💶 Precio' }).click()
  await modal.getByRole('button', { name: 'Archivar', exact: true }).click()
  await expect.poll(() => fake.rows('clientes').find(c => c.id === ids.client)?.archivado_motivo).toBe('precio')
  expect(fake.rows('clientes').find(c => c.id === ids.client)?.archived_at).toBeTruthy()

  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Mi negocio')
  await page.getByRole('option', { name: 'Ir a Mi negocio' }).click()
  const motivos = page.getByRole('region', { name: 'Por qué se van' })
  await expect(motivos).toContainText('💶 Precio', { timeout: 30_000 })
  await expect(motivos).toContainText('1 · 100 %')
})
