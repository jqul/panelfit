import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'

// "Hoy": el entreno es lo primero, la semana dice cómo vas y cada métrica trae una frase.

test('el entreno de hoy va primero, y la semana y las métricas se explican con frases', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)

  // Orden: el botón de empezar (la acción principal) está por encima de las métricas
  const empezar = await page.getByRole('button', { name: 'Empezar entrenamiento' }).boundingBox()
  const metricas = await page.getByText('Adherencia', { exact: true }).boundingBox()
  expect(empezar!.y).toBeLessThan(metricas!.y)

  await expect(page.getByText('Hoy · Semana 1')).toBeVisible()
  await expect(page.getByText('Una sesión esta semana')).toBeVisible() // 1 día con ejercicios, ninguno hecho
  await expect(page.getByText('Empieza hoy')).toBeVisible() // racha 0, sin reproche
  await expect(page.getByText('Aún sin datos').first()).toBeVisible()
})

test('al terminar el entreno, la tarjeta y la semana lo celebran con una frase', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)

  await page.getByRole('button', { name: /Ya lo hiciste/ }).click()
  await page.getByRole('dialog', { name: 'Registrar entreno ya hecho' }).getByRole('button', { name: /Guardar entreno/ }).click()

  await expect(page.getByText('Entreno de hoy hecho. Buen trabajo.')).toBeVisible()
  await expect(page.getByText('Semana completada. Buen trabajo.')).toBeVisible()
  await expect(page.getByText('1 día', { exact: true })).toBeVisible() // racha de 1
})

test('la nota de bienvenida dice quién la deja', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const fila = fake.rows('planes').find(p => p.clientId === ids.client)!
  fila.plan.P.message = 'Vamos con todo esta semana'
  await entrarComoCliente(page)

  await expect(page.getByText('Nota de Alex')).toBeVisible() // el nombre de pila del entrenador ("Alex Trainer")
  await expect(page.getByText('"Vamos con todo esta semana"')).toBeVisible()
})

test('en el modo foco, "Serie X de Y" va en grande y al acabar las series avisa de que el ejercicio está completo', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()

  await expect(page.getByText('Serie 1 de 3', { exact: true })).toBeVisible() // el primer ejercicio es de 3x5
  for (let i = 1; i <= 3; i++) {
    await expect(page.getByText(`Serie ${i} de 3`, { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'HECHO' }).click()
    const saltar = page.getByRole('button', { name: /Listo, siguiente serie/ })
    if (await saltar.isVisible().catch(() => false)) await saltar.click()
  }

  // Al terminar la última serie salta al siguiente ejercicio; al volver, el primero se ve completo
  await page.getByRole('button', { name: 'Ir al ejercicio 1' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Ejercicio completado' })).toBeVisible()
})

test('al terminar la sesión que cierra la semana, la pantalla final lo celebra con frases', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()

  // El día de la semilla es 3x5 + 3x8 + 2x12: ocho series
  for (let i = 0; i < 8; i++) {
    await page.getByRole('button', { name: 'HECHO' }).click()
    const saltar = page.getByRole('button', { name: /Listo, siguiente serie/ })
    if (await saltar.isVisible().catch(() => false)) await saltar.click()
  }
  await page.getByRole('button', { name: /Terminar entrenamiento/ }).click()
  await page.getByRole('button', { name: /Guardar y terminar/ }).click()

  const final = page.locator('div.fixed').filter({ has: page.getByRole('heading', { name: '¡Buen trabajo!' }) })
  await expect(final.getByText('Semana completada. Buen trabajo.')).toBeVisible()
  await expect(final.getByText('Racha de', { exact: false })).toHaveCount(0) // primera sesión: aún sin racha
})

test('la pestaña Dieta solo sale si el cliente tiene dieta', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  const barra = page.getByRole('navigation')
  await expect(barra.getByRole('button', { name: 'Progreso' })).toBeVisible()
  await expect(barra.getByRole('button', { name: 'Dieta' })).toHaveCount(0) // sin dieta: cuatro pestañas
  await expect(barra.getByRole('button')).toHaveCount(4)
})

test('con dieta, la pestaña Dieta sigue en la barra', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('dietas', { cliente_id: ids.client, datos: { clientId: ids.client, kcal: 2400, protein: 160, carbs: 260, fats: 70, meals: [], advice: '', updatedAt: '' } })
  await entrarComoCliente(page)
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Dieta' })).toBeVisible()
})

test('con un programa de varias semanas y una sesión larga: dónde vas y qué cabe si hay poco tiempo', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const fila = fake.rows('planes').find(p => p.clientId === ids.client)!
  const semana = fila.plan.P.weeks[0]
  semana.days[0].exercises.push(...['Prensa', 'Curl femoral', 'Gemelo', 'Abdominales', 'Plancha', 'Zancadas'].map(name => ({ name, sets: '3x8', weight: '', comment: '', isMain: false })))
  fila.plan.P.weeks = [semana, { ...semana, label: 'Semana 2', isCurrent: false }, { ...semana, label: 'Semana 3', isCurrent: false }]
  await entrarComoCliente(page)

  await expect(page.getByText('Semana 1 de 3', { exact: true })).toBeVisible()

  await expect(page.getByText('¿Poco tiempo?', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '30 min' }).click()
  const guia = page.getByRole('status').filter({ hasText: 'En 30 min' })
  await expect(guia).toContainText('Press banca') // el principal siempre entra
  await expect(guia).not.toContainText('Zancadas') // el final de la sesión es lo que se recorta
  await expect(guia).toContainText('Terminar igual')
})

test('al cerrar la tercera semana completa seguida, la pantalla final lo dice', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const fila = fake.rows('planes').find(p => p.clientId === ids.client)!
  const semana = fila.plan.P.weeks[0]
  fila.plan.P.weeks = [semana, { ...semana, label: 'Semana 2', isCurrent: false }, { ...semana, label: 'Semana 3', isCurrent: false }]
  const hace14 = new Date(Date.now() - 14 * 86400000)
  fila.plan.P.fechaInicio = `${hace14.getFullYear()}-${String(hace14.getMonth() + 1).padStart(2, '0')}-${String(hace14.getDate()).padStart(2, '0')}`
  const hechos = Object.fromEntries(['0', '1'].flatMap(w => [0, 1, 2].map(r => [`ex_w${w}_d0_r${r}`, { done: true, sets: {} }])))
  fake.seed('registros', { clientId: ids.client, logs: hechos, updatedAt: 1 })
  await entrarComoCliente(page)
  await expect(page.getByText('Semana 3 de 3', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  for (let i = 0; i < 8; i++) {
    await page.getByRole('button', { name: 'HECHO' }).click()
    const saltar = page.getByRole('button', { name: /Listo, siguiente serie/ })
    if (await saltar.isVisible().catch(() => false)) await saltar.click()
  }
  await page.getByRole('button', { name: /Terminar entrenamiento/ }).click()
  await page.getByRole('button', { name: /Guardar y terminar/ }).click()

  const final = page.locator('div.fixed').filter({ has: page.getByRole('heading', { name: '¡Buen trabajo!' }) })
  await expect(final.getByText('Semana completada: 3 semanas completas seguidas')).toBeVisible()
})

test('al terminar el entreno se ofrecen los avisos una sola vez', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  for (let i = 0; i < 8; i++) {
    await page.getByRole('button', { name: 'HECHO' }).click()
    const saltar = page.getByRole('button', { name: /Listo, siguiente serie/ })
    if (await saltar.isVisible().catch(() => false)) await saltar.click()
  }
  await page.getByRole('button', { name: /Terminar entrenamiento/ }).click()
  await page.getByRole('button', { name: /Guardar y terminar/ }).click()

  const final = page.locator('div.fixed').filter({ has: page.getByRole('heading', { name: '¡Buen trabajo!' }) })
  await expect(final.getByText('¿Activamos los avisos?')).toBeVisible()
  await final.getByRole('button', { name: 'Ahora no' }).click()
  await expect(final.getByText('¿Activamos los avisos?')).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('pf_avisos_pedidos'))).toBe('1')
})

test('la nota de bienvenida lleva el logo del entrenador si lo tiene', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const logo = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>'
  fake.rows('entrenadores').find(e => e.uid === ids.trainer)!.profile.brandLogo = logo
  fake.rows('planes').find(p => p.clientId === ids.client)!.plan.P.message = 'A por la semana'
  await entrarComoCliente(page)

  const nota = page.locator('div.rounded-xl').filter({ hasText: 'Nota de Alex' })
  await expect(nota.locator('img')).toHaveAttribute('src', logo)
})
