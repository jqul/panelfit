import { test, expect } from './support/test'
import { seedWorld, samplePlan, ids } from './support/seed'
import { entrarComoEntrenador, abrirFichaDelCliente, entrarComoCliente, verEjerciciosDelDia } from './support/flows'

const OPCIONES_CLIENTE = { baseURL: `http://127.0.0.1:${process.env.E2E_PORT ?? 5180}`, serviceWorkers: 'block', viewport: { width: 390, height: 844 }, locale: 'es-ES' } as const

test('el cliente no ve el borrador; al publicarlo el entrenador, el cliente ve el plan nuevo', async ({ page, browser, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  // El entrenador tiene un borrador sin publicar: otro primer ejercicio y más peso
  const fila = fake.rows('planes')[0]
  fila.plan_borrador = { P: samplePlan({ exerciseNames: ['Press inclinado', 'Remo con barra', 'Curl de bíceps'], weight: '85kg' }) }
  fila.borrador_activo = true

  // El cliente, en su propio navegador (otra sesión), ve el plan publicado y no el borrador
  const contextoCliente = await browser.newContext(OPCIONES_CLIENTE)
  await fake.attach(contextoCliente)
  const cliente = await contextoCliente.newPage()
  await entrarComoCliente(cliente)
  await verEjerciciosDelDia(cliente)
  await expect(cliente.getByText('Press banca').first()).toBeVisible()
  await expect(cliente.getByText('Press inclinado')).toHaveCount(0)

  // El entrenador abre la ficha, ve el borrador y lo publica
  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)
  await expect(page.getByRole('button', { name: 'Descartar borrador' })).toBeVisible()
  await page.getByRole('button', { name: 'Publicar cambios' }).click()
  await expect(page.getByText('Cambios publicados')).toBeVisible()

  // Lo guardado: el borrador pasa a ser el plan en vivo, se limpia el borrador y queda copia en el historial
  const plan = fake.rows('planes').find(r => r.clientId === ids.client)!
  expect(plan.plan.P.weeks[0].days[0].exercises[0]).toMatchObject({ name: 'Press inclinado', weight: '85kg' })
  expect(plan.borrador_activo).toBe(false)
  expect(plan.plan_borrador).toBeNull()
  expect(plan.updatedAt).toBeGreaterThan(1000) // sube la versión: así el cliente no pisa lo publicado
  expect(fake.rows('plan_history')).toMatchObject([{ clientId: ids.client, published_by: 'Alex Trainer' }])

  // El cliente lo ve al volver a abrir la app
  await cliente.reload()
  await verEjerciciosDelDia(cliente)
  await expect(cliente.getByText('Press inclinado').first()).toBeVisible()
  await contextoCliente.close()
})

test('el cliente cambia sus días de entreno sin pisar lo que el entrenador acaba de publicar', async ({ browser, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.rows('planes')[0].plan.P.diasSemana = 3 // el cliente elige 3 días de la semana

  // El cliente abre la app con la versión actual del plan...
  const contextoCliente = await browser.newContext(OPCIONES_CLIENTE)
  await fake.attach(contextoCliente)
  const cliente = await contextoCliente.newPage()
  await entrarComoCliente(cliente)
  await expect(cliente.getByText('Elige 3 días más')).toBeVisible()

  // ...el entrenador publica una versión nueva mientras tanto (subiendo la versión, como hace todo el que escribe el plan)...
  const fila = fake.rows('planes')[0]
  fila.plan = { P: { ...samplePlan({ exerciseNames: ['Sentadilla', 'Remo con barra', 'Curl de bíceps'], weight: '100kg' }), diasSemana: 3 } }
  fila.updatedAt = 5000

  // ...y el cliente elige sus días con su copia vieja en pantalla
  await cliente.getByRole('button', { name: 'Lun', exact: true }).click()
  await cliente.getByRole('button', { name: 'Mié', exact: true }).click()
  await cliente.getByRole('button', { name: 'Vie', exact: true }).click()
  await expect(cliente.getByText('Días confirmados')).toBeVisible()
  await expect.poll(() => fake.rows('planes')[0].plan.P.diasElegidos).toEqual([0, 2, 4])

  // Se guardó su elección Y se conservó lo publicado por el entrenador
  const guardado = fake.rows('planes')[0].plan.P
  expect(guardado.weeks[0].days[0].exercises[0]).toMatchObject({ name: 'Sentadilla', weight: '100kg' })
  expect(fake.rows('planes')[0].updatedAt).toBeGreaterThan(5000)
  await contextoCliente.close()
})
