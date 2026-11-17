import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador, abrirFichaDelCliente } from './support/flows'
import { respuestasDeAdmision } from '../src/lib/intakeQuestions'

// La ficha de admisión va plegada, pero su cabecera resume el PAR-Q: un «Sí» nunca queda tras un título neutro.
test('con un «Sí» en el PAR-Q la cabecera avisa sin abrir; plegada por defecto y se despliega', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('checkins', { id: 'i1', clientId: ids.client, tipo: 'intake', createdAt: 1, respuestas: respuestasDeAdmision({ 0: false, 1: false, 2: false, 3: false, 4: true, 5: false, 6: false }, { lesiones: 'Hombro', objetivos: 'Fuerza', disponibilidad: 'Tardes' }) })
  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)

  const cabecera = page.getByRole('button', { name: /Ficha de admisión/ })
  await expect(cabecera).toContainText('PAR-Q · 1 respuesta requiere atención')
  await expect(cabecera).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByText('¿Tienes algún problema óseo o articular')).toHaveCount(0) // plegada: el detalle no ocupa sitio

  await cabecera.click()
  await expect(cabecera).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText('¿Tienes algún problema óseo o articular')).toBeVisible()
  await expect(page.getByText('Hombro')).toBeVisible()
})

test('con todo «No» la cabecera lo dice en neutro, sin alerta', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('checkins', { id: 'i1', clientId: ids.client, tipo: 'intake', createdAt: 1, respuestas: respuestasDeAdmision({ 0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false }, {}) })
  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)
  await expect(page.getByRole('button', { name: /Ficha de admisión/ })).toContainText('PAR-Q · sin respuestas de riesgo')
})
