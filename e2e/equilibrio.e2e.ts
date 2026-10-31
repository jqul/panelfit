import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const haceDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const series = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i, { weight: '50', reps: '8' }]))

test('el entrenador ve el equilibrio empuje/tirón/pierna y el aviso si está descompensado', async ({ page, fake }) => {
  seedWorld(fake)
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    ex_w20_d0_r0: { done: true, dateDone: haceDias(10), substituteName: 'Press banca', sets: series(6) },
    ex_w21_d0_r0: { done: true, dateDone: haceDias(3), substituteName: 'Press militar', sets: series(6) },
    ex_w21_d0_r1: { done: true, dateDone: haceDias(3), substituteName: 'Remo con barra', sets: series(4) },
    ex_w21_d0_r2: { done: true, dateDone: haceDias(3), substituteName: 'Sentadilla', sets: series(6) },
  } })
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' }) // en pantallas estrechas las pestañas de la ficha van en un menú
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Progreso/ }).first().click()
  await page.getByRole('button', { name: /Cuerpo/ }).first().click()
  await page.getByRole('button', { name: /Músculos/ }).click()

  const eq = page.getByLabel('Equilibrio empuje, tirón y pierna')
  await expect(eq).toContainText('Empuje 12')
  await expect(eq).toContainText('Tirón 4')
  await expect(eq).toContainText('Mucho más empuje que tirón (3:1)')
  await expect(page.getByText('Pecho', { exact: true })).toBeVisible()
  await expect(page.getByText('6 series · 27%').first()).toBeVisible() // ahora cuenta series, no ejercicios
})
