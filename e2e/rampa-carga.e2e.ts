import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const haceDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

test('en Riesgo, el entrenador ve el ritmo de subida de la carga y el de las últimas semanas', async ({ page, fake }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  seedWorld(fake)
  // Diez semanas con una sesión por semana y las dos últimas, con el doble: la carga sube deprisa
  const logs: Record<string, unknown> = {}
  for (let s = 9; s >= 0; s--) {
    const veces = s < 2 ? 2 : 1
    for (let v = 0; v < veces; v++) logs[`ex_w${30 + s}_d${v}_r0`] = { done: true, dateDone: haceDias(s * 7 + v * 2), substituteName: 'Sentadilla', sets: { 0: { weight: '100', reps: '10' } } }
  }
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs })

  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Progreso/ }).first().click()
  await page.getByRole('button', { name: /Carga y riesgo/ }).first().click()
  await page.getByRole('button', { name: /Riesgo/ }).last().click()

  const rampa = page.getByRole('region', { name: 'Ritmo de subida de la carga' })
  await expect(rampa).toContainText(/Ritmo de subida: \+\d+ %\/semana/)
  await expect(rampa.getByRole('list', { name: 'Ritmo de las últimas semanas' }).getByRole('listitem').first()).toBeVisible()
})
