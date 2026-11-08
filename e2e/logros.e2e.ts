import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, entrarComoEntrenador } from './support/flows'

const dia = (atras: number) => { const d = new Date(); d.setDate(d.getDate() - atras); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// Dos sesiones de press banca fuera del plan (claves de otra semana): la segunda, con más peso, es un récord
const conHistorial = (fake: Parameters<typeof seedWorld>[0]) => fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
  ex_w5_d0_r0: { done: true, dateDone: dia(14), substituteName: 'Press banca', sets: { 0: { weight: '70', reps: '5' } } },
  ex_w6_d0_r0: { done: true, dateDone: dia(7), substituteName: 'Press banca', sets: { 0: { weight: '75', reps: '5' } } },
} })

test('el cliente ve en Hoy sus logros: primer entreno y primer récord', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  conHistorial(fake)
  await entrarComoCliente(page)
  const logros = page.getByRole('list', { name: 'Logros conseguidos' })
  await expect(logros).toContainText('Primer entreno')
  await expect(logros).toContainText('Primer récord')
})

test('el entrenador ve los logros del cliente en el resumen de su ficha', async ({ page, fake }) => {
  seedWorld(fake)
  conHistorial(fake)
  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Logros conseguidos' })).toContainText('Primer récord')
})
