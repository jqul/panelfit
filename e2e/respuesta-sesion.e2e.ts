import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, entrarComoEntrenador } from './support/flows'

const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

test('el entrenador responde a una sesión desde la Bandeja con un toque y le llega al cliente', async ({ page, fake }) => {
  seedWorld(fake)
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: { ex_w0_d0_r0: { done: true, dateDone: hoy(), sets: { 0: { weight: '80', reps: '5' } } } } })
  const avisos: { title: string; body: string; clientId?: string }[] = []
  await page.route('**/functions/v1/send-push', async route => {
    avisos.push(JSON.parse(route.request().postData() || '{}'))
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /^Bandeja/ }).first().click()
  await page.getByRole('tab', { name: 'Actividad' }).click()

  const responder = page.getByRole('group', { name: 'Responder a la sesión de María' })
  await responder.getByRole('button', { name: '💪 ¡Buen trabajo!' }).click()
  await expect(page.getByText('Respondido ✓')).toBeVisible()
  await expect.poll(() => fake.rows('respuestas_sesion')[0]).toMatchObject({ client_id: ids.client, trainer_id: ids.trainer, fecha: hoy(), texto: '💪 ¡Buen trabajo!' })
  await expect.poll(() => avisos.find(a => a.clientId === ids.client)?.body).toBe('💪 ¡Buen trabajo!')
})

test('el cliente ve en Hoy lo que le ha dicho su entrenador y lo marca como leído', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('respuestas_sesion', { id: 'r1', client_id: ids.client, trainer_id: ids.trainer, fecha: hoy(), texto: '🔥 ¡Vaya sesión!', created_at: new Date().toISOString(), leida_at: null })
  await entrarComoCliente(page)
  const mensajes = page.getByRole('region', { name: /^Mensajes de/ })
  await expect(mensajes).toContainText('🔥 ¡Vaya sesión!')
  await mensajes.getByRole('button', { name: 'Entendido' }).click()
  await expect(mensajes).toHaveCount(0)
  await expect.poll(() => fake.rows('respuestas_sesion')[0].leida_at).not.toBeNull()
})
