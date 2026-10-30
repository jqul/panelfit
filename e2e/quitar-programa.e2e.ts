import { test, expect } from './support/test'
import { seedWorld, samplePlan, ids } from './support/seed'
import { entrarComoEntrenador, abrirFichaDelCliente } from './support/flows'

const fecha = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const enDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return fecha(d) }

const tarea = (id: string, titulo: string, f: string, origen: string | null) =>
  ({ id, client_id: ids.client, titulo, tipo: 'cardio', nota: '', enlace: '', fecha: f, repetir: 'none', dias: [], hasta: null, origen, created_at: 1 })

test('quitar un programa conserva el plan y lo ya hecho, y quita solo las tareas por venir sin hacer', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.rows('planes').find(r => r.clientId === ids.client)!.plan = { P: { ...samplePlan(), programId: 'prog-1', programName: 'Bloque de fuerza' } }
  fake.seed('tareas_cliente', tarea('t-futura', 'Cardio futuro', enDias(3), 'programa:prog-1'))
  fake.seed('tareas_cliente', tarea('t-hecha', 'Cardio hecho', enDias(4), 'programa:prog-1'))
  fake.seed('tareas_cliente', tarea('t-pasada', 'Cardio pasado', enDias(-3), 'programa:prog-1'))
  fake.seed('tareas_cliente', tarea('t-propia', 'Movilidad del entrenador', enDias(5), null))
  fake.seed('tareas_hechas', { tarea_id: 't-hecha', client_id: ids.client, fecha: enDias(4) })

  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)
  await page.getByRole('button', { name: 'Abrir menú' }).click()
  await page.getByRole('button', { name: /^Plan/ }).first().click()

  await expect(page.getByText('Bloque de fuerza')).toBeVisible()
  await page.getByRole('button', { name: 'Quitar', exact: true }).click()

  await expect(page.getByText('Sin programa asignado')).toBeVisible()
  await expect(page.getByText(/quitado: el plan y lo ya hecho se conservan/)).toBeVisible()
  const plan = () => fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P // se guarda con el autoguardado
  await expect.poll(() => plan().programId).toBeUndefined()
  expect(plan().weeks.length).toBe(samplePlan().weeks.length) // el plan sigue entero
  await expect.poll(() => fake.rows('tareas_cliente').map(t => t.id).sort()).toEqual(['t-hecha', 't-pasada', 't-propia'])
})
