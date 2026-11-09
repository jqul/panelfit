import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, entrarComoEntrenador } from './support/flows'

const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const cumpleHoy = (fake: Parameters<typeof seedWorld>[0]) => {
  const c = fake.rows('clientes').find(r => r.id === ids.client)!
  c.fechanacimiento = `1994-${hoy().slice(5)}`
  c.phone = '+34 600 111 222'
}

test('la agenda muestra el cumpleaños y deja felicitar por WhatsApp o programar el mensaje en la app', async ({ page, fake }) => {
  seedWorld(fake)
  cumpleHoy(fake)
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir al Calendario')
  await page.getByRole('option', { name: 'Ir al Calendario' }).click()

  await expect(page.getByText(/🎂 Cumple María García/)).toBeVisible()
  await expect(page.getByText(`${new Date().getFullYear() - 1994} años`)).toBeVisible()
  const wa = page.getByRole('link', { name: 'Felicitar a María García por WhatsApp' })
  await expect(wa).toHaveAttribute('href', /^https:\/\/wa\.me\/34600111222\?text=.*Feliz%20cumplea%C3%B1os%2C%20Mar%C3%ADa/)

  await page.getByRole('button', { name: 'Programar felicitación para María García' }).click()
  await expect(page.getByText('Felicitación programada', { exact: true })).toBeVisible()
  await expect.poll(() => fake.rows('programacion_mensajes').find(m => m.clientId === ids.client)).toMatchObject({ tipo: 'cumpleanos', fechaEnvio: hoy(), trainerId: ids.trainer })

  // En el mes, el día lleva la tarta y lo dice su etiqueta
  await page.getByRole('radio', { name: 'Mes', exact: true }).click()
  await expect(page.getByRole('gridcell', { name: /cumpleaños de María/ })).toBeVisible()
})

test('el día de su cumpleaños, el cliente ve la felicitación en Hoy', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  cumpleHoy(fake)
  await entrarComoCliente(page)
  await expect(page.getByRole('status').filter({ hasText: '¡Feliz cumpleaños, María!' })).toBeVisible()
})
