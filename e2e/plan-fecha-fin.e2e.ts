import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const semana = (i: number) => ({ label: `Semana ${i}`, rpe: '', isCurrent: i === 1, days: [{ title: 'Día A', focus: 'Fuerza', exercises: [] }] })

test('asignar un workout para que termine en una fecha calcula cuándo empieza', async ({ page, fake }) => {
  seedWorld(fake)
  fake.seed('plan_templates', {
    id: 'tmpl-1', trainer_id: ids.trainer, name: 'Hacia la competición', description: '', created_at: 1, updated_at: 1, label_ids: [], is_public: false,
    plan: { id: 'tmpl-1', name: 'Hacia la competición', type: 'Fuerza', weeks: [1, 2, 3, 4].map(semana) },
  })
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Workouts')
  await page.getByRole('option', { name: 'Ir a Workouts' }).click()
  await page.getByRole('button', { name: 'Asignar Hacia la competición a un cliente' }).click()

  const modal = page.getByRole('dialog', { name: 'Asignar «Hacia la competición»' })
  await modal.getByRole('radio', { name: /María/ }).click()
  await modal.getByRole('button', { name: 'Termina el' }).click()
  await modal.getByLabel('Fecha de fin').fill('2027-03-07') // domingo
  await expect(modal.getByTestId('resumen-fechas')).toContainText('(4 semanas)')
  await expect(modal.getByTestId('resumen-fechas')).toContainText('7 mar')
  await modal.getByRole('button', { name: 'Asignar a María' }).click()

  // 4 semanas que acaban la semana del 1 al 7 de marzo: 8, 15 y 22 de febrero y 1 de marzo → empieza el lunes 8
  await expect.poll(() => fake.rows('planes').find(r => r.clientId === ids.client)?.plan?.P?.fechaInicio).toBe('2027-02-08')
})
