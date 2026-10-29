import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'

const fecha = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const lunesQueViene = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 7); return d }
const mas = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return fecha(x) }

/** Un programa de una semana: el martes, 30 min de cardio; el jueves, una guía en PDF; el lunes, el entreno. */
function sembrar(fake: FakeSupabase) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('plan_templates', {
    id: 'tmpl-1', trainer_id: ids.trainer, name: 'Fuerza 5x3', description: '', created_at: 1, updated_at: 1, label_ids: [],
    plan: { type: 'Fuerza', weeks: [{ label: 'Semana 1', rpe: '', isCurrent: false, days: [{ title: 'Día 1', focus: '', exercises: [{ name: 'Sentadilla', sets: '3x5', weight: '', comment: '', isMain: true }] }] }] },
  })
  const tareas: Record<number, object[]> = {
    0: [{ id: 't1', type: 'workout', title: 'Fuerza 5x3', data: { templateId: 'tmpl-1', templateName: 'Fuerza 5x3' } }],
    1: [{ id: 't2', type: 'cardio', title: 'Correr', data: { cardioType: 'Correr', objective: '30 min suave' } }],
    3: [{ id: 't3', type: 'documento', title: 'Guía de movilidad', data: { url: 'https://example.com/guia.pdf' } }],
  }
  fake.seed('programs', {
    id: 'prog-1', trainer_id: ids.trainer, name: 'Bloque de fuerza', tipo: 'Fuerza', label_ids: [], created_at: 1, updated_at: 1,
    weeks: [{ label: 'Semana 1', days: Array.from({ length: 7 }, (_, i) => ({ tasks: tareas[i] || [] })) }],
  })
  // Una tarea puesta a mano: asignar un programa no la toca
  fake.seed('tareas_cliente', { id: 'a-mano', client_id: ids.client, titulo: 'Caminar', tipo: 'cardio', nota: '', enlace: '', fecha: mas(lunesQueViene(), 1), repetir: 'una', dias: [], hasta: null, origen: null })
}

test('al asignar un programa, su cardio y su documento llegan al cliente como tareas con fecha; deshacer las quita', async ({ page, fake }) => {
  sembrar(fake)
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Programas')
  await page.getByRole('option', { name: 'Ir a Programas' }).click()
  await page.getByRole('button', { name: 'Asignar', exact: true }).click()

  const hoja = page.getByRole('dialog', { name: 'Asignar a varios' })
  await hoja.getByText('María García').click()
  await hoja.getByRole('button', { name: 'El lunes que viene' }).click()
  await hoja.getByRole('button', { name: 'Asignar a 1 cliente' }).click()
  await expect(page.getByText(/Programa asignado a 1\/1 cliente/)).toBeVisible()

  const lunes = lunesQueViene()
  await expect.poll(() => fake.rows('tareas_cliente').filter(t => t.origen === 'programa:prog-1').length).toBe(2)
  const delPrograma = fake.rows('tareas_cliente').filter(t => t.origen === 'programa:prog-1').map(t => ({ titulo: t.titulo, tipo: t.tipo, fecha: t.fecha, enlace: t.enlace, nota: t.nota }))
  expect(delPrograma).toEqual([
    { titulo: 'Correr', tipo: 'cardio', fecha: mas(lunes, 1), enlace: '', nota: '30 min suave' },
    { titulo: 'Guía de movilidad', tipo: 'tarea', fecha: mas(lunes, 3), enlace: 'https://example.com/guia.pdf', nota: '' },
  ])
  expect(fake.rows('tareas_cliente').find(t => t.id === 'a-mano')).toBeTruthy()

  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByText(/Plan anterior restaurado/)).toBeVisible()
  expect(fake.rows('tareas_cliente').filter(t => t.origen === 'programa:prog-1')).toHaveLength(0)
  expect(fake.rows('tareas_cliente').find(t => t.id === 'a-mano')).toBeTruthy()
})
