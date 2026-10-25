import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'
import type { Page } from '@playwright/test'

// El cliente sube una foto de progreso: va a un bucket PRIVADO, en la carpeta de ese cliente, y en la base
// de datos solo se guarda la ruta (nunca una URL pública); para verla se pide una URL firmada.

function sembrar(fake: FakeSupabase, opts: { fotos: boolean }) {
  seedWorld(fake, { clientHasAccount: true })
  fake.seed('consentimientos', { id: 'c-1', clientId: ids.client, version: '2026-10', salud: true, fotos: opts.fotos, accepted_at: new Date().toISOString() })
}

async function abrirFotos(page: Page) {
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Progreso', exact: true }).click()
  await page.getByRole('tab', { name: 'Cuerpo' }).click()
  await page.getByRole('tab', { name: /Fotos/ }).click()
}

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHdJ7KQAAAABJRU5ErkJggg==', 'base64')

test('la foto va a un bucket privado, solo se guarda la ruta y se ve con una URL firmada', async ({ page, fake }) => {
  sembrar(fake, { fotos: true })
  await abrirFotos(page)

  await page.getByRole('button', { name: 'Nueva sesión de fotos' }).click()
  await expect(page.getByText('0/3 fotos')).toBeVisible()
  await page.getByText('0/3 fotos').click() // despliega la sesión
  await page.locator('input[type=file][accept="image/*"]').first().setInputFiles({ name: 'frente.png', mimeType: 'image/png', buffer: PNG })

  await expect(page.getByText('1/3 fotos')).toBeVisible()
  // Subida: bucket "media", dentro de la carpeta de ESE cliente
  expect(fake.uploads).toHaveLength(1)
  expect(fake.uploads[0].bucket).toBe('media')
  expect(fake.uploads[0].path).toMatch(new RegExp(`^fotos/${ids.client}/[^/]+/front_\\d+\\.png$`))
  // En la base de datos: la ruta tal cual, no una URL (ni pública ni firmada)
  const sesion = fake.rows('foto_sessions')[0]
  expect(sesion.front_url).toBe(fake.uploads[0].path)
  expect(String(sesion.front_url)).not.toMatch(/^https?:|object\/public|token=/)
  // Para mostrarla se pidió una URL firmada y se leyó con ella; nunca por la pública
  await expect(page.getByRole('img', { name: 'Foto de progreso - Frente' })).toBeVisible()
  await expect.poll(() => fake.signedReads).toContain(`media/${fake.uploads[0].path}`)
  expect(fake.publicReads).toEqual([]) // (la fixture también lo comprueba al terminar)
})

test('sin permiso para las fotos no se puede subir nada y se ofrece darlo', async ({ page, fake }) => {
  sembrar(fake, { fotos: false })
  await abrirFotos(page)

  await expect(page.getByText('Las fotos necesitan tu permiso')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nueva sesión de fotos' })).toHaveCount(0)
  expect(fake.uploads).toEqual([])
  expect(fake.rows('foto_sessions')).toEqual([])

  // Al dar el permiso (queda registrado) ya aparece subir
  await page.getByRole('button', { name: 'Permitir que se guarden mis fotos' }).click()
  await expect(page.getByRole('button', { name: 'Nueva sesión de fotos' })).toBeVisible()
  expect(fake.rows('consentimientos').some(c => c.fotos === true)).toBe(true)
})

test('una foto de más de 10 MB se rechaza sin subir nada', async ({ page, fake }) => {
  sembrar(fake, { fotos: true })
  await abrirFotos(page)
  await page.getByRole('button', { name: 'Nueva sesión de fotos' }).click()
  await page.getByText('0/3 fotos').click()

  await page.locator('input[type=file][accept="image/*"]').first()
    .setInputFiles({ name: 'enorme.png', mimeType: 'image/png', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) })

  await expect(page.getByText('0/3 fotos')).toBeVisible()
  expect(fake.uploads).toEqual([])
  expect(fake.rows('foto_sessions')[0].front_url ?? null).toBeNull()
})
