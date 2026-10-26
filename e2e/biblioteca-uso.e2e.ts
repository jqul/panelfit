import { test, expect as expectBase } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

// La ficha del ejercicio dice a qué clientes se lo has puesto ahora en el plan.

const fila = (id: string, name: string, category: string) => ({
  id, trainer_id: ids.trainer, name, description: '', category, especialidades: [], videos: [], tags: [],
  use_count: 0, video_use_count: 0, created_at: 1, updated_at: 1, deleted_at: null, material: '', archived_at: null, alternativas: [],
})

test.setTimeout(120_000) // la primera carga compila el trozo diferido de la biblioteca
const expect = expectBase.configure({ timeout: 30_000 })

test('la ficha dice a qué clientes les has puesto el ejercicio, y avisa si a ninguno', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('exercise_library', fila('ex_1', 'Press banca', 'Pecho'), fila('ex_2', 'Peso muerto rumano', 'Pierna'))
  await page.addInitScript(id => localStorage.setItem(`pf_library_default_topup_${id}`, '8'), ids.trainer)
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a ejercicios')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Ejercicios', level: 2 })).toBeVisible()

  await page.getByRole('button', { name: 'Editar Press banca' }).click()
  await expect(page.getByText('En el plan de 1 cliente: María García')).toBeVisible() // el plan de la semilla lleva "Press banca"
  await page.getByRole('button', { name: 'Cerrar' }).click()

  await page.getByRole('button', { name: 'Editar Peso muerto rumano' }).click()
  await expect(page.getByText('Ningún cliente lo lleva ahora en su plan')).toBeVisible()
})
