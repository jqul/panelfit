import { test, expect } from './support/test'
import { seedWorld, TOKEN, ids, CLIENT_LOGIN } from './support/seed'
import type { Page } from '@playwright/test'
import type { FakeSupabase } from './support/fakeSupabase'

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
  // Sin sus datos básicos (nacimiento, altura y peso) no se puede continuar; el género es opcional
  await expect(continuar).toBeDisabled()
  await page.getByLabel('Fecha de nacimiento').fill('1995-03-10')
  await page.getByLabel('Altura (cm)').fill('168,5')
  await expect(continuar).toBeDisabled()
  await page.getByLabel('Peso (kg)').fill('64.2')
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
  // Sus datos básicos fueron a su ficha, y el peso es su primer pesaje
  expect(client).toMatchObject({ fechanacimiento: '1995-03-10', altura: 168.5, weight: 64.2, genero: null })
  expect(fake.rows('registros_peso')).toMatchObject([{ clientId: ids.client, weight: 64.2 }])
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

// ── Datos básicos del registro y paso al cuestionario de programación ──

async function registrar(page: Page, email: string, opciones: { parqSi?: number; genero?: string } = {}) {
  await page.goto(`/?c=${TOKEN}`)
  await page.getByPlaceholder('tu@email.com').fill(email)
  await page.getByPlaceholder('Mínimo 6 caracteres').fill('clave-e2e-9')
  await page.getByPlaceholder('Repite la contraseña').fill('clave-e2e-9')
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await page.getByLabel(/Consiento el tratamiento de mis datos de salud/).check()
  await page.getByLabel(/He leído y acepto el descargo/).check()
  await page.getByLabel('Firma: nombre completo').fill('María García')
  await page.getByLabel('Fecha de nacimiento').fill('1995-03-10')
  await page.getByLabel('Altura (cm)').fill('168')
  await page.getByLabel('Peso (kg)').fill('64')
  if (opciones.genero) await page.getByLabel('Género (opcional)').selectOption(opciones.genero)
  if (opciones.parqSi !== undefined) await page.getByRole('button', { name: 'Sí', exact: true }).nth(opciones.parqSi).click()
  await page.getByRole('button', { name: /Continuar/ }).click()
}

function sembrarCuestionarioPendiente(fake: FakeSupabase) {
  fake.seed('survey_templates', { id: 'tmpl-x', trainer_id: ids.trainer, name: 'Programación inicial: general', questions: [{ id: 'objetivo', type: 'short', label: 'Tu objetivo', required: true }], created_at: 1, auto_nuevos_desde: null })
  fake.seed('survey_schedules', { id: 'sched-x', trainer_id: ids.trainer, template_id: 'tmpl-x', client_id: ids.client, frequency: 'once', day_of_week: 0, active: true, last_sent_at: null })
}

test('el género es opcional y, si lo da, va a su ficha junto a su nacimiento, altura y peso', async ({ page, fake }) => {
  seedWorld(fake)
  await registrar(page, 'genero@e2e.test', { genero: 'm' })
  await expect(page.getByRole('button', { name: 'Empezar entrenamiento' })).toBeVisible()
  expect(fake.rows('clientes').find(c => c.id === ids.client)).toMatchObject({ genero: 'm', fechanacimiento: '1995-03-10', altura: 168, weight: 64 })
})

test('datos sin sentido: avisa de qué falla con el rango y no deja continuar; no se guarda nada', async ({ page, fake }) => {
  seedWorld(fake)
  await page.goto(`/?c=${TOKEN}`)
  await page.getByPlaceholder('tu@email.com').fill('raro@e2e.test')
  await page.getByPlaceholder('Mínimo 6 caracteres').fill('clave-e2e-9')
  await page.getByPlaceholder('Repite la contraseña').fill('clave-e2e-9')
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await page.getByLabel(/Consiento el tratamiento de mis datos de salud/).check()
  await page.getByLabel(/He leído y acepto el descargo/).check()
  await page.getByLabel('Firma: nombre completo').fill('María García')
  await page.getByLabel('Fecha de nacimiento').fill('1995-03-10')
  await page.getByLabel('Altura (cm)').fill('20')
  await page.getByLabel('Peso (kg)').fill('9999')
  await expect(page.getByText('La altura debe estar entre 100 y 250 cm')).toBeVisible()
  await expect(page.getByText('El peso debe estar entre 20 y 400 kg')).toBeVisible()
  await expect(page.getByRole('button', { name: /Continuar/ })).toBeDisabled()
  await page.getByLabel('Altura (cm)').fill('170')
  await page.getByLabel('Peso (kg)').fill('70')
  await expect(page.getByRole('button', { name: /Continuar/ })).toBeEnabled()
  expect(fake.rows('registros_peso')).toEqual([])
})

test('al terminar el registro, lo primero es el cuestionario de programación que le mandó su entrenador', async ({ page, fake }) => {
  seedWorld(fake)
  sembrarCuestionarioPendiente(fake)
  await registrar(page, 'primero@e2e.test')
  await expect(page.getByRole('heading', { name: 'Programación inicial: general' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Empezar entrenamiento' })).toHaveCount(0)
})

test('con una señal de ALARMA en el cuestionario de salud el de programación queda EN ESPERA: no se abre solo ni sale en Hoy hasta que lo revise su entrenador', async ({ page, fake }) => {
  seedWorld(fake)
  sembrarCuestionarioPendiente(fake)
  await registrar(page, 'alarma@e2e.test', { parqSi: 1 }) // dolor en el pecho al hacer actividad
  await expect(page.getByText(/Tu entrenador va a revisar tus respuestas de salud antes de seguir con tu plan/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Empezar entrenamiento' })).toBeVisible()
  await expect(page.getByText('Tu entrenador está revisando tus respuestas de salud')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Programación inicial: general' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Tienes un cuestionario pendiente/ })).toHaveCount(0)
})

test('con un problema articular o medicación (revisar) se le avisa de que su entrenador lo revisará, pero su cuestionario de programación SÍ se abre', async ({ page, fake }) => {
  seedWorld(fake)
  sembrarCuestionarioPendiente(fake)
  await registrar(page, 'revisar@e2e.test', { parqSi: 4 }) // problema óseo o articular
  await expect(page.getByText(/Tu entrenador revisará tus respuestas de salud para adaptar tu plan/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Programación inicial: general' })).toBeVisible()
})

// Datos básicos que no se pudieron guardar (sin red, o la migración aún no está aplicada): se dice claro y se puede reintentar sin duplicar nada
test('si no se pueden guardar los datos básicos: «cuenta creada, datos pendientes», tarjeta en Hoy y reintento que los guarda sin duplicar el pesaje', async ({ page, fake }) => {
  seedWorld(fake)
  fake.rpcErrors.add('cliente_guardar_datos_basicos')
  await registrar(page, 'pendiente@e2e.test', { genero: 'm' })
  await expect(page.getByRole('alert')).toContainText('Tu cuenta está creada, pero tus datos básicos todavía NO se han guardado')
  await expect(page.getByRole('button', { name: 'Empezar entrenamiento' })).toBeVisible()
  // La ficha sigue sin sus datos, y no hay pesaje
  const sinDatos = fake.rows('clientes').find(c => c.id === ids.client)!
  expect(sinDatos.altura).toBeUndefined()
  expect(sinDatos.fechanacimiento).toBeUndefined()
  expect(sinDatos.weight).toBeUndefined()
  expect(fake.rows('registros_peso')).toEqual([])

  // En Hoy queda la tarjeta, y los datos en el dispositivo (solo ahí: no han salido a ningún servidor)
  const clavePendientes = `pf_datos_basicos_pendientes_${ids.client}`
  const guardado = () => page.evaluate(k => localStorage.getItem(k), clavePendientes)
  const tarjeta = page.getByRole('status').filter({ hasText: 'Tus datos básicos están pendientes de guardar' })
  await expect(tarjeta).toBeVisible()
  expect(JSON.parse((await guardado()) as string)).toMatchObject({ genero: 'm', nacimiento: '1995-03-10', altura: 168, peso: 64 })

  // Mientras la función siga sin estar, reintentar avisa y NO borra nada (un error de red no debe perder lo escrito)
  await tarjeta.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByText('Todavía no se han podido guardar')).toBeVisible()
  await expect(tarjeta).toBeVisible()
  expect(await guardado()).not.toBeNull()

  // Cierra y vuelve a abrir la app (recarga): los datos siguen pendientes y siguen ahí para reintentar
  await page.reload()
  await expect(page.getByRole('button', { name: 'Empezar entrenamiento' })).toBeVisible()
  await expect(tarjeta).toBeVisible()
  expect(await guardado()).not.toBeNull()
  expect(fake.rows('registros_peso')).toEqual([])

  // Ya disponible: se guarda lo que escribió (sin volver a pedírselo), la tarjeta desaparece, no queda NADA en el dispositivo y el pesaje es uno solo
  fake.rpcErrors.delete('cliente_guardar_datos_basicos')
  await tarjeta.getByRole('button', { name: 'Reintentar' }).click()
  await expect(tarjeta).toHaveCount(0)
  expect(await guardado()).toBeNull()
  expect(fake.rows('clientes').find(c => c.id === ids.client)).toMatchObject({ genero: 'm', fechanacimiento: '1995-03-10', altura: 168, weight: 64 })
  expect(fake.rows('registros_peso')).toHaveLength(1)
  // Y no vuelve a salir al recargar
  await page.reload()
  await expect(page.getByRole('button', { name: 'Empezar entrenamiento' })).toBeVisible()
  await expect(page.getByText('Tus datos básicos están pendientes de guardar')).toHaveCount(0)
})
