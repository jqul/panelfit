import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador, abrirFichaDelCliente } from './support/flows'

const dia = (atras: number) => { const d = new Date(); d.setDate(d.getDate() - atras); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// Arriba del Resumen de la ficha: solo lo accionable ahora mismo, y cada aviso lleva al sitio donde se resuelve.
test('sin nada que atender no sale la tarjeta «Atención hoy»', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)
  await expect(page.getByText('Recordatorios').first()).toBeVisible() // el Resumen ya cargó
  await expect(page.getByRole('region', { name: 'Atención hoy' })).toHaveCount(0)
})

test('molestia, vídeo y recordatorio vencido salen arriba y cada botón lleva a su sitio', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('registros_dolor', { id: 'd1', clientId: ids.client, date: dia(1), zona: 'Rodilla', intensidad: 8, tipo: 'articular', created_at: 1 })
  fake.seed('video_feedback', { id: 'v1', client_id: ids.client, status: 'pendiente', exercise: 'Sentadilla', created_at: new Date().toISOString() })
  fake.rows('clientes').find(r => r.id === ids.client)!.alerts = [{ id: 'a1', type: 'llamar', note: 'Revisar el hombro', date: dia(3), done: false, createdAt: 1 }]
  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)

  const tarjeta = page.getByRole('region', { name: 'Atención hoy' })
  await expect(tarjeta).toBeVisible()
  await expect(tarjeta.getByText('Molestia en Rodilla (8/10)')).toBeVisible()
  await expect(tarjeta.getByText('1 vídeo espera tu feedback')).toBeVisible()
  await expect(tarjeta.getByText('1 recordatorio pendiente (1 vencido)')).toBeVisible()

  // Recordatorio → baja a la lista de recordatorios del propio Resumen
  await tarjeta.getByRole('button', { name: /recordatorio pendiente/ }).click()
  await expect(page.locator('#recordatorios')).toBeInViewport()

  // Vídeo → Progreso, ya en la sección de vídeos
  await tarjeta.getByRole('button', { name: /vídeo espera/ }).click()
  await expect(page.getByText('Progreso de María')).toBeVisible()
  await expect(page.getByRole('button', { name: /Vídeos/ }).first()).toHaveClass(/bg-ink/)
})
