import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const haceDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const s = (nombre: string, kg: number) => ({ done: true, dateDone: haceDias(3), substituteName: nombre, sets: { 0: { weight: String(kg), reps: '1' } } })

test('el entrenador ve la nota de fuerza por levantamiento y cuál va por detrás', async ({ page, fake }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  seedWorld(fake)
  const c = fake.rows('clientes').find(x => x.id === ids.client)!
  c.weight = 80; c.genero = 'h'
  // Sentadilla 1,5×, peso muerto 1,75× (intermedio: 60) y banca 0,75× (novato: 40)
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: { ex_w20_d0_r0: s('Sentadilla', 120), ex_w20_d0_r1: s('Peso muerto', 140), ex_w20_d0_r2: s('Press banca', 60) } })

  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  await page.getByRole('button', { name: /^Progreso/ }).first().click()
  await page.getByRole('button', { name: /Rendimiento/ }).first().click()
  await page.getByRole('button', { name: /Nivel de fuerza/ }).first().click()

  const nivel = page.getByRole('region', { name: 'Nivel de fuerza' })
  await expect(nivel).toContainText('53/100')
  await expect(nivel.getByRole('list', { name: 'Nota por levantamiento' })).toContainText('Press banca40')
  await expect(nivel).toContainText('Press banca va 20 puntos por detrás de peso muerto')
})
