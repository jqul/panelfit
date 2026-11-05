import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, entrarComoEntrenador } from './support/flows'

const enMin = (m: number) => new Date(Date.now() + m * 60_000).toISOString()

test('el cliente entra a su cita online con «Unirse» cuando está a punto de empezar', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('citas', { id: 'c1', trainer_id: ids.trainer, client_id: ids.client, title: 'Revisión online', start_at: enMin(10), end_at: enMin(55), status: 'confirmada', notes: '', enlace: 'https://meet.google.com/abc-defg-hij' })
  fake.seed('citas', { id: 'c2', trainer_id: ids.trainer, client_id: ids.client, title: 'Revisión de la semana que viene', start_at: enMin(60 * 24 * 3), end_at: enMin(60 * 24 * 3 + 45), status: 'confirmada', notes: '', enlace: 'https://zoom.us/j/123' })
  await entrarComoCliente(page)

  const unirse = page.getByRole('link', { name: 'Unirse' })
  await expect(unirse).toHaveCount(1) // la de dentro de 3 días aún no
  await expect(unirse).toHaveAttribute('href', 'https://meet.google.com/abc-defg-hij')
  await expect(page.getByText('Online · Google Meet')).toBeVisible()
  await expect(page.getByText('Online · Zoom')).toBeVisible()
  await expect(page.getByText('Enlace activo 15 min antes')).toBeVisible()
})

test('clase online: con plaza tiene el enlace; en la lista de espera, aún no', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('clases', { id: 'k1', trainer_id: ids.trainer, titulo: 'Yoga online', start_at: enMin(10), end_at: enMin(70), aforo: 5, notas: '', cancelada: false, enlace: 'https://zoom.us/j/999' })
  fake.seed('clases', { id: 'k2', trainer_id: ids.trainer, titulo: 'HIIT online', start_at: enMin(60 * 24), end_at: enMin(60 * 25), aforo: 1, notas: '', cancelada: false, enlace: 'https://zoom.us/j/888' })
  fake.seed('clase_plazas', { clase_id: 'k1', client_id: ids.client, estado: 'reservada', created_at: enMin(-60) })
  fake.seed('clase_plazas', { clase_id: 'k2', client_id: 'otra', estado: 'reservada', created_at: enMin(-60) })
  fake.seed('clase_plazas', { clase_id: 'k2', client_id: ids.client, estado: 'espera', created_at: enMin(-30) })
  await entrarComoCliente(page)

  const clases = page.getByRole('region', { name: 'Clases de grupo' })
  const yoga = clases.getByRole('listitem', { name: 'Yoga online' })
  await expect(yoga.getByRole('link', { name: 'Unirse' })).toHaveAttribute('href', 'https://zoom.us/j/999')
  const hiit = clases.getByRole('listitem', { name: 'HIIT online' })
  await expect(hiit).toContainText('el enlace te llega al tener plaza')
  await expect(hiit.getByRole('link', { name: 'Unirse' })).toHaveCount(0)
})

test('el entrenador crea una cita online con su enlace', async ({ page, fake }) => {
  seedWorld(fake)
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir al Calendario')
  await page.getByRole('option', { name: 'Ir al Calendario' }).click()
  await page.getByRole('button', { name: /^Añadir sesión el / }).first().click()

  await page.getByRole('checkbox', { name: 'Online (videollamada)' }).check()
  await page.getByLabel('Enlace de la videollamada').fill('zoom')
  await expect(page.getByText('Pega el enlace completo de la videollamada')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Crear sesión' })).toBeDisabled()
  await page.getByLabel('Enlace de la videollamada').fill('https://meet.google.com/abc-defg-hij')
  await page.getByRole('button', { name: 'Crear sesión' }).click()

  await expect.poll(() => fake.rows('citas').slice(-1)[0]?.enlace).toBe('https://meet.google.com/abc-defg-hij')
  await expect(page.getByText('Online · Google Meet').first()).toBeVisible()
})
