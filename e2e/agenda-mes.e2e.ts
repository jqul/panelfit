import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const LAURA = '66666666-6666-4666-8666-666666666666' // compañera del equipo
const PEDRO = '44444444-4444-4444-8444-444444444444' // cliente asignado a Laura

// Mañana a una hora (si hoy es el último día del mes, la cita cae en el siguiente: se navega a él si hace falta)
const manana = (h: number) => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(h, 0, 0, 0); return d }

async function irAlCalendario(page: import('@playwright/test').Page) {
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir al Calendario')
  await page.getByRole('option', { name: 'Ir al Calendario' }).click()
}

test('vista de mes: cada día con sus citas y, al pulsar uno, su semana', async ({ page, fake }) => {
  seedWorld(fake)
  const d = manana(10)
  fake.seed('citas', { id: 'c1', trainer_id: ids.trainer, client_id: ids.client, title: 'Sesión', start_at: d.toISOString(), end_at: new Date(d.getTime() + 3600_000).toISOString(), status: 'confirmada', notes: '' })
  await entrarComoEntrenador(page)
  await irAlCalendario(page)

  await page.getByRole('radio', { name: 'Mes', exact: true }).click()
  const nombreMes = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  if (!(await page.getByTestId('periodo-agenda').textContent())?.includes(d.toLocaleDateString('es-ES', { month: 'long' }))) {
    await page.getByRole('button', { name: 'Mes siguiente' }).click()
  }
  await expect(page.getByTestId('periodo-agenda')).toHaveText(new RegExp(nombreMes, 'i'))
  const etiqueta = `${d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}: 1 cita`
  const dia = page.getByRole('gridcell', { name: etiqueta })
  await expect(dia).toContainText(/d{2}:d{2} María/) // la hora depende de la zona horaria del navegador (en CI, Madrid frente a UTC)
  await dia.click()
  await expect(page.getByRole('radio', { name: 'Semana', exact: true })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('Sesión', { exact: true }).first()).toBeVisible()
})

test('con equipo, la agenda se filtra por profesional', async ({ page, fake }) => {
  seedWorld(fake)
  fake.seed('entrenadores', { uid: LAURA, email: 'laura@e2e.test', displayName: 'Laura Coach', approved: true, rol: 'trainer', role: 'trainer', profile: {} })
  fake.seed('team_members', { id: 'tm-1', owner_id: ids.trainer, member_uid: LAURA, role: 'coach', created_at: 1 })
  fake.seed('clientes', { id: PEDRO, trainerId: ids.trainer, name: 'Pedro', surname: 'Ruiz', token: 'tokenpedro', metricas_cliente: [], createdAt: Date.now(), profesional_id: LAURA })
  const d = manana(10), e = manana(12)
  fake.seed('citas', { id: 'c1', trainer_id: ids.trainer, client_id: ids.client, title: 'Sesión de María', start_at: d.toISOString(), end_at: new Date(d.getTime() + 3600_000).toISOString(), status: 'confirmada', notes: '' })
  fake.seed('citas', { id: 'c2', trainer_id: ids.trainer, client_id: PEDRO, title: 'Sesión de Pedro', start_at: e.toISOString(), end_at: new Date(e.getTime() + 3600_000).toISOString(), status: 'confirmada', notes: '' })
  await entrarComoEntrenador(page)
  await irAlCalendario(page)
  if (d.getDay() === 1) await page.getByRole('button', { name: 'Semana siguiente' }).click() // mañana es lunes: otra semana

  await expect(page.getByText('Sesión de María')).toBeVisible()
  await expect(page.getByText('Sesión de Pedro')).toBeVisible()
  await page.getByLabel('Profesional').selectOption({ label: 'Laura Coach' })
  await expect(page.getByText('Sesión de Pedro')).toBeVisible()
  await expect(page.getByText('Sesión de María')).toHaveCount(0)
  await page.getByLabel('Profesional').selectOption({ label: 'Alex Trainer (tú)' })
  await expect(page.getByText('Sesión de María')).toBeVisible()
  await expect(page.getByText('Sesión de Pedro')).toHaveCount(0)
})
