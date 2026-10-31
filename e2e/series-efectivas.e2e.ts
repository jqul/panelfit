import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const haceDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

test('el volumen por grupo cuenta todas las series o solo las efectivas (RIR ≤ 3)', async ({ page, fake }) => {
  seedWorld(fake)
  // Tres semanas de plan iguales: el gráfico nombra cada registro por el ejercicio del plan
  const plan = fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P
  plan.weeks = [0, 1, 2].map(i => ({ ...plan.weeks[0], label: `Semana ${i + 1}`, isCurrent: i === 2 }))
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    // Hace dos semanas: dos series duras
    ex_w0_d0_r0: { done: true, dateDone: haceDias(14), sets: { 0: { weight: '80', reps: '8', rir: 1 }, 1: { weight: '80', reps: '8', rir: 1 } } },
    // Esta semana (hoy): una dura, una con margen y una sin RIR
    ex_w2_d0_r0: { done: true, dateDone: haceDias(0), sets: {
      0: { weight: '80', reps: '8', rir: 2 }, 1: { weight: '70', reps: '8', rir: 5 }, 2: { weight: '80', reps: '6' },
    } },
  } })
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' }) // en pantallas estrechas las pestañas de la ficha van en un menú
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Progreso/ }).first().click()
  await page.getByRole('button', { name: /Carga y riesgo/ }).click()
  await page.getByRole('button', { name: /Volumen por grupo/ }).click()

  await expect(page.getByText('3 series', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Efectivas (RIR ≤ 3)' }).click()
  await expect(page.getByText('2 efectivas', { exact: true })).toBeVisible()
  const nota = page.getByTestId('nota-efectivas')
  await expect(nota).toContainText('1 serie con RIR 4 o más no cuenta')
  await expect(nota).toContainText('1 sin RIR apuntado se dan por efectivas')
})
