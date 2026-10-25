import { test, expect } from './support/test'
import { seedWorld, samplePlan, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'
import type { Page } from '@playwright/test'

const PEDRO = '44444444-4444-4444-8444-444444444444'
const LUCIA = '55555555-5555-4555-8555-555555555555'

const semana = (dias: string[][]) => [{
  label: 'Semana 1', rpe: '', isCurrent: false,
  days: dias.map((nombres, i) => ({ title: `Día ${i + 1}`, focus: '', exercises: nombres.map(name => ({ name, sets: '3x5', weight: '', comment: '', isMain: false })) })),
}]

/**
 * María (con plan publicado y teléfono), Pedro (con un borrador sin publicar y teléfono) y Lucía (sin plan ni teléfono).
 * Un workout de dos días y dos etiquetas, para elegir.
 */
function sembrar(fake: FakeSupabase) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const maria = fake.rows('clientes').find(c => c.id === ids.client)!
  maria.phone = '+34 600 111 222'
  fake.seed('clientes', { id: PEDRO, trainerId: ids.trainer, name: 'Pedro', surname: 'Ruiz', token: 'tokenpedro', phone: '600333444', metricas_cliente: [], createdAt: Date.now() })
  fake.seed('clientes', { id: LUCIA, trainerId: ids.trainer, name: 'Lucía', surname: 'Díaz', token: 'tokenlucia', metricas_cliente: [], createdAt: Date.now() })
  fake.seed('planes', {
    clientId: PEDRO, plan: { P: samplePlan() }, updatedAt: 1000,
    borrador_activo: true, plan_borrador: { P: samplePlan({ exerciseNames: ['Mi borrador A', 'Mi borrador B', 'Mi borrador C'] }) },
  })
  fake.seed('plan_templates', {
    id: 'tmpl-1', trainer_id: ids.trainer, name: 'Fuerza 5x3', description: '', created_at: 1, updated_at: 1, label_ids: [],
    plan: { type: 'Fuerza', weeks: semana([['Sentadilla', 'Press banca', 'Remo'], ['Peso muerto', 'Press militar']]) },
  })
  fake.seed('labels', { id: 'lab-vip', trainer_id: ids.trainer, name: 'VIP', color: '#a0522d', emoji: '⭐', survey_template_id: null, created_at: 1 })
  fake.seed('labels', { id: 'lab-online', trainer_id: ids.trainer, name: 'Online', color: '#2f6f4f', emoji: '💻', survey_template_id: null, created_at: 2 })
  fake.seed('survey_templates', { id: 'enc-1', trainer_id: ids.trainer, name: 'Check-in semanal', questions: [], created_at: 1 })
}

const planDe = (fake: FakeSupabase, id: string) => fake.rows('planes').find(r => r.clientId === id)
const etiquetasDe = (fake: FakeSupabase, id: string) => fake.rows('clientes').find(c => c.id === id)?.label_ids ?? []

async function abrirClientesEnModoSeleccion(page: Page) {
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: 'Ver todos →' }).first().click()
  await expect(page.getByRole('heading', { name: 'Clientes', level: 2 })).toBeVisible()
  await page.getByRole('button', { name: 'Seleccionar', exact: true }).click()
}

async function marcar(page: Page, ...nombres: string[]) {
  for (const n of nombres) await page.getByRole('checkbox', { name: `Seleccionar a ${n}` }).check() // de uno en uno: cada clic vuelve a pintar la lista
}

test('seleccionar todos y ver cuántos se afectan; al filtrar solo cuentan los que se ven', async ({ page, fake }) => {
  sembrar(fake)
  await abrirClientesEnModoSeleccion(page)
  const barra = page.getByRole('region', { name: /Acciones para/ })
  await expect(barra).toHaveCount(0) // sin selección no hay barra

  await page.getByLabel(/Seleccionar todos los que se ven \(3\)/).check()
  await expect(barra).toHaveAccessibleName('Acciones para 3 clientes seleccionados')

  // Al buscar a Pedro, los otros dos ya no se ven: dejan de estar seleccionados (lo que se ve es lo que se afecta)
  await page.getByPlaceholder('Buscar cliente...').fill('Pedro')
  await expect(barra).toHaveAccessibleName('Acciones para 1 cliente seleccionado')
  await page.getByPlaceholder('Buscar cliente...').fill('')
  await expect(page.getByText('1 seleccionado', { exact: true })).toBeVisible()

  // Cancelar la selección quita las casillas y la barra
  await page.getByRole('button', { name: 'Cancelar selección' }).first().click()
  await expect(barra).toHaveCount(0)
  await expect(page.getByRole('checkbox', { name: /Seleccionar a/ })).toHaveCount(0)
})

test('asignar un workout: respeta el borrador de Pedro, deja copia, no reordena y se puede deshacer', async ({ page, fake }) => {
  sembrar(fake)
  const planAntes = JSON.parse(JSON.stringify(planDe(fake, ids.client)!.plan))
  await abrirClientesEnModoSeleccion(page)
  await page.getByLabel(/Seleccionar todos los que se ven/).check()
  await page.getByRole('region', { name: /Acciones para/ }).getByRole('button', { name: 'Plan' }).click()

  const hoja = page.getByRole('dialog', { name: 'Asignar plan' })
  await expect(hoja.getByTestId('afectados')).toContainText('Afecta a 3 clientes')
  await hoja.getByRole('radio', { name: 'Fuerza 5x3' }).check()
  await hoja.getByRole('button', { name: /^Asignar «Fuerza 5x3» a 3 clientes/ }).click()
  // Sobrescribe: pide confirmar diciendo a cuántos
  await expect(hoja.getByRole('alert')).toContainText('Se sustituirá el plan actual de 3 clientes')
  await hoja.getByRole('button', { name: 'Sí, asignar a 3 clientes' }).click()

  // Resumen: 2 hechos, 1 omitido con su motivo (no queda nada callado)
  await expect(hoja.getByText('Plan asignado en 2 de 3 clientes')).toBeVisible()
  await expect(hoja.getByText('1 omitido')).toBeVisible()
  await expect(hoja.getByText('Pedro Ruiz')).toBeVisible()
  await expect(hoja.getByText('Tiene un borrador sin publicar')).toBeVisible()

  // María: el workout, con los ejercicios en su orden, y la versión sube
  const maria = planDe(fake, ids.client)!
  expect(maria.plan.P.weeks[0].days.map((d: any) => d.exercises.map((e: any) => e.name))).toEqual([['Sentadilla', 'Press banca', 'Remo'], ['Peso muerto', 'Press militar']])
  expect(maria.plan.P).toMatchObject({ type: 'Fuerza', clientId: ids.client })
  expect(maria.updatedAt).toBeGreaterThan(1000)
  // Pedro: ni su plan ni su borrador se han tocado
  const pedro = planDe(fake, PEDRO)!
  expect(pedro.borrador_activo).toBe(true)
  expect(pedro.plan_borrador.P.weeks[0].days[0].exercises[0].name).toBe('Mi borrador A')
  expect(pedro.updatedAt).toBe(1000)
  // Lucía no tenía fila de plan: ahora tiene uno
  expect(planDe(fake, LUCIA)!.plan.P.weeks).toHaveLength(1)
  // Copia del plan anterior de María en el historial
  expect(fake.rows('plan_history')).toMatchObject([{ clientId: ids.client, note: 'Copia automática antes de asignar "Fuerza 5x3"' }])

  // Deshacer devuelve el plan anterior de María
  await hoja.getByRole('button', { name: 'Deshacer' }).click()
  await expect(hoja.getByText('Plan anterior restaurado ✓')).toBeVisible()
  expect(planDe(fake, ids.client)!.plan).toEqual(planAntes)
})

test('etiquetas: añadir a varios y quitar, sin tocar a los no seleccionados', async ({ page, fake }) => {
  sembrar(fake)
  fake.rows('clientes').find(c => c.id === PEDRO)!.label_ids = ['lab-vip']
  await abrirClientesEnModoSeleccion(page)
  await marcar(page, 'María García', 'Pedro Ruiz')
  await page.getByRole('region', { name: /Acciones para/ }).getByRole('button', { name: 'Etiquetas' }).click()

  const hoja = page.getByRole('dialog', { name: 'Etiquetas' })
  await expect(hoja.getByTestId('afectados')).toContainText('Afecta a 2 clientes')
  await hoja.getByRole('checkbox', { name: /VIP/ }).check()
  await hoja.getByRole('checkbox', { name: /Online/ }).check()
  await hoja.getByRole('button', { name: 'Añadir 2 etiquetas a 2 clientes' }).click()
  await expect(hoja.getByText('Etiquetas añadidas en 2 de 2 clientes')).toBeVisible()

  expect(etiquetasDe(fake, ids.client)).toEqual(['lab-vip', 'lab-online'])
  expect(etiquetasDe(fake, PEDRO)).toEqual(['lab-vip', 'lab-online']) // ya tenía VIP: no se duplica
  expect(etiquetasDe(fake, LUCIA)).toEqual([]) // no estaba seleccionada
  await hoja.getByRole('button', { name: 'Cerrar' }).last().click() // hay dos: la X de la cabecera y el botón del pie

  // Quitar VIP a los mismos dos
  await page.getByRole('region', { name: /Acciones para/ }).getByRole('button', { name: 'Etiquetas' }).click()
  await hoja.getByRole('tab', { name: 'Quitar' }).click()
  await hoja.getByRole('checkbox', { name: /VIP/ }).check()
  await hoja.getByRole('button', { name: 'Quitar 1 etiqueta de 2 clientes' }).click()
  await expect(hoja.getByText('Etiquetas quitadas en 2 de 2 clientes')).toBeVisible()
  expect(etiquetasDe(fake, ids.client)).toEqual(['lab-online'])
  expect(etiquetasDe(fake, PEDRO)).toEqual(['lab-online'])
})

test('mensaje: uno por cliente con su nombre, marca los enviados y avisa de quien no tiene teléfono', async ({ page, fake, context }) => {
  sembrar(fake)
  await context.route('https://wa.me/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: 'ok' })) // WhatsApp real no se abre
  await abrirClientesEnModoSeleccion(page)
  await page.getByLabel(/Seleccionar todos los que se ven/).check()
  await page.getByRole('region', { name: /Acciones para/ }).getByRole('button', { name: 'Mensaje' }).click()

  const hoja = page.getByRole('dialog', { name: 'Enviar mensaje' })
  await hoja.getByLabel('Mensaje', { exact: true }).fill('Hola {{cliente}}, mañana toca pierna')
  await expect(hoja.getByText('Así lo verá María García')).toBeVisible()
  await expect(hoja.getByText('Hola María, mañana toca pierna')).toBeVisible()
  await hoja.getByRole('button', { name: 'Preparar mensaje para 3 clientes' }).click()

  await expect(hoja.getByText('0 de 3 enviados')).toBeVisible()
  await expect(hoja.getByText('1 sin teléfono')).toBeVisible()
  // El enlace de María lleva su teléfono normalizado y SU nombre en el texto
  const enlace = hoja.getByRole('link', { name: 'Abrir WhatsApp con María García' })
  const href = await enlace.getAttribute('href')
  expect(href).toBe(`https://wa.me/34600111222?text=${encodeURIComponent('Hola María, mañana toca pierna')}`)
  expect(await hoja.getByRole('link', { name: 'Abrir WhatsApp con Pedro Ruiz' }).getAttribute('href')).toContain(encodeURIComponent('Hola Pedro,'))
  // Lucía no tiene teléfono: no hay enlace, solo copiar
  await expect(hoja.getByRole('link', { name: /Lucía/ })).toHaveCount(0)
  await expect(hoja.getByText('Sin teléfono guardado')).toBeVisible()

  const [popup] = await Promise.all([page.waitForEvent('popup'), enlace.click()])
  await popup.close()
  await expect(hoja.getByText('1 de 3 enviados')).toBeVisible()
  await expect(hoja.getByText('faltan 2')).toBeVisible()
})

test('encuesta: enlace de cada cliente con su acceso a la encuesta', async ({ page, fake }) => {
  sembrar(fake)
  await abrirClientesEnModoSeleccion(page)
  await marcar(page, 'María García', 'Pedro Ruiz')
  await page.getByRole('region', { name: /Acciones para/ }).getByRole('button', { name: 'Encuesta' }).click()

  const hoja = page.getByRole('dialog', { name: 'Enviar encuesta' })
  await hoja.getByRole('radio', { name: 'Check-in semanal' }).check()
  await hoja.getByRole('button', { name: 'Preparar «Check-in semanal» para 2 clientes' }).click()
  await expect(hoja.getByText('0 de 2 enviados')).toBeVisible()
  const hrefPedro = decodeURIComponent((await hoja.getByRole('link', { name: 'Abrir WhatsApp con Pedro Ruiz' }).getAttribute('href'))!)
  expect(hrefPedro).toContain('?c=tokenpedro&encuesta=1')
  expect(hrefPedro).toContain('*Check-in semanal*')
  expect(hrefPedro).toContain('Hola Pedro')
})
