import { test, expect } from './support/test'
import { seedWorld, TOKEN } from './support/seed'
import type { Page } from '@playwright/test'

// Un acceso directo / app instalada arranca en la raíz ("/") sin el enlace del cliente. Esta prueba emula la app
// instalada (display-mode: standalone) a partir de una marca en localStorage, para poder pasar de "navegador" a
// "app instalada" dentro de la misma prueba.
async function emularAppInstalada(page: Page) {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window)
    window.matchMedia = (q: string) => {
      if (q.includes('display-mode: standalone') && localStorage.getItem('pf_e2e_standalone') === '1') {
        return { matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false } as unknown as MediaQueryList
      }
      return original(q)
    }
  })
}
const comoAppInstalada = (page: Page, on: boolean) => page.evaluate(v => { v ? localStorage.setItem('pf_e2e_standalone', '1') : localStorage.removeItem('pf_e2e_standalone') }, on)
const pantallaDeAccesoDelCliente = (page: Page) => page.getByPlaceholder('Mínimo 6 caracteres')

test('la app instalada que arranca en la raíz vuelve al panel del cliente y sigue ahí al recargar', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await emularAppInstalada(page)

  await page.goto(`/?c=${TOKEN}`)
  await expect(pantallaDeAccesoDelCliente(page)).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('pf_client_link'))).toBe(TOKEN) // se recuerda al entrar con un enlace válido

  // Acceso directo: la app instalada arranca en "/", sin enlace
  await comoAppInstalada(page, true)
  await page.goto('/')
  await expect(pantallaDeAccesoDelCliente(page)).toBeVisible()
  expect(new URL(page.url()).searchParams.get('c')).toBe(TOKEN) // la dirección ya lleva el enlace

  // Y recargar no lo pierde
  await page.reload()
  await expect(pantallaDeAccesoDelCliente(page)).toBeVisible()
  expect(new URL(page.url()).searchParams.get('c')).toBe(TOKEN)
})

test('en el navegador normal la raíz sigue siendo la de siempre: un entrenador no queda atrapado en la vista de cliente', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await emularAppInstalada(page)
  await page.goto(`/?c=${TOKEN}`)
  await expect(pantallaDeAccesoDelCliente(page)).toBeVisible()

  await comoAppInstalada(page, false)
  await page.goto('/')
  await expect(page.getByRole('button', { name: /Entrar/ }).first()).toBeVisible() // la página de siempre
  await expect(pantallaDeAccesoDelCliente(page)).toHaveCount(0)
  expect(new URL(page.url()).searchParams.get('c')).toBeNull()
})

test('la página del cliente apunta su manifiesto al del servidor con su enlace (para instalar el acceso directo)', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await page.goto('/')
  expect(await page.evaluate(() => document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!.getAttribute('href'))).toBe('/manifest.json') // la general

  await page.goto(`/?c=${TOKEN}`)
  await expect(pantallaDeAccesoDelCliente(page)).toBeVisible()
  // El contenido del manifiesto (start_url con el enlace) lo prueba api/manifest.test.ts
  expect(await page.evaluate(() => document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!.getAttribute('href'))).toBe(`/api/manifest?c=${TOKEN}`)
})

test('un enlace que ya no existe se olvida: la app instalada deja de insistir', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await emularAppInstalada(page)
  await page.goto('/?c=token-que-no-existe-1234')
  await page.evaluate(() => { localStorage.setItem('pf_client_link', 'token-que-no-existe-1234'); localStorage.setItem('pf_e2e_standalone', '1') })

  await page.goto('/')
  await expect(page.getByText('Enlace no encontrado')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('pf_client_link'))).toBeNull()

  await page.goto('/') // la siguiente vez ya no abre el cliente
  await expect(page.getByRole('button', { name: /Entrar/ }).first()).toBeVisible()
})
