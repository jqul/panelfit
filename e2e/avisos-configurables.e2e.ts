import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, entrarComoEntrenador } from './support/flows'

test('el entrenador apaga un tipo de aviso en Ajustes y se guarda en su perfil sin pisar el resto', async ({ page, fake }) => {
  seedWorld(fake)
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a ajustes')
  await page.keyboard.press('Enter')

  const tipos = page.getByRole('list', { name: 'Tipos de aviso' })
  const sesion = tipos.getByRole('switch', { name: 'Sesión completada' })
  await expect(sesion).toHaveAttribute('aria-checked', 'true')
  await sesion.click()
  await expect(sesion).toHaveAttribute('aria-checked', 'false')

  const perfil = () => fake.rows('entrenadores').find(e => e.uid === ids.trainer)!.profile
  await expect.poll(() => perfil().avisos?.sesion).toBe(false)
  expect(perfil().avisos.record).toBe(true)
  expect(perfil().brandName).toBe('AlexFit')
})

test('un check-in con escalas bajas avisa al entrenador, con el tipo para que pueda apagarlo', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const avisos: { title: string; body: string; trainerId?: string; tipo?: string }[] = []
  await page.route('**/functions/v1/send-push', async route => {
    avisos.push(JSON.parse(route.request().postData() || '{}'))
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  await entrarComoCliente(page)
  await page.getByLabel('Energía, de 1 a 5').fill('2')
  await page.getByLabel('Sueño, de 1 a 5').fill('1')
  await page.getByRole('button', { name: 'Enviar' }).click()

  await expect.poll(() => avisos.find(a => a.tipo === 'checkin_bajo')?.body).toBe('María García: Energía 2/5 · Sueño 1/5')
  expect(avisos.find(a => a.tipo === 'checkin_bajo')?.trainerId).toBe(ids.trainer)
})
