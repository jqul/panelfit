import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { Page } from '@playwright/test'

async function abrirDescarga(page: Page) {
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Progreso/ }).first().click()
  await page.getByRole('button', { name: /¿Puede tocar descarga\?/ }).click()
}

const haceDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// «¿Puede tocar descarga?» es una lectura de evidencia: tres cajas, qué falta, y ni un veredicto ni un cambio en el plan.
test('Descarga: sin historial dice «datos insuficientes», qué falta, y no da veredicto', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoEntrenador(page)
  await abrirDescarga(page)

  await expect(page.getByRole('note').first()).toContainText('Datos insuficientes para valorar.')
  await expect(page.getByRole('region', { name: 'Datos insuficientes' })).toContainText('semanas completas con entrenos')
  await expect(page.getByRole('region', { name: 'Señales a observar' })).toContainText('Ninguna señal')
  await expect(page.getByRole('region', { name: 'Evidencia disponible' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Qué falta para más confianza' })).toContainText('de historial')
  await expect(page.getByText('no un veredicto')).toBeVisible()
  await expect(page.getByText(/toca descarga|sobreentren/i).filter({ hasNotText: 'No decide' })).toHaveCount(0)
})

test('Descarga: seis semanas seguidas de carga y check-ins bajos salen como señales a observar, sin tocar el plan', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const plan = fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P
  plan.fechaInicio = haceDias(49)
  plan.calibracion = { confirmadaEl: haceDias(48) }
  plan.weeks = Array.from({ length: 8 }, (_, i) => ({ ...plan.weeks[0], label: `Semana ${i + 1}`, isDeload: false, isCurrent: false, days: [plan.weeks[0].days[0]] }))
  const planAntes = JSON.stringify(fake.rows('planes').find(r => r.clientId === ids.client)!.plan)
  // Una sesión por semana, las seis semanas completas anteriores (una de las previstas: adherencia total)
  const logs: Record<string, unknown> = {}
  ;[42, 35, 28, 21, 14, 7].forEach((d, i) => { logs[`ex_w${i + 1}_d0_r0`] = { done: true, dateDone: haceDias(d), sets: { 0: { weight: '60', reps: '8', rir: 2 } } } })
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs })
  ;[1, 3, 5, 8].forEach(d => fake.seed('readiness_checkins', { clientId: ids.client, date: haceDias(d), sleep: 1, soreness: 2, motivation: 2 }))
  await entrarComoEntrenador(page)
  await abrirDescarga(page)

  const senales = page.getByRole('region', { name: 'Señales a observar' })
  await expect(senales).toContainText('6 semanas seguidas de carga sin una semana de descarga marcada')
  await expect(senales).toContainText('4 de 4 check-ins con alguna escala baja')
  await expect(page.getByRole('note').first()).toContainText('señales a observar. Es evidencia, no un veredicto.')
  await expect(page.getByRole('region', { name: 'Evidencia disponible' })).toContainText('Adherencia reciente')
  await expect(page.getByRole('button', { name: /aplicar|crear plan|proponer/i })).toHaveCount(0)
  // Leer no cambia nada: el plan queda como estaba
  expect(JSON.stringify(fake.rows('planes').find(r => r.clientId === ids.client)!.plan)).toBe(planAntes)
})

test('Descarga: con poca adherencia no se interpreta la carga y se dice por qué', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const plan = fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P
  plan.fechaInicio = haceDias(49)
  plan.calibracion = { confirmadaEl: haceDias(48) }
  // Tres días previstos por semana y solo uno hecho (33 %)
  plan.weeks = Array.from({ length: 8 }, (_, i) => ({ ...plan.weeks[0], label: `Semana ${i + 1}`, isDeload: false, isCurrent: false, days: [0, 1, 2].map(() => plan.weeks[0].days[0]) }))
  const logs: Record<string, unknown> = {}
  ;[42, 35, 28, 21, 14, 7].forEach((d, i) => { logs[`ex_w${i + 1}_d0_r0`] = { done: true, dateDone: haceDias(d), sets: { 0: { weight: '60', reps: '8', rir: 2 } } } })
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs })
  await entrarComoEntrenador(page)
  await abrirDescarga(page)

  await expect(page.getByRole('region', { name: 'Señales a observar' })).toContainText('Adherencia baja (33 % de lo previsto)')
  await expect(page.getByRole('region', { name: 'Señales a observar' })).toContainText('menos sesiones no es lo mismo que más cansancio')
  await expect(page.getByRole('region', { name: 'Señales a observar' })).not.toContainText('semanas seguidas de carga')
})
