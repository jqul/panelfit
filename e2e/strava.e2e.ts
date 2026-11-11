import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'

async function irAEntrenos(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Progreso', exact: true }).click()
  await page.getByRole('tab', { name: 'Entrenos' }).click()
}

test('el cliente conecta Strava: va a autorizar, vuelve con el código y se completa la conexión', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const llamadas: { accion?: string; vuelta?: string; code?: string }[] = []
  await page.route('**/functions/v1/strava', async route => {
    const b = JSON.parse(route.request().postData() || '{}')
    llamadas.push(b)
    // "Strava" devuelve directamente a la app con el código y el mismo state
    const cuerpo = b.accion === 'url' ? { url: `${b.vuelta}&code=codigo-1&state=st-1`, state: 'st-1' }
      : b.accion === 'conectar' ? { ok: true, nuevas: 2 } : { ok: true, nuevas: 0 }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) })
  })
  await entrarComoCliente(page)
  await irAEntrenos(page)

  await page.getByRole('button', { name: 'Conectar con Strava' }).click()
  await expect(page.getByText('Strava conectado: 2 entrenos de los últimos 30 días')).toBeVisible()
  expect(llamadas.find(l => l.accion === 'url')?.vuelta).toMatch(/[?&]strava=1$/)
  expect(llamadas.find(l => l.accion === 'conectar')?.code).toBe('codigo-1')
  await expect(page).not.toHaveURL(/code=/) // la dirección queda limpia
})

test('si la vuelta no trae el mismo state, no se conecta', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const acciones: string[] = []
  await page.route('**/functions/v1/strava', async route => {
    acciones.push(JSON.parse(route.request().postData() || '{}').accion)
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  await entrarComoCliente(page)
  await page.goto(`${new URL(page.url()).origin}/${new URL(page.url()).search.replace(/^\?/, '?')}&strava=1&code=robado&state=otro`)
  await expect(page.getByText('La conexión con Strava no se ha podido comprobar')).toBeVisible()
  expect(acciones).not.toContain('conectar')
})

test('conectado: se ve en Entrenos del reloj, sincroniza al abrir y deja desconectar', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('strava_conexiones', { client_id: ids.client, ultima_sync: new Date().toISOString() })
  const acciones: string[] = []
  await page.route('**/functions/v1/strava', async route => {
    acciones.push(JSON.parse(route.request().postData() || '{}').accion)
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"nuevas":0}' })
  })
  await entrarComoCliente(page)
  await irAEntrenos(page)
  const strava = page.getByRole('group', { name: 'Strava' })
  await expect(strava).toContainText('Strava conectado')
  await expect.poll(() => acciones).toContain('sincronizar')
  await strava.getByRole('button', { name: 'Desconectar' }).click()
  await expect(strava.getByRole('button', { name: 'Conectar con Strava' })).toBeVisible()
  expect(acciones).toContain('desconectar')
})
