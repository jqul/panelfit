import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

// En «Hoy», junto al nombre de cada cliente: su objetivo y sus etiquetas, como contexto rápido (no otra pantalla de filtros).
test('Hoy enseña el objetivo y las etiquetas del cliente junto a su nombre', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('labels', { id: 'lab-online', trainer_id: ids.trainer, name: 'Online', color: '#2f6f4f', emoji: '💻', survey_template_id: null, created_at: 1 })
  const maria = fake.rows('clientes').find(r => r.id === ids.client)!
  maria.label_ids = ['lab-online']
  maria.main_goal = 'Competir en abril'
  await entrarComoEntrenador(page)

  const fila = page.getByRole('button', { name: /María García/ }).first()
  await expect(fila).toContainText('Competir en abril')
  await expect(fila).toContainText('Online')
})

test('un cliente sin etiquetas y con objetivo «general» no lleva contexto', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const maria = fake.rows('clientes').find(r => r.id === ids.client)!
  maria.objetivo = 'general'
  await entrarComoEntrenador(page)
  const fila = page.getByRole('button', { name: /María García/ }).first()
  await expect(fila).toBeVisible()
  await expect(fila).not.toContainText('🎯')
})
