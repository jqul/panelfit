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
