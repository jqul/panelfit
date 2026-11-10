import { readFileSync } from 'node:fs'
import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const haceDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

test('el entrenador descarga el progreso de su cliente serie a serie en CSV', async ({ page, fake }, info) => {
  seedWorld(fake)
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    ex_w20_d0_r0: { done: true, dateDone: haceDias(7), substituteName: 'Press banca', sets: { 0: { weight: '60', reps: '8', rir: 2 }, 1: { weight: '62,5', reps: '6' } } },
    ex_w21_d0_r0: { done: true, dateDone: haceDias(1), substituteName: 'Press banca', sets: { 0: { weight: '65', reps: '5' } } },
  } })
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Progreso/ }).first().click()

  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: '⬇ Series (CSV)' }).click()
  const d = await descarga
  expect(d.suggestedFilename()).toMatch(/^progreso-maria-garcia-\d{4}-\d{2}-\d{2}\.csv$/)
  const ruta = info.outputPath('progreso.csv')
  await d.saveAs(ruta)
  const csv = readFileSync(ruta, 'utf8')
  const lineas = csv.replace(/^\uFEFF/, '').trim().split(/\r\n/)
  expect(lineas[0]).toBe('Fecha;Semana;Día;Ejercicio;Serie;Peso (kg);Reps;RIR;1RM estimado (kg);Nota')
  expect(lineas.slice(1)).toEqual([
    `${haceDias(7)};21;;Press banca;1;60;8;2;76;`,
    `${haceDias(7)};21;;Press banca;2;62,5;6;;75;`,
    `${haceDias(1)};22;;Press banca;1;65;5;;75,8;`,
  ])
  await expect(page.getByText('3 series exportadas ✓')).toBeVisible()
})
