import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

test('añadir una sesión (con hora y videollamada) a un programa', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('programs', {
    id: 'prog-1', trainer_id: ids.trainer, name: 'Bloque de fuerza', tipo: 'Fuerza', label_ids: [], created_at: 1, updated_at: 1,
    weeks: [{ label: 'Semana 1', days: Array.from({ length: 7 }, () => ({ tasks: [] })) }],
  })

  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Programas')
  await page.getByRole('option', { name: 'Ir a Programas' }).click()
  await page.getByText('Bloque de fuerza').first().click()

  await page.getByRole('button', { name: 'Añadir tarea el Lun' }).click()
  await page.getByRole('button', { name: 'Sesión', exact: true }).click()

  const añadir = page.getByRole('button', { name: 'Añadir sesión' })
  await expect(añadir).toBeDisabled() // sin título no
  await page.getByLabel('Título de la sesión').fill('Revisión técnica')
  await page.getByLabel('Hora de la sesión').fill('18:30')
  await page.getByLabel('Enlace de la sesión').fill('http://no-seguro')
  await expect(añadir).toBeDisabled() // el enlace tiene que ser https
  await page.getByLabel('Enlace de la sesión').fill('https://meet.google.com/abc')
  await añadir.click()

  await expect(page.getByText('Revisión técnica')).toBeVisible()
  await expect(page.getByText('A las 18:30')).toBeVisible()
})
