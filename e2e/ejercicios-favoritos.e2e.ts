import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'

test('el cliente sigue un ejercicio: sale primero en su historial y con su evolución en el resumen', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const sets = (w: string, r: string) => ({ 0: { weight: w, reps: r }, 1: { weight: w, reps: r } })
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    // Semanas fuera del plan: el entreno de hoy sigue pendiente
    ex_w20_d0_r0: { done: true, dateDone: '2026-10-01', substituteName: 'Remo con barra', sets: sets('60', '8') },
    ex_w21_d0_r0: { done: true, dateDone: '2026-10-08', substituteName: 'Remo con barra', sets: sets('65', '8') },
    ex_w21_d0_r1: { done: true, dateDone: '2026-10-09', substituteName: 'Press banca', sets: sets('80', '5') },
  } })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Progreso', exact: true }).click()

  const card = page.getByLabel('Ejercicios que sigues')
  await expect(card).toContainText('Marca con la estrella')
  await card.getByRole('button', { name: 'Elegir ejercicios →' }).click()

  // Ya en Entrenos › Por ejercicio; el press (lo último) va primero hasta que se sigue el remo
  await expect(page.getByRole('button', { name: 'Por ejercicio' })).toHaveAttribute('aria-pressed', 'true')
  const estrellas = page.getByRole('button', { name: /^(Seguir|Dejar de seguir) / })
  await expect(estrellas.first()).toHaveAccessibleName('Seguir Press banca')
  await page.getByRole('button', { name: 'Seguir Remo con barra' }).click()
  await expect(estrellas.first()).toHaveAccessibleName('Dejar de seguir Remo con barra')

  await page.getByRole('tab', { name: 'Resumen' }).click()
  await expect(card).toContainText('Remo con barra')
  await expect(card).toContainText('65×8')
})
