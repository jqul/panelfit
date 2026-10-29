import { test, expect } from './support/test'
import { seedWorld } from './support/seed'
import { entrarComoEntrenador, abrirFichaDelCliente } from './support/flows'

const fecha = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const domingoDeEstaSemana = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 6); return fecha(d) }

test('en el calendario del plan, una sesión se copia a otro día de la misma semana', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true }) // plan de una semana que empieza hoy, con un día
  await entrarComoEntrenador(page)
  await abrirFichaDelCliente(page)
  await page.getByRole('button', { name: 'Abrir menú' }).click() // en el móvil, las pestañas de la ficha están en el menú lateral
  await page.getByRole('button', { name: /^Plan/ }).first().click()
  await page.getByRole('tab', { name: 'Calendario' }).click()

  const sesiones = page.getByRole('button', { name: /^DÍA A — EMPUJE, semana 1/ })
  await expect(sesiones).toHaveCount(1)
  await sesiones.first().click()
  await page.getByLabel('Nueva fecha').fill(domingoDeEstaSemana())
  await page.getByRole('button', { name: 'Copiar a esta fecha' }).click()

  await expect(page.getByText(/«DÍA A — EMPUJE» copiada al domingo/)).toBeVisible()
  await expect(sesiones).toHaveCount(2)
})
