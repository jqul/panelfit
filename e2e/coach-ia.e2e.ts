import type { Page } from '@playwright/test'
import { test, expect as expectBase } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'

// Coach IA beta: Claude (lanzado por el entrenador) deja un borrador «listo para revisar» en la solicitud; el entrenador lo lee, lo aprueba o
// lo descarta, y solo al convertir en cliente queda como BORRADOR de su plan (nunca publicado). Un caso con PAR-Q «sí», molestias o datos
// contradictorios dice «plan no generado; requiere revisión profesional» y no ofrece decidir nada. Las reglas de verdad (elegibilidad,
// paquete limitado, validación del plan, tope de casos) las prueba bloque44 con PGlite; aquí se prueba lo que ve y hace el entrenador.

test.setTimeout(120_000) // la primera carga compila los trozos diferidos
const expect = expectBase.configure({ timeout: 30_000 })

const PROPUESTA = {
  type: 'fuerza', restMain: 150, restAcc: 90, restWarn: 45, programName: 'Inicial 3 días',
  weeks: [{ label: 'Semana 1', rpe: '6', isCurrent: true, days: [{ title: 'Día 1', focus: 'Full-body', exercises: [
    { name: 'Sentadilla goblet', sets: '3x8', weight: '16 kg', isMain: true, comment: 'Técnica primero', rir: '3', tempo: '3-0-1-0' },
    { name: 'Remo con mancuerna', sets: '3x10', weight: '', isMain: false, comment: '', rir: '2' },
  ] }] }],
}

function sembrarCaso(fake: FakeSupabase, over: { status?: string; sol?: Record<string, unknown> } = {}) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('leads', {
    id: 'l-ia', trainer_id: ids.trainer, name: 'Adrián Gómez', email: 'adrian@example.com', phone: null, message: 'Solicitud de programación inicial',
    status: over.status ?? 'borrador_listo', created_at: Date.now() - 3600_000, referred_by_client_id: null, origen: 'programacion', enlace_id: null,
  })
  fake.seed('solicitudes_programacion', {
    lead_id: 'l-ia', trainer_id: ids.trainer, client_id: null, clave_envio: 'k-ia', consentimiento_salud: true, consentimiento_asistente: true,
    consentimiento_version: 'prog-2026-11-3', consentimiento_en: new Date().toISOString(), seguimiento_autorizado: false,
    respuestas: { objetivo: 'Ganar músculo', experiencia: 'De 6 meses a 2 años', dias: '3', duracion: '60-75 min', molestias: false, edad: 30, rutina_actual: 'Torso/pierna 4 días', rechaza: 'Nada de dominadas por el hombro' },
    parq: [false, false, false, false, false, false, false], parq_alarma: false, preparar_borrador: true,
    borrador_estado: 'listo_para_revisar', propuesta: PROPUESTA,
    razones: [{ decision: '3 días full-body', porque: 'Indicó 3 días y 60-75 min por sesión' }],
    criterios_version: '3', ia_leida_en: new Date().toISOString(), ia_campos: ['nombre', 'objetivo', 'rutina_actual', 'mayor_de_edad', 'criterios'],
    borrador_generado_en: new Date().toISOString(), borrador_decidido_en: null, created_at: new Date().toISOString(),
    ...over.sol,
  })
}

async function abrirSolicitud(page: Page, pestana: string) {
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a contactos')
  await page.keyboard.press('Enter')
  // Con borrador el contacto está en «Borrador listo», no en «Nuevos»
  await page.getByRole('tab', { name: new RegExp(`^${pestana}`) }).click()
  await page.getByRole('button', { name: 'Ver solicitud' }).click()
  return page.getByRole('region', { name: 'Detalle de la solicitud' })
}

test('un borrador listo se lee con sus razones y su trazabilidad, se aprueba y al convertir en cliente queda como BORRADOR del plan', async ({ page, fake }) => {
  sembrarCaso(fake)
  const detalle = await abrirSolicitud(page, 'Borrador listo')
  const caso = detalle.getByRole('group', { name: 'Coach IA: borrador de programa' })
  await expect(caso.getByText('Estado:')).toContainText('Listo para revisar')
  await expect(caso.getByText('Estado:')).toContainText('criterios v3')
  await expect(caso.getByText(/3 días full-body/)).toBeVisible()
  await expect(caso.getByText(/Indicó 3 días y 60-75 min/)).toBeVisible()
  // La propuesta, legible antes de decidir
  await caso.getByText(/Ver la propuesta \(1 semana, 2 ejercicios\)/).click()
  await expect(caso.getByText('Sentadilla goblet · 3x8 · 16 kg · RIR 3')).toBeVisible()
  await expect(caso.getByText('Remo con mancuerna · 3x10 · RIR 2')).toBeVisible()
  // Qué se le entregó a quien la preparó: sin el cuestionario de salud
  await expect(caso.getByText(/Datos entregados al prepararlo: nombre de pila, objetivo, rutina actual, que es mayor de edad \(no su edad\), tus criterios/)).toBeVisible()
  await expect(caso.getByText(/Ninguna respuesta de salud \(ni molestias, peso, altura, edad, sueño o estrés, ni lo que quiere evitar\)/)).toBeVisible()
  // Lo que dijo evitar NO se le entregó a quien preparó el borrador: se le recuerda al entrenador para que lo contraste él
  await expect(caso.getByText(/Revisa la propuesta contra esto, que quien la preparó no ha visto/)).toBeVisible()
  await expect(caso.getByText(/Nada de dominadas por el hombro/)).toBeVisible()

  // Aprobar
  await caso.getByRole('button', { name: 'Aprobar borrador' }).click()
  await expect(caso.getByText(/Aprobado el .* quedará como borrador de su plan; lo activas tú/)).toBeVisible()
  await expect.poll(() => fake.rows('solicitudes_programacion').find(s => s.lead_id === 'l-ia')!.borrador_estado).toBe('aprobado')
  expect(fake.rows('solicitudes_programacion').find(s => s.lead_id === 'l-ia')!.borrador_decidido_en).not.toBeNull()
  await expect(caso.getByRole('button', { name: 'Aprobar borrador' })).toHaveCount(0)

  // Convertir en cliente: la propuesta aprobada queda como BORRADOR del plan; el plan publicado no cambia
  await page.getByRole('button', { name: 'Convertir en cliente' }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Crear cliente' }).click()
  await expect.poll(() => fake.rows('clientes').some(c => c.name === 'Adrián')).toBe(true)
  const cliente = fake.rows('clientes').find(c => c.name === 'Adrián')!
  await expect.poll(() => fake.rows('planes').find(p => p.clientId === cliente.id)?.plan_borrador?.P?.weeks?.length).toBe(1)
  const plan = fake.rows('planes').find(p => p.clientId === cliente.id)!
  expect(plan).toMatchObject({ borrador_activo: true })
  expect(plan.plan_borrador.P).toMatchObject({ clientId: cliente.id, programName: 'Inicial 3 días' })
  expect(plan.plan?.P?.weeks ?? []).toHaveLength(0) // nada publicado: lo activa el entrenador con el flujo de siempre
  // Lo de salud no pasa a la ficha
  expect(JSON.stringify(cliente)).not.toMatch(/Ganar músculo|PAR-Q|molestias/i)
})

test('descartar un borrador no conserva la propuesta y el caso se puede preparar de nuevo', async ({ page, fake }) => {
  sembrarCaso(fake)
  const detalle = await abrirSolicitud(page, 'Borrador listo')
  const caso = detalle.getByRole('group', { name: 'Coach IA: borrador de programa' })
  await caso.getByRole('button', { name: 'Descartar borrador' }).click()
  await expect(caso.getByText('Estado:')).toContainText('Descartado')
  await expect(caso.getByText(/Caso apto para preparar/)).toBeVisible()
  await expect(caso.getByText(/Ver la propuesta/)).toHaveCount(0)
  const sol = fake.rows('solicitudes_programacion').find(s => s.lead_id === 'l-ia')!
  expect(sol).toMatchObject({ borrador_estado: 'descartado', propuesta: null, razones: null })
  expect(fake.rows('leads').find(l => l.id === 'l-ia')!.status).toBe('nuevo')
})

test('un caso con un «sí» en el PAR-Q dice «plan no generado; requiere revisión profesional» y no ofrece decidir nada', async ({ page, fake }) => {
  sembrarCaso(fake, {
    status: 'nuevo',
    sol: { parq: [false, false, false, false, true, false, false], borrador_estado: 'sin_generar', propuesta: null, razones: null, criterios_version: null, ia_campos: null, borrador_generado_en: null },
  })
  const detalle = await abrirSolicitud(page, 'Nuevos')
  const caso = detalle.getByRole('group', { name: 'Coach IA: borrador de programa' })
  await expect(caso.getByText(/Plan no generado: requiere revisión profesional/)).toBeVisible()
  await expect(caso.getByText(/contestó «sí» en alguna pregunta del cuestionario de salud/)).toBeVisible()
  await expect(caso.getByRole('button', { name: /Aprobar borrador|Descartar borrador/ })).toHaveCount(0)
  await expect(caso.getByText(/abre Claude/)).toHaveCount(0)
})

test('un caso apto sin borrador dice qué se le entrega a quien lo prepara', async ({ page, fake }) => {
  sembrarCaso(fake, {
    status: 'nuevo',
    sol: { borrador_estado: 'sin_generar', propuesta: null, razones: null, criterios_version: null, ia_campos: null, borrador_generado_en: null },
  })
  const detalle = await abrirSolicitud(page, 'Nuevos')
  const caso = detalle.getByRole('group', { name: 'Coach IA: borrador de programa' })
  await expect(caso.getByText('Estado:')).toContainText('Sin generar')
  await expect(caso.getByText(/Caso apto para preparar: abre Claude y lanza la tarea de Coach IA/)).toBeVisible()
  await expect(caso.getByText(/ninguna respuesta de salud ni el cuestionario de salud/)).toBeVisible()
  await expect(caso.getByRole('button', { name: /Aprobar borrador|Descartar borrador/ })).toHaveCount(0)
})
