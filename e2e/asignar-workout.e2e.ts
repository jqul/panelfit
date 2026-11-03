import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

async function irAWorkouts(page: import('@playwright/test').Page) {
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Workouts')
  await page.getByRole('option', { name: 'Ir a Workouts' }).click()
}

test('un programa de la galería se añade y se asigna a un cliente sin salir de Workouts', async ({ page, fake }) => {
  seedWorld(fake)
  await entrarComoEntrenador(page)
  await irAWorkouts(page)
  await page.getByRole('button', { name: 'Más herramientas' }).click()
  await page.getByRole('button', { name: /Galería de workouts/ }).click()
  await page.getByRole('button', { name: 'Añadir Fuerza básica 4 días a mi librería' }).click()

  // Ya en la librería, con el aviso para asignarlo
  const aviso = page.getByRole('status').filter({ hasText: 'ya está en tu librería' })
  await expect(aviso).toContainText('«Fuerza básica 4 días»')
  await aviso.getByRole('button', { name: 'Asignar a un cliente' }).click()

  const modal = page.getByRole('dialog', { name: 'Asignar «Fuerza básica 4 días»' })
  await modal.getByRole('radio', { name: /María/ }).click()
  await modal.getByRole('button', { name: 'Asignar a María' }).click()
  await expect(page.getByText('«Fuerza básica 4 días» asignado a María ✓')).toBeVisible()

  // Su plan tiene ahora las semanas del programa, y el que tenía quedó en el historial
  const plan = () => fake.rows('planes').find(r => r.clientId === ids.client)?.plan?.P
  await expect.poll(() => plan()?.weeks?.[0]?.days?.map((d: { focus: string }) => d.focus)).toEqual(['Sentadilla', 'Press banca', 'Peso muerto', 'Press militar'])
  expect(plan()?.type).toBe('Fuerza')
  expect(fake.rows('plan_history').filter(r => r.clientId === ids.client).length).toBe(1)
})

test('cada workout de la librería tiene su botón Asignar', async ({ page, fake }) => {
  seedWorld(fake)
  fake.seed('plan_templates', {
    id: 'tmpl-1', trainer_id: ids.trainer, name: 'Torso pierna', description: '', created_at: 1, updated_at: 1, label_ids: [], is_public: false,
    plan: { id: 'tmpl-1', name: 'Torso pierna', type: 'Hipertrofia', weeks: [{ label: 'Semana 1', rpe: '', isCurrent: true, days: [{ title: 'Día A', focus: 'Torso', exercises: [] }] }] },
  })
  await entrarComoEntrenador(page)
  await irAWorkouts(page)
  await page.getByRole('button', { name: 'Asignar Torso pierna a un cliente' }).click()
  const modal = page.getByRole('dialog', { name: 'Asignar «Torso pierna»' })
  await expect(modal.getByRole('button', { name: 'Elige un cliente' })).toBeDisabled()
  await modal.getByRole('radio', { name: /María/ }).click()
  await modal.getByRole('button', { name: 'Asignar a María' }).click()
  await expect.poll(() => fake.rows('planes').find(r => r.clientId === ids.client)?.plan?.P?.weeks?.[0]?.days?.[0]?.focus).toBe('Torso')
})
