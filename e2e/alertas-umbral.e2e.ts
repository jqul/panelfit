import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const dia = (atras: number) => { const d = new Date(); d.setDate(d.getDate() - atras); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

test('la Bandeja avisa de los clientes que cumplen las alertas del entrenador', async ({ page, fake }) => {
  seedWorld(fake)
  fake.rows('entrenadores').find(e => e.uid === ids.trainer)!.profile.alertasUmbral = [
    { id: 'r1', tipo: 'inactivo', dias: 7 },
    { id: 'r2', tipo: 'peso', kg: 2, dias: 7 },
    { id: 'r3', tipo: 'checkin', escala: 'motivation', max: 2, dias: 3 },
  ]
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: { ex_w0_d0_r0: { done: true, dateDone: dia(10), sets: { 0: { weight: '80', reps: '5' } } } } })
  fake.seed('registros_peso', { clientId: ids.client, date: dia(6), weight: 70 })
  fake.seed('registros_peso', { clientId: ids.client, date: dia(1), weight: 72.5 })
  for (let i = 0; i < 3; i++) fake.seed('readiness_checkins', { clientId: ids.client, date: dia(i), sleep: 4, soreness: 4, stress: 3, motivation: 2 })

  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /^Bandeja/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Bandeja', level: 2 })).toBeVisible()
  await expect(page.getByText('💤 10 días sin entrenar')).toBeVisible()
  await expect(page.getByText('⚖️ Peso +2,5 kg en 5 días')).toBeVisible()
  await expect(page.getByText('📉 Energía a 2 o menos 3 días seguidos')).toBeVisible()
})

test('el entrenador pone sus alertas en Ajustes y se guardan en su perfil sin pisar el resto', async ({ page, fake }) => {
  seedWorld(fake)
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a ajustes')
  await page.keyboard.press('Enter')

  const alertas = page.getByRole('region', { name: 'Alertas por umbral' })
  await alertas.getByRole('button', { name: /7 días sin entrenar/ }).click()
  await alertas.getByRole('button', { name: /El peso cambia más de 2 kg/ }).click()
  await alertas.getByRole('listitem', { name: 'Regla 1' }).getByLabel('Días sin entrenar').fill('10')
  await alertas.getByRole('button', { name: 'Guardar alertas' }).click()
  await expect(page.getByText('Alertas guardadas ✓', { exact: false })).toBeVisible()

  const perfil = fake.rows('entrenadores').find(e => e.uid === ids.trainer)!.profile
  expect(perfil.alertasUmbral).toEqual([{ id: 'r1', tipo: 'inactivo', dias: 10 }, { id: 'r2', tipo: 'peso', kg: 2, dias: 7 }])
  expect(perfil.brandName).toBe('AlexFit')
})
