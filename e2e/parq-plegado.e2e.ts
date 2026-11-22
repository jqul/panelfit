import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador, abrirFichaDelCliente } from './support/flows'
import { respuestasDeAdmision } from '../src/lib/intakeQuestions'
import { huellaAdmision, respuestasDeRevision } from '../src/lib/retencionParq'

// La ficha de admisión va plegada, pero su cabecera resume el PAR-Q: un «Sí» nunca queda tras un título neutro. Mientras tenga algo SIN REVISAR se enseña abierta
// (lib/retencionParq); ya revisada, vuelve a ir plegada.
test('con un «Sí» ya revisado la cabecera avisa sin abrir; plegada por defecto y se despliega', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const respuestas = respuestasDeAdmision({ 0: false, 1: false, 2: false, 3: false, 4: true, 5: false, 6: false }, { lesiones: 'Hombro', objetivos: 'Fuerza', disponibilidad: 'Tardes' })
  fake.seed('checkins', { id: 'i1', clientId: ids.client, tipo: 'intake', createdAt: 1, respuestas })
  fake.seed('checkins', { id: 'r1', clientId: ids.client, tipo: 'parq_revisado', createdAt: 2, respuestas: respuestasDeRevision(huellaAdmision(respuestas)) }) // el entrenador ya la revisó (con la huella de lo que leyó)
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

test('con un «Sí» SIN revisar la ficha se enseña abierta, con la explicación y el botón para marcarla como revisada', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('checkins', { id: 'i1', clientId: ids.client, tipo: 'intake', createdAt: 1, respuestas: respuestasDeAdmision({ 0: false, 1: false, 2: false, 3: false, 4: true, 5: false, 6: false }, {}) })
  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)
  await expect(page.getByRole('button', { name: /Ficha de admisión/ })).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText('¿Tienes algún problema óseo o articular')).toBeVisible()
  const revision = page.getByRole('group', { name: 'Revisión del cuestionario de salud' })
  await expect(revision).toContainText('Problema articular o medicación: revísalo y adapta el plan')
  await expect(revision.getByRole('button', { name: 'Marcar como revisado' })).toBeVisible()
})
