import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, entrarComoEntrenador } from './support/flows'

const dia = (atras: number) => { const d = new Date(); d.setDate(d.getDate() - atras); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const planDe = (fake: Parameters<typeof seedWorld>[0]) => fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P

// La semana pasada hizo el press banca (3x5) con 80 kg y completó todas las series: toca subir a 82,5
const conSemanaPasada = (fake: Parameters<typeof seedWorld>[0]) => fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
  ex_w5_d0_r0: { done: true, dateDone: dia(7), substituteName: 'Press banca', sets: { 0: { weight: '80', reps: '5' }, 1: { weight: '80', reps: '5' }, 2: { weight: '80', reps: '5' } } },
} })

test('el entrenador activa la progresión para el plan y ve el objetivo de la próxima sesión', async ({ page, fake }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  seedWorld(fake)
  conSemanaPasada(fake)
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Plan/ }).first().click()

  const prog = page.getByRole('region', { name: 'Progresión automática' })
  await prog.getByRole('radio', { name: 'Según las series' }).click()
  await prog.getByRole('radio', { name: 'Solo para ti' }).click()
  const objetivos = prog.getByRole('list', { name: 'Objetivos de la próxima sesión' })
  await expect(objetivos).toContainText('82,5 kg × 5 (+2,5)')
  await expect(objetivos).toContainText('solo lo ves tú')

  const p = () => fake.rows('planes').find(r => r.clientId === ids.client)?.plan?.P?.progresion
  await expect.poll(() => p()?.defecto, { timeout: 10000 }).toEqual({ tipo: 'auto', modo: 'guia' })
})

test('con la progresión en sugerencia, el cliente ve su objetivo de hoy y puede usarlo', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  conSemanaPasada(fake)
  planDe(fake).progresion = { defecto: { tipo: 'auto', modo: 'sugerencia' } }
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()

  const obj = page.getByTestId('objetivo-progresion')
  await expect(obj).toContainText('Objetivo hoy: 82,5 kg × 5 (+2,5)')
  await expect(obj).toContainText('Completó 3×5')
  await expect(page.getByLabel('Peso serie 1')).toHaveValue('80') // sugerencia: no se lo cambia solo
  await page.getByRole('button', { name: 'Usar el objetivo' }).click()
  await expect(page.getByLabel('Peso serie 1')).toHaveValue('82.5')
})

test('si es solo una guía para el entrenador, el cliente no la ve', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  conSemanaPasada(fake)
  planDe(fake).progresion = { defecto: { tipo: 'auto', modo: 'guia' } }
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  await expect(page.getByLabel('Peso serie 1')).toBeVisible()
  await expect(page.getByTestId('objetivo-progresion')).toHaveCount(0)
})
