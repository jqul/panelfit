import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const haceDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const series = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i, { weight: '60', reps: '8', rir: 2 }]))

test('el volumen por grupo separa directas e indirectas, con pesos que el entrenador puede cambiar', async ({ page, fake }) => {
  seedWorld(fake)
  const plan = fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P
  plan.weeks = [0, 1, 2].map(i => ({ ...plan.weeks[0], label: `Semana ${i + 1}`, isCurrent: i === 2 }))
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    ex_w0_d0_r0: { done: true, dateDone: haceDias(14), sets: series(3) },
    // Esta semana: 4 de press banca, 3 de remo y 2 de curl (Press banca, Remo con barra y Curl de bíceps)
    ex_w2_d0_r0: { done: true, dateDone: haceDias(0), sets: series(4) },
    ex_w2_d0_r1: { done: true, dateDone: haceDias(0), sets: series(3) },
    ex_w2_d0_r2: { done: true, dateDone: haceDias(0), sets: series(2) },
  } })
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Progreso/ }).first().click()
  await page.getByRole('button', { name: /Carga y riesgo/ }).click()
  await page.getByRole('button', { name: /Volumen por grupo/ }).click()

  // Sin indirectas: como siempre, solo lo directo de cada grupo
  await expect(page.getByText('4 series', { exact: true })).toBeVisible() // Pecho
  await expect(page.getByTestId('desglose-Bíceps')).toHaveCount(0)

  // Con indirectas: el bíceps tiene 2 directas del curl y 3 × 0,5 del remo
  await page.getByLabel('Contar el trabajo indirecto (estimado)').check()
  await expect(page.getByTestId('nota-indirectas')).toContainText('una serie indirecta no aporta lo mismo a todas las personas')
  await expect(page.getByTestId('desglose-Bíceps')).toHaveText('2 directas + 1,5 indirectas (est.)')
  await expect(page.getByTestId('desglose-Tríceps')).toHaveText('0 directas + 2 indirectas (est.)') // 4 × 0,5 del press banca
  await expect(page.getByTestId('desglose-Pecho')).toHaveText('4 directas + 0 indirectas (est.)')

  // El entrenador decide que en este cliente el remo no cuenta para el bíceps: se guarda en su perfil
  await page.getByText('Ajustar qué músculos ayuda cada ejercicio').click()
  await page.getByLabel('Bíceps en Remo con barra').selectOption('0')
  await expect(page.getByTestId('desglose-Bíceps')).toHaveText('2 directas + 0 indirectas (est.)')
  await expect.poll(() => fake.rows('entrenadores').find(r => r.uid === ids.trainer)?.profile?.contribMuscular?.['remo con barra'])
    .toEqual([{ grupo: 'Espalda', peso: 1 }, { grupo: 'Bíceps', peso: 0 }])
})
