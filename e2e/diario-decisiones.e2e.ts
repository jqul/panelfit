import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { Page } from '@playwright/test'

const haceDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// Con entrenos registrados, María ya no sale como «Nunca» en Hoy: se abre por su nombre
async function abrirFicha(page: Page) {
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
}
async function irAEstancamiento(page: Page) {
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Progreso/ }).first().click()
  await page.getByRole('button', { name: /Estancamiento/ }).click()
}
function sembrarSentadilla(fake: Parameters<typeof seedWorld>[0]) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const plan = fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P
  plan.weeks = [0, 1, 2, 3, 4].map(i => ({ ...plan.weeks[0], label: `Semana ${i + 1}`, isCurrent: i === 4 }))
  plan.weeks.forEach((w: any) => { w.days[0].exercises[0].name = 'Sentadilla' })
  const logs: Record<string, unknown> = {}
  ;[28, 21, 14, 7, 0].forEach((d, i) => {
    logs[`ex_w${i}_d0_r0`] = { done: true, dateDone: haceDias(d), sets: { 0: { weight: i === 0 ? '105' : '100', reps: '5' } } }
  })
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs })
}

// Tras mirar la lista de comprobación: hipótesis, decisión y plazo; al revisarla, qué pasó. Solo lo ve el entrenador.
test('anotar una decisión (hipótesis, qué se decide y plazo) y revisarla después', async ({ page, fake }) => {
  test.setTimeout(150_000)
  expect.configure({ timeout: 30_000 })
  sembrarSentadilla(fake)
  await entrarComoEntrenador(page)
  await abrirFicha(page)
  await irAEstancamiento(page)

  const diario = page.getByRole('region', { name: 'Diario de decisiones' })
  await expect(diario.getByText('Aún no has anotado ninguna decisión')).toBeVisible()
  await diario.getByRole('button', { name: 'Anotar decisión' }).click()

  // Sin rellenar no se guarda y se dice qué falta
  await diario.getByRole('button', { name: 'Guardar decisión' }).click()
  await expect(page.getByText('Elige qué decides')).toBeVisible()
  expect(fake.rows('decisiones_entrenador')).toHaveLength(0)

  await diario.getByLabel('¿Qué crees que pasa? (hipótesis)').fill('Duerme 5-6 h')
  await diario.getByLabel('¿Qué decides?').selectOption('subir')
  await diario.getByRole('button', { name: 'Guardar decisión' }).click()
  await expect(page.getByText('Describe qué vas a cambiar')).toBeVisible()
  await diario.getByLabel('Qué cambias (una sola cosa pequeña)').fill('+1 serie, nada más')
  await diario.getByLabel('Cuándo lo vuelves a mirar').selectOption('3')
  await diario.getByRole('button', { name: 'Guardar decisión' }).click()

  await expect(diario.getByText('Subir (carga o volumen) · Sentadilla')).toBeVisible()
  await expect(diario.getByText('+1 serie, nada más')).toBeVisible()
  const fila = fake.rows('decisiones_entrenador')[0]
  expect(fila).toMatchObject({ trainer_id: ids.trainer, client_id: ids.client, ejercicio: 'Sentadilla', tipo: 'subir', hipotesis: 'Duerme 5-6 h', intervencion: '+1 serie, nada más', revisada_el: null })
  expect(fila.revisar_el).toBe((() => { const d = new Date(); d.setDate(d.getDate() + 21); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })())

  // Aún no toca: se ve cuándo revisarla pero no «Toca revisar»
  await expect(diario.getByText('Toca revisar')).toHaveCount(0)
})

test('una decisión con el plazo cumplido avisa en «Atención hoy» y se cierra con el resultado', async ({ page, fake }) => {
  test.setTimeout(150_000)
  expect.configure({ timeout: 30_000 })
  sembrarSentadilla(fake)
  fake.seed('decisiones_entrenador', { id: 'dec-1', trainer_id: ids.trainer, client_id: ids.client, fecha: haceDias(28), ejercicio: 'Sentadilla', hipotesis: 'Poco sueño', tipo: 'no-intervenir', intervencion: '', revisar_el: haceDias(1), revisada_el: null, resultado: null })
  await entrarComoEntrenador(page)
  await abrirFicha(page)

  // En el Resumen, la tarjeta lo dice y lleva al diario
  const tarjeta = page.getByRole('region', { name: 'Atención hoy' })
  await expect(tarjeta.getByText('1 decisión toca revisarla')).toBeVisible()
  await tarjeta.getByRole('button', { name: /Revisar:/ }).click()

  const diario = page.getByRole('region', { name: 'Diario de decisiones' })
  await expect(diario.getByText('1 por revisar')).toBeVisible()
  await expect(diario.getByText('Toca revisar')).toBeVisible()
  await diario.getByRole('button', { name: /Revisar la decisión/ }).click()
  await diario.getByLabel('Tu conclusión: ¿qué pasó y qué haces con esto?').fill('Subió 2,5 kg sin tocar nada')
  await diario.getByRole('button', { name: 'Guardar revisión' }).click()

  await expect(diario.getByText('Resultado: Subió 2,5 kg sin tocar nada')).toBeVisible()
  await expect(diario.getByText('Revisada')).toBeVisible()
  await expect(diario.getByText('por revisar')).toHaveCount(0)
  expect(fake.rows('decisiones_entrenador')[0]).toMatchObject({ resultado: 'Subió 2,5 kg sin tocar nada' })
  expect(fake.rows('decisiones_entrenador')[0].revisada_el).toBeTruthy()
})
