import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

test('Negocio enseña las sesiones del mes, cuántas completas, cómo las valoraron y el esfuerzo medio', async ({ page, fake }) => {
  seedWorld(fake)
  const plan = fake.rows('planes').find(p => p.clientId === ids.client)!.plan.P
  const n = plan.weeks[0].days[0].exercises.length
  // Hoy: el día 0 entero (completa)
  const logs = Object.fromEntries(Array.from({ length: n }, (_, r) => [`ex_w0_d0_r${r}`, { done: true, dateDone: hoy(), sets: { 0: { weight: '50', reps: '5' } } }]))
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs })
  fake.seed('session_reactions', { id: 'r1', clientId: ids.client, date: hoy(), emoji: '🔥', comment: null })
  fake.seed('session_load', { id: 'l1', client_id: ids.client, trainer_id: ids.trainer, date: hoy(), duration_min: 60, rpe: 8, load_au: 480 })

  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Mi negocio')
  await page.getByRole('option', { name: 'Ir a Mi negocio' }).click()

  const servicio = page.getByRole('region', { name: 'Calidad del servicio' })
  await expect(servicio).toContainText('Sesiones hechas1', { timeout: 30_000 }) // la primera vez el servidor compila la tarjeta
  await expect(servicio).toContainText('Sesiones completas100%')
  await expect(servicio).toContainText('Valoración positiva100%')
  await expect(servicio).toContainText('Esfuerzo medio8/10')

  // El mes anterior, vacío; y el siguiente al actual no se puede abrir
  await expect(servicio.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled()
  await servicio.getByRole('button', { name: 'Mes anterior' }).click()
  await expect(servicio).toContainText('Nadie ha registrado sesiones este mes.')
})
