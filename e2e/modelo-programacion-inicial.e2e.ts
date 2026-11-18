import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

// «Programación inicial»: un modelo de encuesta con lo que hace falta para preparar un primer programa. Se abre ya relleno en el
// editor, se puede ajustar, y al guardarlo es una encuesta más del entrenador.
test('el entrenador usa el modelo Programación inicial, lo ajusta y lo guarda como suyo', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Encuestas')
  await page.getByRole('option', { name: 'Ir a Encuestas' }).click()

  await expect(page.getByText('Modelo: Programación inicial')).toBeVisible()
  await page.getByRole('button', { name: 'Usar el modelo Programación inicial' }).click()

  // El editor se abre ya relleno: nombre y 22 preguntas, con solo 5 obligatorias
  await expect(page.getByLabel('Nombre')).toHaveValue('Programación inicial')
  await expect(page.getByRole('button', { name: 'REQ', exact: true })).toHaveCount(5)
  await expect(page.getByRole('button', { name: 'OPC', exact: true })).toHaveCount(17)
  await expect(page.getByRole('textbox', { name: 'Pregunta 1', exact: true })).toHaveValue('¿Cuál es tu objetivo principal?')
  await expect(page.getByRole('textbox', { name: 'Pregunta 8', exact: true })).toHaveValue('¿Hay ejercicios que no quieras hacer o que no puedas hacer? ¿Por qué?')

  // Se ajusta antes de guardar: cambia el nombre
  await page.getByRole('button', { name: 'Guardar plantilla' }).scrollIntoViewIfNeeded()
  await page.getByLabel('Nombre').fill('Programación inicial · amigos')
  await page.getByRole('button', { name: 'Guardar plantilla' }).click()

  await expect.poll(() => fake.rows('survey_templates').filter(r => r.trainer_id === ids.trainer).length).toBe(1)
  const fila = fake.rows('survey_templates')[0]
  expect(fila.name).toBe('Programación inicial · amigos')
  expect(fila.questions).toHaveLength(22)
  expect(fila.auto_nuevos_desde).toBeNull() // no se envía sola a los clientes nuevos: eso lo decide el entrenador

  // Ya existe una encuesta con el modelo: la tarjeta del modelo sigue disponible porque el nombre es distinto
  await expect(page.getByText('Modelo: Programación inicial')).toBeVisible()
})
