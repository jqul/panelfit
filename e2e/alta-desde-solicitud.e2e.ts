import type { Page } from '@playwright/test'
import { test, expect as expectBase } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'

// Alta de un cliente desde una solicitud: el formulario viene rellenado con lo que la persona ya contestó (objetivo, altura y peso), que el entrenador
// revisa antes de crear la ficha; el género y la fecha de nacimiento no se preguntan y no se inventan (solo se enseña la edad como pista); y, si la cuenta
// lleva Coach IA, se ofrece la etiqueta «Coach IA» (que se crea si no existe y se puede desmarcar). Las demás respuestas de salud y el PAR-Q no pasan a la ficha.

test.setTimeout(150_000) // la primera carga compila los trozos diferidos
const expect = expectBase.configure({ timeout: 30_000 })

function sembrar(fake: FakeSupabase, over: { coachIa?: boolean; salud?: boolean; respuestas?: Record<string, unknown> } = {}) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  if (over.coachIa !== false) fake.seed('coach_ia_habilitados', { trainer_id: ids.trainer })
  fake.seed('leads', {
    id: 'l-alta', trainer_id: ids.trainer, name: 'Adrián Gómez', email: 'adrian@example.com', phone: '600111222', message: 'Solicitud de programación inicial',
    status: 'nuevo', created_at: Date.now() - 3600_000, referred_by_client_id: null, origen: 'programacion', enlace_id: null,
  })
  const salud = over.salud !== false
  fake.seed('solicitudes_programacion', {
    lead_id: 'l-alta', trainer_id: ids.trainer, client_id: null, clave_envio: 'k-alta', consentimiento_salud: salud, consentimiento_asistente: salud, consentimiento_version: 'prog-2026-11-3',
    consentimiento_en: new Date().toISOString(), seguimiento_autorizado: false,
    respuestas: over.respuestas ?? { objetivo: 'Ganar músculo', experiencia: 'De 6 meses a 2 años', dias: '3', duracion: '60-75 min', molestias: false, peso: 78.5, altura: 178, edad: 29, rechaza: 'Nada de dominadas', sueno: 5, estres: 8 },
    parq: salud ? [false, false, false, false, false, false, false] : null, parq_alarma: false, preparar_borrador: salud, borrador_estado: 'sin_generar', propuesta: null, razones: null, criterios_version: null,
    ia_leida_en: null, ia_campos: null, borrador_generado_en: null, borrador_decidido_en: null, created_at: new Date(Date.now() - 3600_000).toISOString(),
  })
}

async function abrirAlta(page: Page) {
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a contactos')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Convertir en cliente' }).first().click()
  return page.getByRole('dialog')
}

const clienteCreado = (fake: FakeSupabase) => fake.rows('clientes').find(c => c.name === 'Adrián')

test('el formulario viene con su objetivo, altura y peso, avisa de lo rellenado y no inventa género ni nacimiento', async ({ page, fake }) => {
  sembrar(fake)
  const alta = await abrirAlta(page)
  await expect(alta.getByText(/Rellenado con lo que contestó en su solicitud: objetivo, altura y peso\. Revísalo antes de crear la ficha/)).toBeVisible()
  // «Más datos» queda desplegado y con lo rellenado
  await expect(alta.getByRole('button', { name: 'Hipertrofia' })).toHaveClass(/bg-ink/)
  await expect(alta.locator('input[type="number"]').nth(0)).toHaveValue('178')
  await expect(alta.locator('input[type="number"]').nth(1)).toHaveValue('78.5')
  // Lo que no se preguntó se queda vacío; de la edad solo hay una pista
  await expect(alta.locator('select')).toHaveValue('')
  await expect(alta.locator('input[type="date"]')).toHaveValue('')
  await expect(alta.getByText('Dijo tener 29 años')).toBeVisible()
  // Lo demás de la solicitud no aparece en el formulario
  await expect(alta.getByText(/dominadas|sueño|estrés/i)).toHaveCount(0)

  await alta.getByRole('button', { name: 'Crear cliente' }).click()
  await expect.poll(() => !!clienteCreado(fake)).toBe(true)
  const c = clienteCreado(fake)!
  expect(c).toMatchObject({ objetivo: 'hipertrofia', altura: 178, weight: 78.5, genero: null })
  // Nada más de su cuestionario de salud pasa a la ficha
  expect(JSON.stringify(c)).not.toMatch(/dominadas|PAR-Q|molestias|sueno|estres/i)
})

test('con Coach IA se ofrece la etiqueta «Coach IA»: se crea si no existe y se pone al cliente', async ({ page, fake }) => {
  sembrar(fake)
  const alta = await abrirAlta(page)
  const casilla = alta.getByRole('checkbox', { name: /Llevarla con Coach IA/ })
  await expect(casilla).toBeChecked()
  await alta.getByRole('button', { name: 'Crear cliente' }).click()
  await expect.poll(() => !!clienteCreado(fake)).toBe(true)
  const etiqueta = fake.rows('labels').find(l => l.name === 'Coach IA')!
  expect(etiqueta).toMatchObject({ trainer_id: ids.trainer, emoji: '🤖' })
  expect(clienteCreado(fake)!.label_ids).toContain(etiqueta.id)
})

test('si la etiqueta «Coach IA» ya existe se reutiliza (no se duplica)', async ({ page, fake }) => {
  sembrar(fake)
  fake.seed('labels', { id: 'lbl-ia', trainer_id: ids.trainer, name: 'coach ia', color: '#000000', emoji: '🏷️', survey_template_id: null, created_at: 1 })
  const alta = await abrirAlta(page)
  await alta.getByRole('button', { name: 'Crear cliente' }).click()
  await expect.poll(() => !!clienteCreado(fake)).toBe(true)
  expect(clienteCreado(fake)!.label_ids).toEqual(['lbl-ia'])
  expect(fake.rows('labels').filter(l => /coach ia/i.test(l.name))).toHaveLength(1)
})

test('desmarcar «Llevarla con Coach IA» (a esa persona la llevo a mano): sin etiqueta y sin crear ninguna', async ({ page, fake }) => {
  sembrar(fake)
  const alta = await abrirAlta(page)
  await alta.getByRole('checkbox', { name: /Llevarla con Coach IA/ }).uncheck()
  await alta.getByRole('button', { name: 'Crear cliente' }).click()
  await expect.poll(() => !!clienteCreado(fake)).toBe(true)
  expect(clienteCreado(fake)!.label_ids ?? []).toEqual([])
  expect(fake.rows('labels')).toHaveLength(0)
})

test('una cuenta sin Coach IA habilitado: se rellena igual, pero no se ofrece ninguna etiqueta', async ({ page, fake }) => {
  sembrar(fake, { coachIa: false })
  const alta = await abrirAlta(page)
  await expect(alta.getByText(/Rellenado con lo que contestó en su solicitud/)).toBeVisible()
  await expect(alta.getByRole('checkbox', { name: /Coach IA/ })).toHaveCount(0)
  await alta.getByRole('button', { name: 'Crear cliente' }).click()
  await expect.poll(() => !!clienteCreado(fake)).toBe(true)
  expect(fake.rows('labels')).toHaveLength(0)
})

test('sin consentimiento de salud solo se propone el objetivo: ni altura ni peso ni edad', async ({ page, fake }) => {
  sembrar(fake, { salud: false, respuestas: { objetivo: 'Ganar fuerza', experiencia: 'Nunca he entrenado', dias: '3', duracion: '45 min' } })
  const alta = await abrirAlta(page)
  await expect(alta.getByText(/Rellenado con lo que contestó en su solicitud: objetivo\./)).toBeVisible()
  await expect(alta.getByRole('button', { name: 'Fuerza', exact: true })).toHaveClass(/bg-ink/)
  await expect(alta.locator('input[type="number"]').nth(0)).toHaveValue('')
  await expect(alta.locator('input[type="number"]').nth(1)).toHaveValue('')
  await expect(alta.getByText(/Dijo tener/)).toHaveCount(0)
})

test('un contacto normal de la página (no una solicitud) no se rellena ni ofrece etiqueta', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('coach_ia_habilitados', { trainer_id: ids.trainer })
  fake.seed('leads', { id: 'l-pag', trainer_id: ids.trainer, name: 'Pablo Página', email: 'pablo@example.com', phone: null, message: 'Quiero info', status: 'nuevo', created_at: Date.now() - 3600_000, referred_by_client_id: null, origen: 'pagina', enlace_id: null })
  const alta = await abrirAlta(page)
  await expect(alta.getByText(/Rellenado con lo que contestó/)).toHaveCount(0)
  await expect(alta.getByRole('checkbox', { name: /Coach IA/ })).toHaveCount(0)
})
