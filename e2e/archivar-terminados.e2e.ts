import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const PEDRO = '44444444-4444-4444-8444-444444444444'

test('el entrenador enciende el archivado al terminar el plan y elige los días', async ({ page, fake }) => {
  seedWorld(fake)
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a ajustes')
  await page.keyboard.press('Enter')

  const ajuste = page.getByRole('region', { name: 'Archivar al terminar el plan' })
  await ajuste.getByRole('switch', { name: 'Archivar solos al terminar el plan' }).click()
  await ajuste.getByLabel('Días sin entrenar tras terminar').selectOption('30')
  const perfil = () => fake.rows('entrenadores').find(e => e.uid === ids.trainer)!.profile
  await expect.poll(() => perfil().autoArchivar).toEqual({ activo: true, dias: 30 })
  expect(perfil().brandName).toBe('AlexFit')
})

test('la Bandeja enseña a quien se archivó solo y lo recupera con un toque', async ({ page, fake }) => {
  seedWorld(fake)
  fake.seed('clientes', { id: PEDRO, trainerId: ids.trainer, name: 'Pedro', surname: 'Ruiz', token: 'tokenpedro', metricas_cliente: [], createdAt: Date.now() - 90 * 86400000,
    archived_at: Date.now() - 86400000, archivado_motivo: 'plan_terminado' })
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /^Bandeja/ }).first().click()

  const tarjeta = page.getByRole('region', { name: 'Archivados al terminar el plan' })
  await expect(tarjeta).toContainText('Pedro Ruiz')
  await tarjeta.getByRole('button', { name: 'Recuperar' }).click()
  await expect.poll(() => fake.rows('clientes').find(c => c.id === PEDRO)!.archived_at).toBeNull()
  await expect(tarjeta).toHaveCount(0)
})
