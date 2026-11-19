import type { Page } from '@playwright/test'
import { test, expect as expectBase } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'
import { PARQ_QUESTIONS } from '../src/lib/intakeQuestions'

// Solicitud de programación inicial por enlace público: el entrenador crea el enlace, alguien lo abre SIN cuenta y rellena la solicitud,
// llega a Contactos como lead (no como cliente), y solo al convertirlo se crea la ficha. Revocado: ya no acepta. PAR-Q con alarma: «revisar»
// y sin borrador. Sin consentimiento: no se guardan las respuestas de salud. Las reglas de verdad (límites, RLS) las prueba bloque40 con PGlite.

test.setTimeout(120_000) // la primera carga compila los trozos diferidos
const expect = expectBase.configure({ timeout: 30_000 })

const SLUG = 'ab12cd34ef56ab12cd34ef56ab12cd34'
const enlaceSembrado = (over: Record<string, unknown> = {}) => ({
  id: 'enl-1', trainer_id: ids.trainer, nombre: 'Programación inicial — amigos', slug: SLUG, caduca_en: null, max_usos: null, un_solo_uso: false,
  mostrar_foto: false, activo: true, usos: 0, ultimo_uso_en: null, creado_en: new Date().toISOString(), revocado_en: null, revocado_por: null, ...over,
})

function sembrar(fake: FakeSupabase, enlace = true) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  if (enlace) fake.seed('programacion_enlaces', enlaceSembrado())
}

/** Quien recibe el enlace: un navegador limpio, sin sesión, con el mismo Supabase simulado. */
async function visitante(browser: import('@playwright/test').Browser, fake: FakeSupabase, slug = SLUG) {
  const ctx = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } })
  await fake.attach(ctx)
  const page = await ctx.newPage()
  await page.goto(`/programacion/${slug}`)
  return { page, cerrar: () => ctx.close() }
}

async function contacto(page: Page, nombre: string, email: string) {
  await page.getByLabel('Tu nombre').fill(nombre)
  await page.getByLabel('Correo o WhatsApp').fill(email)
  await page.getByRole('button', { name: 'Empezar' }).click()
}

/** Las preguntas obligatorias del modelo (las de salud, solo si hay consentimiento). */
async function preguntas(page: Page, conSalud: boolean) {
  await page.getByRole('radio', { name: 'Ganar músculo', exact: true }).click()
  await page.getByRole('radio', { name: 'De 6 meses a 2 años' }).click()
  await page.getByRole('radiogroup', { name: /cuántos días/i }).getByRole('radio', { name: '3', exact: true }).click()
  await page.getByRole('radio', { name: '60-75 min' }).click()
  await page.getByRole('checkbox', { name: 'Mancuernas' }).check()
  if (conSalud) {
    await page.getByLabel(/si has contestado que sí/i).fill('Hombro derecho desde hace dos meses')
  }
  await page.getByRole('button', { name: 'Continuar' }).click()
}

test('recorrido completo: crear enlace → rellenar sin cuenta → lead en Contactos → convertir en cliente', async ({ page, browser, fake }) => {
  sembrar(fake, false)
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a contactos')
  await page.keyboard.press('Enter')

  // 1. El entrenador crea el enlace (14 días por defecto) y queda activo, con 0 usos
  await page.getByRole('button', { name: 'Crear enlace' }).click()
  await page.getByRole('button', { name: 'Crear', exact: true }).click()
  const region = page.getByRole('region', { name: 'Enlaces de programación inicial' })
  await expect(region.getByText('Programación inicial — amigos')).toBeVisible()
  await expect(region.getByText(/Activo/)).toBeVisible()
  await expect(region.getByText(/0 usos/)).toBeVisible()
  const enlace = fake.rows('programacion_enlaces')[0]
  expect(enlace.slug).toMatch(/^[0-9a-f]{32}$/)
  expect(enlace.caduca_en).not.toBeNull()

  // 2. Alguien lo abre sin cuenta: solo ve nombre del entrenador, qué incluye, 5 minutos y el aviso de que no es consejo médico
  const v = await visitante(browser, fake, enlace.slug)
  await expect(v.page.getByRole('heading', { name: 'Solicitud de programación inicial' })).toBeVisible()
  await expect(v.page.getByText('Alex Trainer')).toBeVisible()
  await expect(v.page.getByText('Unos 5 minutos.')).toBeVisible()
  await expect(v.page.getByText(/no es consejo médico/)).toBeVisible()
  await expect(v.page.getByLabel(/contraseña/i)).toHaveCount(0) // no se pide contraseña

  await contacto(v.page, 'Paula Navarro', 'paula@example.com')
  await v.page.getByRole('checkbox', { name: /Consiento que mi entrenador trate/ }).check()
  await v.page.getByRole('checkbox', { name: /herramienta de apoyo/ }).check()
  await v.page.getByRole('button', { name: 'Continuar' }).click()
  await preguntas(v.page, true)
  await v.page.getByRole('button', { name: 'Continuar' }).click() // segunda parte → PAR-Q
  await expect(v.page.getByRole('heading', { name: 'Cuestionario de salud' })).toBeVisible()
  for (const radio of await v.page.getByRole('radio', { name: /No$/ }).all()) await radio.click()
  await v.page.getByRole('button', { name: 'Enviar solicitud' }).click()
  await expect(v.page.getByText('Tu entrenador revisará tu solicitud y preparará una propuesta personalizada.')).toBeVisible()
  await expect(v.page.getByText(/IA|automático|horas/)).toHaveCount(0)

  // Entró como LEAD (no como cliente), con las respuestas estructuradas, el consentimiento y el uso contado
  const lead = fake.rows('leads').find(l => l.name === 'Paula Navarro')!
  expect(lead).toMatchObject({ origen: 'programacion', status: 'nuevo', trainer_id: ids.trainer })
  expect(fake.rows('clientes').some(c => c.name === 'Paula')).toBe(false)
  const sol = fake.rows('solicitudes_programacion').find(s => s.lead_id === lead.id)!
  expect(sol).toMatchObject({ consentimiento_salud: true, consentimiento_asistente: true, parq_alarma: false, preparar_borrador: true, borrador_estado: 'sin_generar' })
  expect(sol.respuestas.molestias_detalle).toContain('Hombro')
  expect(sol.parq).toHaveLength(7)
  expect(fake.rows('programacion_enlaces')[0].usos).toBe(1)
  await v.cerrar()

  // 3. El entrenador la ve en Contactos, con el detalle legible y el hueco del borrador
  await page.reload()
  await expect(page.getByText('Resumen').first()).toBeVisible()
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a contactos')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Paula Navarro')).toBeVisible()
  await expect(page.getByText('Solicitud de programación inicial', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Ver solicitud' }).click()
  const detalle = page.getByRole('region', { name: 'Detalle de la solicitud' })
  await expect(detalle.getByText('Hombro derecho desde hace dos meses')).toBeVisible()
  await expect(detalle.getByText('Estado:')).toContainText('Sin generar')
  await expect(detalle.getByText(/Al convertir en cliente solo pasan su nombre y su contacto/)).toBeVisible()

  // 4. Convertir en cliente: la ficha sale con su nombre, y NO se copian las respuestas de salud
  await page.getByRole('button', { name: 'Convertir en cliente' }).first().click()
  const alta = page.getByRole('dialog')
  await expect(alta.getByText('Viene de una solicitud de programación inicial')).toBeVisible()
  await expect(alta.getByPlaceholder('Nombre')).toHaveValue('Paula')
  await expect(alta.getByPlaceholder('Apellido')).toHaveValue('Navarro')
  await alta.getByRole('button', { name: 'Crear cliente' }).click()
  await expect.poll(() => fake.rows('clientes').find(c => c.name === 'Paula')?.notas_privadas ?? '').toContain('paula@example.com')
  const cliente = fake.rows('clientes').find(c => c.name === 'Paula')!
  expect(JSON.stringify(cliente)).not.toMatch(/Hombro|PAR-Q|molestias/i) // nada de salud en la ficha
  await expect.poll(() => fake.rows('leads').find(l => l.id === lead.id)!.status).toBe('convertido')
  expect(fake.rows('solicitudes_programacion').find(s => s.lead_id === lead.id)!.client_id).toBe(cliente.id) // enlazada; las respuestas siguen en la solicitud
})

test('revocar el enlace: ya no enseña nada y no acepta solicitudes', async ({ page, browser, fake }) => {
  sembrar(fake)
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a contactos')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Revocar Programación inicial — amigos' }).click()
  await page.getByRole('button', { name: /Confirmar revocar/ }).click()
  await expect(page.getByRole('region', { name: 'Enlaces de programación inicial' }).getByText(/Revocado/)).toBeVisible()
  const e = fake.rows('programacion_enlaces')[0]
  expect(e).toMatchObject({ activo: false, revocado_por: ids.trainer })
  expect(e.revocado_en).not.toBeNull()

  const v = await visitante(browser, fake)
  await expect(v.page.getByText('Este enlace ya no está disponible')).toBeVisible()
  await expect(v.page.getByLabel('Tu nombre')).toHaveCount(0)
  await expect(v.page.getByText('Alex Trainer')).toHaveCount(0) // no enseña ni el nombre
  expect(fake.rows('leads')).toHaveLength(0)
  await v.cerrar()
})

test('un enlace caducado o agotado se ve igual que uno inexistente', async ({ browser, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('programacion_enlaces',
    enlaceSembrado({ caduca_en: new Date(Date.now() - 1000).toISOString() }),
    enlaceSembrado({ id: 'enl-2', slug: 'f'.repeat(32), un_solo_uso: true, usos: 1 }))
  for (const slug of [SLUG, 'f'.repeat(32), '0'.repeat(32)]) {
    const v = await visitante(browser, fake, slug)
    await expect(v.page.getByText('Este enlace ya no está disponible')).toBeVisible()
    await v.cerrar()
  }
})

test('PAR-Q con señal de alarma: la persona ve «revisión personal», el lead queda «revisar» y NO se prepara borrador', async ({ page, browser, fake }) => {
  sembrar(fake)
  const v = await visitante(browser, fake)
  await contacto(v.page, 'Luis Pardo', '644 77 88 99')
  await v.page.getByRole('checkbox', { name: /Consiento que mi entrenador trate/ }).check()
  await v.page.getByRole('checkbox', { name: /herramienta de apoyo/ }).check()
  await v.page.getByRole('button', { name: 'Continuar' }).click()
  await preguntas(v.page, true)
  await v.page.getByRole('button', { name: 'Continuar' }).click()
  for (const radio of await v.page.getByRole('radio', { name: /No$/ }).all()) await radio.click()
  await v.page.getByRole('radio', { name: `${PARQ_QUESTIONS[1]} Sí` }).click() // dolor en el pecho al hacer actividad
  await v.page.getByRole('button', { name: 'Enviar solicitud' }).click()
  await expect(v.page.getByText('Tu solicitud necesita revisión personal del entrenador antes de programar.')).toBeVisible()
  await expect(v.page.getByText(/diagn|infarto|cardi/i)).toHaveCount(0) // no se diagnostica nada
  await v.cerrar()

  const lead = fake.rows('leads').find(l => l.name === 'Luis Pardo')!
  expect(lead.status).toBe('revisar')
  const sol = fake.rows('solicitudes_programacion').find(s => s.lead_id === lead.id)!
  expect(sol).toMatchObject({ parq_alarma: true, preparar_borrador: false, borrador_estado: 'sin_generar', propuesta: null })

  // El entrenador lo ve marcado como «a revisar», con el aviso en el detalle
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a contactos')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Solicitud de programación inicial · necesita tu revisión personal')).toBeVisible()
  await page.getByRole('button', { name: 'Ver solicitud' }).click()
  await expect(page.getByText(/señal de alarma/)).toBeVisible()
  await expect(page.getByText('No se prepara borrador por la señal de alarma.')).toBeVisible()
})

test('sin consentimiento de salud: no se piden ni se guardan las respuestas de salud ni el PAR-Q', async ({ browser, fake }) => {
  sembrar(fake)
  const v = await visitante(browser, fake)
  await contacto(v.page, 'Rosa Gil', 'rosa@example.com')
  await v.page.getByRole('button', { name: 'Continuar' }).click() // sin marcar nada
  await expect(v.page.getByLabel(/si has contestado que sí/i)).toHaveCount(0) // las preguntas de salud no se enseñan
  await preguntas(v.page, false)
  await v.page.getByRole('button', { name: 'Enviar solicitud' }).click() // sin PAR-Q: envía al terminar las preguntas
  await expect(v.page.getByText('Tu entrenador revisará tu solicitud y preparará una propuesta personalizada.')).toBeVisible()
  await v.cerrar()

  const lead = fake.rows('leads').find(l => l.name === 'Rosa Gil')!
  const sol = fake.rows('solicitudes_programacion').find(s => s.lead_id === lead.id)!
  expect(sol).toMatchObject({ consentimiento_salud: false, consentimiento_asistente: false, parq: null, parq_alarma: false, preparar_borrador: false })
  expect(Object.keys(sol.respuestas)).toEqual(expect.arrayContaining(['objetivo', 'experiencia', 'dias']))
  for (const k of ['molestias', 'molestias_detalle', 'rechaza', 'peso', 'altura', 'edad', 'fase', 'sueno', 'estres']) expect(sol.respuestas).not.toHaveProperty(k)
})

test('eliminar una solicitud no convertida la borra con todas sus respuestas', async ({ page, fake }) => {
  sembrar(fake)
  fake.seed('leads', { id: 'l-sol', trainer_id: ids.trainer, name: 'Pablo Sin', email: 'pablo@example.com', phone: null, message: 'Solicitud de programación inicial', status: 'nuevo', created_at: Date.now() - 3600_000, referred_by_client_id: null, origen: 'programacion', enlace_id: 'enl-1' })
  fake.seed('solicitudes_programacion', { lead_id: 'l-sol', trainer_id: ids.trainer, client_id: null, clave_envio: 'k1', consentimiento_salud: true, consentimiento_asistente: false, consentimiento_version: 'prog-2026-11', consentimiento_en: new Date().toISOString(), respuestas: { objetivo: 'Ganar fuerza' }, parq: [false, false, false, false, false, false, false], parq_alarma: false, preparar_borrador: false, borrador_estado: 'sin_generar', propuesta: null, razones: null, criterios_version: null, created_at: new Date().toISOString() })
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a contactos')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Eliminar solicitud de Pablo Sin' }).click()
  await page.getByRole('button', { name: /Confirmar eliminar solicitud de Pablo Sin/ }).click()
  await expect(page.getByText('Pablo Sin')).toHaveCount(0)
  expect(fake.rows('leads').some(l => l.id === 'l-sol')).toBe(false)
  expect(fake.rows('solicitudes_programacion')).toHaveLength(0)
})

test('los criterios para programación inicial se guardan solo en el perfil del entrenador, con versión', async ({ page, fake }) => {
  sembrar(fake, false)
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a ajustes')
  await page.keyboard.press('Enter')
  await page.getByLabel('Máximo de días por semana').fill('4')
  await page.getByLabel(/Límites clínicos/).fill('Dolor torácico o mareo con pérdida de conocimiento: parar y pedir revisión')
  await page.getByRole('button', { name: 'Guardar criterios' }).click()
  await expect.poll(() => fake.rows('entrenadores').find(e => e.uid === ids.trainer)!.profile?.criteriosProgramacion?.version).toBe(1)
  const c = fake.rows('entrenadores').find(e => e.uid === ids.trainer)!.profile.criteriosProgramacion
  expect(c).toMatchObject({ maxDias: '4', version: 1 })
  expect(c.limitesClinicos).toContain('parar y pedir revisión')
})
