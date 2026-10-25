import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, entrarComoEntrenador } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'
import type { Page } from '@playwright/test'

const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const CLAVE = 'ex_w0_d0_r0' // "Press banca", el primer ejercicio del plan de prueba

const logsDelServidor = (fake: FakeSupabase) =>
  (fake.rows('registros').find(r => r.clientId === ids.client)?.logs ?? {}) as Record<string, any>
const ejercicioDelPlan = (fake: FakeSupabase) =>
  fake.rows('planes').find(p => p.clientId === ids.client)!.plan.P.weeks[0].days[0].exercises[0]

const BIBLIOTECA = [
  ['b1', 'Press banca con barra', 'Pecho'], ['b2', 'Press banca con mancuernas', 'Pecho'], ['b3', 'Chest press en máquina', 'Pecho'],
  ['b4', 'Flexiones', 'Pecho'], ['b5', 'Remo con mancuerna', 'Espalda'], ['b6', 'Sentadilla', 'Piernas'],
]

/** Cliente con cuenta, su plan, y la biblioteca de su entrenador. `planB` se añade al primer ejercicio. */
function sembrar(fake: FakeSupabase, ejercicio: Record<string, unknown> = {}) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  for (const [id, name, category] of BIBLIOTECA) fake.seed('exercise_library', { id, trainer_id: ids.trainer, name, category, deleted_at: null })
  Object.assign(ejercicioDelPlan(fake), ejercicio)
}

async function abrirPanelDeSustitucion(page: Page) {
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  await page.getByRole('button', { name: /^Más: historial/ }).click()
  await page.getByRole('button', { name: '¿No puedes hacerlo?', exact: true }).click()
  return page.getByRole('group', { name: '¿No puedes hacerlo?' })
}

test('material ocupado: solo se ofrece el plan B del entrenador, no la biblioteca, y queda aprobado', async ({ page, fake }) => {
  sembrar(fake, { alternativas: [{ name: 'Press banca con mancuernas' }, { name: 'Chest press en máquina' }] })
  const panel = await abrirPanelDeSustitucion(page)

  await panel.getByRole('button', { name: 'Material ocupado' }).click()
  await expect(panel.getByRole('button', { name: /Press banca con mancuernas/ })).toBeVisible()
  await expect(panel.getByRole('button', { name: /Chest press en máquina/ })).toBeVisible()
  await expect(panel.getByText('de tu entrenador')).toHaveCount(2)
  await expect(panel.getByRole('button', { name: /Flexiones|Remo con mancuerna|Sentadilla/ })).toHaveCount(0) // el resto de la biblioteca no se enseña

  await panel.getByRole('button', { name: /Press banca con mancuernas/ }).click()
  await expect(page.getByRole('button', { name: 'Volver a «Press banca»' })).toBeVisible()

  // Al entrenador le llega con el motivo y aprobado de antemano; la receta del plan no cambia y el nombre sigue en el campo de siempre
  await expect.poll(() => logsDelServidor(fake)[CLAVE]?.sustitucion).toMatchObject({
    performedName: 'Press banca con mancuernas', performedExerciseId: 'b2', reason: 'material', approvedBy: 'entrenador', fecha: hoy(),
  })
  expect(logsDelServidor(fake)[CLAVE].substituteName).toBe('Press banca con mancuernas')
  expect(ejercicioDelPlan(fake).name).toBe('Press banca')
})

test('sin plan B se sugiere lo más parecido del mismo grupo; escribir otro ejercicio queda pendiente de revisar', async ({ page, fake }) => {
  sembrar(fake)
  const panel = await abrirPanelDeSustitucion(page)

  await panel.getByRole('button', { name: 'Material ocupado' }).click()
  await expect(panel.getByRole('button', { name: /Press banca con barra|Press banca con mancuernas/ }).first()).toBeVisible()
  await expect(panel.getByRole('button', { name: /Sentadilla|Remo con mancuerna/ })).toHaveCount(0) // otro grupo muscular

  // La búsqueda libre es lo último, no lo primero
  await panel.getByRole('button', { name: 'No encuentro una alternativa' }).click()
  await panel.getByLabel('Buscar ejercicio sustituto').fill('Press de pecho en polea')
  await panel.getByRole('button', { name: 'Usar lo escrito' }).click()

  await expect.poll(() => logsDelServidor(fake)[CLAVE]?.sustitucion).toMatchObject({
    performedName: 'Press de pecho en polea', reason: 'material', approvedBy: 'pendiente',
  })
})

test('me molesta con dolor fuerte: recomienda parar y avisa, sin cambiar de ejercicio', async ({ page, fake }) => {
  sembrar(fake, { alternativas: [{ name: 'Flexiones' }] })
  const panel = await abrirPanelDeSustitucion(page)

  await panel.getByRole('button', { name: 'Me molesta' }).click()
  await panel.getByRole('button', { name: 'Hombro' }).click()
  await panel.getByRole('button', { name: 'Intensidad 8 de 10' }).click()
  await expect(panel.getByText(/Para este ejercicio/)).toBeVisible()
  await expect(panel.getByRole('button', { name: /Flexiones/ })).toHaveCount(0) // con dolor fuerte no se propone nada

  await panel.getByRole('button', { name: 'Avisar a mi entrenador' }).click()
  await expect(panel.getByRole('button', { name: 'Avisado ✓' })).toBeVisible()
  await expect.poll(() => fake.rows('registros_dolor').length).toBe(1)
  expect(fake.rows('registros_dolor')[0]).toMatchObject({ clientId: ids.client, zona: 'Hombro', intensidad: 8, tipo: 'articular' })
  expect(logsDelServidor(fake)[CLAVE]?.substituteName).toBeUndefined() // no se cambió nada
})

test('me molesta leve: solo alternativas que no cargan la zona; si el entrenador lo prohíbe, solo avisa', async ({ page, fake }) => {
  sembrar(fake, { alternativas: [{ name: 'Press banca con mancuernas' }, { name: 'Flexiones' }] })
  const panel = await abrirPanelDeSustitucion(page)

  await panel.getByRole('button', { name: 'Me molesta' }).click()
  await panel.getByRole('button', { name: 'Hombro' }).click()
  await panel.getByRole('button', { name: 'Intensidad 3 de 10' }).click()
  await expect(panel.getByText('Alternativas seguras para hoy')).toBeVisible()
  await expect(panel.getByRole('button', { name: /Press banca con mancuernas/ })).toHaveCount(0) // todo "press" carga el hombro
  await panel.getByRole('button', { name: /Flexiones/ }).click() // (en el plan B del entrenador, y no es un press)
  await expect.poll(() => logsDelServidor(fake)[CLAVE]?.sustitucion).toMatchObject({ performedName: 'Flexiones', reason: 'dolor', approvedBy: 'entrenador', zona: 'Hombro', intensidad: 3 })
  await expect.poll(() => fake.rows('registros_dolor').length).toBe(1)
})

test('con "no sustituir por dolor" el cliente solo puede avisar', async ({ page, fake }) => {
  sembrar(fake, { dolorSinSustituir: true, alternativas: [{ name: 'Flexiones' }] })
  const panel = await abrirPanelDeSustitucion(page)

  await panel.getByRole('button', { name: 'Me molesta' }).click()
  await panel.getByRole('button', { name: 'Codo' }).click()
  await panel.getByRole('button', { name: 'Intensidad 2 de 10' }).click()
  await expect(panel.getByText(/prefiere que no cambies este ejercicio/)).toBeVisible()
  await expect(panel.getByRole('button', { name: /Flexiones/ })).toHaveCount(0)
})

test('no lo entiendo: ve las indicaciones y puede preguntar al entrenador, que lo recibe en su cola', async ({ page, fake }) => {
  sembrar(fake, { comment: 'Escápulas juntas y baja controlado' })
  const panel = await abrirPanelDeSustitucion(page)

  await panel.getByRole('button', { name: 'No lo entiendo' }).click()
  await expect(panel.getByText(/Escápulas juntas y baja controlado/)).toBeVisible()
  await panel.getByRole('button', { name: 'Preguntar a mi entrenador' }).click()
  await expect(panel.getByRole('button', { name: /Preguntado ✓/ })).toBeVisible()
  await expect.poll(() => logsDelServidor(fake)[CLAVE]?.duda).toMatch(/^\d{4}-\d{2}-\d{2}T/)
})

test('el entrenador ve la sustitución en su cola y la acepta como alternativa habitual', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('registros', {
    clientId: ids.client, updatedAt: 1,
    logs: { [CLAVE]: {
      done: true, dateDone: hoy(), sets: { 0: { weight: '20', reps: '10' }, 1: { weight: '20', reps: '10' }, 2: { weight: '22,5', reps: '10' } },
      substituteName: 'Press con mancuernas',
      sustitucion: { performedName: 'Press con mancuernas', reason: 'material', approvedBy: 'pendiente', fecha: hoy() },
    } },
  })
  const versionAntes = fake.rows('planes').find(p => p.clientId === ids.client)!.updatedAt

  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /^Bandeja/ }).first().click()
  // (el texto sale en el resumen de la fila y en la tarjeta con el botón: basta con que esté en pantalla)
  await expect(page.getByText(/María cambió «Press banca» por «Press con mancuernas» · material ocupado · 3×10 con 22,5 kg/).last()).toBeVisible()

  await page.getByRole('button', { name: /Aceptar Press con mancuernas como alternativa habitual/ }).click()
  await expect(page.getByText(/ya es una alternativa habitual de «Press banca»/)).toBeVisible()
  await expect(page.getByText(/María cambió «Press banca»/)).toHaveCount(0)

  // Queda en el plan B del ejercicio (en el plan que ve el cliente) y la versión del plan sube
  expect(ejercicioDelPlan(fake).alternativas).toEqual([{ name: 'Press con mancuernas' }])
  expect(fake.rows('planes').find(p => p.clientId === ids.client)!.updatedAt).toBeGreaterThan(versionAntes)
})

test('una sustitución que ya estaba en el plan B no pide decidir nada', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  Object.assign(ejercicioDelPlan(fake), { alternativas: [{ name: 'Press con mancuernas' }] })
  fake.seed('registros', {
    clientId: ids.client, updatedAt: 1,
    logs: { [CLAVE]: { done: true, dateDone: hoy(), sets: { 0: { weight: '20', reps: '10' } }, substituteName: 'Press con mancuernas',
      sustitucion: { performedName: 'Press con mancuernas', reason: 'material', approvedBy: 'entrenador', fecha: hoy() } } },
  })
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /^Bandeja/ }).first().click()
  await expect(page.getByRole('button', { name: /Aceptar .* como alternativa habitual/ })).toHaveCount(0)
})
