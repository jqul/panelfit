import { test, expect } from './support/test'
import { seedWorld, TOKEN, ids, CLIENT_LOGIN } from './support/seed'

test('un cliente nuevo se registra, da su consentimiento y entra a su panel', async ({ page, fake }) => {
  seedWorld(fake)
  await page.goto(`/?c=${TOKEN}`)

  // 1. Registro con email y contraseña
  await expect(page.getByRole('heading', { name: /Hola, María/ })).toBeVisible()
  await page.getByPlaceholder('tu@email.com').fill('maria@e2e.test')
  await page.getByPlaceholder('Mínimo 6 caracteres').fill('clave-e2e-2')
  await page.getByPlaceholder('Repite la contraseña').fill('clave-e2e-2')
  await page.getByRole('button', { name: 'Crear cuenta' }).click()

  // 2. Antes del cuestionario de salud, el consentimiento: sin marcar y sin poder continuar
  await expect(page.getByRole('heading', { name: 'Antes de empezar...' })).toBeVisible()
  const salud = page.getByLabel(/Consiento el tratamiento de mis datos de salud/)
  const fotos = page.getByLabel(/Consiento que mi entrenador guarde mis fotos/)
  const continuar = page.getByRole('button', { name: /Continuar/ })
  await expect(salud).not.toBeChecked()
  await expect(fotos).not.toBeChecked()
  await expect(continuar).toBeDisabled()

  // 3. Consentimiento de salud (no el de fotos) + descargo y firma
  await salud.check()
  await page.getByLabel(/He leído y acepto el descargo/).check()
  await page.getByLabel('Firma: nombre completo').fill('María García')
  await page.getByLabel(/Marcas o pesos actuales/).fill('Sentadilla 80 kg x 5')
  await page.getByLabel(/Cuántas horas duermes/).fill('6')
  await expect(continuar).toBeEnabled()
  await continuar.click()

  // 4. Entra a su panel con su plan
  await expect(page.getByRole('button', { name: 'Empezar entrenamiento' })).toBeVisible()

  // Lo guardado: cuenta vinculada, consentimiento (solo salud), cuestionario y descargo
  const client = fake.rows('clientes').find(c => c.id === ids.client)!
  expect(client.auth_user_id).toBeTruthy()
  expect(fake.rows('consentimientos')).toMatchObject([{ clientId: ids.client, salud: true, fotos: false, version: '2026-10' }])
  expect(fake.rows('checkins')).toMatchObject([{ clientId: ids.client, tipo: 'intake' }])
  // Las opcionales contestadas se guardan; la que dejó en blanco (experiencia) no aparece como «Sin responder»
  const respuestas = (fake.rows('checkins')[0].respuestas as { pregunta: string; respuesta: string }[])
  expect(respuestas[respuestas.length - 2]).toMatchObject({ pregunta: expect.stringMatching(/Marcas o pesos actuales/), respuesta: 'Sentadilla 80 kg x 5' })
  expect(respuestas[respuestas.length - 1]).toMatchObject({ pregunta: expect.stringMatching(/Cuántas horas duermes/), respuesta: '6' })
  expect(respuestas.some(r => /Cuánto tiempo llevas entrenando/.test(r.pregunta))).toBe(false)
  expect(fake.rows('waivers')).toMatchObject([{ clientId: ids.client, signed_name: 'María García' }])
})

test('sin marcar el consentimiento de salud no se puede continuar aunque se firme el descargo', async ({ page, fake }) => {
  seedWorld(fake)
  await page.goto(`/?c=${TOKEN}`)
  await page.getByPlaceholder('tu@email.com').fill('otra@e2e.test')
  await page.getByPlaceholder('Mínimo 6 caracteres').fill('clave-e2e-3')
  await page.getByPlaceholder('Repite la contraseña').fill('clave-e2e-3')
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await page.getByLabel(/He leído y acepto el descargo/).check()
  await page.getByLabel('Firma: nombre completo').fill('Otra Persona')
  await expect(page.getByRole('button', { name: /Continuar/ })).toBeDisabled()
  expect(fake.rows('consentimientos')).toEqual([])
  expect(fake.rows('checkins')).toEqual([])
})

test('un cliente que ya existía ve la pantalla de consentimiento una sola vez y sin aceptar no entra', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: false })
  await page.goto(`/?c=${TOKEN}`)
  await page.getByPlaceholder('tu@email.com').fill(CLIENT_LOGIN.email)
  await page.getByPlaceholder('Mínimo 6 caracteres').fill(CLIENT_LOGIN.password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()

  // En vez de su panel, el consentimiento (sin marcar) y sin poder continuar
  await expect(page.getByRole('heading', { name: 'Antes de seguir...' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Empezar entrenamiento' })).toHaveCount(0)
  const aceptar = page.getByRole('button', { name: /Aceptar y continuar/ })
  await expect(aceptar).toBeDisabled()

  // Con el consentimiento de salud (y sin el de fotos) entra, y queda registrado
  await page.getByLabel(/Consiento el tratamiento de mis datos de salud/).check()
  await aceptar.click()
  await expect(page.getByRole('button', { name: 'Empezar entrenamiento' })).toBeVisible()
  expect(fake.rows('consentimientos')).toMatchObject([{ clientId: ids.client, salud: true, fotos: false }])

  // La próxima vez que entra ya no se le pide
  await page.reload()
  await expect(page.getByRole('button', { name: 'Empezar entrenamiento' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Antes de seguir...' })).toHaveCount(0)
})
