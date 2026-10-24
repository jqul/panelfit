import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { Page } from '@playwright/test'

function sembrar(fake: Parameters<typeof seedWorld>[0]) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('plan_templates', {
    id: 'tmpl-1', trainer_id: ids.trainer, name: 'Fuerza 5x3 Powerlifting', description: '', created_at: 1, updated_at: 1, label_ids: [], is_public: false,
    plan: { type: 'Fuerza', weeks: [{ label: 'Semana 1', rpe: '', isCurrent: false, days: [{ title: 'Día A', focus: '', exercises: [] }] }] },
  })
  fake.seed('plan_templates', {
    id: 'tmpl-2', trainer_id: ids.trainer, name: 'Hipertrofia pierna', description: '', created_at: 2, updated_at: 2, label_ids: [], is_public: false,
    plan: { type: 'Hipertrofia', weeks: [{ label: 'Semana 1', rpe: '', isCurrent: false, days: [{ title: 'Día A', focus: '', exercises: [] }] }] },
  })
}

async function abrirBuscador(page: Page) {
  await page.keyboard.press('Control+K')
  const buscador = page.getByRole('combobox', { name: 'Buscar' })
  await expect(buscador).toBeFocused() // el foco entra solo: se puede escribir al instante
  return buscador
}

test('Ctrl+K abre el buscador y Esc lo cierra', async ({ page, fake }) => {
  sembrar(fake)
  await entrarComoEntrenador(page)

  await abrirBuscador(page)
  await expect(page.getByRole('dialog', { name: 'Búsqueda global' })).toBeVisible()
  // Sin texto es un lanzador de acciones
  await expect(page.getByRole('option', { name: 'Nuevo cliente' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Búsqueda global' })).toHaveCount(0)
})

test('encuentra a un cliente sin tildes ni mayúsculas y abre su ficha', async ({ page, fake }) => {
  sembrar(fake)
  await entrarComoEntrenador(page)

  const buscador = await abrirBuscador(page)
  await buscador.fill('MARIA garcia')
  await expect(page.getByRole('group', { name: 'Clientes' }).getByRole('option', { name: /María García/ })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible() // la ficha del cliente
})

test('un workout se abre en su pestaña con el buscador ya relleno, y el texto no se queda pegado', async ({ page, fake }) => {
  sembrar(fake)
  await entrarComoEntrenador(page)

  const buscador = await abrirBuscador(page)
  await buscador.fill('powerlifting')
  await expect(page.getByRole('group', { name: 'Workouts' }).getByRole('option', { name: /Fuerza 5x3 Powerlifting/ })).toBeVisible() // cargado al abrir
  await page.keyboard.press('Enter')

  await expect(page.getByRole('heading', { name: 'Workouts', level: 2 })).toBeVisible()
  await expect(page.getByPlaceholder(/Buscar workout/)).toHaveValue('Fuerza 5x3 Powerlifting')
  await expect(page.getByText('Hipertrofia pierna')).toHaveCount(0) // la lista ya viene filtrada

  // Si se sale a otra pestaña y se vuelve a mano, el filtro no vuelve
  await page.getByRole('button', { name: 'Ejercicios', exact: true }).click()
  await page.getByRole('button', { name: 'Workouts', exact: true }).click()
  await expect(page.getByPlaceholder(/Buscar workout/)).toHaveValue('')
  await expect(page.getByText('Hipertrofia pierna')).toBeVisible()
})

test('una acción lleva a la sección y las flechas mueven la selección', async ({ page, fake }) => {
  sembrar(fake)
  await entrarComoEntrenador(page)

  const buscador = await abrirBuscador(page)
  await buscador.fill('ir a')
  const primera = page.getByRole('option').first()
  await expect(primera).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('ArrowDown')
  await expect(primera).toHaveAttribute('aria-selected', 'false')
  await expect(page.getByRole('option').nth(1)).toHaveAttribute('aria-selected', 'true')

  await buscador.fill('avisos') // sinónimo de la Bandeja
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Bandeja', level: 2 })).toBeVisible()
})

test('sin coincidencias lo dice', async ({ page, fake }) => {
  sembrar(fake)
  await entrarComoEntrenador(page)

  const buscador = await abrirBuscador(page)
  await buscador.fill('zzzzzz')
  await expect(page.getByText('Nada coincide con “zzzzzz”')).toBeVisible()
})
