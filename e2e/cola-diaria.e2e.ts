import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { Page } from '@playwright/test'

const PEDRO = '44444444-4444-4444-8444-444444444444'

/** María: molestia articular fuerte (urgente) y cinco check-ins. Pedro: sin plan (para hoy). */
function sembrarCola(fake: Parameters<typeof seedWorld>[0]) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('clientes', { id: PEDRO, trainerId: ids.trainer, name: 'Pedro', surname: 'Ruiz', token: 'tokenpedro', metricas_cliente: [], createdAt: Date.now() })
  const dia = (atras: number) => { const d = new Date(); d.setDate(d.getDate() - atras); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
  fake.seed('registros_dolor', { id: 'd1', clientId: ids.client, date: dia(1), zona: 'Rodilla', intensidad: 8, tipo: 'articular', nota: 'Duele al bajar escaleras', created_at: 1 })
  for (let i = 1; i <= 5; i++) fake.seed('readiness_checkins', { clientId: ids.client, date: dia(i), sleep: 4, soreness: 4, stress: 3, motivation: 4 })
}

async function abrirBandeja(page: Page) {
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /^Bandeja/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Bandeja', level: 2 })).toBeVisible()
}

test('la cola reúne los avisos en una fila por cliente, ordenada por urgencia', async ({ page, fake }) => {
  sembrarCola(fake)
  await abrirBandeja(page)

  // Siete avisos de María (1 dolor + 5 check-ins + sesiones...) son UNA fila; Pedro, otra
  await expect(page.getByText('1 urgente · 1 para hoy')).toBeVisible()
  const urgente = page.getByRole('region', { name: 'Urgente' })
  await expect(urgente.getByText('María García')).toBeVisible()
  await expect(urgente.getByText(/Molestia articular en Rodilla \(8\/10\)/)).toBeVisible()
  await expect(urgente.getByText(/Check-in de forma/)).toBeVisible() // la razón secundaria, en la misma fila
  const hoy = page.getByRole('region', { name: 'Para hoy' })
  await expect(hoy.getByText('Pedro Ruiz')).toBeVisible()
  await expect(hoy.getByText('Sin plan asignado')).toBeVisible()
  // Lo urgente no se pospone; lo de hoy sí
  await expect(urgente.getByRole('button', { name: /Posponer/ })).toHaveCount(0)
  await expect(hoy.getByRole('button', { name: 'Posponer Pedro Ruiz' })).toBeVisible()
})

test('marcar como hecho y posponer sacan la fila de la cola, se pueden recuperar y se recuerdan al recargar', async ({ page, fake }) => {
  sembrarCola(fake)
  await abrirBandeja(page)

  await page.getByRole('button', { name: 'Hecho: María García' }).click()
  await page.getByRole('button', { name: 'Posponer Pedro Ruiz' }).click()
  await page.getByRole('button', { name: 'Hasta mañana' }).click()
  await expect(page.getByText('Todo al día')).toBeVisible()
  await expect(page.getByRole('tab', { name: /Hecho y pospuesto \(2\)/ })).toBeVisible()

  // Sigue así tras recargar (se guarda en el navegador del entrenador)
  await page.reload()
  await page.getByRole('button', { name: /^Bandeja/ }).first().click()
  await expect(page.getByText('Todo al día')).toBeVisible()

  // Aparte están los dos, y se recuperan
  await page.getByRole('tab', { name: /Hecho y pospuesto/ }).click()
  await expect(page.getByText(/Hecho · Molestia articular/)).toBeVisible()
  await expect(page.getByText(/Pospuesto hasta el .* · Sin plan asignado/)).toBeVisible()
  await page.getByRole('button', { name: 'Recuperar' }).first().click()
  await page.getByRole('button', { name: 'Recuperar' }).first().click()
  await page.getByRole('tab', { name: /^Cola/ }).click()
  await expect(page.getByText('1 urgente · 1 para hoy')).toBeVisible()
})

test('un aviso nuevo vuelve a la cola aunque el cliente estuviera marcado como hecho', async ({ page, fake }) => {
  sembrarCola(fake)
  await abrirBandeja(page)
  await page.getByRole('button', { name: 'Hecho: María García' }).click()
  await expect(page.getByRole('region', { name: 'Urgente' })).toHaveCount(0)

  // Llega otra molestia fuerte (otra fila en registros_dolor) y se recarga la bandeja
  fake.seed('registros_dolor', { id: 'd2', clientId: ids.client, date: new Date().toISOString().slice(0, 10), zona: 'Lumbar', intensidad: 7, tipo: 'muscular', nota: 'Tirón', created_at: 2 })
  await page.reload()
  await page.getByRole('button', { name: /^Bandeja/ }).first().click()
  await expect(page.getByRole('region', { name: 'Urgente' }).getByText(/Dolor en Lumbar \(7\/10\)/)).toBeVisible()
})
