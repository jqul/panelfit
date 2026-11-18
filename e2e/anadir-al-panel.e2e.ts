import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador, abrirFichaDelCliente } from './support/flows'
import type { Page } from '@playwright/test'

// «Añadir» en la ficha también lleva a lo que vive fuera de ella (cita, encuesta, documento), con el cliente ya elegido.
async function elegirAnadir(page: Page, opcion: string) {
  await page.getByRole('banner').getByRole('button', { name: 'Añadir' }).click()
  await page.getByRole('menuitem', { name: opcion, exact: true }).click()
}

test('Añadir → Cita abre la nueva sesión en la Agenda con ese cliente elegido', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)
  await elegirAnadir(page, 'Cita')

  const nueva = page.getByRole('dialog', { name: 'Nueva sesión' })
  await expect(nueva).toBeVisible()
  await expect(nueva.getByRole('combobox').filter({ hasText: 'María García' }).first()).toHaveValue(ids.client)
})

test('Añadir → Encuesta abre «Programar envío» con ese cliente y envío único', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('survey_templates', { id: 'enc-1', trainer_id: ids.trainer, name: 'Check-in semanal', questions: [], created_at: 1 })
  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)
  await elegirAnadir(page, 'Encuesta')

  await expect(page.getByRole('heading', { name: 'Programar envío' })).toBeVisible()
  await expect(page.getByRole('combobox').filter({ hasText: 'María García' }).first()).toHaveValue(ids.client)
})

test('Añadir → Documento sale a Documentos y explica que se enseñan por etiqueta', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)
  await elegirAnadir(page, 'Documento')
  await expect(page.getByText('Los documentos se enseñan a los clientes por etiqueta')).toBeVisible()
  await expect(page.getByRole('heading', { name: /Documentos/ }).first()).toBeVisible()
})
