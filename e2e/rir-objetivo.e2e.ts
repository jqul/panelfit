import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'

// El entrenador fija un RIR objetivo en el ejercicio (campo `rir` del plan): el cliente lo ve al hacerlo, no solo dentro del comentario.

function conRir(fake: Parameters<typeof seedWorld>[0], rir: Record<number, string>) {
  const fila = fake.rows('planes').find(p => p.clientId === ids.client)!
  const ejercicios = fila.plan.P.weeks[0].days[0].exercises
  for (const [i, v] of Object.entries(rir)) ejercicios[Number(i)].rir = v
}

test('el cliente ve el RIR objetivo del ejercicio, y solo donde el entrenador lo fijó', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  conRir(fake, { 0: '2-3' }) // Press banca: RIR 2-3; Remo y Curl: sin RIR
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()

  const chip = page.getByTestId('rir-objetivo')
  await expect(chip).toBeVisible()
  await expect(chip).toContainText('RIR 2-3')
  await expect(chip).toContainText('entre 2 y 3 repeticiones en reserva')
})

test('un RIR que no tiene sentido no se pinta', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  conRir(fake, { 0: '3-2' }) // mínimo mayor que el máximo
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  await expect(page.getByText('Press banca').first()).toBeVisible()
  await expect(page.getByTestId('rir-objetivo')).toHaveCount(0)
})
