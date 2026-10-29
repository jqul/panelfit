import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { Page } from '@playwright/test'

const ej = (name: string, comment = '', weight = '') => ({ name, sets: '3x5', weight, comment, isMain: false })

// Un workout de dos semanas con un comentario personal y dos cargas escritas.
const CON_DATOS = {
  type: 'Fuerza',
  weeks: [
    { label: 'Semana 1', rpe: '', isCurrent: false, days: [{ title: 'Día A', focus: '', exercises: [ej('Sentadilla', '🎯 Objetivo: 90 kg x 5 a RIR 3', '90kg'), ej('Press banca')] }] },
    { label: 'Semana 2', rpe: '', isCurrent: false, days: [{ title: 'Día A', focus: '', exercises: [ej('Sentadilla', '', '92.5kg')] }] },
  ],
}
const SIN_DATOS = { type: 'Fuerza', weeks: [{ label: 'Semana 1', rpe: '', isCurrent: false, days: [{ title: 'Día A', focus: '', exercises: [ej('Dominadas')] }] }] }

function sembrar(fake: Parameters<typeof seedWorld>[0]) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('plan_templates', { id: 'tmpl-1', trainer_id: ids.trainer, name: 'Mi bloque de fuerza', description: '', created_at: 2, updated_at: 2, label_ids: [], is_public: false, plan: CON_DATOS })
  fake.seed('plan_templates', { id: 'tmpl-2', trainer_id: ids.trainer, name: 'Solo estructura', description: '', created_at: 1, updated_at: 1, label_ids: [], is_public: false, plan: SIN_DATOS })
}

async function abrirWorkouts(page: Page) {
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a workouts')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Workouts', level: 2 })).toBeVisible()
}

async function menuCompartir(page: Page, nombre: string) {
  await page.getByRole('button', { name: `Acciones de ${nombre}` }).click()
  await page.getByRole('button', { name: /Compartir en la galería/ }).click()
}

test.describe('compartir un workout en la galería', () => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })

  test('antes de publicar avisa de los comentarios y cargas que se verían, y cancelar no publica nada', async ({ page, fake }) => {
    sembrar(fake)
    await abrirWorkouts(page)

    await menuCompartir(page, 'Mi bloque de fuerza')
    const aviso = page.getByRole('dialog', { name: '¿Compartir en la galería?' })
    await expect(aviso).toBeVisible()
    await expect(aviso).toContainText('3 ejercicios') // cuenta todas las semanas, no solo la primera
    await expect(aviso).toContainText('1 comentario')
    await expect(aviso).toContainText('2 cargas')

    await aviso.getByRole('button', { name: 'Cancelar' }).click()
    await expect(aviso).toHaveCount(0)
    await expect(page.getByText('Público', { exact: true })).toHaveCount(0)
  })

  test('al confirmar queda público, y dejar de compartir no pregunta', async ({ page, fake }) => {
    sembrar(fake)
    await abrirWorkouts(page)

    await menuCompartir(page, 'Mi bloque de fuerza')
    await page.getByRole('dialog', { name: '¿Compartir en la galería?' }).getByRole('button', { name: 'Compartir' }).click()
    await expect(page.getByText('Público', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Acciones de Mi bloque de fuerza' }).click()
    await page.getByRole('button', { name: /Dejar de compartir/ }).click()
    await expect(page.getByRole('dialog', { name: '¿Compartir en la galería?' })).toHaveCount(0) // salir no necesita confirmación
    await expect(page.getByText('Público', { exact: true })).toHaveCount(0)
  })

  test('si no lleva comentarios ni cargas, lo dice', async ({ page, fake }) => {
    sembrar(fake)
    await abrirWorkouts(page)

    await menuCompartir(page, 'Solo estructura')
    await expect(page.getByRole('dialog', { name: '¿Compartir en la galería?' })).toContainText('solo se ve la estructura')
  })
})
