import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

// Un día de la semana `atras` (0 = esta) contando desde su lunes (0 = lunes)
const dia = (atras: number, desdeLunes: number) => {
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7 * atras + desdeLunes)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const s = (fecha: string, kg: number) => ({ done: true, dateDone: fecha, substituteName: 'Press banca', sets: { 0: { weight: String(kg), reps: '5' } } })

test('la Bandeja avisa de quien cada semana entrena menos y de los ejercicios estancados', async ({ page, fake }) => {
  seedWorld(fake)
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    // Hace 3 semanas: 3 días; hace 2: 2; la pasada: 1 → 3 → 2 → 1
    a: s(dia(3, 0), 80), b: s(dia(3, 2), 82.5), c: s(dia(3, 4), 80),
    d: s(dia(2, 1), 80), e: s(dia(2, 3), 80),
    f: s(dia(1, 2), 80),
  } })
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /^Bandeja/ }).first().click()
  await expect(page.getByText('📉 Cada semana entrena menos (3 → 2 → 1 días)')).toBeVisible()
  await expect(page.getByText(/🔧 Estancado: Press banca/)).toBeVisible()
})
