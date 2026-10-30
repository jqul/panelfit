import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const LAURA = '66666666-6666-4666-8666-666666666666'

test('el dueño cambia los permisos de una compañera del equipo', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('entrenadores', { uid: LAURA, email: 'laura@e2e.test', displayName: 'Laura Coach', approved: true, rol: 'trainer', role: 'trainer', profile: {} })
  fake.seed('team_members', { id: 'tm-1', owner_id: ids.trainer, member_uid: LAURA, role: 'coach', created_at: 1, solo_asignados: false, ver_negocio: true })

  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Ajustes')
  await page.getByRole('option', { name: 'Ir a Ajustes' }).click()

  const permisos = page.getByRole('group', { name: 'Permisos de Laura Coach' })
  await expect(permisos.getByRole('checkbox', { name: /Solo ve sus clientes asignados/ })).not.toBeChecked()
  await expect(permisos.getByRole('checkbox', { name: /Ve la sección Negocio/ })).toBeChecked()

  await permisos.getByRole('checkbox', { name: /Solo ve sus clientes asignados/ }).check()
  await permisos.getByRole('checkbox', { name: /Ve la sección Negocio/ }).uncheck()
  await expect.poll(() => fake.rows('team_members')[0]).toMatchObject({ solo_asignados: true, ver_negocio: false })
})
