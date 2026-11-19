import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador, entrarComoCliente } from './support/flows'

const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// Primera semana guiada: el cliente nuevo lo ve, y el entrenador revisa y confirma las cargas de partida.
test('el cliente nuevo ve «Calibrando · Semana 1 de 1» en Hoy', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  const aviso = page.getByRole('region', { name: 'Primera semana' })
  await expect(aviso).toContainText('Calibrando · Semana 1 de 1')
  await expect(aviso).toContainText('no hace falta que te midas')
})

test('el entrenador revisa las cargas de la primera semana y las confirma; el cliente deja de calibrar', async ({ page, fake }) => {
  test.setTimeout(150_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  // Un entreno hecho: el press banca le sobró (RIR 5 con 2-3 previsto) y dice que fue demasiado fácil
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    ex_w0_d0_r0: { done: true, dateDone: hoy(), sensacion: 'facil', sets: { 0: { weight: '80', reps: '5', rir: 5 }, 1: { weight: '80', reps: '5', rir: 5 }, 2: { weight: '80', reps: '5', rir: 4 } } },
  } })
  fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P.weeks[0].days[0].exercises[0].rir = '2-3'
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()

  // «Atención hoy» lo avisa y la tarjeta enseña qué mirar
  await expect(page.getByRole('region', { name: 'Atención hoy' }).getByText('Primera semana: revisa las cargas de 1 ejercicio')).toBeVisible()
  const tarjeta = page.getByRole('region', { name: 'Primera semana de calibración' })
  await expect(tarjeta).toContainText('Calibrando · Semana 1 de 1')
  await expect(tarjeta.getByRole('list', { name: 'Ejercicios de la primera semana' })).toContainText('Press banca')
  await expect(tarjeta).toContainText('Le resultó demasiado fácil: puede convenir subir la carga')
  await expect(tarjeta).toContainText('va sobrado')

  // Al confirmar, queda guardado y la tarjeta desaparece
  await tarjeta.getByRole('button', { name: 'Confirmar cargas y pasar a progresión normal' }).click()
  await expect.poll(() => fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P.calibracion?.confirmadaEl, { timeout: 15_000 }).toBe(hoy())
  await expect(page.getByRole('region', { name: 'Primera semana de calibración' })).toHaveCount(0)
})

test('en el entreno, mientras calibra, el RIR se explica a la vista', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  const ayuda = page.getByRole('list', { name: 'Qué significa cada número del RIR' })
  await expect(ayuda).toBeVisible()
  await expect(ayuda).toContainText('No podía hacer ni una más')
  await expect(ayuda).toContainText('Iba muy sobrado')
})
