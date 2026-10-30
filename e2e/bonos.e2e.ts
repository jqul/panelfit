import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador, abrirFichaDelCliente, entrarComoCliente } from './support/flows'

test('el entrenador crea un bono a su cliente desde la ficha', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)

  const bonos = page.getByRole('region', { name: 'Bonos de sesiones' })
  await bonos.getByRole('button', { name: '+ Nuevo bono' }).click()
  await bonos.getByLabel('Sesiones').fill('5')
  await bonos.getByRole('button', { name: 'Crear' }).click()
  await expect(page.getByText('Bono creado: sus próximas citas se descuentan solas ✓')).toBeVisible()
  await expect(bonos.getByText('Quedan 5 de 5')).toBeVisible()
  expect(fake.rows('bonos_cliente')).toMatchObject([{ client_id: ids.client, trainer_id: ids.trainer, nombre: 'Bono 5 sesiones', sesiones: 5, caduca: null }])
})

test('el cliente ve cuántas sesiones le quedan de su bono (las canceladas no cuentan)', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('bonos_cliente', { id: 'bono-1', trainer_id: ids.trainer, client_id: ids.client, nombre: 'Bono 5 sesiones', sesiones: 5, caduca: '2099-12-31', created_at: new Date().toISOString() })
  const cita = (id: string, status: string) => ({ id, trainer_id: ids.trainer, client_id: ids.client, title: 'Sesión', start_at: new Date(Date.now() + 86400000).toISOString(), end_at: new Date(Date.now() + 90000000).toISOString(), status, bono_id: 'bono-1' })
  fake.seed('citas', cita('c1', 'completada'))
  fake.seed('citas', cita('c2', 'confirmada'))
  fake.seed('citas', cita('c3', 'cancelada'))

  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Más', exact: true }).click()
  const bonos = page.getByRole('region', { name: 'Bonos de sesiones' })
  await expect(bonos.getByText('Tus bonos')).toBeVisible()
  await expect(bonos.getByText(/Quedan 3 de 5 · caduca el 31 dic 2099/)).toBeVisible()
  await expect(bonos.getByRole('button', { name: '+ Nuevo bono' })).toHaveCount(0)
})
