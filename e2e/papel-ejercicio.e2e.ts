import { test, expect } from './support/test'
import { seedWorld, samplePlan, ids } from './support/seed'
import { entrarComoEntrenador, abrirFichaDelCliente } from './support/flows'

// El entrenador puede corregir el papel que se deduce del nombre; queda guardado en el ejercicio (campo `papel`).
test('el papel del ejercicio se deduce del nombre y el entrenador lo puede corregir', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const fila = fake.rows('planes')[0]
  fila.plan_borrador = { P: samplePlan({ exerciseNames: ['Sentadilla con pausa', 'Remo con barra', 'Curl de bíceps'] }) }
  fila.borrador_activo = true
  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)
  await page.getByRole('button', { name: /Abrir menú|Menú/i }).first().click().catch(() => {})
  await page.getByRole('button', { name: /^Plan/ }).first().click()
  await page.getByTitle('Arrastra para reordenar', { exact: true }).first().click()

  const papel = page.getByLabel('Papel del ejercicio')
  await expect(papel).toBeVisible()
  // Sin marcar: lo deduce del nombre
  await expect(papel.locator('option').first()).toHaveText('Automático (Variante)')
  await expect(papel).toHaveValue('')

  // Lo corrige a mano y se publica con el plan
  await papel.selectOption('accesorio')
  await page.getByRole('button', { name: 'Publicar cambios' }).dispatchEvent('click')
  await expect(page.getByText('Cambios publicados')).toBeVisible()
  const plan = fake.rows('planes').find(r => r.clientId === ids.client)!
  expect(plan.plan.P.weeks[0].days[0].exercises[0].papel).toBe('accesorio')
  expect(plan.plan.P.weeks[0].days[0].exercises[1].papel).toBeUndefined() // los demás, sin tocar
})
