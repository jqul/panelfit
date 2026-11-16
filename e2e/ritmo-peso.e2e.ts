import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const dos = (n: number) => String(n).padStart(2, '0')
const fecha = (d: Date) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
// Lunes de la semana actual desplazado `semanas` hacia atrás, más `dias` días
const lunes = (semanas: number, dias = 0) => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7 * semanas + dias); return fecha(d) }

test('el peso enseña la media semanal, el ritmo en % y avisa si el ritmo de pérdida se mantiene alto', async ({ page, fake }) => {
  test.setTimeout(120_000) // la primera carga de pantallas diferidas compila en frío
  expect.configure({ timeout: 30_000 })
  seedWorld(fake)
  // Tres semanas seguidas con tres pesajes cada una: medias de 81, 80,2 y 79,4 kg (−0,99 % y −1 % por semana)
  ;([[3, 81], [2, 80.2], [1, 79.4]] as const).forEach(([sem, kg]) =>
    [0, 1, 2].forEach(d => fake.seed('registros_peso', { clientId: ids.client, date: lunes(sem, d), weight: kg })))

  await entrarComoEntrenador(page)
  await page.getByRole('button', { name: /María García/ }).first().click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
  await page.getByRole('button', { name: /^Progreso/ }).first().click()
  await page.getByRole('button', { name: /^.{0,3}Cuerpo/ }).click()
  await page.getByRole('button', { name: /^.{0,3}Peso/ }).first().click()

  // Ritmo de la última semana frente a la anterior
  await expect(page.getByTestId('ritmo-actual')).toContainText('−1 % por semana')
  await expect(page.getByTestId('ritmo-actual')).toContainText('−0,8 kg')

  // Dos semanas seguidas por encima del 0,75 %: aviso neutro, que habla de revisar y no concluye
  const aviso = page.getByTestId('aviso-ritmo')
  await expect(aviso).toContainText('Ritmo de pérdida alto')
  await expect(aviso).toContainText('conviene revisar el déficit y la recuperación')
  await expect(aviso).toContainText('no una regla')

  // Tabla de medias semanales con el número de pesajes
  const tabla = page.getByRole('region', { name: 'Peso medio por semana' })
  await expect(tabla.getByRole('row')).toHaveCount(4) // cabecera + 3 semanas
  await expect(tabla).toContainText('81 kg')
  await expect(tabla).toContainText('80,2 kg')
  await expect(tabla).toContainText('79,4 kg')
  await expect(tabla).toContainText('−0,8 kg · −1 %')
})
