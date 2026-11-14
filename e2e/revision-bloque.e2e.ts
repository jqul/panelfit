import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const haceDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

test('al terminar el plan, la revisión del bloque dice qué subió, qué se estancó y cuánto se cumplió', async ({ page, fake }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  seedWorld(fake)
  const plan = fake.rows('planes').find(p => p.clientId === ids.client)!.plan.P
  plan.weeks = [plan.weeks[0], JSON.parse(JSON.stringify(plan.weeks[0]))] // dos semanas
  plan.fechaInicio = haceDias(21)                                         // ya terminó
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    ex_w0_d0_r0: { done: true, dateDone: haceDias(20), sets: { 0: { weight: '80', reps: '5' } } },
    ex_w1_d0_r0: { done: true, dateDone: haceDias(13), sets: { 0: { weight: '85', reps: '5' } } },
  } })
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])

  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Plan/ }).first().click()

  const revision = page.getByRole('region', { name: 'Revisión del bloque' })
  await expect(revision).toContainText('Terminó el')
  await expect(revision).toContainText('2 de 2 sesiones hechas')
  await expect(revision.getByRole('list', { name: 'Ejercicios del bloque' })).toContainText('Press banca')
  await expect(revision.getByRole('list', { name: 'Ejercicios del bloque' })).toContainText('+6 %')

  await revision.getByRole('button', { name: /Copiar resumen para María/ }).click()
  await expect(page.getByText('Resumen copiado', { exact: false })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('📈 Press banca: +6 %')
})
