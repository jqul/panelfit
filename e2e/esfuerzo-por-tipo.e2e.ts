import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const haceDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const serie = (rir?: number, tipo?: string) => ({ weight: '100', reps: '5', ...(rir !== undefined ? { rir } : {}), ...(tipo ? { tipo } : {}) })

test('el esfuerzo se separa por papel del ejercicio, con distribución, comparación entre bloques y desvío sobre el previsto', async ({ page, fake }) => {
  test.setTimeout(120_000) // la primera carga de pantallas diferidas compila en frío
  expect.configure({ timeout: 30_000 })
  seedWorld(fake)
  const plan = fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P
  plan.weeks = Array.from({ length: 6 }, (_, i) => JSON.parse(JSON.stringify({ ...plan.weeks[0], label: `Semana ${i + 1}`, isCurrent: i === 5 })))
  plan.weeks.forEach((w: any) => {
    w.days[0].exercises[0].name = 'Sentadilla'; w.days[0].exercises[0].rir = '2-3' // previsto: RIR 2-3 ⇒ RPE 7,5
    w.days[0].exercises[1].name = 'Remo con barra'
  })
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    // Hace 5 semanas (bloque anterior): sentadilla a RPE 7
    ex_w0_d0_r0: { done: true, dateDone: haceDias(35), sets: { 0: serie(3), 1: serie(3) } },
    // Esta semana: sentadilla a RPE 8 y 9 (más un calentamiento que no cuenta) y remo a RPE 7
    ex_w5_d0_r0: { done: true, dateDone: haceDias(0), sets: { 0: serie(5, 'calentamiento'), 1: serie(2), 2: serie(1) } },
    ex_w5_d0_r1: { done: true, dateDone: haceDias(0), sets: { 0: serie(3), 1: serie(3) } },
  } })
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Progreso/ }).first().click()
  await page.getByRole('button', { name: /Carga y riesgo/ }).click()
  await page.getByRole('button', { name: /Esfuerzo por tipo/ }).click()

  // Media por semana, por separado para competición y accesorios (el calentamiento no cuenta)
  await expect(page.getByRole('row', { name: /Competición/ })).toContainText('8,5 · 2')
  await expect(page.getByRole('row', { name: /Accesorio/ })).toContainText('7 · 2')

  // Distribución de las últimas 4 semanas
  const dist = page.getByTestId('distribucion-rpe')
  await expect(dist.getByRole('img', { name: /Competición: .*RPE 8: 1, RPE 9: 1/ })).toBeVisible()
  await expect(dist).toContainText('máx. RPE 9')

  // Comparación con las 4 semanas anteriores y desvío sobre el previsto (RPE 8 y 9 cuando tocaba 7,5: +1)
  const cmp = page.getByTestId('comparacion-bloques')
  await expect(cmp).toContainText(/Competición:\s*RPE 8,5/)
  await expect(cmp).toContainText('+1,5 respecto a las 4 semanas anteriores')
  await expect(cmp).toContainText('+1 sobre el RPE previsto en 2 series con objetivo')
  await expect(cmp).toContainText(/Accesorio:\s*RPE 7/)
  await expect(cmp).toContainText('sin datos antes para comparar')
})
