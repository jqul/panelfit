import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'
import type { Page } from '@playwright/test'

// Tras cada serie sale el cronómetro de descanso, que tapa la pantalla: el cliente pulsa "Listo, siguiente serie".
async function hacerSerie(page: Page) {
  await page.getByRole('button', { name: 'HECHO' }).click()
  await page.getByRole('button', { name: /Listo, siguiente serie/ }).click()
}

const logsDelServidor = (fake: { rows: (t: string) => Record<string, any>[] }) =>
  (fake.rows('registros').find(r => r.clientId === ids.client)?.logs ?? {}) as Record<string, any>

// "Visible" importa: el entreno ocupa toda la pantalla y tapa la cabecera y la barra de estado del panel,
// así que lo pendiente de subir tiene que verse DENTRO del entreno. Aquí se comprueba con toBeVisible.
const pendiente = (page: Page, n: number) => page.getByRole('button', { name: new RegExp(`${n} sin subir`) })

test('sin conexión el entreno se guarda en el móvil, se ve qué falta por subir y al volver se sube sin pisar al entrenador', async ({ page, context, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()

  // Con conexión: la primera serie se sube al momento y no hay nada pendiente a la vista
  await hacerSerie(page)
  await expect.poll(() => Object.keys(logsDelServidor(fake))).toEqual(['ex_w0_d0_r0'])
  await expect(page.getByRole('button', { name: /sin subir/ })).toHaveCount(0)

  // Se pierde la conexión: la serie siguiente queda en el dispositivo y se ve que falta por subir
  fake.offline = true
  await context.setOffline(true)
  await hacerSerie(page)
  await expect(pendiente(page, 1)).toBeVisible()
  expect(Object.keys(logsDelServidor(fake))).toEqual(['ex_w0_d0_r0']) // el servidor no ha recibido nada

  // Mientras tanto, el entrenador registra otro ejercicio en el servidor
  const fila = fake.rows('registros').find(r => r.clientId === ids.client)!
  fila.logs = { ...fila.logs, ex_w0_d0_r2: { done: true, sets: { 0: { weight: '20', reps: '12' } }, dateDone: '2026-10-24' } }
  fila.updatedAt = Date.now() + 5000

  // Vuelve la conexión: se sube solo, fusionando (lo del entrenador no se pierde) y el aviso desaparece
  fake.offline = false
  await context.setOffline(false)
  await expect(page.getByRole('button', { name: /sin subir/ })).toHaveCount(0)
  expect(Object.keys(logsDelServidor(fake)).sort()).toEqual(['ex_w0_d0_r0', 'ex_w0_d0_r2'])
  expect(logsDelServidor(fake).ex_w0_d0_r0.sets[0]).toBeDefined()
})

test('si falla la subida con conexión, queda pendiente, se ve y se puede reintentar', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()

  // El servidor falla (la red del navegador sigue "conectada")
  fake.offline = true
  await hacerSerie(page)
  await expect(pendiente(page, 1)).toBeVisible()
  expect(logsDelServidor(fake)).toEqual({})

  // La librería reintenta unos segundos antes de rendirse (el aviso está desactivado mientras guarda);
  // cuando se rinde, el aviso se puede tocar. Entonces se arregla el servidor y se reintenta.
  await expect(pendiente(page, 1)).toBeEnabled({ timeout: 20_000 })
  fake.offline = false
  await pendiente(page, 1).click()
  await expect(page.getByRole('button', { name: /sin subir/ })).toHaveCount(0)
  expect(Object.keys(logsDelServidor(fake))).toEqual(['ex_w0_d0_r0'])
})
