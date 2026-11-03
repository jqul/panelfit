import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

test('cuatro preguntas recomiendan un programa de PanelFit con el porqué, y se añade a la librería', async ({ page, fake }) => {
  seedWorld(fake)
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Workouts')
  await page.getByRole('option', { name: 'Ir a Workouts' }).click()
  await page.getByRole('button', { name: 'Más herramientas' }).click()
  await page.getByRole('button', { name: /Galería de workouts/ }).click()

  await page.getByRole('button', { name: /¿Cuál le va mejor\?/ }).click()
  const q = page.getByLabel('Cuestionario de programa')
  await q.getByRole('radiogroup', { name: '¿Cuántos días por semana puede entrenar?' }).getByRole('radio', { name: '4' }).click()
  await q.getByRole('radiogroup', { name: '¿Qué experiencia tiene?' }).getByRole('radio', { name: 'Intermedio' }).click()
  await q.getByRole('radiogroup', { name: '¿Qué busca sobre todo?' }).getByRole('radio', { name: 'Hipertrofia' }).click()
  await expect(q.getByRole('list', { name: 'Programas recomendados' })).toHaveCount(0) // falta una respuesta
  await q.getByRole('radiogroup', { name: '¿Dónde entrena?' }).getByRole('radio', { name: 'Gimnasio' }).click()

  const primero = q.getByRole('list', { name: 'Programas recomendados' }).getByRole('listitem').first()
  await expect(primero).toContainText('Torso / Pierna 4 días')
  await expect(primero).toContainText('4 días, los que puede entrenar · pensado para hipertrofia · nivel intermedio')
  await primero.getByRole('button', { name: /^Añadir/ }).click()
  await expect.poll(() => fake.rows('plan_templates').filter(r => r.trainer_id === ids.trainer).map(r => r.name)).toContain('Torso / Pierna 4 días')
})
