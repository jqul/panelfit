import { test, expect } from './support/test'
import { seedWorld, ids, TRAINER_LOGIN } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'
import type { Page } from '@playwright/test'

/** Un entrenador recién llegado: sin clientes, sin plantillas. */
function sembrarEntrenadorNuevo(fake: FakeSupabase) {
  fake.addUser(TRAINER_LOGIN.email, TRAINER_LOGIN.password, ids.trainer)
  fake.seed('entrenadores', { uid: ids.trainer, email: TRAINER_LOGIN.email, displayName: 'Alex Trainer', approved: true, rol: 'trainer', role: 'trainer', profile: { planName: 'studio', clientLimit: 50, brandName: 'AlexFit' } })
}

const tarjeta = (page: Page) => page.getByRole('region', { name: 'Primeros pasos' })
const asistente = (page: Page) => page.getByRole('dialog', { name: 'Primer cliente' })

test('de cero a un cliente con su workout y su enlace enviado, en tres pantallas', async ({ page, context, fake }) => {
  sembrarEntrenadorNuevo(fake)
  await context.route('https://wa.me/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: 'ok' }))
  await entrarComoEntrenador(page)

  // Hoy empieza por una sola acción: crear el primer cliente
  await expect(tarjeta(page).getByText('Primeros pasos · 0 de 3')).toBeVisible()
  await tarjeta(page).getByRole('button', { name: /Crear cliente/ }).click()

  // 1 · Cliente
  await expect(asistente(page).getByText('Paso 1 de 3')).toBeVisible()
  await expect(page.getByLabel('Nombre', { exact: true })).toBeFocused()
  await expect(asistente(page).getByRole('button', { name: /Crear y continuar/ })).toBeDisabled()
  await page.getByLabel('Nombre', { exact: true }).fill('Lucía')
  await page.getByLabel(/Apellido/).fill('Soto')
  await asistente(page).getByRole('button', { name: /Crear y continuar/ }).click()

  // 2 · Workout: sin plantillas propias se ofrecen las de arranque
  await expect(asistente(page).getByText('Paso 2 de 3')).toBeVisible()
  await expect(asistente(page).getByRole('radio')).toHaveCount(3)
  await expect(asistente(page).getByRole('button', { name: /Asignar y continuar/ })).toBeDisabled()
  await asistente(page).getByRole('radio', { name: /Cuerpo completo 3 días/ }).click()
  await asistente(page).getByRole('button', { name: /Asignar y continuar/ }).click()

  // 3 · Acceso
  await expect(asistente(page).getByText('Paso 3 de 3')).toBeVisible()
  const cliente = fake.rows('clientes').find(c => c.name === 'Lucía')!
  await expect(page.getByLabel('Enlace del cliente')).toHaveValue(new RegExp(`\\?c=${cliente.token}$`))
  await page.getByLabel('Caducidad del enlace').selectOption('30')
  await expect.poll(() => cliente.token_expires_at).toBeTruthy()
  const [wa] = await Promise.all([
    context.waitForEvent('page'),
    asistente(page).getByRole('button', { name: 'Enviar por WhatsApp' }).click(),
  ])
  expect(wa.url()).toContain('wa.me/?text=')
  expect(decodeURIComponent(wa.url())).toContain(`?c=${cliente.token}`)
  await expect(asistente(page).getByRole('status')).toContainText('Enviado')
  await asistente(page).getByRole('button', { name: 'Terminar' }).click()
  await expect(asistente(page)).toHaveCount(0)

  // Lo que quedó guardado: la plantilla en SU librería, el plan del cliente y el cliente en la lista
  const plantilla = fake.rows('plan_templates').find(t => t.trainer_id === ids.trainer)!
  expect(plantilla.name).toBe('Cuerpo completo 3 días')
  const plan = fake.rows('planes').find(p => p.clientId === cliente.id)!
  expect(plan.plan.P.weeks[0].days).toHaveLength(3)
  expect(plan.plan.P.type).toBe('General')

  // Completo: la tarjeta se retira sola; y recuerda que se envió, también tras recargar
  await expect(tarjeta(page)).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('Resumen').first()).toBeVisible()
  await expect(tarjeta(page)).toHaveCount(0)

  // Se puede reabrir desde la búsqueda global (Ctrl+K), y cerrar para siempre
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('primeros pasos')
  await page.keyboard.press('Enter')
  await expect(tarjeta(page).getByText('Tu primer cliente ya tiene su enlace')).toBeVisible()
  await tarjeta(page).getByRole('button', { name: 'Entendido' }).click()
  await page.reload()
  await expect(page.getByText('Resumen').first()).toBeVisible()
  await expect(tarjeta(page)).toHaveCount(0)
})

test('el progreso sale de los datos reales: con plan pero sin enviar sigue en el acceso, y si el cliente abrió el enlace desaparece sin marcas locales', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true }) // María ya tiene plan
  await entrarComoEntrenador(page)

  await expect(tarjeta(page).getByText('Primeros pasos · 2 de 3')).toBeVisible()
  await tarjeta(page).getByRole('button', { name: /Enviar enlace/ }).click()
  await expect(asistente(page).getByText('Paso 3 de 3')).toBeVisible()
  await expect(page.getByLabel('Enlace del cliente')).toHaveValue(/\?c=tokene2e/)
  await page.keyboard.press('Escape')
  await expect(asistente(page)).toHaveCount(0)
  await expect(tarjeta(page)).toBeVisible() // cerrar el asistente no marca nada como hecho

  // El cliente abre su enlace (lo registra el servidor): al recargar ya está completo
  fake.rows('clientes').find(c => c.id === ids.client)!.plan_last_opened_at = new Date().toISOString()
  await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('pf_onb_')).forEach(k => localStorage.removeItem(k)))
  await page.reload()
  await expect(page.getByText('Resumen').first()).toBeVisible()
  await expect(tarjeta(page)).toHaveCount(0)
})

test('"Nuevo cliente" continúa con el mismo asistente y no pisa un plan que ya existe', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoEntrenador(page)

  await page.getByRole('button', { name: 'Nuevo cliente', exact: true }).first().click()
  await page.getByPlaceholder('Nombre', { exact: true }).fill('Pedro')
  await page.getByRole('button', { name: 'Crear cliente' }).click()

  await expect(asistente(page).getByText('Paso 2 de 3')).toBeVisible() // arranca en el workout de Pedro
  await expect(asistente(page).getByText('Pedro', { exact: true })).toBeVisible()
  const pedro = fake.rows('clientes').find(c => c.name === 'Pedro')!

  // Si alguien (otro dispositivo, un programa automático) le asigna un plan mientras tanto, no se pisa
  fake.seed('planes', { clientId: pedro.id, plan: { P: { clientId: pedro.id, type: 'Fuerza', restMain: 1, restAcc: 1, restWarn: 1, weeks: [{ label: 'S1', rpe: '', isCurrent: true, days: [] }] } }, updatedAt: 5 })
  await asistente(page).getByRole('radio', { name: /Torso \/ Pierna/ }).click()
  await asistente(page).getByRole('button', { name: /Asignar y continuar/ }).click()
  await expect(asistente(page).getByText('Paso 3 de 3')).toBeVisible()
  const planes = fake.rows('planes').filter(p => p.clientId === pedro.id)
  expect(planes).toHaveLength(1)
  expect(planes[0].plan.P.type).toBe('Fuerza') // el que ya había
  await page.keyboard.press('Escape')
  await expect(asistente(page)).toHaveCount(0)
})
