import { readFileSync } from 'node:fs'
import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const haceDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

test('el entrenador crea la historia de éxito de una clienta como imagen', async ({ page, fake }, info) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }) })
  seedWorld(fake)
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    ex_w20_d0_r0: { done: true, dateDone: haceDias(90), substituteName: 'Sentadilla', sets: { 0: { weight: '60', reps: '5' } } },
    ex_w21_d0_r0: { done: true, dateDone: haceDias(3), substituteName: 'Sentadilla', sets: { 0: { weight: '90', reps: '5' } } },
  } })
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Progreso/ }).first().click()

  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: '⭐ Historia de éxito' }).click()
  const d = await descarga
  expect(d.suggestedFilename()).toBe('historia-maria.png')
  const ruta = info.outputPath('historia.png')
  await d.saveAs(ruta)
  const png = readFileSync(ruta)
  expect(png.subarray(1, 4).toString()).toBe('PNG')
  await expect(page.getByText('pídele permiso antes de publicarla', { exact: false })).toBeVisible()
})
