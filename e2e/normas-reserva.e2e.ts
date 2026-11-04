import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, entrarComoEntrenador } from './support/flows'

const TODOS_LOS_DIAS = Array.from({ length: 7 }, (_, dia) => ({ dia, desde: '08:00', hasta: '21:00' }))

test('el entrenador fija hasta cuándo se reserva y hasta cuándo puede cancelar el cliente', async ({ page, fake }) => {
  seedWorld(fake)
  fake.seed('horario_citas', { trainer_id: ids.trainer, franjas: TODOS_LOS_DIAS, duracion_min: 60, margen_min: 0, antelacion_horas: 12, autoconfirmar: false })
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a calendario')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: /Horario para reservas/ }).click()

  const modal = page.getByRole('dialog', { name: 'Horario para reservas' })
  await modal.getByRole('group', { name: 'Reservar con hasta' }).getByRole('button', { name: '2 semanas' }).click()
  await modal.getByRole('group', { name: 'El cliente puede cancelar' }).getByRole('button', { name: '24 h antes' }).click()
  await modal.getByRole('button', { name: 'Guardar horario' }).click()
  await expect.poll(() => fake.rows('horario_citas').find(h => h.trainer_id === ids.trainer)).toMatchObject({ dias_vista: 14, cancelar_horas: 24 })
})

test('el cliente solo ve los días que se pueden reservar, sabe hasta cuándo puede cancelar y por qué no puede', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('horario_citas', { trainer_id: ids.trainer, franjas: TODOS_LOS_DIAS, duracion_min: 60, margen_min: 0, antelacion_horas: 0, autoconfirmar: true, dias_vista: 3, cancelar_horas: 24 })
  // Una cita dentro de dos horas: fuera del plazo de cancelación (24 h)
  const ini = new Date(Date.now() + 2 * 3600_000)
  fake.seed('citas', { id: 'cita-pronto', trainer_id: ids.trainer, client_id: ids.client, title: 'Sesión', start_at: ini.toISOString(), end_at: new Date(ini.getTime() + 3600_000).toISOString(), status: 'confirmada', notes: '', recurring: null, recurring_until: null })
  // La base de datos real lo impide con un disparador (bloque28); aquí se simula su respuesta
  await page.route('**/rest/v1/citas?*', async route => {
    if (route.request().method() !== 'PATCH') return route.fallback()
    await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'P0001', message: 'plazo_cancelacion', hint: 'Se puede cancelar hasta 24 h antes' }) })
  })
  await entrarComoCliente(page)

  await page.getByRole('button', { name: 'Cancelar' }).first().click()
  await expect(page.getByText('Se puede cancelar hasta 24 h antes: habla con tu entrenador.')).toBeVisible()

  await page.getByRole('button', { name: '+ Pedir cita' }).click()
  const dias = page.getByRole('group', { name: 'Día' })
  await expect(dias.getByRole('button').first()).toBeVisible()
  expect(await dias.getByRole('button').count()).toBeLessThanOrEqual(4) // 3 días vista (hoy incluido, según la hora)
  await expect(page.getByText(/Puedes cancelarla hasta 24 h antes\./)).toBeVisible()
})
