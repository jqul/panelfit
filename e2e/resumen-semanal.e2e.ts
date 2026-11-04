import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'

const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

test('«Tu semana» en Hoy: entrenos, hábitos, tareas y check-in de la semana', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true }) // plan con un día de entreno a la semana, sin hacer
  fake.seed('habitos', { id: 'h1', clientId: ids.client, text: 'Beber agua', sub: '', order: 0 })
  fake.seed('habitos', { id: 'h2', clientId: ids.client, text: 'Dormir 8 h', sub: '', order: 1 })
  fake.seed('registros_habitos', { clientId: ids.client, date: hoy(), completedHabitIds: ['h1'], valores: {} })
  fake.seed('tareas_cliente', { id: 't1', client_id: ids.client, titulo: 'Caminar', tipo: 'cardio', nota: '', enlace: '', fecha: hoy(), repetir: 'una', dias: [], hasta: null })
  fake.seed('tareas_hechas', { tarea_id: 't1', client_id: ids.client, fecha: hoy() })
  fake.seed('readiness_checkins', { id: 'r1', clientId: ids.client, date: hoy() })

  await entrarComoCliente(page)
  const semana = page.getByRole('region', { name: 'Tu semana' })
  await expect(semana).toContainText('Entrenos')
  await expect(semana).toContainText('0 de 1')
  await expect(semana).toContainText('Hábitos')
  await expect(semana).toContainText('Tareas')
  await expect(semana).toContainText('Check-in')
  await expect(semana).toContainText('% hecho')
})

test('sin nada previsto más allá del plan, solo los entrenos', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  const semana = page.getByRole('region', { name: 'Tu semana' })
  await expect(semana).toContainText('Entrenos')
  await expect(semana).not.toContainText('Hábitos')
  await expect(semana).not.toContainText('Check-in') // sin check-ins en las últimas semanas, no se le pide
})
