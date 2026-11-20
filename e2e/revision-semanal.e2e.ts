import { test, expect } from './support/test'
import { seedWorld, samplePlan, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const ayer = () => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const PEDRO = '44444444-4444-4444-8444-444444444444'
const LUCIA = '55555555-5555-4555-8555-555555555555'

// Una pasada por todos los clientes: lo que hay que mirar de cada uno, ordenado, con una acción rápida (mensaje) y «revisado» recordado.
test('Revisión semanal: ordena por urgencia, propone un mensaje con nombre de pila y recuerda lo revisado', async ({ page, fake, context }) => {
  test.setTimeout(150_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.rows('clientes').find(c => c.id === ids.client)!.phone = '+34 600 111 222'
  // María: molestia fuerte (atender). Pedro: sin plan. Lucía: con plan y una decisión del diario cuyo plazo ya llegó.
  fake.seed('registros_dolor', { id: 'd1', clientId: ids.client, date: hoy(), zona: 'Rodilla', intensidad: 8, tipo: 'articular', created_at: 1 })
  fake.seed('clientes', { id: PEDRO, trainerId: ids.trainer, name: 'Pedro', surname: 'Ruiz', token: 'tokenpedro', metricas_cliente: [], createdAt: Date.now() })
  fake.seed('clientes', { id: LUCIA, trainerId: ids.trainer, name: 'Lucía', surname: 'Díaz', token: 'tokenlucia', metricas_cliente: [], createdAt: Date.now() })
  fake.seed('planes', { clientId: LUCIA, plan: { P: { ...samplePlan(), clientId: LUCIA } }, updatedAt: 1000, borrador_activo: false, plan_borrador: null })
  fake.seed('decisiones_entrenador', { id: 'dec-1', trainer_id: ids.trainer, client_id: LUCIA, fecha: ayer(), ejercicio: 'Press banca', hipotesis: 'h', tipo: 'mantener', intervencion: '', revisar_el: ayer(), revisada_el: null, resultado: null })
  await context.route('https://wa.me/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: 'ok' }))
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a revision semanal')
  await page.keyboard.press('Enter')

  await expect(page.getByRole('heading', { name: 'Revisión semanal' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('3 clientes por revisar · 1 para atender')
  const lista = page.getByRole('region', { name: 'Por revisar' }).getByRole('listitem')
  await expect(lista).toHaveCount(3)
  // Orden: la molestia fuerte primero
  await expect(lista.nth(0)).toContainText('María García')
  await expect(lista.nth(0)).toContainText('Molestia en Rodilla (8/10)')
  await expect(lista.nth(1)).toContainText('Lucía Díaz')
  await expect(lista.nth(1)).toContainText('1 decisión por revisar')
  await expect(lista.nth(2)).toContainText('Pedro Ruiz')
  await expect(lista.nth(2)).toContainText('Sin plan asignado')

  // Acción rápida: WhatsApp con su nombre de pila (nunca nombre y apellidos)
  const [wa] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('button', { name: 'Mensaje a María García: Molestia' }).click(),
  ])
  expect(decodeURIComponent(wa.url())).toContain('Hola María, ¿cómo va la molestia de rodilla?')
  expect(decodeURIComponent(wa.url())).not.toContain('García')
  await wa.close()

  // «Revisado»: sale de la lista y se puede ver aparte
  await page.getByRole('button', { name: 'Revisado: María García' }).click()
  await expect(page.getByRole('status')).toContainText('2 clientes por revisar')
  await expect(lista).toHaveCount(2)
  // Se recuerda (por semana): al salir y volver, sigue revisado
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a hoy')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Revisión semanal' })).toHaveCount(0)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a revision semanal')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toContainText('2 clientes por revisar')
  await page.getByRole('button', { name: /los 1 revisados esta semana/ }).click()
  await expect(page.getByRole('region', { name: 'Revisados esta semana' })).toContainText('María García')
})
