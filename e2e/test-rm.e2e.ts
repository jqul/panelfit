import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, entrarComoEntrenador } from './support/flows'

const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const planDe = (fake: Parameters<typeof seedWorld>[0]) => fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P

test('con una marca puesta, el % del plan se calcula con ella (y el foco ya trae el peso)', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const plan = planDe(fake)
  plan.weeks[0].days[0].exercises[0] = { ...plan.weeks[0].days[0].exercises[0], name: 'Sentadilla', sets: '3x5', weight: '80%' }
  plan.marcas = { sentadilla: { kg: 200, fecha: hoy() } }
  // Un historial que estimaría menos: manda la marca
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {} })

  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  await expect(page.getByLabel('Peso serie 1')).toHaveValue('160') // vista de foco

  await page.getByRole('button', { name: 'Ver todos los ejercicios en lista' }).click()
  await expect(page.getByText(/80% ≈ 160kg \(según tu marca del/)).toBeVisible()
})

test('el ejercicio de test de RM se anuncia como tal', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const plan = planDe(fake)
  plan.weeks[0].days[0].exercises[0] = { ...plan.weeks[0].days[0].exercises[0], name: 'Sentadilla', sets: '1x1', weight: '', testRM: true }
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  await expect(page.getByTestId('test-rm')).toContainText('Test de RM')
  await page.getByRole('button', { name: 'Ver todos los ejercicios en lista' }).click()
  await expect(page.getByText('🎯 Test de RM · tu mejor serie de hoy será tu nueva marca')).toBeVisible()
})

test('el entrenador marca un test de RM y pone una marca a mano', async ({ page, fake }) => {
  await page.setViewportSize({ width: 1280, height: 900 }) // el editor del plan, en escritorio
  seedWorld(fake)
  const plan = planDe(fake)
  plan.weeks[0].days[0].exercises[0] = { ...plan.weeks[0].days[0].exercises[0], name: 'Sentadilla', weight: '80%' }
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Plan/ }).first().click()

  const marcas = page.getByRole('region', { name: 'Marcas de referencia' })
  const fila = marcas.getByRole('listitem', { name: 'Marca de Sentadilla' })
  await expect(fila).toContainText('Sin marca aún')
  await fila.getByRole('button', { name: 'Poner a mano' }).click()
  await fila.getByLabel('Marca de Sentadilla en kg').fill('182.5')
  await fila.getByRole('button', { name: 'Guardar' }).click()
  await expect(fila).toContainText('182,5 kg')
  await expect(fila).toContainText('puesta a mano')

  await page.locator('.plan-grid').nth(1).click({ position: { x: 8, y: 8 } }) // la 1ª es la cabecera; abre las opciones
  const activar = page.getByRole('button', { name: /Test de RM \(tomar marca\)/ })
  await activar.scrollIntoViewIfNeeded()
  await activar.click()

  const p = () => fake.rows('planes').find(r => r.clientId === ids.client)?.plan?.P
  await expect.poll(() => p()?.marcas?.sentadilla?.kg, { timeout: 10000 }).toBe(182.5)
  await expect.poll(() => p()?.weeks?.[0]?.days?.[0]?.exercises?.[0]?.testRM, { timeout: 10000 }).toBe(true)
})
