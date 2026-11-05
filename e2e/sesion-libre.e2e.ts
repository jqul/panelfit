import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, entrarComoEntrenador } from './support/flows'

const conLibre = (fake: Parameters<typeof seedWorld>[0]) => {
  const plan = fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P
  plan.weeks[0].days[0].exercises = [{
    name: 'Movilidad', sets: '1x1', weight: '', isMain: false, kind: 'libre', hideRest: true, videoUrl: '',
    comment: '10 min de movilidad de cadera\n\n3 rondas: 30 s de plancha y 10 puentes de glúteo',
  }]
}
const registro = (fake: Parameters<typeof seedWorld>[0]) => fake.rows('registros').find(r => r.clientId === ids.client)?.logs?.ex_w0_d0_r0

test('vista de foco: el cliente lee la sesión libre y la marca como hecha', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  conLibre(fake)
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()

  const bloque = page.getByTestId('sesion-libre')
  await expect(bloque).toContainText('10 min de movilidad de cadera')
  await expect(bloque).toContainText('3 rondas: 30 s de plancha')
  await expect(page.getByText('Sesión libre', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Peso serie 1')).toHaveCount(0) // sin kilos ni reps
  await bloque.getByRole('button', { name: 'Marcar como hecha' }).click()
  await expect.poll(() => registro(fake)?.done).toBe(true)
})

test('vista de lista: sin tabla de series, un solo hecho', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  conLibre(fake)
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  await page.getByRole('button', { name: 'Ver todos los ejercicios en lista' }).click()

  const bloque = page.getByTestId('sesion-libre')
  await expect(bloque).toContainText('3 rondas')
  await expect(page.getByRole('button', { name: /Añadir serie/ })).toHaveCount(0)
  await bloque.getByRole('button', { name: 'Marcar como hecha' }).click()
  await expect(bloque.getByRole('button', { name: 'Hecha · desmarcar' })).toBeVisible()
  await expect.poll(() => registro(fake)?.done).toBe(true)
})

test('el entrenador añade una sesión libre con su texto y vídeo', async ({ page, fake }) => {
  await page.setViewportSize({ width: 1280, height: 900 }) // el editor del plan, en escritorio
  seedWorld(fake)
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Plan/ }).first().click()

  await page.getByRole('button', { name: '📝 Añadir sesión libre' }).first().click()
  await page.locator('.plan-grid').last().click({ position: { x: 8, y: 8 } }) // la nueva es la última fila: abre su panel
  const panel = page.getByRole('group', { name: /^Sesión libre/ })
  await panel.getByRole('button', { name: 'Yoga' }).click()
  await panel.getByLabel('Qué tiene que hacer').fill('Saludo al sol x5')
  await panel.getByLabel('Vídeo de la sesión').fill('https://youtu.be/abc123')

  const ultimo = () => fake.rows('planes').find(r => r.clientId === ids.client)?.plan?.P?.weeks?.[0]?.days?.[0]?.exercises?.at(-1)
  await expect.poll(() => ultimo(), { timeout: 10000 }).toMatchObject({ name: 'Yoga', kind: 'libre', comment: 'Saludo al sol x5', videoUrl: 'https://youtu.be/abc123' })
})
