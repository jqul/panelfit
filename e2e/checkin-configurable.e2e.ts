import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, entrarComoEntrenador } from './support/flows'

test('el entrenador elige qué preguntar en el check-in y se guarda en su perfil sin pisar el resto', async ({ page, fake }) => {
  seedWorld(fake)
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a ajustes')
  await page.keyboard.press('Enter')

  const checkin = page.getByRole('region', { name: 'Check-in diario' })
  await expect(checkin.getByRole('button', { name: 'Guardar check-in' })).toBeDisabled()
  const escalas = checkin.getByRole('group', { name: 'Escalas de siempre' })
  await escalas.getByRole('button', { name: /Estrés/ }).click()
  await escalas.getByRole('button', { name: /Agujetas/ }).click()
  await checkin.getByRole('button', { name: '+ 💧 Hidratación' }).click()
  await checkin.getByRole('button', { name: 'Guardar check-in' }).click()
  await expect(page.getByText('Check-in guardado ✓')).toBeVisible()

  const perfil = fake.rows('entrenadores').find(e => e.uid === ids.trainer)!.profile
  expect(perfil.checkin.escalas).toEqual(['motivation', 'sleep'])
  expect(perfil.checkin.extra.map((e: { label: string }) => e.label)).toEqual(['Hidratación'])
  expect(perfil.brandName).toBe('AlexFit') // lo demás del perfil sigue ahí
})

test('el cliente responde solo lo que pregunta su entrenador y lo demás queda vacío', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.rows('entrenadores').find(e => e.uid === ids.trainer)!.profile.checkin = {
    escalas: ['sleep'], extra: [{ id: 'x1', label: 'Hidratación', emoji: '💧', bajo: 'Poca agua', alto: 'Bien hidratado' }],
  }
  await entrarComoCliente(page)

  await expect(page.getByText('¿Cómo te encuentras hoy?')).toBeVisible()
  await expect(page.getByRole('group', { name: 'Sueño' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Hidratación' })).toContainText('Bien hidratado')
  await expect(page.getByRole('group', { name: 'Energía' })).toHaveCount(0)
  await expect(page.getByRole('group', { name: 'Estrés' })).toHaveCount(0)

  await page.getByLabel('Hidratación, de 1 a 5').fill('5')
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByText('¿Cómo te encuentras hoy?')).toBeHidden()

  const fila = () => fake.rows('readiness_checkins').find(r => r.clientId === ids.client)
  await expect.poll(() => fila()?.extra).toEqual({ x1: 5 })
  expect(fila()).toMatchObject({ sleep: 3, motivation: null, soreness: null, stress: null })
})
