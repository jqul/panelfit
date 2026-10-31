import { readFileSync } from 'node:fs'
import { test, expect } from './support/test'
import { seedWorld } from './support/seed'
import { entrarComoCliente } from './support/flows'

test('al terminar, el entreno se comparte como imagen (sin menú de compartir, se descarga)', async ({ page, fake }, info) => {
  // Como en un ordenador: no se pueden compartir archivos, así que se descarga la imagen
  await page.addInitScript(() => { Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }) })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()

  // El día de la semilla es 3x5 + 3x8 + 2x12: ocho series
  for (let i = 0; i < 8; i++) {
    await page.getByRole('button', { name: 'HECHO' }).click()
    const saltar = page.getByRole('button', { name: /Listo, siguiente serie/ })
    if (await saltar.isVisible().catch(() => false)) await saltar.click()
  }
  await page.getByRole('button', { name: /Terminar entrenamiento/ }).click()

  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: /Compartir como imagen/ }).click()
  const d = await descarga
  expect(d.suggestedFilename()).toMatch(/^entreno-\d{4}-\d{2}-\d{2}\.png$/)
  const ruta = info.outputPath('tarjeta.png')
  await d.saveAs(ruta)
  const png = readFileSync(ruta)
  expect(png.subarray(1, 4).toString()).toBe('PNG')
  expect(png.length).toBeGreaterThan(10_000)

  // Y también desde la pantalla final, ya guardado
  await page.getByRole('button', { name: /Guardar y terminar/ }).click()
  await expect(page.getByRole('heading', { name: '¡Buen trabajo!' })).toBeVisible()
  const otra = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Compartir como imagen' }).click()
  await otra
})
