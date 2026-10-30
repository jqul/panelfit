import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, entrarComoEntrenador } from './support/flows'

const TODOS_LOS_DIAS = Array.from({ length: 7 }, (_, dia) => ({ dia, desde: '08:00', hasta: '21:00' }))

test('con horario, el cliente reserva en un hueco libre y queda confirmada', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('horario_citas', { trainer_id: ids.trainer, franjas: TODOS_LOS_DIAS, duracion_min: 60, margen_min: 0, antelacion_horas: 24, autoconfirmar: true })
  await entrarComoCliente(page)

  await page.getByRole('button', { name: '+ Pedir cita' }).click()
  const dias = page.getByRole('group', { name: 'Día' })
  await expect(dias.getByRole('button').first()).toBeVisible()
  // El segundo día que se ofrece (pasado mañana) siempre tiene las 10:00; el primero depende de la hora que sea ahora
  await dias.getByRole('button').nth(1).click()
  await page.getByRole('group', { name: 'Hora' }).getByRole('button', { name: '10:00' }).click()
  await page.getByRole('button', { name: 'Reservar a las 10:00' }).click()
  await expect(page.getByText(/^Cita reservada: .* a las 10:00 ✓$/)).toBeVisible()

  const citas = fake.rows('citas')
  expect(citas).toHaveLength(1)
  expect(citas[0]).toMatchObject({ client_id: ids.client, trainer_id: ids.trainer, status: 'confirmada' })
  // Con 24 h de antelación, el primer día que se ofrece es mañana
  const inicio = new Date(citas[0].start_at)
  expect(inicio.getHours()).toBe(10)
  expect(inicio.getTime()).toBeGreaterThan(Date.now() + 24 * 3600_000 - 60_000)
})

test('sin horario, la solicitud libre de siempre', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: '+ Pedir cita' }).click()
  await expect(page.getByRole('button', { name: 'Enviar solicitud' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Hora' })).toHaveCount(0)
})

test('el entrenador pone su horario para reservas', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir al Calendario')
  await page.getByRole('option', { name: 'Ir al Calendario' }).click()
  await page.getByRole('button', { name: /Horario para reservas/ }).click()

  await page.getByRole('button', { name: 'Añadir franja el miércoles' }).click()
  await page.getByLabel('Miércoles: desde').fill('16:00')
  await page.getByLabel('Miércoles: hasta').fill('20:00')
  await page.getByRole('button', { name: '45 min' }).click()
  await page.getByRole('button', { name: 'Guardar horario' }).click()
  await expect(page.getByText('Horario guardado: tus clientes ya pueden reservar ✓')).toBeVisible()

  expect(fake.rows('horario_citas')).toMatchObject([{ trainer_id: ids.trainer, duracion_min: 45, franjas: [{ dia: 2, desde: '16:00', hasta: '20:00' }] }])
})
