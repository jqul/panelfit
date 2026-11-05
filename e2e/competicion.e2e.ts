import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, entrarComoEntrenador } from './support/flows'

const enDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const planDe = (fake: Parameters<typeof seedWorld>[0]) => fake.rows('planes').find(r => r.clientId === ids.client)!.plan.P

test('el entrenador prepara una competición: intentos desde la marca, total y puntos', async ({ page, fake }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  seedWorld(fake)
  fake.rows('clientes').find(c => c.id === ids.client)!.genero = 'm'
  fake.rows('clientes').find(c => c.id === ids.client)!.weight = 63
  const plan = planDe(fake)
  plan.weeks[0].days[0].exercises[0] = { ...plan.weeks[0].days[0].exercises[0], name: 'Sentadilla', weight: '80%' }
  plan.marcas = { sentadilla: { kg: 140, fecha: enDias(-3) } }

  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Plan/ }).first().click()

  await page.getByRole('button', { name: 'Preparar una competición' }).click()
  const comp = page.getByRole('region', { name: 'Competición' })
  await expect(comp.getByTestId('cuenta-atras')).toHaveText('Faltan 56 días')
  await expect(comp.getByLabel('Ejercicio del plan para Sentadilla')).toHaveValue('Sentadilla')
  await expect(comp.getByLabel('Peso corporal (kg)')).toHaveValue('63')
  await expect(comp.getByRole('radio', { name: 'Femenina' })).toHaveAttribute('aria-checked', 'true')

  const sentadilla = comp.getByRole('listitem', { name: 'Intentos de Sentadilla' })
  await expect(sentadilla).toContainText('Marca 140 kg')
  await sentadilla.getByRole('button', { name: 'Proponer' }).click()
  await expect(sentadilla.getByLabel('3º intento de Sentadilla')).toHaveValue('142.5') // 101 % de 140 → 141,4 → 142,5

  await comp.getByLabel('3º intento de Press banca').fill('75')
  await comp.getByLabel('3º intento de Peso muerto').fill('160')
  await comp.getByLabel('1º intento de Press banca').fill('67.5')
  await expect(comp.getByTestId('resumen-competicion')).toContainText('377,5 kg') // 142,5 + 75 + 160
  await expect(comp.getByTestId('resumen-competicion')).toContainText('DOTS')
  await expect(comp.getByTestId('resumen-competicion')).toContainText('IPF GL')

  const c = () => fake.rows('planes').find(r => r.clientId === ids.client)?.plan?.P?.competicion
  await expect.poll(() => c()?.intentos?.sentadilla, { timeout: 10000 }).toEqual([127.5, 135, 142.5])
  expect(c()?.sexo).toBe('m')
})

test('el cliente ve su competición en Hoy con la cuenta atrás y sus intentos', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  planDe(fake).competicion = {
    fecha: enDias(20), nombre: 'Open de Madrid', sexo: 'm', pesoCorporal: 63,
    intentos: { sentadilla: [125, 132.5, 140], banca: [65, 70, 75], muerto: [145, 152.5, 160] },
  }
  await entrarComoCliente(page)
  const comp = page.getByRole('region', { name: 'Tu competición' })
  await expect(comp).toContainText('Open de Madrid')
  await expect(comp).toContainText('20')
  await expect(comp).toContainText('Peaking')
  await expect(comp.getByRole('listitem').filter({ hasText: 'Sentadilla' })).toContainText('132,5')
  await expect(comp).toContainText('Total si entran los terceros: 375 kg')
})
