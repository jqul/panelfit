import { readFileSync } from 'node:fs'
import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'

const haceDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

test('el cliente comparte «Mi mes» como imagen desde Progreso (sin menú de compartir, se descarga)', async ({ page, fake }, info) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }) })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    ex_w20_d0_r0: { done: true, dateDone: haceDias(45), substituteName: 'Sentadilla', sets: { 0: { weight: '100', reps: '5' } } },
    ex_w21_d0_r0: { done: true, dateDone: haceDias(0), substituteName: 'Sentadilla', sets: { 0: { weight: '110', reps: '5' } } },
  } })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Progreso', exact: true }).click()

  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Compartir mi mes' }).click()
  const d = await descarga
  expect(d.suggestedFilename()).toMatch(/^mi-mes-\d{4}-\d{2}\.png$/)
  const ruta = info.outputPath('mes.png')
  await d.saveAs(ruta)
  const png = readFileSync(ruta)
  expect(png.subarray(1, 4).toString()).toBe('PNG')
  expect(png.length).toBeGreaterThan(10_000)
  await expect(page.getByText('Imagen descargada ✓', { exact: false })).toBeVisible()
})
