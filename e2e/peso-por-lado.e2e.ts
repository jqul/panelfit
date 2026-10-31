import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'

test('con «peso por lado» el cliente apunta el peso de un lado y el volumen cuenta el doble', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  // El entrenador marcó el primer ejercicio como peso por lado
  const plan = fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P
  plan.weeks[0].days[0].exercises[0] = { ...plan.weeks[0].days[0].exercises[0], name: 'Press con mancuernas', weight: '', pesoPorLado: true }

  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  await expect(page.getByText('kg por lado', { exact: true })).toBeVisible() // vista de foco

  await page.getByRole('button', { name: 'Ver todos los ejercicios en lista' }).click()
  await expect(page.getByText('Kg/lado', { exact: true })).toBeVisible()
  await page.getByLabel('Peso serie 1').first().fill('20')
  await page.getByLabel('Repeticiones serie 1').first().fill('5')
  await page.getByRole('button', { name: 'Marcar serie 1 como hecha' }).first().click()

  // 20 kg × 5 reps × 2 lados
  await expect(page.getByLabel('Hoy frente a la última vez').first()).toContainText('200')
  await expect.poll(() => fake.rows('registros').find(r => r.clientId === ids.client)?.logs?.ex_w0_d0_r0)
    .toMatchObject({ porLado: true, sets: { 0: { weight: '20', reps: '5' } } })
})
