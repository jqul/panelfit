import { readFileSync } from 'node:fs'
import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'

test('en diciembre el cliente también comparte «Mi año» como imagen', async ({ page, fake }, info) => {
  await page.clock.install({ time: new Date('2026-12-15T10:00:00') })
  await page.addInitScript(() => { Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }) })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    ex_w20_d0_r0: { done: true, dateDone: '2026-03-03', substituteName: 'Sentadilla', sets: { 0: { weight: '100', reps: '5' } } },
    ex_w21_d0_r0: { done: true, dateDone: '2026-12-10', substituteName: 'Sentadilla', sets: { 0: { weight: '110', reps: '5' } } },
  } })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Progreso', exact: true }).click()

  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: '🎉 Mi 2026' }).click()
  const d = await descarga
  expect(d.suggestedFilename()).toBe('mi-anio-2026.png')
  const ruta = info.outputPath('anio.png')
  await d.saveAs(ruta)
  expect(readFileSync(ruta).subarray(1, 4).toString()).toBe('PNG')
})

