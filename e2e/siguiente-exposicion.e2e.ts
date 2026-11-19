import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { Page } from '@playwright/test'

const haceDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// Debajo del historial del ejercicio (Progreso → Fuerza): «Siguiente exposición», una orientación explicada que no toca el plan.
function sembrar(fake: Parameters<typeof seedWorld>[0], expos: [number, number, number, number][], confirmada: boolean) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const fila = fake.rows('planes').find(r => r.clientId === ids.client)!
  const plan = fila.plan.P
  plan.weeks = [0, 1, 2, 3, 4, 5].map(i => ({ ...plan.weeks[0], label: `Semana ${i + 1}`, isCurrent: i === 5 }))
  plan.weeks.forEach((w: any) => { w.days[0].exercises[0] = { ...w.days[0].exercises[0], name: 'Press banca', sets: '3x8-10', rir: '2-3' } })
  if (confirmada) plan.calibracion = { confirmadaEl: haceDias(70) } // confirmada ANTES de estas sesiones: ninguna es de calibración
  const logs: Record<string, unknown> = {}
  expos.forEach(([dias, kg, reps, rir], w) => {
    logs[`ex_w${w}_d0_r0`] = { done: true, dateDone: haceDias(dias), sets: { 0: { weight: String(kg), reps: String(reps), rir }, 1: { weight: String(kg), reps: String(reps), rir }, 2: { weight: String(kg), reps: String(reps), rir } } }
  })
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs })
  return JSON.stringify(plan)
}
async function irAFuerza(page: Page) {
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Progreso/ }).first().click()
}

test('con 3 exposiciones comparables sin calibración: sube con su porqué, la política y el aviso de que es orientativa; no toca nada', async ({ page, fake }) => {
  test.setTimeout(150_000)
  expect.configure({ timeout: 30_000 })
  const planAntes = sembrar(fake, [[60, 60, 8, 2], [50, 60, 9, 2], [45, 60, 10, 3]], true)
  await entrarAFuerzaYComprobar()
  async function entrarAFuerzaYComprobar() {
    await irAFuerza(page)
    const tarjeta = page.getByRole('region', { name: 'Siguiente exposición' })
    await expect(tarjeta).toBeVisible()
    await expect(tarjeta).toContainText('Subir · 62,5 kg')
    await expect(tarjeta).toContainText('todas las series en 10 repeticiones')
    await expect(tarjeta).not.toContainText('Orientación provisional')
    await expect(tarjeta).toContainText('Confianza media')
    await expect(tarjeta.getByRole('list', { name: 'Últimas exposiciones comparables' }).getByRole('listitem')).toHaveCount(3)
    await expect(tarjeta).toContainText('Orientativa: no cambia el plan ni se aplica sola')
    await expect(tarjeta).toContainText('Política prog-v0-provisional')
    await expect(tarjeta).not.toContainText(/estanc|fatiga|descarga/i)
  }
  // No cambia el plan ni crea decisiones
  expect(JSON.stringify(fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P)).toBe(planAntes)
  expect(fake.rows('decisiones_entrenador')).toHaveLength(0)
})

test('con sesiones de la primera semana (calibración sin confirmar): orientación provisional y confianza baja', async ({ page, fake }) => {
  test.setTimeout(150_000)
  expect.configure({ timeout: 30_000 })
  sembrar(fake, [[12, 60, 8, 2], [8, 60, 9, 2], [4, 60, 10, 3]], false)
  await irAFuerza(page)
  const tarjeta = page.getByRole('region', { name: 'Siguiente exposición' })
  await expect(tarjeta).toContainText('Orientación provisional')
  await expect(tarjeta).toContainText('Confianza baja: incluye sesiones de la primera semana de calibración')
  await expect(tarjeta.getByText('calibración', { exact: true }).first()).toBeVisible()
})

test('con menos de 3 exposiciones comparables: datos insuficientes, sin recomendar nada', async ({ page, fake }) => {
  test.setTimeout(150_000)
  expect.configure({ timeout: 30_000 })
  sembrar(fake, [[30, 60, 8, 2], [14, 60, 9, 2]], true)
  await irAFuerza(page)
  const tarjeta = page.getByRole('region', { name: 'Siguiente exposición' })
  await expect(tarjeta).toContainText('Datos insuficientes: hacen falta 3 exposiciones comparables y hay 2')
  await expect(tarjeta).toContainText('Orientación provisional')
  await expect(tarjeta).not.toContainText('Subir')
})
