import { test, expect } from './support/test'
import { seedWorld } from './support/seed'
import { entrarComoCliente } from './support/flows'

test('al terminar con récords, el entrenador recibe un aviso de récord con el nombre del cliente', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const avisos: { title: string; body: string; trainerId?: string }[] = []
  await page.route('**/functions/v1/send-push', async route => {
    avisos.push(JSON.parse(route.request().postData() || '{}'))
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()

  // El día de la semilla es 3x5 + 3x8 + 2x12 con pesos del plan (80, 60, 15 kg): sin sesiones anteriores, todo es récord
  for (let i = 0; i < 8; i++) {
    await page.getByRole('button', { name: 'HECHO' }).click()
    const saltar = page.getByRole('button', { name: /Listo, siguiente serie/ })
    if (await saltar.isVisible().catch(() => false)) await saltar.click()
  }
  await page.getByRole('button', { name: /Terminar entrenamiento/ }).click()
  await page.getByRole('button', { name: /Guardar y terminar/ }).click()

  await expect.poll(() => avisos.find(a => a.trainerId)?.title).toBe('🏆 María ha batido 3 récords')
  expect(avisos.find(a => a.trainerId)?.body).toBe('Press banca 80 kg · Remo con barra 60 kg · Curl de bíceps 15 kg')
  expect(avisos.filter(a => a.trainerId).length).toBe(1) // uno solo, no también el de «sesión completada»
})
