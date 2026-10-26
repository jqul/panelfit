import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, entrarComoEntrenador } from './support/flows'

// Consejos cortos del entrenador: los escribe en Ajustes y el cliente los lee en Más.

test('el cliente lee en Más los consejos que ha escrito su entrenador', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.rows('entrenadores').find(e => e.uid === ids.trainer)!.profile.consejos = [
    { id: 'c1', titulo: 'Dormir bien', texto: 'Entre 7 y 9 horas.' },
    { id: 'c2', titulo: '', texto: 'sin título: no debe salir' },
  ]
  await entrarComoCliente(page)
  await page.getByRole('navigation').getByRole('button', { name: 'Más' }).click()

  const seccion = page.getByRole('region', { name: 'Consejos de tu entrenador' })
  await expect(seccion.getByText('Consejos de Alex')).toBeVisible()
  await expect(seccion.getByText('Dormir bien')).toBeVisible()
  await expect(seccion.getByText('Entre 7 y 9 horas.')).toBeHidden() // plegado hasta que se abre
  await seccion.getByText('Dormir bien').click()
  await expect(seccion.getByText('Entre 7 y 9 horas.')).toBeVisible()
  await expect(seccion.getByText('sin título')).toHaveCount(0)
})

test('sin consejos, Más no enseña la sección', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  await page.getByRole('navigation').getByRole('button', { name: 'Más' }).click()
  await expect(page.getByText('Tu cuenta')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Consejos de tu entrenador' })).toHaveCount(0)
})

test('el entrenador escribe consejos en Ajustes y se guardan en su perfil sin pisar el resto', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a ajustes')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Consejos para tus clientes')).toBeVisible()

  await expect(page.getByRole('button', { name: 'Guardar consejos' })).toBeDisabled() // nada que guardar aún
  await page.getByRole('button', { name: '+ Ejemplo: Dormir bien' }).click()
  await page.getByRole('button', { name: 'Nuevo consejo' }).click()
  await page.getByLabel('Título del consejo 2').fill('Mi norma')
  await page.getByLabel('Texto del consejo 2').fill('Calentar siempre.')
  await page.getByRole('button', { name: 'Guardar consejos' }).click()
  await expect(page.getByText('Consejos guardados')).toBeVisible()

  const perfil = fake.rows('entrenadores').find(e => e.uid === ids.trainer)!.profile
  expect(perfil.consejos.map((c: { titulo: string }) => c.titulo)).toEqual(['Dormir bien', 'Mi norma'])
  expect(perfil.brandName).toBe('AlexFit') // el resto del perfil sigue ahí
})
