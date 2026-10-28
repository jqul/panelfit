import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import type { FakeSupabase } from './support/fakeSupabase'

// El formulario de contacto de la página pública: pide un correo o teléfono de verdad, no se deja engañar por un robot
// y dice claro lo que falla.

function sembrar(fake: FakeSupabase) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const e = fake.rows('entrenadores').find(x => x.uid === ids.trainer)!
  e.slug = 'entrenador-e2e'
  e.public_page = { activa: true, bio: 'Entrenador de fuerza', especialidades: ['Fuerza'], servicios: ['Plan online'], ubicacion: '', instagram: '', whatsapp: '' }
}

async function abrirFormulario(page: import('@playwright/test').Page) {
  await page.goto('/p/entrenador-e2e')
  await page.getByRole('button', { name: /Pedir más información/ }).click()
  await page.getByLabel('Tu nombre').fill('Paula Navarro')
}

test('sin un correo o teléfono válido no se envía, y dice qué falta', async ({ page, fake }) => {
  sembrar(fake)
  await abrirFormulario(page)

  await page.getByRole('button', { name: 'Enviar' }).click() // sin contacto
  await expect(page.getByRole('alert')).toContainText('correo o un teléfono')
  await page.getByLabel('Email o teléfono').fill('hola que tal')
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByRole('alert')).toContainText('El teléfono no parece válido')
  await page.getByLabel('Email o teléfono').fill('paula@')
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByRole('alert')).toContainText('El correo no parece válido')
  expect(fake.rows('leads')).toHaveLength(0) // nada llegó al servidor
})

test('con un teléfono válido el contacto llega limpio al entrenador', async ({ page, fake }) => {
  sembrar(fake)
  await abrirFormulario(page)
  await page.getByLabel('Email o teléfono').fill('622 11 22 33')
  await page.getByLabel('Mensaje').fill('Quiero empezar a entrenar fuerza')
  await page.getByRole('button', { name: 'Enviar' }).click()

  await expect(page.getByText('¡Gracias! Te contactaré pronto.')).toBeVisible()
  expect(fake.rows('leads')).toMatchObject([{ trainer_id: ids.trainer, name: 'Paula Navarro', phone: '622 11 22 33', email: null, message: 'Quiero empezar a entrenar fuerza', status: 'nuevo' }])
})

test('un robot que rellena el campo oculto parece haber enviado, pero no deja nada', async ({ page, fake }) => {
  sembrar(fake)
  await abrirFormulario(page)
  await page.getByLabel('Email o teléfono').fill('robot@example.com')
  await page.locator('input[name="web"]').fill('http://spam.example') // un campo que una persona no ve
  await page.getByRole('button', { name: 'Enviar' }).click()

  await expect(page.getByText('¡Gracias! Te contactaré pronto.')).toBeVisible()
  expect(fake.rows('leads')).toHaveLength(0)
})

test('si el servidor frena el envío (demasiados en una hora), lo dice en vez de quedarse callado', async ({ page, fake }) => {
  sembrar(fake)
  for (let i = 0; i < 10; i++) fake.seed('leads', { id: `l${i}`, trainer_id: ids.trainer, name: `Robot ${i}`, email: `r${i}@example.com`, phone: null, message: null, status: 'nuevo', created_at: Date.now() - 60_000, referred_by_client_id: null })
  await abrirFormulario(page)
  await page.getByLabel('Email o teléfono').fill('paula@example.com')
  await page.getByRole('button', { name: 'Enviar' }).click()

  await expect(page.getByRole('alert')).toContainText('Demasiados mensajes')
  await expect(page.getByText('¡Gracias!')).toHaveCount(0)
})
