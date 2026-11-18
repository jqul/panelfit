import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { Page } from '@playwright/test'

// Con entrenos registrados, María ya no sale como «Nunca» en Hoy: se abre por su nombre
async function abrirFicha(page: Page) {
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
}

const haceDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// Ante un ejercicio que no sube: la lista de comprobación enseña qué dicen los datos en cada paso, sin recetar.
test('Estancamiento: sentadilla parada con 5 sesiones muestra los pasos, qué falta y no receta', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const plan = fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P
  plan.weeks = [0, 1, 2, 3, 4].map(i => ({ ...plan.weeks[0], label: `Semana ${i + 1}`, isCurrent: i === 4 }))
  plan.weeks.forEach((w: any) => { w.days[0].exercises[0].name = 'Sentadilla'; w.days[0].exercises[0].rir = '1-2' })
  // La primera sesión es la mejor (100×5) y las cuatro siguientes no la superan, con RIR 4 (más lejos de lo previsto)
  const logs: Record<string, unknown> = {}
  ;[28, 21, 14, 7, 0].forEach((d, i) => {
    logs[`ex_w${i}_d0_r0`] = { done: true, dateDone: haceDias(d), sets: { 0: { weight: i === 0 ? '105' : '100', reps: '5', rir: i === 0 ? 2 : 4 } } }
  })
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs })
  await entrarComoEntrenador(page)
  await abrirFicha(page)
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Progreso/ }).first().click()
  await page.getByRole('button', { name: /Estancamiento/ }).click()

  await expect(page.getByLabel('Ejercicio')).toHaveValue('Sentadilla')
  const lista = page.getByRole('list', { name: 'Lista de comprobación' })
  await expect(lista.getByRole('listitem')).toHaveCount(8)
  await expect(lista.getByRole('listitem').nth(0)).toContainText('Mirar')
  await expect(lista.getByRole('listitem').nth(0)).toContainText('no superan lo mejor de antes')
  await expect(lista.getByRole('listitem').nth(3)).toContainText('RIR medio 4 frente a 1-2 previsto')
  await expect(lista.getByRole('listitem').nth(2)).toContainText('Falta dato') // sin vídeo no se comprueba la técnica
  await expect(page.getByRole('note')).toContainText('Elige UNA intervención pequeña')
  await expect(page.getByText('no un diagnóstico')).toBeVisible()
})

test('Estancamiento: sin historial suficiente se explica qué hace falta', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoEntrenador(page)
  await abrirFicha(page)
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Progreso/ }).first().click()
  await page.getByRole('button', { name: /Estancamiento/ }).click()
  await expect(page.getByText('Aún no hay ejercicios con historial')).toBeVisible()
})
