import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, entrarComoEntrenador } from './support/flows'

const enDias = (d: number, h = 18) => { const x = new Date(); x.setUTCDate(x.getUTCDate() + d); x.setUTCHours(h, 0, 0, 0); return x.toISOString() }

test('el entrenador crea una clase de grupo y ve quién va y quién espera', async ({ page, fake }) => {
  seedWorld(fake)
  fake.seed('clases', { id: 'k1', trainer_id: ids.trainer, titulo: 'Funcional', start_at: enDias(2), end_at: enDias(2, 19), aforo: 1, notas: '', cancelada: false, created_at: enDias(-1) })
  fake.seed('clientes', { id: 'cli-2', trainerId: ids.trainer, name: 'Lucía', surname: 'Pérez', token: 'tok-lucia', objetivo: 'fuerza', metricas_cliente: [], createdAt: Date.now() })
  fake.seed('clase_plazas', { clase_id: 'k1', client_id: ids.client, estado: 'reservada', created_at: enDias(-1, 10) })
  fake.seed('clase_plazas', { clase_id: 'k1', client_id: 'cli-2', estado: 'espera', created_at: enDias(-1, 11) })

  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir al Calendario')
  await page.getByRole('option', { name: 'Ir al Calendario' }).click()
  await page.getByRole('button', { name: /Clases de grupo/ }).click()

  const funcional = page.getByRole('listitem', { name: 'Clase Funcional' })
  await expect(funcional).toContainText('1 de 1 plaza · 1 en espera')
  const apuntados = funcional.getByRole('list', { name: 'Apuntados a Funcional' })
  await expect(apuntados.getByRole('listitem').nth(0)).toContainText('PlazaMaría García')
  await expect(apuntados.getByRole('listitem').nth(1)).toContainText('Espera 1ºLucía Pérez')

  // Una clase nueva
  const nueva = page.getByRole('region', { name: 'Nueva clase' })
  await nueva.getByLabel('Nombre de la clase').fill('Yoga')
  await nueva.getByLabel('Plazas').fill('8')
  await nueva.getByRole('button', { name: 'Crear clase' }).click()
  await expect(page.getByText('«Yoga» creada ✓', { exact: false })).toBeVisible()
  await expect.poll(() => fake.rows('clases').find(k => k.titulo === 'Yoga')?.aforo).toBe(8)
  expect(fake.rows('clases').find(k => k.titulo === 'Yoga')?.trainer_id).toBe(ids.trainer)
})

test('el cliente reserva, se apunta a la espera y pasa a tener plaza cuando alguien cancela', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('clases', { id: 'k1', trainer_id: ids.trainer, titulo: 'Funcional', start_at: enDias(2), end_at: enDias(2, 19), aforo: 3, notas: 'Sala 2', cancelada: false })
  fake.seed('clases', { id: 'k2', trainer_id: ids.trainer, titulo: 'HIIT', start_at: enDias(3), end_at: enDias(3, 19), aforo: 1, notas: '', cancelada: false })
  fake.seed('clase_plazas', { clase_id: 'k2', client_id: 'otra', estado: 'reservada', created_at: enDias(-1) })
  await entrarComoCliente(page)

  const clases = page.getByRole('region', { name: 'Clases de grupo' })
  const funcional = clases.getByRole('listitem', { name: 'Funcional' })
  const hiit = clases.getByRole('listitem', { name: 'HIIT' })
  await expect(funcional).toContainText('Quedan 3 plazas')
  await expect(funcional).toContainText('Sala 2')
  await expect(hiit).toContainText('Completa')

  await funcional.getByRole('button', { name: 'Reservar' }).click()
  await expect(funcional).toContainText('Tienes plaza')
  await hiit.getByRole('button', { name: 'Apuntarme a la espera' }).click()
  await expect(hiit).toContainText('En lista de espera (1º)')

  // Quien tenía la plaza de HIIT cancela: pasa a tenerla ella
  const plazas = fake.rows('clase_plazas')
  plazas.splice(plazas.findIndex(p => p.client_id === 'otra'), 1)
  plazas.find(p => p.clase_id === 'k2' && p.client_id === ids.client)!.estado = 'reservada'
  await page.reload()
  await expect(page.getByRole('region', { name: 'Clases de grupo' }).getByRole('listitem', { name: 'HIIT' })).toContainText('Tienes plaza')

  // Cancela la de Funcional
  page.once('dialog', d => d.accept())
  await page.getByRole('region', { name: 'Clases de grupo' }).getByRole('listitem', { name: 'Funcional' }).getByRole('button', { name: 'Cancelar plaza' }).click()
  await expect(page.getByRole('region', { name: 'Clases de grupo' }).getByRole('listitem', { name: 'Funcional' })).toContainText('Quedan 3 plazas')
  expect(fake.rows('clase_plazas').some(p => p.clase_id === 'k1')).toBe(false)
})
