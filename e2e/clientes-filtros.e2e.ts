import { test, expect } from './support/test'
import { seedWorld, samplePlan, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const PEDRO = '44444444-4444-4444-8444-444444444444'

test('filtrar clientes por etiqueta y ver quién no ha entrado nunca', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  // María nunca ha abierto su enlace; Pedro sí, y lleva la etiqueta "Online"
  fake.seed('labels', { id: 'lab-online', trainer_id: ids.trainer, name: 'Online', color: '#2f6f4f', emoji: '💻', survey_template_id: null, created_at: 1 })
  fake.seed('clientes', { id: PEDRO, trainerId: ids.trainer, name: 'Pedro', surname: 'Ruiz', token: 'tokenpedro', metricas_cliente: [], createdAt: Date.now(), label_ids: ['lab-online'], plan_last_opened_at: new Date().toISOString() })
  fake.seed('planes', { clientId: PEDRO, plan: { P: { ...samplePlan(), clientId: PEDRO } }, updatedAt: 1000, borrador_activo: false, plan_borrador: null })

  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: 'Ver todos →' }).first().click()
  const fila = (n: string) => page.getByRole('button', { name: `Abrir a ${n}` })
  await expect(fila('María García')).toBeVisible()
  await expect(fila('Pedro Ruiz')).toBeVisible()

  await page.getByRole('button', { name: /^Sin entrar/ }).click()
  await expect(fila('María García')).toBeVisible()
  await expect(fila('Pedro Ruiz')).toHaveCount(0)

  await page.getByRole('button', { name: /^Todos/ }).click()
  await page.getByLabel('Filtrar por etiqueta').selectOption('lab-online')
  await expect(fila('Pedro Ruiz')).toBeVisible()
  await expect(fila('María García')).toHaveCount(0)
})
