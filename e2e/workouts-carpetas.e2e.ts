import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const workout = (id: string, name: string, created_at: number) => ({
  id, trainer_id: ids.trainer, name, description: '', created_at, updated_at: created_at, label_ids: [], is_public: false,
  plan: { id, name, type: 'Fuerza', weeks: [{ label: 'Semana 1', rpe: '', isCurrent: false, days: [{ title: 'Día A', focus: '', exercises: [] }] }] },
})

test('mover un workout a una carpeta y ver solo los de esa carpeta', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('plan_templates', workout('tmpl-1', 'Torso pierna', 2))
  fake.seed('plan_templates', workout('tmpl-2', 'Full body casa', 1))

  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Workouts')
  await page.getByRole('option', { name: 'Ir a Workouts' }).click()
  await expect(page.getByRole('group', { name: 'Carpetas' })).toHaveCount(0) // sin carpetas, no hay fila de carpetas

  await page.getByRole('button', { name: 'Acciones de Torso pierna' }).click()
  await page.getByRole('button', { name: 'Mover a carpeta…' }).click()
  await page.getByLabel('Carpeta').fill('  Fuerza   2026 ')
  await page.getByRole('button', { name: 'Mover', exact: true }).click()
  await expect(page.getByText('«Torso pierna» está en Fuerza 2026 ✓')).toBeVisible()
  expect(fake.rows('plan_templates').find(t => t.id === 'tmpl-1')!.plan.carpeta).toBe('Fuerza 2026')

  const carpetas = page.getByRole('group', { name: 'Carpetas' })
  await carpetas.getByRole('button', { name: /Fuerza 2026 \(1\)/ }).click()
  await expect(page.getByText('Torso pierna', { exact: true })).toBeVisible()
  await expect(page.getByText('Full body casa', { exact: true })).toHaveCount(0)
  await carpetas.getByRole('button', { name: /Sin carpeta \(1\)/ }).click()
  await expect(page.getByText('Full body casa', { exact: true })).toBeVisible()
  await expect(page.getByText('Torso pierna', { exact: true })).toHaveCount(0)
})
