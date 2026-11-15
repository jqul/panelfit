import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'

// La función del reloj (importar entrenos de archivo y Strava) está apagada por defecto hasta que se pueda sacar completa
// (lib/funcionesEnDesarrollo): el cliente no ve nada de ella, ni en su progreso ni en las tareas de cardio.
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

test('con el reloj apagado el cliente no ve la importación ni Strava en su progreso', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Progreso', exact: true }).click()
  await page.getByRole('tab', { name: 'Entrenos' }).click()
  await expect(page.getByRole('tab', { name: 'Entrenos', selected: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Entrenos del reloj' })).toHaveCount(0)
  await expect(page.getByLabel('Archivo del reloj')).toHaveCount(0)
})

test('con el reloj apagado una tarea de cardio no ofrece subir el entreno del reloj', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('tareas_cliente', { id: 't-correr', client_id: ids.client, titulo: 'Correr 30 min', tipo: 'cardio', nota: '', enlace: '', fecha: hoy(), repetir: 'una', dias: [], hasta: null, origen: null })
  await entrarComoCliente(page)
  await expect(page.getByRole('checkbox', { name: 'Correr 30 min' })).toBeVisible() // la tarea sigue ahí, como casilla
  await expect(page.getByRole('button', { name: 'Desde el reloj' })).toHaveCount(0)
})
