import type { Page, Locator } from '@playwright/test'
import { test, expect as expectBase } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'

// El desplegable de la campana (320 px) se abre desde el encabezado de la barra lateral, que mide 208 px y está pegada a la IZQUIERDA de la pantalla, tanto en escritorio como
// en el menú del móvil. Alineado a la derecha del icono se salía por la izquierda de la pantalla y los avisos salían cortados. Aquí se comprueba que el desplegable entero cae
// dentro de la pantalla en los dos sitios, y que sigue cerrándose al pulsar fuera.

test.setTimeout(120_000) // la primera carga compila los trozos diferidos del panel
const expect = expectBase.configure({ timeout: 30_000 })

function sembrarAvisos(fake: FakeSupabase) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const avisos = [
    ['Nuevo contacto: Paula Navarro', 'Quiero empezar a entrenar fuerza y no sé por dónde empezar con mi rodilla'],
    ['Sergio ha rellenado su cuestionario de programación', 'Ya tienes su ficha de admisión y el cuestionario para preparar su plan'],
    ['Prueba Alarma Sin Plan 2 completó una sesión', 'Entrenamiento de pierna con sentadilla pesada y extensión de cuádriceps'],
  ]
  avisos.forEach(([titulo, mensaje], i) => fake.seed('notificaciones', {
    id: `n${i}`, trainer_id: ids.trainer, client_id: null, tipo: 'nuevo_contacto', titulo, mensaje, leida: false, created_at: Date.now() - i * 60_000, destinatario: 'trainer',
  }))
}

const desplegable = (page: Page) => page.getByRole('region', { name: 'Notificaciones' })

/** La caja entera del elemento está dentro de la pantalla (con el desplegable abierto y ya pintado). */
async function dentroDeLaPantalla(page: Page, el: Locator) {
  const caja = await el.boundingBox()
  const pantalla = page.viewportSize()!
  expect(caja, 'el elemento no tiene caja: no está pintado').not.toBeNull()
  expect(caja!.x, `se sale por la izquierda (x = ${Math.round(caja!.x)})`).toBeGreaterThanOrEqual(0)
  expect(caja!.y, `se sale por arriba (y = ${Math.round(caja!.y)})`).toBeGreaterThanOrEqual(0)
  expect(caja!.x + caja!.width, `se sale por la derecha (${Math.round(caja!.x + caja!.width)} de ${pantalla.width})`).toBeLessThanOrEqual(pantalla.width)
  expect(caja!.y + caja!.height, `se sale por abajo (${Math.round(caja!.y + caja!.height)} de ${pantalla.height})`).toBeLessThanOrEqual(pantalla.height)
}

test('en escritorio, el desplegable de la campana cabe entero en la pantalla y se ven los avisos completos', async ({ page, fake }) => {
  sembrarAvisos(fake)
  await page.setViewportSize({ width: 1280, height: 800 })
  await entrarComoEntrenador(page)

  await page.getByRole('button', { name: /Notificaciones \(3 sin leer\)/ }).click()
  await expect(desplegable(page)).toBeVisible()
  await expect(desplegable(page).getByText('Nuevo contacto: Paula Navarro')).toBeVisible()
  await dentroDeLaPantalla(page, desplegable(page))
  // Cada aviso, entero y legible: ni su borde izquierdo ni el derecho quedan fuera
  for (const texto of ['Nuevo contacto: Paula Navarro', 'Sergio ha rellenado su cuestionario de programación', 'Prueba Alarma Sin Plan 2 completó una sesión']) {
    await dentroDeLaPantalla(page, desplegable(page).getByText(texto))
  }
})

test('en el móvil, el desplegable de la campana (dentro del menú lateral) cabe entero en la pantalla', async ({ page, fake }) => {
  sembrarAvisos(fake)
  await entrarComoEntrenador(page) // el viewport de las pruebas es el de un móvil: 390 × 844
  await page.getByRole('button', { name: 'Abrir menú' }).click()

  await page.getByRole('button', { name: /Notificaciones \(3 sin leer\)/ }).click()
  await expect(desplegable(page)).toBeVisible()
  await dentroDeLaPantalla(page, desplegable(page))
  await dentroDeLaPantalla(page, desplegable(page).getByText('Nuevo contacto: Paula Navarro'))
})

test('el desplegable sigue funcionando: se cierra al pulsar fuera y la campana lo vuelve a abrir', async ({ page, fake }) => {
  sembrarAvisos(fake)
  await page.setViewportSize({ width: 1280, height: 800 })
  await entrarComoEntrenador(page)

  const campana = page.getByRole('button', { name: /Notificaciones \(3 sin leer\)/ })
  await campana.click()
  await expect(desplegable(page)).toBeVisible()
  await page.getByRole('heading', { name: 'Resumen', level: 2 }).click() // fuera del desplegable
  await expect(desplegable(page)).toHaveCount(0)
  await campana.click()
  await expect(desplegable(page)).toBeVisible()
  await campana.click() // y con la propia campana se cierra
  await expect(desplegable(page)).toHaveCount(0)
})
