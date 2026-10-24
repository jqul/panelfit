import { test, expect } from './support/test'
import { seedWorld } from './support/seed'
import { entrarComoCliente } from './support/flows'

// El entreno en vivo se descarga bajo demanda (y se precarga cuando el navegador está libre). Si un cliente
// pulsa "Empezar" sin conexión y sin haberlo descargado, la app tiene que avisar, no romperse.
test('sin conexión y sin tener descargado el entreno, avisa; al reintentar con conexión se abre', async ({ page, fake, erroresEsperados }) => {
  erroresEsperados.push(/Failed to fetch dynamically imported module/) // la descarga bloqueada
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  // El trozo del entreno no se puede descargar (y su precarga tampoco)
  const bloqueo = (route: { abort: () => Promise<void> }) => route.abort()
  await page.route(/\/ActiveWorkout\.tsx/, bloqueo)
  await entrarComoCliente(page)

  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  const aviso = page.getByRole('alert')
  await expect(aviso).toContainText('No se pudo abrir el entreno')

  // Vuelve la conexión: "Reintentar" recarga la app (el navegador no repite una descarga fallida en la
  // misma carga) y ya se puede abrir el entreno
  await page.unroute(/\/ActiveWorkout\.tsx/, bloqueo)
  await aviso.getByRole('button', { name: 'Reintentar' }).click()
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  await expect(page.getByRole('button', { name: 'HECHO' })).toBeVisible()
})

test('"Volver" en el aviso cierra la pantalla y deja el panel como estaba', async ({ page, fake, erroresEsperados }) => {
  erroresEsperados.push(/Failed to fetch dynamically imported module/)
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await page.route(/\/ActiveWorkout\.tsx/, route => route.abort())
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  await page.getByRole('alert').getByRole('button', { name: 'Volver' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Empezar entrenamiento' })).toBeVisible()
})
