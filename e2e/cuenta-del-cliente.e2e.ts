import { test, expect } from './support/test'
import { seedWorld, ids, TOKEN, TRAINER_LOGIN, CLIENT_LOGIN } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { Page } from '@playwright/test'

// El móvil de un entrenador que también prueba su propio panel de cliente: dos cuentas, una sola sesión por navegador.

async function acceder(page: Page, login: { email: string; password: string }) {
  await page.getByPlaceholder('tu@email.com').fill(login.email)
  await page.getByPlaceholder('Mínimo 6 caracteres').fill(login.password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
}
const panelDelCliente = (page: Page) => page.getByRole('button', { name: 'Empezar entrenamiento' })
const sesionGuardada = (page: Page) => page.evaluate(() => Object.keys(localStorage).some(k => /^sb-.*-auth-token$/.test(k) && !!localStorage.getItem(k)))

test('con el usuario de entrenador en el enlace del cliente no se entra: se explica y no se deja una sesión a medias', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await page.goto(`/?c=${TOKEN}`)
  await acceder(page, TRAINER_LOGIN)

  await expect(page.getByText(/Ese usuario no es el de este panel/)).toBeVisible()
  await expect(panelDelCliente(page)).toHaveCount(0)
  expect(await sesionGuardada(page)).toBe(false) // no queda la sesión del entrenador abierta como si fuera del cliente
})

test('con la cuenta del cliente entra, y recargar o abrir la raíz no vuelve a pedir el acceso', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await page.goto(`/?c=${TOKEN}`)
  await acceder(page, CLIENT_LOGIN)
  await expect(panelDelCliente(page)).toBeVisible()

  await page.reload()
  await expect(panelDelCliente(page)).toBeVisible() // sin volver a poner el usuario

  // El acceso directo abre la raíz: con la sesión del cliente va a su panel, no a la pantalla de entrenadores
  await page.goto('/')
  await expect(panelDelCliente(page)).toBeVisible()
  expect(new URL(page.url()).searchParams.get('c')).toBe(TOKEN)
})

test('una cuenta de cliente con su fila de entrenador pendiente (alta antigua) también va a su panel desde la raíz', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('entrenadores', { uid: ids.clientUser, email: CLIENT_LOGIN.email, displayName: 'María', approved: false, rol: 'trainer', role: 'trainer' })
  await page.goto(`/?c=${TOKEN}`)
  await acceder(page, CLIENT_LOGIN)
  await expect(panelDelCliente(page)).toBeVisible()

  await page.goto('/')
  await expect(panelDelCliente(page)).toBeVisible()
  await expect(page.getByText(/pendiente|aprobación/i)).toHaveCount(0)
})

test('con la sesión de entrenador abierta, el enlace del cliente avisa de que se cerrará al entrar con la cuenta del cliente', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoEntrenador(page)

  await page.goto(`/?c=${TOKEN}`)
  await expect(page.getByText(/hay otra sesión abierta/)).toBeVisible()
  await acceder(page, CLIENT_LOGIN)
  await expect(panelDelCliente(page)).toBeVisible()
})

test('un entrenador aprobado que abre la raíz sigue yendo a su panel de entrenador', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoEntrenador(page)
  await page.goto('/')
  await expect(page.getByText('Resumen').first()).toBeVisible()
  await expect(panelDelCliente(page)).toHaveCount(0)
})
