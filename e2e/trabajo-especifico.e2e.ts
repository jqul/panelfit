import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

test('Progreso separa el trabajo de competición, las variantes y los accesorios por levantamiento', async ({ page, fake }) => {
  seedWorld(fake)
  const plan = fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P
  const ex = plan.weeks[0].days[0].exercises
  ex[0].name = 'Sentadilla'                    // sin marcar: se deduce → competición
  ex[1].name = 'Remo con barra'; ex[1].papel = 'variante' // marcado a mano, pero no es un levantamiento: va a accesorios
  ex[2].name = 'Press banca con agarre cerrado' // sin marcar: se deduce → variante de banca
  const serie = (reps: string, tipo?: string) => ({ weight: '100', reps, ...(tipo ? { tipo } : {}) })
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    ex_w0_d0_r0: { done: true, dateDone: hoy(), sets: { 0: serie('5', 'calentamiento'), 1: serie('5'), 2: serie('5'), 3: serie('5'), 4: serie('5') } },
    ex_w0_d0_r1: { done: true, dateDone: hoy(), sets: { 0: serie('10'), 1: serie('10') } },
    ex_w0_d0_r2: { done: true, dateDone: hoy(), sets: { 0: serie('6'), 1: serie('6'), 2: serie('6') } },
  } })

  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Progreso/ }).first().click()
  await page.getByRole('button', { name: /Carga y riesgo/ }).click()
  await page.getByRole('button', { name: /Trabajo específico/ }).click()

  // Sentadilla: 4 series de competición (el calentamiento no cuenta) y 20 repeticiones
  await expect(page.getByRole('row', { name: /Sentadilla Competición/ })).toContainText('4 · 20')
  // Banca con agarre cerrado: variante, 3 series y 18 repeticiones
  await expect(page.getByRole('row', { name: /Press banca Variantes/ })).toContainText('3 · 18')
  // El remo marcado como variante no es ninguno de los tres levantamientos: queda en accesorios
  await expect(page.getByRole('row', { name: /Accesorios/ })).toContainText('2 · 20')
  // No aparece una fila de peso muerto sin datos
  await expect(page.getByRole('row', { name: /Peso muerto/ })).toHaveCount(0)
})
