import { test, expect as expectBase } from './support/test'

// En la demo no hay filas reales: añadir de la galería y asignar a un cliente de ejemplo tienen que funcionar igual
// (antes «Añadir» intentaba guardar en la base de datos y fallaba).

test.setTimeout(180_000) // la demo y los trozos diferidos compilan en frío
const expect = expectBase.configure({ timeout: 45_000 })

test('en la demo, un programa de la galería se añade a la librería y se asigna a un cliente de ejemplo', async ({ page }) => {
  await page.goto('/?demo=1')
  await expect(page.getByText('3 contactos nuevos')).toBeVisible()
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Workouts')
  await page.getByRole('option', { name: 'Ir a Workouts' }).click()

  // En la demo el menú puede tardar en responder mientras termina de cargar: se reintenta hasta que se abre
  const galeria = page.getByRole('button', { name: /Galería de workouts/ })
  await expect(async () => {
    if (!(await galeria.isVisible())) await page.getByRole('button', { name: 'Más herramientas' }).click()
    await expectBase(galeria).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 60_000 })
  await galeria.click()
  await page.getByRole('button', { name: /¿Cuál le va mejor\?/ }).click()
  const q = page.getByLabel('Cuestionario de programa')
  await q.getByRole('radiogroup', { name: '¿Cuántos días por semana puede entrenar?' }).getByRole('radio', { name: '3' }).click()
  await q.getByRole('radiogroup', { name: '¿Qué experiencia tiene?' }).getByRole('radio', { name: 'Principiante' }).click()
  await q.getByRole('radiogroup', { name: '¿Qué busca sobre todo?' }).getByRole('radio', { name: 'Forma general' }).click()
  await q.getByRole('radiogroup', { name: '¿Dónde entrena?' }).getByRole('radio', { name: 'Gimnasio' }).click()
  await q.getByRole('list', { name: 'Programas recomendados' }).getByRole('listitem').first().getByRole('button', { name: /^Añadir/ }).click()

  const aviso = page.getByRole('status').filter({ hasText: 'ya está en tu librería' })
  await expect(aviso).toBeVisible()
  await expect(page.getByRole('button', { name: /^Asignar Cuerpo completo 3 días a un cliente$/ })).toBeVisible() // en la lista

  await aviso.getByRole('button', { name: 'Asignar a un cliente' }).click()
  const modal = page.getByRole('dialog', { name: /^Asignar «/ })
  await modal.getByRole('radio').first().click()
  await modal.getByRole('button', { name: /^Asignar a / }).click()
  await expect(page.getByText(/asignado a .+ ✓/)).toBeVisible()
})
