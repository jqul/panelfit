import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const haceDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

test('el Hoy del entrenador enseña los récords de la semana de sus clientes', async ({ page, fake }) => {
  seedWorld(fake)
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    ex_w20_d0_r0: { done: true, dateDone: haceDias(14), substituteName: 'Sentadilla', sets: { 0: { weight: '100', reps: '5' } } },
    ex_w21_d0_r0: { done: true, dateDone: haceDias(0), substituteName: 'Sentadilla', sets: { 0: { weight: '110', reps: '5' } } },
  } })
  await entrarComoEntrenador(page)
  const records = page.getByRole('region', { name: 'Récords de la semana' })
  await expect(records).toContainText('María García')
  await expect(records).toContainText('🏆 Sentadilla')
  await expect(records).toContainText('+10 %')
  await records.getByRole('button', { name: /María García/ }).click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
})
