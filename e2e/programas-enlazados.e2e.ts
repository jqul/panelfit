import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

test('el entrenador deja preparado el siguiente workout para cuando termine el plan', async ({ page, fake }) => {
  seedWorld(fake) // plan de una semana que empieza hoy
  fake.seed('plan_templates', {
    id: 'tmpl-b', trainer_id: ids.trainer, name: 'Fuerza B', description: '', created_at: 1, updated_at: 1, label_ids: [], is_public: false,
    plan: { id: 'tmpl-b', name: 'Fuerza B', type: 'fuerza', weeks: [
      { label: 'Semana 1', rpe: '', isCurrent: true, days: [{ title: 'Día A', focus: 'Pierna', exercises: [] }] },
      { label: 'Semana 2', rpe: '', isCurrent: false, days: [{ title: 'Día A', focus: 'Pierna', exercises: [] }] },
    ] },
  })
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' }) // en pantallas estrechas las pestañas de la ficha van en un menú
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Plan/ }).first().click()

  const siguiente = page.getByRole('region', { name: 'Cuando termine este plan' })
  await siguiente.getByRole('button', { name: 'Preparar siguiente' }).click()
  await siguiente.getByLabel('Siguiente workout').selectOption({ label: 'Fuerza B (2 sem.)' })
  await siguiente.getByRole('button', { name: 'Preparar' }).click()

  await expect(siguiente).toContainText('Empieza «Fuerza B» (2 sem.) el lunes')
  const fila = () => fake.rows('planes').find(r => r.clientId === ids.client)
  await expect.poll(() => fila()?.siguiente?.nombre).toBe('Fuerza B')
  expect(fila()?.siguiente?.weeks).toHaveLength(2)
  expect(fila()?.plan?.P?.weeks).toHaveLength(1) // el plan actual sigue igual hasta que termine

  await siguiente.getByRole('button', { name: 'Quitar' }).click()
  await expect(siguiente).toContainText('Prepara el siguiente workout')
  await expect.poll(() => fila()?.siguiente).toBeNull()
})
