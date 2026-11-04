import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

test('el entrenador elige qué columnas ver en la lista de clientes y se recuerdan', async ({ page, fake }) => {
  await page.setViewportSize({ width: 1280, height: 800 }) // las columnas son de la tabla de escritorio
  seedWorld(fake)
  fake.seed('labels', { id: 'lbl-online', trainer_id: ids.trainer, name: 'Online', color: '#000', emoji: '💻', created_at: 1 })
  fake.rows('clientes').find(c => c.id === ids.client)!.label_ids = ['lbl-online']
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a clientes')
  await page.getByRole('option', { name: 'Ir a clientes' }).click()

  const fila = page.getByRole('listitem', { name: 'María García' })
  await expect(fila).toContainText('Aún no ha entrenado')
  await expect(fila.locator('[data-columna="etiquetas"]')).toHaveCount(0)

  await page.getByText('Columnas', { exact: true }).last().click()
  const columnas = page.getByRole('group', { name: 'Columnas de la lista' }).last()
  await columnas.getByLabel('Etiquetas').check()
  await columnas.getByLabel('Plan').check()
  await columnas.getByLabel('Alertas').uncheck()

  await expect(fila.locator('[data-columna="etiquetas"]')).toContainText('💻 Online')
  await expect(fila.locator('[data-columna="plan"]')).toBeVisible()
  await expect(fila).not.toContainText('Aún no ha entrenado')

  // Al volver, siguen las mismas
  await page.reload()
  await page.getByRole('button', { name: /^Clientes/ }).first().click()
  await expect(page.getByRole('listitem', { name: 'María García' }).locator('[data-columna="etiquetas"]')).toContainText('💻 Online')
  await expect(page.getByRole('listitem', { name: 'María García' })).not.toContainText('Aún no ha entrenado')
})
