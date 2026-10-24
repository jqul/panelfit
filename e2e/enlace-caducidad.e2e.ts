import { test, expect } from './support/test'
import { seedWorld, ids, TOKEN } from './support/seed'
import { entrarComoEntrenador, abrirFichaDelCliente } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'
import type { Page } from '@playwright/test'

const DIA = 86_400_000
const fila = (fake: FakeSupabase) => fake.rows('clientes').find(c => c.id === ids.client)!

async function abrirConfiguracion(page: Page) {
  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)
  await page.getByRole('button', { name: /^Configuración/ }).click()
  await expect(page.getByLabel('Caducidad del enlace')).toBeVisible()
}

test('un enlace caducado dice que caducó; uno que no existe, que no se encontró; uno vigente deja entrar', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fila(fake).token_expires_at = new Date(Date.now() - DIA).toISOString()

  await page.goto(`/?c=${TOKEN}`)
  await expect(page.getByText('Este enlace ha caducado')).toBeVisible()
  await expect(page.getByText(/Pídele un enlace nuevo/)).toBeVisible()
  await expect(page.getByPlaceholder('tu@email.com')).toHaveCount(0) // no se ofrece iniciar sesión con un enlace caducado

  await page.goto('/?c=token-que-no-existe')
  await expect(page.getByText('Enlace no encontrado')).toBeVisible()
  await expect(page.getByText('Este enlace ha caducado')).toHaveCount(0) // no se confunde un enlace inventado con uno caducado

  fila(fake).token_expires_at = new Date(Date.now() + 5 * DIA).toISOString()
  await page.goto(`/?c=${TOKEN}`)
  await expect(page.getByPlaceholder('tu@email.com')).toBeVisible() // enlace vigente: pantalla de acceso
})

test('el entrenador pone y quita la caducidad del enlace', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await abrirConfiguracion(page)

  const selector = page.getByLabel('Caducidad del enlace')
  await expect(selector).toHaveValue('nunca')
  await expect(page.getByText('El enlace no caduca.')).toBeVisible()

  await selector.selectOption('7')
  await expect(page.getByText(/Caducidad guardada/)).toBeVisible()
  const dias = (new Date(String(fila(fake).token_expires_at)).getTime() - Date.now()) / DIA
  expect(dias).toBeGreaterThan(6.9)
  expect(dias).toBeLessThan(7.1)
  await expect(page.getByText(/El enlace caduca el .* \(quedan 7 días\)/)).toBeVisible()

  await selector.selectOption('nunca')
  await expect(page.getByText(/El enlace ya no caduca/)).toBeVisible()
  expect(fila(fake).token_expires_at).toBeNull()
})

test('un enlace caducado se avisa al entrenador y se reactiva eligiendo una caducidad nueva', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fila(fake).token_expires_at = new Date(Date.now() - 2 * DIA).toISOString()
  await abrirConfiguracion(page)

  await expect(page.getByText(/El enlace caducó el .*tu cliente no puede abrirlo/)).toBeVisible()
  await expect(page.getByLabel('Caducidad del enlace')).toHaveValue('') // ninguna opción vigente marcada

  await page.getByLabel('Caducidad del enlace').selectOption('30')
  await expect(page.getByText(/Caducidad guardada/)).toBeVisible()

  // Con el mismo enlace, el cliente vuelve a poder entrar
  await page.goto(`/?c=${TOKEN}`)
  await expect(page.getByPlaceholder('tu@email.com')).toBeVisible()
})

test('regenerar el enlace deja de valer el anterior', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await abrirConfiguracion(page)

  await page.getByRole('button', { name: /Regenerar enlace/ }).click()
  await page.getByRole('button', { name: 'Sí, revocar' }).click()
  await expect(page.getByText('Enlace regenerado ✓')).toBeVisible()
  const nuevo = String(fila(fake).token)
  expect(nuevo).not.toBe(TOKEN)

  await page.goto(`/?c=${TOKEN}`)
  await expect(page.getByText('Enlace no encontrado')).toBeVisible() // el antiguo ya no existe
  await page.goto(`/?c=${nuevo}`)
  await expect(page.getByPlaceholder('tu@email.com')).toBeVisible() // el nuevo sí
})
