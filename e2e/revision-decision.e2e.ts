import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { Page } from '@playwright/test'

const haceDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

async function irAlDiario(page: Page) {
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Progreso/ }).first().click()
  await page.getByRole('button', { name: /Estancamiento/ }).click()
}

// Sentadilla cada semana: dos exposiciones a 100 kg antes de la decisión (hace 15 días) y tres a 105 kg después
function sembrar(fake: Parameters<typeof seedWorld>[0], diasPrevistos: number) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const plan = fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P
  plan.fechaInicio = haceDias(35)
  plan.calibracion = { confirmadaEl: haceDias(34) }
  plan.weeks = [0, 1, 2, 3, 4].map(i => ({ ...plan.weeks[0], label: `Semana ${i + 1}`, isCurrent: i === 4, isDeload: false, days: Array.from({ length: diasPrevistos }, () => plan.weeks[0].days[0]) }))
  plan.weeks.forEach((w: any) => { w.days[0].exercises[0].name = 'Sentadilla'; w.days[0].exercises[0].rir = '1-2' })
  const logs: Record<string, unknown> = {}
  ;[[28, '100', 3], [21, '100', 3], [14, '105', 2], [7, '105', 2], [0, '105', 2]].forEach(([d, kg, rir], i) => {
    logs[`ex_w${i}_d0_r0`] = { done: true, dateDone: haceDias(d as number), sets: { 0: { weight: kg, reps: '5', rir }, 1: { weight: kg, reps: '5', rir } } }
  })
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs })
  fake.seed('decisiones_entrenador', { id: 'dec-1', trainer_id: ids.trainer, client_id: ids.client, fecha: haceDias(15), ejercicio: 'Sentadilla', hipotesis: 'Demasiado volumen', tipo: 'bajar', intervencion: 'Quitar una serie', revisar_el: haceDias(1), revisada_el: null, resultado: null })
}

// Al llegar el plazo de una decisión de volumen, intensidad o descarga: «¿Qué pasó desde esta decisión?», solo descriptiva, y el cierre es del entrenador.
test('revisión de una decisión: línea de tiempo con evidencia descriptiva y cierre «Ajustar» sin tocar el plan', async ({ page, fake }) => {
  test.setTimeout(150_000)
  expect.configure({ timeout: 30_000 })
  sembrar(fake, 1)
  const planAntes = JSON.stringify(fake.rows('planes').find(r => r.clientId === ids.client)!.plan)
  await entrarComoEntrenador(page)
  await irAlDiario(page)

  const tarjeta = page.getByRole('region', { name: '¿Qué pasó desde esta decisión?' })
  await expect(tarjeta).toBeVisible()
  await expect(tarjeta).toContainText('Bajar (carga o volumen) · Sentadilla')
  await expect(tarjeta).toContainText('Motivo: Demasiado volumen')
  await expect(tarjeta).toContainText('Conclusión descriptiva:Mejoró')
  await expect(tarjeta.getByRole('list', { name: 'Rendimiento por ejercicio' })).toContainText('Sentadilla: 1RM estimado')
  await expect(tarjeta).toContainText('Sesiones realizadas: 2 antes y 3 después.')
  await expect(tarjeta).toContainText('Pendiente: la escribes tú al cerrar la revisión. No cambia ningún plan.')
  await expect(tarjeta).toContainText('no demuestra que la decisión lo causara')
  await expect(tarjeta).not.toContainText(/lo causó|gracias a/i)

  const diario = page.getByRole('region', { name: 'Diario de decisiones' })
  await diario.getByRole('button', { name: /Revisar la decisión/ }).click()
  await diario.getByRole('button', { name: 'Ajustar' }).click()
  const nota = diario.getByLabel('Tu conclusión: ¿qué pasó y qué haces con esto?')
  await expect(nota).toHaveValue('Ajustar: ') // el botón rápido deja el comienzo escrito
  await expect(diario.getByRole('button', { name: 'Ajustar' })).toHaveAttribute('aria-pressed', 'true')
  await nota.pressSequentially('sigo una semana más y miro el sueño')
  await diario.getByRole('button', { name: 'Guardar revisión' }).click()

  await expect(diario.getByText('Revisada')).toBeVisible()
  const fila = fake.rows('decisiones_entrenador')[0]
  expect(fila.resultado).toBe('Ajustar: sigo una semana más y miro el sueño')
  expect(fila.revisada_el).toBeTruthy()
  // Es memoria de coaching: el plan no se toca
  expect(JSON.stringify(fake.rows('planes').find(r => r.clientId === ids.client)!.plan)).toBe(planAntes)
  // Ya cerrada, la evidencia se puede volver a ver, con la conclusión del entrenador al final
  await diario.getByRole('button', { name: /Ver qué pasó desde la decisión/ }).click()
  await expect(page.getByRole('region', { name: '¿Qué pasó desde esta decisión?' })).toContainText('Ajustar: sigo una semana más')
})

test('revisión de una decisión: con poca adherencia el rendimiento no se interpreta y se explica por qué', async ({ page, fake }) => {
  test.setTimeout(150_000)
  expect.configure({ timeout: 30_000 })
  sembrar(fake, 3) // tres sesiones previstas por semana y solo una hecha
  await entrarComoEntrenador(page)
  await irAlDiario(page)

  const tarjeta = page.getByRole('region', { name: '¿Qué pasó desde esta decisión?' })
  await expect(tarjeta).toContainText('Conclusión descriptiva:Datos insuficientes')
  await expect(tarjeta).toContainText('El rendimiento y el RIR no se interpretan')
  await expect(tarjeta).toContainText('adherencia baja')
  await expect(tarjeta).toContainText('Menos sesiones o una ausencia no es lo mismo que más cansancio')
  await expect(tarjeta.getByRole('list', { name: 'Rendimiento por ejercicio' })).toHaveCount(0)
  await expect(tarjeta).toContainText('Qué falta para decir más')
})

test('una decisión que no es de volumen, intensidad ni descarga no lleva esta tarjeta', async ({ page, fake }) => {
  test.setTimeout(150_000)
  expect.configure({ timeout: 30_000 })
  sembrar(fake, 1)
  const fila = fake.rows('decisiones_entrenador')[0]
  fila.tipo = 'sustituir'; fila.hipotesis = 'Le molesta el codo'; fila.intervencion = 'Cambiar de variante'
  await entrarComoEntrenador(page)
  await irAlDiario(page)
  await expect(page.getByRole('region', { name: 'Diario de decisiones' }).getByText('Toca revisar')).toBeVisible()
  await expect(page.getByRole('region', { name: '¿Qué pasó desde esta decisión?' })).toHaveCount(0)
})
