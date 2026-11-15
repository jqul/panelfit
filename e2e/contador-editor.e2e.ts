import { test, expect } from './support/test'
import { seedWorld, samplePlan } from './support/seed'
import { entrarComoEntrenador, abrirFichaDelCliente } from './support/flows'

// El contador de series del editor del plan separa directas e indirectas (estimadas) y usa un lenguaje neutro.
test('el editor del plan cuenta las series directas y las indirectas estimadas por grupo', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const fila = fake.rows('planes')[0]
  // Press banca 3x5, Remo con barra 3x8 y Curl de bíceps 2x12 (los de la semilla)
  fila.plan_borrador = { P: samplePlan() }
  fila.borrador_activo = true
  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)
  await page.getByRole('button', { name: /Abrir menú|Menú/i }).first().click().catch(() => {})
  await page.getByRole('button', { name: /^Plan/ }).first().click()

  // Pecho: 3 directas. Bíceps: 2 del curl + la mitad de las 3 del remo (1,5 indirectas, estimado)
  await expect(page.getByTitle(/^Pecho: 3 directas\./)).toBeVisible()
  const biceps = page.getByTitle(/^Bíceps: 2 directas \+ 1,5 indirectas \(estimado\)\./)
  await expect(biceps).toBeVisible()
  await expect(biceps).toContainText('+1,5 ind.')
  // Tríceps: solo indirectas, del press banca (3 × 0,5)
  await expect(page.getByTitle(/^Tríceps: 0 directas \+ 1,5 indirectas/)).toBeVisible()
  // El rango es una referencia, no un límite, y nunca se llama «excesivo»
  await expect(biceps).toHaveAttribute('title', /rango habitual, no un límite/)
  await expect(page.getByText('Excesivo')).toHaveCount(0)
})
