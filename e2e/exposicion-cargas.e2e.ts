import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const haceDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

test('Trabajo específico cuenta las repeticiones por encima del 70, 80 y 90 % del 1RM de cada sesión', async ({ page, fake }) => {
  seedWorld(fake)
  const plan = fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P
  plan.weeks = [0, 1, 2].map(i => ({ ...plan.weeks[0], label: `Semana ${i + 1}`, isCurrent: i === 2 }))
  plan.weeks.forEach((w: any) => { w.days[0].exercises[0].name = 'Sentadilla' })
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    // Hace dos semanas: un single de 180 (su 1RM de entonces)
    ex_w0_d0_r0: { done: true, dateDone: haceDias(14), sets: { 0: { weight: '180', reps: '1' } } },
    // Hoy: 165×3 (91,7 %), 145×5 (80,6 %) y 125×8 (69,4 %) respecto a ese 180
    ex_w2_d0_r0: { done: true, dateDone: haceDias(0), sets: {
      0: { weight: '165', reps: '3' }, 1: { weight: '145', reps: '5' }, 2: { weight: '125', reps: '8' },
    } },
  } })
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Progreso/ }).first().click()
  await page.getByRole('button', { name: /Carga y riesgo/ }).click()
  await page.getByRole('button', { name: /Trabajo específico/ }).click()

  const bloque = page.getByTestId('exposicion-cargas')
  const fila = bloque.getByRole('row', { name: /Sentadilla Competición/ })
  // Por defecto ≥ 80 %: 3 + 5 repeticiones de las 16 de la semana
  await expect(fila).toContainText('8 / 16')
  await bloque.getByRole('button', { name: '≥ 90 %' }).click()
  await expect(fila).toContainText('3 / 16')
  await bloque.getByRole('button', { name: '≥ 70 %' }).click()
  await expect(fila).toContainText('8 / 16') // las 8 de 125 kg (69,4 %) no llegan al 70 %
  await expect(bloque).toContainText('no el de hoy')
})
