import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

test('el entrenador saca de las estadísticas un registro mal apuntado, y lo puede volver a contar', async ({ page, fake }) => {
  seedWorld(fake)
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    ex_w0_d0_r0: { done: true, dateDone: '2026-10-20', sets: { 0: { weight: '800', reps: '5' } } }, // quería poner 80
  } })
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' }) // en pantallas estrechas las pestañas de la ficha van en un menú
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Entrenos/ }).first().click()

  const registro = () => fake.rows('registros').find(r => r.clientId === ids.client)?.logs?.ex_w0_d0_r0
  await page.getByRole('button', { name: 'No contar Press banca del 2026-10-20 en el progreso' }).click()
  await expect(page.getByText('No cuenta en el progreso')).toBeVisible()
  await expect.poll(() => registro()?.noContar).toBe(true)
  expect(registro()?.sets?.[0]?.weight).toBe('800') // no se borra nada

  await page.getByRole('button', { name: 'Volver a contar Press banca del 2026-10-20' }).click()
  await expect(page.getByText('No cuenta en el progreso')).toHaveCount(0)
  await expect.poll(() => registro()?.noContar).toBeUndefined()
})
