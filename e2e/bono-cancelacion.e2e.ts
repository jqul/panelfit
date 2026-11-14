import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

test('una cita cancelada tarde gasta la sesión del bono y el entrenador puede devolverla', async ({ page, fake }) => {
  seedWorld(fake)
  const d = new Date(); d.setHours(10, 0, 0, 0); d.setDate(d.getDate() + (d.getDay() === 0 ? -1 : 1)) // dentro de esta semana
  fake.seed('bonos_cliente', { id: 'bono-1', trainer_id: ids.trainer, client_id: ids.client, nombre: 'Bono 10', sesiones: 10, caduca: null, created_at: new Date().toISOString() })
  fake.seed('citas', { id: 'c1', trainer_id: ids.trainer, client_id: ids.client, title: 'Sesión de María', start_at: d.toISOString(), end_at: new Date(d.getTime() + 3600_000).toISOString(),
    status: 'cancelada', notes: '', bono_id: 'bono-1', consume_bono: true })

  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir al Calendario')
  await page.getByRole('option', { name: 'Ir al Calendario' }).click()

  await expect(page.getByText('Cancelada tarde: gasta sesión del bono')).toBeVisible()
  await page.getByRole('button', { name: 'Devolver al bono' }).click()
  await expect(page.getByText('Sesión devuelta a su bono ✓')).toBeVisible()
  await expect.poll(() => fake.rows('citas').find(c => c.id === 'c1')?.consume_bono).toBe(false)
  await expect(page.getByText('Cancelada tarde: gasta sesión del bono')).toHaveCount(0)
})
