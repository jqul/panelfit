import { test, expect } from './support/test'
import { seedWorld, samplePlan } from './support/seed'
import { entrarComoEntrenador, abrirFichaDelCliente } from './support/flows'

// El editor del plan dice cuánto dura cada día con los descansos de ese plan, para que el entrenador lo vea al montarlo.

test('el editor del plan enseña la duración estimada de cada día', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const fila = fake.rows('planes')[0]
  fila.plan_borrador = { P: samplePlan() } // se edita sobre un borrador, como hace el entrenador
  fila.borrador_activo = true
  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)
  await page.getByRole('button', { name: /Abrir menú|Menú/i }).first().click().catch(() => {})
  await page.getByRole('button', { name: /^Plan/ }).first().click()

  // 3x5 (descanso 120 s) + 3x8 (60 s) + 2x12 (60 s) = 16 min, redondeado a 5
  await expect(page.getByTitle('Duración estimada con los descansos de este plan')).toHaveText('~15 min')
})
