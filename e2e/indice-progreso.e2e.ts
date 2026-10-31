import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, entrarComoEntrenador } from './support/flows'

const haceDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const sets = (w: string, r: string) => ({ 0: { weight: w, reps: r }, 1: { weight: w, reps: r } })

function conDosPeriodos(fake: Parameters<typeof seedWorld>[0]) {
  // Semanas fuera del plan: el entreno de hoy sigue pendiente
  fake.seed('registros', { clientId: ids.client, updatedAt: 1, logs: {
    ex_w20_d0_r0: { done: true, dateDone: haceDias(40), substituteName: 'Press banca', sets: sets('100', '5') },
    ex_w21_d0_r0: { done: true, dateDone: haceDias(10), substituteName: 'Press banca', sets: sets('105', '5') },
  } })
}

test('el cliente ve su índice de progreso y de dónde sale', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  conDosPeriodos(fake)
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Progreso', exact: true }).click()

  const card = page.getByLabel('Índice de progreso')
  await expect(card).toContainText('+5 %')               // solo fuerza y volumen +5 %, constancia 0 %
  await expect(card).toContainText('Estás progresando')
  await expect(card).toContainText('1 ejercicio repetido')
  await card.getByRole('button', { name: /Cómo se calcula/ }).click()
  await expect(card).toContainText('media ponderada')
})

test('el entrenador lo ve arriba del progreso del cliente', async ({ page, fake }) => {
  seedWorld(fake)
  conDosPeriodos(fake)
  await entrarComoEntrenador(page)
  // Con sesiones, su fila ya no dice «Nunca» (la ayuda abrirFichaDelCliente lo da por hecho)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' }) // en pantallas estrechas las pestañas de la ficha van en un menú
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Progreso/ }).first().click()
  await expect(page.getByLabel('Índice de progreso')).toContainText('Progresa')
})
