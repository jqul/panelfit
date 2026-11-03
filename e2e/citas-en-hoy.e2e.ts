import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

// A las 10:00 UTC de dentro de N días: sea cual sea la hora y la zona en que corra la prueba, cae en ese día en Madrid
const aLas10 = (dias: number, min = 60) => {
  const d = new Date(); const ini = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + dias, 10))
  return { start_at: ini.toISOString(), end_at: new Date(ini.getTime() + min * 60000).toISOString() }
}

test('el Hoy del entrenador enseña las citas de mañana, sin las canceladas ni las de más adelante', async ({ page, fake }) => {
  seedWorld(fake)
  const base = { trainer_id: ids.trainer, notes: '', recurring: null, recurring_until: null }
  fake.seed('citas', { ...base, id: 'c1', client_id: ids.client, title: 'Sesión de fuerza', ...aLas10(1), status: 'confirmada' })
  fake.seed('citas', { ...base, id: 'c2', client_id: null, title: 'Llamada cancelada', ...aLas10(1, 30), status: 'cancelada' })
  fake.seed('citas', { ...base, id: 'c3', client_id: ids.client, title: 'Dentro de tres días', ...aLas10(3), status: 'confirmada' })

  await entrarComoEntrenador(page)
  const card = page.getByRole('region', { name: 'Próximas citas' })
  await expect(card).toContainText('Mañana')
  await expect(card).toContainText('María G.')
  await expect(card).toContainText('Sesión de fuerza')
  await expect(card).not.toContainText('Llamada cancelada')
  await expect(card).not.toContainText('Dentro de tres días')

  await card.getByRole('button', { name: /Próximas citas/ }).click()
  await expect(page.getByRole('button', { name: /Horario para reservas/ })).toBeVisible() // ya en la agenda
})

test('sin citas, la tarjeta lo dice', async ({ page, fake }) => {
  seedWorld(fake)
  await entrarComoEntrenador(page)
  await expect(page.getByRole('region', { name: 'Próximas citas' })).toContainText('Sin citas hoy ni mañana.')
})
