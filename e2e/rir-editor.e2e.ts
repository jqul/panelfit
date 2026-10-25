import { test, expect } from './support/test'
import { seedWorld, samplePlan, ids } from './support/seed'
import { entrarComoEntrenador, abrirFichaDelCliente } from './support/flows'

// El entrenador fija el RIR objetivo en el editor del plan y queda guardado en el ejercicio (campo `rir`).
test('el entrenador fija el RIR objetivo de un ejercicio en el editor y se publica con el plan', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  // Se edita sobre un borrador (así lo hace el entrenador antes de publicar)
  const fila = fake.rows('planes')[0]
  fila.plan_borrador = { P: samplePlan() }
  fila.borrador_activo = true
  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)

  // Menú de la ficha → Plan
  await page.getByRole('button', { name: /Abrir menú|Menú/i }).first().click().catch(() => {})
  await page.getByRole('button', { name: /^Plan/ }).first().click()

  // El día ya viene desplegado: se despliega el primer ejercicio pulsando su fila (por el número, no por un campo)
  await page.getByTitle('Arrastra para reordenar', { exact: true }).first().click()

  const campo = page.getByLabel('RIR objetivo')
  await expect(campo).toBeVisible()
  await page.getByRole('button', { name: 'RIR 2-3' }).dispatchEvent('click') // el panel del ejercicio se anima: Playwright no lo ve "estable"
  await expect(campo).toHaveValue('2-3')
  await campo.fill('1 - 2') // se normaliza al salir del campo
  await campo.blur()
  await expect(campo).toHaveValue('1-2')
  await campo.fill('abc') // lo que no es un número no entra
  await expect(campo).toHaveValue('')

  await page.getByRole('button', { name: 'RIR 3-4' }).dispatchEvent('click')
  await page.getByRole('button', { name: 'Publicar cambios' }).dispatchEvent('click')
  await expect(page.getByText('Cambios publicados')).toBeVisible()
  const plan = fake.rows('planes').find(r => r.clientId === ids.client)!
  expect(plan.plan.P.weeks[0].days[0].exercises[0].rir).toBe('3-4')
  expect(plan.plan.P.weeks[0].days[0].exercises[1].rir).toBeUndefined() // los demás ejercicios, sin tocar
})
