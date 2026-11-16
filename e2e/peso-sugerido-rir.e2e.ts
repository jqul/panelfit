import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'

// El peso recomendado se decide por la desviación respecto al RIR que el entrenador fijó EN EL EJERCICIO (el que ve el
// cliente), y no solo por el RPE de la semana: antes podían llevarse la contraria.

const haceDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

/** Semana 2 en curso con Press banca a RIR 2-3 y RPE de semana @9 (que previsto sería RIR 1); la semana 1 ya hecha con 100 kg. */
function sembrar(fake: Parameters<typeof seedWorld>[0], rirLaSemanaPasada: number) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const plan = fake.rows('planes').find(p => p.clientId === ids.client)!.plan.P
  const s1 = JSON.parse(JSON.stringify(plan.weeks[0]))
  s1.isCurrent = false; s1.label = 'Semana 1'
  plan.weeks[0].label = 'Semana 2'; plan.weeks[0].rpe = '@9'
  plan.weeks = [s1, plan.weeks[0]]
  plan.fechaInicio = haceDias(7) // hoy cae en la semana 2
  plan.weeks.forEach((w: any) => { w.days[0].exercises[0].name = 'Press banca'; w.days[0].exercises[0].rir = '2-3' })
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    ex_w0_d0_r0: { done: true, dateDone: haceDias(7), sets: { 0: { weight: '100', reps: '5', rir: rirLaSemanaPasada }, 1: { weight: '100', reps: '5', rir: rirLaSemanaPasada }, 2: { weight: '100', reps: '5', rir: rirLaSemanaPasada } } },
  } })
}

test('con RIR 3 la semana pasada y el ejercicio pidiendo RIR 2-3, el peso recomendado se mantiene', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  sembrar(fake, 3) // dentro del RIR previsto (con el RPE @9 de la semana solo, habría sugerido subir)
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  await expect(page.getByText(/Recomendado hoy: 100\s?kg/)).toBeVisible()
  await expect(page.getByText(/Recomendado hoy: 100-105/)).toHaveCount(0)
})

test('con RIR 5 la semana pasada (más margen del previsto) se recomienda subir', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  sembrar(fake, 5)
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  await expect(page.getByText(/Recomendado hoy: 100-105\s?kg/)).toBeVisible()
})
