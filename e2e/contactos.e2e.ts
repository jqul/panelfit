import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'

// Los contactos que llegan por la página pública se ven donde el entrenador mira (Hoy, Bandeja, su propia pestaña), no
// solo escondidos en Ajustes.

const hace = (horas: number) => Date.now() - horas * 3600_000
const lead = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  id, trainer_id: ids.trainer, name, email: null, phone: null, message: null, status: 'nuevo', created_at: hace(2), referred_by_client_id: null, ...over,
})

function sembrar(fake: FakeSupabase) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('leads',
    lead('l1', 'Paula Navarro', { phone: '622 11 22 33', message: 'Quiero empezar a entrenar fuerza', created_at: hace(5) }),
    lead('l2', 'Sergio Blanco', { email: 'sergio@example.com', status: 'contactado', created_at: hace(30) }),
  )
}

test('un contacto nuevo aparece en Hoy y en su pestaña, con enlace a WhatsApp', async ({ page, fake }) => {
  sembrar(fake)
  await entrarComoEntrenador(page)

  // En Hoy: la tarjeta de contactos nuevos
  await expect(page.getByText('Un contacto nuevo')).toBeVisible()
  await page.getByRole('button', { name: /Un contacto nuevo/ }).click()

  // La pestaña: por defecto, los nuevos
  await expect(page.getByRole('heading', { name: 'Contactos', level: 2 })).toBeVisible()
  await expect(page.getByText('Paula Navarro')).toBeVisible()
  await expect(page.getByText('"Quiero empezar a entrenar fuerza"')).toBeVisible()
  await expect(page.getByText('Sergio Blanco')).toHaveCount(0) // contactado: en su pestaña
  const wa = page.getByRole('link', { name: /Escribir por WhatsApp/ })
  await expect(wa).toHaveAttribute('href', /^https:\/\/wa\.me\/34622112233\?text=/) // móvil español: se añade el +34

  // Marcarlo como descartado lo guarda y lo saca de "Nuevos"
  await page.getByLabel('Estado de Paula Navarro').selectOption('descartado')
  await expect.poll(() => fake.rows('leads').find(l => l.id === 'l1')!.status).toBe('descartado')
  await expect(page.getByText('Paula Navarro')).toHaveCount(0)
  await page.getByRole('tab', { name: /Descartados/ }).click()
  await expect(page.getByText('Paula Navarro')).toBeVisible()
})

test('la Bandeja y Ajustes llevan a los contactos', async ({ page, fake }) => {
  sembrar(fake)
  await entrarComoEntrenador(page)

  // Bandeja (cola): una sección con los nuevos
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a la bandeja')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('region', { name: 'Contactos nuevos' }).getByText('Paula Navarro')).toBeVisible()

  // Ajustes: ya no es el único sitio, y desde la página pública se enlaza a la pestaña
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a ajustes')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: /Contactos recibidos \(2\)/ }).click()
  await expect(page.getByRole('heading', { name: 'Contactos', level: 2 })).toBeVisible()
})

test('el aviso del contacto nuevo sale en la campanita y lleva a la pestaña', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('leads', lead('l1', 'Paula Navarro', { phone: '622 11 22 33', message: 'Quiero empezar a entrenar fuerza' }))
  // Lo que deja el trigger de la base de datos al entrar el contacto
  fake.seed('notificaciones', { id: 'lead_l1', trainer_id: ids.trainer, client_id: null, tipo: 'nuevo_contacto', titulo: 'Nuevo contacto: Paula Navarro', mensaje: 'Quiero empezar a entrenar fuerza', leida: false, created_at: Date.now(), destinatario: 'trainer' })
  await entrarComoEntrenador(page)

  await page.getByRole('button', { name: 'Abrir menú' }).click() // en el móvil, la campanita está en el menú lateral
  await page.getByRole('button', { name: /Notificaciones \(1 sin leer\)/ }).first().click()
  await page.getByText('Nuevo contacto: Paula Navarro').click()
  await expect(page.getByRole('heading', { name: 'Contactos', level: 2 })).toBeVisible()
  await expect(page.getByText('Quiero empezar a entrenar fuerza').first()).toBeVisible()
})

test('convertir un contacto en cliente: el alta sale rellena, se guardan sus datos y el contacto pasa a "Clientes"', async ({ page, fake }) => {
  sembrar(fake)
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a contactos')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Paula Navarro')).toBeVisible()

  await page.getByRole('button', { name: 'Convertir en cliente' }).first().click()
  const alta = page.getByRole('dialog')
  await expect(alta.getByText('Viene de un contacto de tu página pública')).toBeVisible()
  await expect(alta.getByPlaceholder('Nombre')).toHaveValue('Paula')
  await expect(alta.getByPlaceholder('Apellido')).toHaveValue('Navarro')
  await expect(alta.getByPlaceholder('+34 600 000 000')).toHaveValue('622 11 22 33')
  await alta.getByRole('button', { name: 'Crear cliente' }).click()

  // Cliente creado con el contexto del contacto en sus notas privadas
  await expect.poll(() => fake.rows('clientes').find(c => c.name === 'Paula')?.notas_privadas ?? '').toContain('Quiero empezar a entrenar fuerza')
  const nuevo = fake.rows('clientes').find(c => c.name === 'Paula')!
  expect(nuevo.surname).toBe('Navarro')
  expect(nuevo.trainerId).toBe(ids.trainer)
  // Y el contacto queda como convertido
  await expect.poll(() => fake.rows('leads').find(l => l.id === 'l1')!.status).toBe('convertido')
})

async function irAContactos(page: import('@playwright/test').Page) {
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a contactos')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Contactos', level: 2 })).toBeVisible()
}

test('con la página pública activa, Contactos da el enlace para copiar y el QR', async ({ page, fake }) => {
  sembrar(fake)
  const fila = fake.rows('entrenadores').find(e => e.uid === ids.trainer)!
  fila.slug = 'alexfit'
  fila.public_page = { activa: true, bio: '', especialidades: [], servicios: [], ubicacion: '', instagram: '', whatsapp: '' }
  await entrarComoEntrenador(page)
  await irAContactos(page)

  await expect(page.getByText(/\/p\/alexfit$/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copiar enlace' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Código QR de tu página pública' })).toHaveCount(0) // plegado
  await page.getByRole('button', { name: 'Ver QR' }).click()
  const qr = page.getByRole('img', { name: 'Código QR de tu página pública' })
  await expect(qr).toBeVisible()
  expect((await qr.locator('path').getAttribute('d'))!.length).toBeGreaterThan(200) // trazo con módulos de verdad
  await expect(page.getByRole('button', { name: /Descargar \(SVG\)/ })).toBeVisible()
})

test('sin página pública activa, Contactos explica qué falta y lleva a Ajustes', async ({ page, fake }) => {
  sembrar(fake)
  await entrarComoEntrenador(page)
  await irAContactos(page)

  await expect(page.getByText('Aún no tienes página pública activa')).toBeVisible()
  await page.getByRole('button', { name: 'Configurar mi página' }).click()
  await expect(page.getByRole('heading', { name: 'Personalización' })).toBeVisible() // Ajustes
})
