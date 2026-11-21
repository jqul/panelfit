import { test, expect as expectBase } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'

// Coach IA beta en «Decisión de hoy»: el aviso de que hay un borrador por revisar, un caso apto por preparar o un caso que requiere revisión
// profesional, SOLO para las cuentas habilitadas (lo decide la base de datos: `coach_ia_resumen`). Cada fila lleva a la solicitud, en la pestaña
// de Contactos donde está y con su detalle desplegado. La elegibilidad y el resumen los prueba bloque44 (secciones 8 y 9) con PGlite.

test.setTimeout(150_000) // la primera carga compila los trozos diferidos
const expect = expectBase.configure({ timeout: 30_000 })

const dia = (atras: number) => { const d = new Date(); d.setDate(d.getDate() - atras); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const PARQ_LIMPIO = [false, false, false, false, false, false, false]
const PROPUESTA = { type: 'fuerza', restMain: 150, restAcc: 90, restWarn: 45, programName: 'Inicial 3 días', weeks: [{ label: 'Semana 1', rpe: '6', isCurrent: true, days: [{ title: 'Día 1', focus: 'Full-body', exercises: [{ name: 'Sentadilla goblet', sets: '3x8', weight: '', isMain: true, comment: '', rir: '3' }] }] }] }

// El plan del cliente empieza hoy: sin semanas completas no hay adherencia y nada más entra en la lista por sí solo
function sembrar(fake: FakeSupabase, over: { habilitado?: boolean; status?: string; sol?: Record<string, unknown> } = {}) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P.fechaInicio = dia(0)
  if (over.habilitado !== false) fake.seed('coach_ia_habilitados', { trainer_id: ids.trainer })
  fake.seed('leads', {
    id: 'l-ia', trainer_id: ids.trainer, name: 'Adrián Gómez', email: 'adrian@example.com', phone: null, message: 'Solicitud de programación inicial',
    status: over.status ?? 'nuevo', created_at: Date.now() - 2 * 86_400_000 - 3600_000, referred_by_client_id: null, origen: 'programacion', enlace_id: null,
  })
  fake.seed('solicitudes_programacion', {
    lead_id: 'l-ia', trainer_id: ids.trainer, client_id: null, clave_envio: 'k-ia', consentimiento_salud: true, consentimiento_asistente: true,
    consentimiento_version: 'prog-2026-11-3', consentimiento_en: new Date().toISOString(), seguimiento_autorizado: false,
    respuestas: { objetivo: 'Ganar músculo', experiencia: 'De 6 meses a 2 años', dias: '3', duracion: '60-75 min', molestias: false, edad: 30 },
    parq: PARQ_LIMPIO, parq_alarma: false, preparar_borrador: true, borrador_estado: 'sin_generar', propuesta: null, razones: null, criterios_version: null,
    ia_leida_en: null, ia_campos: null, borrador_generado_en: null, borrador_decidido_en: null, created_at: new Date(Date.now() - 2 * 86_400_000 - 3600_000).toISOString(),
    ...over.sol,
  })
}

test('un borrador listo avisa en Decisión de hoy y el botón abre la solicitud en «Borrador listo», con su detalle desplegado', async ({ page, fake }) => {
  sembrar(fake, {
    status: 'borrador_listo',
    sol: { borrador_estado: 'listo_para_revisar', propuesta: PROPUESTA, razones: [{ decision: '3 días full-body', porque: 'Indicó 3 días' }], criterios_version: '3', borrador_generado_en: new Date(Date.now() - 86_400_000 - 3600_000).toISOString() },
  })
  const planAntes = JSON.stringify(fake.rows('planes').find(r => r.clientId === ids.client)!.plan)
  await entrarComoEntrenador(page)
  const seccion = page.getByRole('region', { name: 'Decisión de hoy' })
  const filas = seccion.getByRole('listitem')
  await expect(filas).toHaveCount(1)
  await expect(filas.nth(0)).toContainText('Adrián Gómez')
  await expect(filas.nth(0)).toContainText('Revisar el borrador de programa que dejó Coach IA')
  await expect(filas.nth(0)).toContainText('Quedó listo (lleva 1 día)')
  await expect(filas.nth(0)).toContainText('la persona no ha recibido nada')

  await seccion.getByRole('button', { name: 'Abrir el borrador' }).click()
  // Contactos, en la pestaña donde está la solicitud (no en «Nuevos»), con su detalle abierto y los botones para decidir
  await expect(page.getByRole('tab', { name: /^Borrador listo/ })).toHaveAttribute('aria-selected', 'true')
  const detalle = page.getByRole('region', { name: 'Detalle de la solicitud' })
  await expect(detalle.getByRole('button', { name: 'Aprobar borrador' })).toBeVisible()
  expect(JSON.stringify(fake.rows('planes').find(r => r.clientId === ids.client)!.plan)).toBe(planAntes) // la lista no toca ningún plan
})

test('un borrador aprobado sin convertir sigue avisando: falta convertirla en cliente', async ({ page, fake }) => {
  sembrar(fake, { status: 'borrador_listo', sol: { borrador_estado: 'aprobado', propuesta: PROPUESTA, razones: [{ decision: 'a', porque: 'b' }], criterios_version: '3', borrador_decidido_en: new Date().toISOString() } })
  await entrarComoEntrenador(page)
  const fila = page.getByRole('region', { name: 'Decisión de hoy' }).getByRole('listitem')
  await expect(fila).toHaveCount(1)
  await expect(fila).toContainText('Convertirla en cliente para dejar su borrador aprobado en su plan')
  await expect(fila).toContainText('quedará como borrador, sin publicar')
})

test('un caso apto sin borrador avisa («Caso listo») junto a la fila de contestar la solicitud, y el botón abre su detalle', async ({ page, fake }) => {
  sembrar(fake)
  await entrarComoEntrenador(page)
  const seccion = page.getByRole('region', { name: 'Decisión de hoy' })
  const filas = seccion.getByRole('listitem')
  await expect(filas).toHaveCount(2)
  await expect(filas.filter({ hasText: 'Contestar la solicitud de programación' })).toHaveCount(1)
  const ia = filas.filter({ hasText: 'Preparar su borrador con Coach IA' })
  await expect(ia).toHaveCount(1)
  await expect(ia).toContainText('apto para prepararse sin revisión profesional previa (lleva 2 días)')
  await ia.getByRole('button', { name: 'Abrir la solicitud' }).click()
  const detalle = page.getByRole('region', { name: 'Detalle de la solicitud' })
  await expect(detalle.getByText(/Caso apto para preparar: abre Claude y lanza la tarea de Coach IA/)).toBeVisible()
})

test('un «sí» del PAR-Q (sin alarma) o molestias: «requiere revisión profesional», para atender y por delante de lo demás; no se prepara', async ({ page, fake }) => {
  sembrar(fake, { sol: { parq: [false, false, false, false, true, false, false] } })
  await entrarComoEntrenador(page)
  const seccion = page.getByRole('region', { name: 'Decisión de hoy' })
  const filas = seccion.getByRole('listitem')
  await expect(filas).toHaveCount(2)
  await expect(filas.nth(0)).toContainText('Revisar tú la solicitud: Coach IA no prepara este caso')
  await expect(filas.nth(0)).toContainText('Necesita revisión profesional antes de programar nada; no se genera plan')
  await expect(filas.nth(0).getByRole('img', { name: 'Atender' })).toBeVisible()
  await expect(seccion.getByText('Preparar su borrador con Coach IA')).toHaveCount(0)
  await filas.nth(0).getByRole('button', { name: 'Abrir la solicitud' }).click()
  await expect(page.getByRole('region', { name: 'Detalle de la solicitud' }).getByText(/Plan no generado: requiere revisión profesional/)).toBeVisible()
})

test('la alarma del PAR-Q no repite fila: solo la de «revisión personal» de siempre', async ({ page, fake }) => {
  sembrar(fake, { status: 'revisar', sol: { parq: [false, true, false, false, false, false, false], parq_alarma: true, preparar_borrador: false } })
  await entrarComoEntrenador(page)
  const filas = page.getByRole('region', { name: 'Decisión de hoy' }).getByRole('listitem')
  await expect(filas).toHaveCount(1)
  await expect(filas.nth(0)).toContainText('Revisar tú la solicitud antes de programar nada')
})

test('una cuenta SIN Coach IA habilitado no ve nada de Coach IA: ni filas ni bloque en el detalle', async ({ page, fake }) => {
  sembrar(fake, { habilitado: false, sol: { parq: [false, false, false, false, true, false, false] } })
  await entrarComoEntrenador(page)
  const seccion = page.getByRole('region', { name: 'Decisión de hoy' })
  const filas = seccion.getByRole('listitem')
  await expect(filas).toHaveCount(1) // solo «contestar la solicitud», como siempre
  await expect(filas.nth(0)).toContainText('Contestar la solicitud de programación')
  await expect(seccion.getByText(/Coach IA/)).toHaveCount(0)
  await filas.nth(0).getByRole('button', { name: 'Abrir la solicitud' }).click()
  await page.getByRole('button', { name: 'Ver solicitud' }).click()
  await expect(page.getByRole('region', { name: 'Detalle de la solicitud' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Coach IA: borrador de programa' })).toHaveCount(0)
})
