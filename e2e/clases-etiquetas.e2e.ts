import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

test('el entrenador crea una clase solo para clientes con una etiqueta', async ({ page, fake }) => {
  seedWorld(fake)
  fake.seed('labels', { id: 'lab-vip', trainer_id: ids.trainer, name: 'VIP', color: '#eab308', emoji: '⭐', survey_template_id: null, created_at: 1 })

  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir al Calendario')
  await page.getByRole('option', { name: 'Ir al Calendario' }).click()
  await page.getByRole('button', { name: /Clases de grupo/ }).click()

  const nueva = page.getByRole('region', { name: 'Nueva clase' })
  await nueva.getByLabel('Nombre de la clase').fill('Técnica VIP')
  await expect(nueva).toContainText('Quién puede reservarla: todos tus clientes')
  await nueva.getByRole('group', { name: 'Solo para las etiquetas' }).getByRole('button', { name: /VIP/ }).click()
  await expect(nueva).toContainText('solo los clientes con alguna de estas etiquetas')
  await nueva.getByRole('button', { name: 'Crear clase' }).click()

  await expect.poll(() => fake.rows('clases').find(k => k.titulo === 'Técnica VIP')?.etiquetas).toEqual(['lab-vip'])
  await expect(page.getByText('«Técnica VIP» creada ✓', { exact: false })).toBeVisible()
})
