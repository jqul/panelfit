import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const dia = (atras: number) => { const d = new Date(); d.setDate(d.getDate() - atras); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const solicitud = (id: string, nombre: string, status: string, horas: number) =>
  ({ id, trainer_id: ids.trainer, name: nombre, email: `${id}@example.com`, phone: null, message: null, status, created_at: Date.now() - horas * 3600_000, referred_by_client_id: null, origen: 'programacion', aviso_push: null })

// El plan de María empieza hoy: sin semanas completas no hay adherencia que valorar y nada más entra en la lista por sí solo
function sembrar(fake: Parameters<typeof seedWorld>[0]) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P.fechaInicio = dia(0)
}

// «Decisión de hoy»: en el Resumen, lo que conviene mirar hoy, con quién, qué necesita, por qué ahora y un botón a la pantalla donde se decide.
test('sin nada que mirar dice que nada pide atención y no enseña filas', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  sembrar(fake)
  await entrarComoEntrenador(page)
  const seccion = page.getByRole('region', { name: 'Decisión de hoy' })
  await expect(seccion).toContainText('Nada pide tu atención hoy')
  await expect(seccion.getByRole('listitem')).toHaveCount(0)
})

test('solicitud con revisión personal, molestia y decisión vencida: ordenadas, explicadas y cada botón abre su pantalla sin tocar el plan', async ({ page, fake }) => {
  test.setTimeout(150_000)
  expect.configure({ timeout: 30_000 })
  sembrar(fake)
  fake.seed('leads', solicitud('l-rev', 'Lucas Solicitud', 'revisar', 50))
  fake.seed('registros_dolor', { id: 'd1', clientId: ids.client, date: dia(1), zona: 'Rodilla', intensidad: 8, tipo: 'articular', created_at: 1 })
  fake.seed('decisiones_entrenador', { id: 'dec-1', trainer_id: ids.trainer, client_id: ids.client, fecha: dia(20), ejercicio: 'Sentadilla', hipotesis: 'Mucho volumen', tipo: 'bajar', intervencion: 'Quitar una serie', revisar_el: dia(1), revisada_el: null, resultado: null })
  const planAntes = JSON.stringify(fake.rows('planes').find(r => r.clientId === ids.client)!.plan)
  await entrarComoEntrenador(page)

  const seccion = page.getByRole('region', { name: 'Decisión de hoy' })
  const filas = seccion.getByRole('listitem')
  await expect(filas).toHaveCount(3)
  // Orden: primero la solicitud que pide revisión personal, luego la molestia fuerte, luego la decisión vencida
  await expect(filas.nth(0)).toContainText('Lucas Solicitud')
  await expect(filas.nth(0)).toContainText('Revisar tú la solicitud antes de programar nada')
  await expect(filas.nth(0)).toContainText('Lleva 2 días sin contestar')
  await expect(filas.nth(1)).toContainText('María García')
  await expect(filas.nth(1)).toContainText('Mirar la molestia de rodilla')
  await expect(filas.nth(1)).toContainText('Por qué ahora: Ha registrado 8/10')
  await expect(filas.nth(2)).toContainText('Revisar una decisión anotada')
  await expect(seccion).toContainText('2 para atender · 1 para revisar')
  await expect(seccion).toContainText('No cambia ningún plan')
  await expect(seccion).not.toContainText(/toca descarga|deberías|baja la carga/i)

  // La molestia lleva a Progreso, ya en la sección de dolor
  await seccion.getByRole('button', { name: 'Abrir su registro de dolor: María García' }).click()
  await expect(page.getByText('Progreso de María')).toBeVisible()
  await expect(page.getByRole('button', { name: /Dolor/ }).first()).toHaveClass(/bg-ink/)

  // Y el plan no se ha tocado
  expect(JSON.stringify(fake.rows('planes').find(r => r.clientId === ids.client)!.plan)).toBe(planAntes)
})

test('la solicitud lleva a Contactos', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  sembrar(fake)
  fake.seed('leads', solicitud('l-nueva', 'Nora Nueva', 'nuevo', 2))
  await entrarComoEntrenador(page)
  const seccion = page.getByRole('region', { name: 'Decisión de hoy' })
  await expect(seccion.getByRole('listitem')).toHaveCount(1)
  await expect(seccion.getByRole('listitem').first()).toContainText('Acaba de llegar')
  await seccion.getByRole('button', { name: 'Abrir la solicitud: Nora Nueva' }).click()
  await expect(page.getByRole('heading', { name: /Contactos/ }).first()).toBeVisible()
})
