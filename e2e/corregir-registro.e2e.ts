import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

test('el entrenador corrige un peso mal apuntado y queda marcado como corregido', async ({ page, fake }) => {
  seedWorld(fake)
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    ex_w0_d0_r0: { done: true, dateDone: '2026-10-20', sets: { 0: { weight: '800', reps: '5', rir: 2 }, 1: { weight: '80', reps: '5' } } }, // quería poner 80
  } })
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' }) // en pantallas estrechas las pestañas de la ficha van en un menú
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Entrenos/ }).first().click()

  await page.getByRole('button', { name: 'Corregir Press banca del 2026-10-20' }).click()
  const editor = page.getByRole('group', { name: 'Corregir Press banca' })
  await expect(editor.getByLabel('Peso de la serie 1')).toHaveValue('800')
  await editor.getByLabel('Peso de la serie 1').fill('80')
  await editor.getByRole('button', { name: 'Guardar corrección' }).click()

  await expect(page.getByText('Corregido por ti')).toBeVisible()
  const registro = () => fake.rows('registros').find(r => r.clientId === ids.client)?.logs?.ex_w0_d0_r0
  await expect.poll(() => registro()?.sets?.[0]?.weight).toBe('80')
  expect(registro()?.sets?.[0]?.rir).toBe(2) // lo demás de la serie se conserva
  expect(registro()?.corregido).toBeTruthy()
})
