import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const dos = (n: number) => String(n).padStart(2, '0')
const fecha = (d: Date) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
// Lunes de la semana pasada y los días siguientes, para que los datos caigan en una misma semana natural
const lunesPasado = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7); return d }
const mas = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return fecha(x) }

function sembrar(fake: Parameters<typeof seedWorld>[0]) {
  seedWorld(fake)
  const lunes = lunesPasado()
  // Un hábito de sueño con meta en horas y tres días apuntados esa semana: 7, 5 y 6 h
  fake.seed('habitos', { id: 'h-sueno', clientId: ids.client, text: 'Dormir', sub: '', order: 1, meta: 7, unidad: 'h' })
  fake.seed('habitos', { id: 'h-casilla', clientId: ids.client, text: 'Beber agua', sub: '', order: 2, meta: null, unidad: null }) // casilla sí/no: no sale
  ;[7, 5, 6].forEach((h, i) => fake.seed('registros_habitos', { clientId: ids.client, date: mas(lunes, i), completedHabitIds: [], valores: { 'h-sueno': h } }))
  // Dos entrenos del reloj: 40 min corriendo (6 km) y 60 min en bici (25 km), y uno de fuerza que no es cardio
  const act = (id: string, dias: number, deporte: string, duracion_s: number, distancia_m: number | null) =>
    fake.seed('actividades', { id, client_id: ids.client, fecha: mas(lunes, dias), inicio: null, deporte, nombre: deporte, duracion_s, distancia_m, desnivel_m: null, fc_media: null, fc_max: null, kcal: null })
  act('a1', 1, 'correr', 2400, 6000); act('a2', 3, 'bici', 3600, 25000); act('a3', 2, 'fuerza', 3000, null)
  // Una sesión de fuerza esa semana con dos series a RPE 8
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    ex_w0_d0_r0: { done: true, dateDone: mas(lunes, 0), sets: { 0: { weight: '100', reps: '5', rir: 2 }, 1: { weight: '100', reps: '5', rir: 2 } } },
  } })
}

async function irASueno(page: import('@playwright/test').Page) {
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Progreso/ }).first().click()
  await page.getByRole('button', { name: /^.{0,3}Cuerpo/ }).click()
  await page.getByRole('button', { name: /Sueño y hábitos/ }).click()
}

async function comprobarSuenoYFuerza(page: import('@playwright/test').Page) {
  // Sueño: media de los 3 días apuntados, con el número de días; el hábito de casilla no aparece
  const habitos = page.getByRole('region', { name: 'Hábitos con número' })
  await expect(habitos.getByRole('row', { name: /Dormir/ })).toContainText('6 · 3 días')
  await expect(habitos.getByRole('row', { name: /Dormir/ })).toContainText('Sueño')
  await expect(habitos).not.toContainText('Beber agua')
  // Al lado, la carga de fuerza de esa semana, sin concluir nada
  const fuerza = page.getByRole('region', { name: 'Carga de fuerza para comparar' })
  await expect(fuerza.getByRole('row', { name: /Sesiones/ })).toContainText('1')
  await expect(fuerza.getByRole('row', { name: /RPE medio/ })).toContainText('8 · 2')
  await expect(fuerza).toContainText('no se concluye que una cosa cause la otra')
}

test('Sueño y hábitos enseña las horas de sueño y la carga de fuerza; el cardio del reloj no sale (apagado)', async ({ page, fake }) => {
  test.setTimeout(120_000) // la primera carga de pantallas diferidas compila en frío
  expect.configure({ timeout: 30_000 })
  sembrar(fake)
  await irASueno(page)
  await comprobarSuenoYFuerza(page)
  // La función del reloj está apagada por defecto: aunque haya entrenos guardados, no se enseñan
  await expect(page.getByTestId('cardio-semanal')).toHaveCount(0)
  await expect(page.getByText('Cardio (entrenos del reloj)')).toHaveCount(0)
})

test('con el reloj encendido, además sale el cardio: 100 min, 2 sesiones y 31 km sin contar la fuerza', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  await page.addInitScript(() => localStorage.setItem('pf_reloj', '1'))
  sembrar(fake)
  await irASueno(page)
  await comprobarSuenoYFuerza(page)
  const cardio = page.getByTestId('cardio-semanal')
  await expect(cardio.getByRole('row', { name: /Minutos/ })).toContainText('100')
  await expect(cardio.getByRole('row', { name: /Sesiones/ })).toContainText('2')
  await expect(cardio.getByRole('row', { name: /Distancia/ })).toContainText('31')
  await expect(page.getByTestId('cardio-por-tipo')).toContainText('Bici 60 min · Carrera 40 min') // de más a menos minutos
})
