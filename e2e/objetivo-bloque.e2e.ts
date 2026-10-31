import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, entrarComoEntrenador, abrirFichaDelCliente } from './support/flows'

test('el cliente ve en Hoy el bloque en el que está y para qué sirve', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  // Dos semanas de un bloque de fuerza; el plan empieza hoy, así que está en la primera
  const plan = fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P
  plan.weeks = [0, 1].map(i => ({ ...plan.weeks[0], label: `Semana ${i + 1}`, bloque: 'Bloque de fuerza · 4 semanas', objetivo: 'fuerza' }))

  await entrarComoCliente(page)
  const bloque = page.getByTestId('bloque-actual')
  await expect(bloque).toContainText('Bloque de fuerza · 4 semanas · semana 1 de 2')
  await expect(bloque).toContainText('Subir tus máximos')
})

test('al aplicar un bloque, sus semanas llevan el objetivo; y se puede poner a mano', async ({ page, fake }) => {
  seedWorld(fake)
  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)
  const menu = page.getByRole('button', { name: 'Abrir menú' }) // en pantallas estrechas las pestañas de la ficha van en un menú
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Plan/ }).first().click()

  const objetivo = page.getByLabel('Objetivo del bloque')
  await expect(objetivo).toHaveValue('')
  await page.getByRole('button', { name: /Aplicar bloque/ }).click()
  await page.getByRole('button', { name: /Bloque de fuerza · 4 semanas/ }).click()
  await expect(objetivo).toHaveValue('fuerza') // la primera semana nueva del bloque

  await objetivo.selectOption('hipertrofia')
  await expect(objetivo).toHaveValue('hipertrofia')
})
