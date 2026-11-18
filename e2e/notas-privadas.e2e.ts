import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador, abrirFichaDelCliente, entrarComoCliente } from './support/flows'

// Las «Notas privadas» (la ficha promete «Solo las ves tú») ya no viajan en el plan, que el cliente lee entero: tienen su propia
// tabla (notas_privadas_cliente) sin política para el cliente. La garantía de la base de datos (RLS, migración de los datos y el
// disparador que impide que vuelvan al plan) se prueba con PGlite (bloque30); aquí, el recorrido de la app.
test('las notas privadas se guardan en su tabla, no en el plan, y el cliente ni las pide ni las recibe', async ({ page, fake }) => {
  test.setTimeout(150_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('notas_privadas_cliente', { client_id: ids.client, trainer_id: ids.trainer, notas: 'Rodilla derecha: ojo', updated_at: new Date().toISOString() })

  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)

  // La ficha avisa de que hay notas sin abrir nada y las enseña al desplegar
  const seccion = page.getByRole('button', { name: /^Notas privadas/ })
  await expect(seccion).toContainText('Tienes notas guardadas')
  await seccion.click()
  const caja = page.getByRole('textbox', { name: 'Notas privadas' })
  await expect(caja).toHaveValue('Rodilla derecha: ojo')

  // Escribe y se guarda sola, en la tabla de notas
  await caja.fill('Rodilla derecha: ojo\nVigilar hombro')
  await page.getByRole('button', { name: '⚠️ Lesión' }).click()
  await expect(page.getByText('Guardado ✓')).toBeVisible()
  await expect.poll(() => fake.rows('notas_privadas_cliente').length).toBe(1)
  expect(fake.rows('notas_privadas_cliente')[0]).toMatchObject({ client_id: ids.client, trainer_id: ids.trainer, notas: 'Rodilla derecha: ojo\nVigilar hombro\n[⚠️ Lesión] ' })

  // El plan no se ha tocado ni lleva notas
  expect(JSON.stringify(fake.rows('planes'))).not.toContain('coachNotes')
  expect(fake.rows('planes').find(r => r.clientId === ids.client)!.updatedAt).toBe(1000)
})

test('el cliente carga su plan sin coachNotes y nunca consulta la tabla de notas', async ({ page, fake }) => {
  test.setTimeout(150_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('notas_privadas_cliente', { client_id: ids.client, trainer_id: ids.trainer, notas: 'Secreto del entrenador', updated_at: new Date().toISOString() })

  const peticiones: string[] = []
  const planesRecibidos: string[] = []
  page.on('request', r => { peticiones.push(r.url()) })
  page.on('response', async r => {
    if (r.url().includes('/rest/v1/planes')) planesRecibidos.push(await r.text().catch(() => ''))
  })

  await entrarComoCliente(page)
  await expect.poll(() => planesRecibidos.length).toBeGreaterThan(0)

  expect(planesRecibidos.join('\n')).not.toContain('coachNotes')
  expect(planesRecibidos.join('\n')).not.toContain('Secreto del entrenador')
  expect(peticiones.filter(u => u.includes('notas_privadas_cliente'))).toHaveLength(0)
})

// En el demo las notas viven en el navegador, con las de ejemplo como punto de partida (lib/demoNotasPrivadas.ts)
test('demo: la ficha enseña las notas de ejemplo y recuerda lo que se edita', async ({ page }) => {
  test.setTimeout(150_000)
  expect.configure({ timeout: 30_000 })
  await page.goto('/?demo=1')
  await page.getByRole('button', { name: /María García/ }).first().click()
  const seccion = page.getByRole('button', { name: /^Notas privadas/ })
  await expect(seccion).toContainText('Tienes notas guardadas')
  await seccion.click()
  const caja = page.getByRole('textbox', { name: 'Notas privadas' })
  await expect(caja).toHaveValue(/rodilla derecha en sentadilla/)
  await caja.fill('Cambio de nota en el demo')
  await expect(page.getByText('Guardado ✓')).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('pf_notas_privadas_demo-client-001'))).toBe('Cambio de nota en el demo')
})
