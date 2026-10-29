import { test, expect as expectBase } from './support/test'

// El modo demo enseña lo nuevo con datos de ejemplo y sin escribir nada en ningún sitio: contactos de la página pública
// (con uno sin contestar y uno ya convertido), sus avisos, los consejos y el uso real de cada ejercicio.

test.setTimeout(180_000) // la demo y los trozos diferidos compilan en frío
const expect = expectBase.configure({ timeout: 45_000 })

async function irA(page: import('@playwright/test').Page, busqueda: string) {
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill(busqueda)
  await page.keyboard.press('Enter')
}

test('la demo del entrenador enseña contactos nuevos, uno sin contestar y uno ya convertido', async ({ page }) => {
  await page.goto('/?demo=1')

  // Hoy: la tarjeta, con la marca de "sin contestar" (Marta lleva 30 h)
  await expect(page.getByText('3 contactos nuevos')).toBeVisible()
  await expect(page.getByText('· sin contestar')).toBeVisible()

  await irA(page, 'ir a contactos')
  await expect(page.getByRole('heading', { name: 'Contactos', level: 2 })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Nuevos \(3\)/ })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Clientes \(1\)/ })).toBeVisible() // Sergio, ya convertido
  await expect(page.getByRole('listitem').filter({ hasText: 'Marta Díaz' }).getByText('Lleva más de un día sin contestar')).toBeVisible()
  await expect(page.getByText('Tu página pública')).toBeVisible()
  await expect(page.getByText(/\/p\/demo-alex$/)).toBeVisible()

  // Convertir: se ve el flujo, no se crea nada de verdad y el contacto pasa a "Clientes"
  await page.getByRole('listitem').filter({ hasText: 'Paula Navarro' }).getByRole('button', { name: 'Convertir en cliente' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Crear cliente' }).click()
  await expect(page.getByText('En la demostración no se crean clientes de verdad')).toBeVisible()
  await expect(page.getByRole('tab', { name: /Clientes \(2\)/ })).toBeVisible()
})

test('en la demo, la ficha de un ejercicio dice a qué clientes de ejemplo se lo has puesto', async ({ page }) => {
  await page.goto('/?demo=1')
  await expect(page.getByText('3 contactos nuevos')).toBeVisible()
  await irA(page, 'ir a ejercicios')
  await expect(page.getByRole('heading', { name: 'Ejercicios', level: 2 })).toBeVisible()
  await page.getByRole('button', { name: 'Editar Press banca' }).first().click()
  await expect(page.getByText(/^En el plan de \d+ clientes?: /)).toBeVisible() // salen de los planes de ejemplo
})

test('en la demo, Ajustes trae los consejos de ejemplo y la foto de perfil del entrenador', async ({ page }) => {
  await page.goto('/?demo=1')
  await expect(page.getByText('3 contactos nuevos')).toBeVisible()
  await irA(page, 'ir a ajustes')
  await expect(page.getByText('Consejos para tus clientes')).toBeVisible()
  await expect(page.getByLabel('Título del consejo 1')).toHaveValue('Dormir bien')
  await expect(page.getByLabel('Título del consejo 3')).toHaveValue('Si un día no puedes entrenar')
  await expect(page.getByRole('button', { name: /Contactos recibidos \(6\)/ })).toBeVisible() // el enlace a su pestaña
  await expect(page.locator('img[src^="data:image/svg"]').first()).toBeVisible() // el avatar de la demo (Foto de perfil)
})

test('en la demo, la campanita trae el aviso del contacto nuevo y el del que lleva más de un día esperando', async ({ page }) => {
  await page.goto('/?demo=1')
  await expect(page.getByText('3 contactos nuevos')).toBeVisible()
  await page.getByRole('button', { name: 'Abrir menú' }).click().catch(() => {}) // en el móvil la campanita está en el menú lateral
  await page.getByRole('button', { name: /^Notificaciones/ }).first().click()
  await expect(page.getByText('Nuevo contacto: Paula Navarro')).toBeVisible()
  await expect(page.getByText('Sin contestar: Marta Díaz')).toBeVisible()
})
