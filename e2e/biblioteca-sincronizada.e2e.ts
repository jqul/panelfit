import { test, expect as expectBase } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'
import type { Page } from '@playwright/test'

// Los favoritos y las listas propias (grupos, especialidades, etiquetas) se sincronizan entre dispositivos.

const fila = (id: string, name: string, category: string) => ({
  id, trainer_id: ids.trainer, name, description: '', category, especialidades: [], videos: [], tags: [],
  use_count: 0, video_use_count: 0, created_at: 1, updated_at: 1, deleted_at: null, material: '', archived_at: null, alternativas: [],
})

function sembrar(fake: FakeSupabase) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('exercise_library', fila('ex_1', 'Remo con mancuerna', 'Espalda'), fila('ex_2', 'Curl de bíceps', 'Bíceps'))
}

async function abrirBiblioteca(page: Page) {
  await page.addInitScript(id => localStorage.setItem(`pf_library_default_topup_${id}`, '8'), ids.trainer)
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a ejercicios')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Ejercicios', level: 2 })).toBeVisible()
}

test.setTimeout(120_000) // la primera carga compila el trozo diferido de la biblioteca
const expect = expectBase.configure({ timeout: 30_000 })

const prefs = (fake: FakeSupabase) => fake.rows('exercise_library_prefs').find(r => r.trainer_id === ids.trainer)
const local = (page: Page, clave: string) => page.evaluate(k => localStorage.getItem(k), `${clave}${ids.trainer}`)

test('un dispositivo nuevo recibe del servidor los favoritos y las listas propias', async ({ page, fake }) => {
  sembrar(fake)
  fake.seed('exercise_library_prefs', {
    trainer_id: ids.trainer,
    valores: { fav: ['ex_2'], cats: ['Pecho', 'Mi grupo'], tags: [{ id: 't1', label: 'Rehab', emoji: '🩹', colorIdx: 0 }] },
    ts: { fav: 100, cats: 100, tags: 100 }, updated_at: 100,
  })
  await abrirBiblioteca(page) // localStorage vacío: es "otro dispositivo"

  await expect(page.getByRole('button', { name: 'Favoritos 1' })).toBeVisible() // el favorito llegó del servidor
  await expect.poll(() => local(page, 'pf_cats_')).toBe(JSON.stringify(['Pecho', 'Mi grupo']))
  expect(JSON.parse((await local(page, 'pf_tags_'))!)[0].label).toBe('Rehab')
  expect(prefs(fake)!.valores.fav).toEqual(['ex_2']) // y no se pisó el servidor con un dispositivo vacío
})

test('marcar un favorito lo sube al servidor, sin borrar lo que solo tenía el servidor', async ({ page, fake }) => {
  sembrar(fake)
  fake.seed('exercise_library_prefs', { trainer_id: ids.trainer, valores: { fav: [], cats: ['Pecho', 'Mi grupo'] }, ts: { fav: 100, cats: 100 }, updated_at: 100 })
  await abrirBiblioteca(page)
  await expect.poll(() => local(page, 'pf_cats_')).toBe(JSON.stringify(['Pecho', 'Mi grupo'])) // ya sincronizó

  await page.getByRole('button', { name: 'Marcar Remo con mancuerna como favorito' }).first().click()
  await expect.poll(() => prefs(fake)!.valores.fav).toEqual(['ex_1'])
  expect(prefs(fake)!.valores.cats).toEqual(['Pecho', 'Mi grupo']) // la lista que solo tenía el servidor sigue ahí
  expect(prefs(fake)!.ts.fav).toBeGreaterThan(100) // con su marca de tiempo nueva
})

test('lo que ya había en este dispositivo (de antes de la sincronización) se sube la primera vez', async ({ page, fake }) => {
  sembrar(fake)
  await page.addInitScript(uid => { localStorage.setItem(`pf_fav_${uid}`, JSON.stringify(['ex_1'])); localStorage.setItem(`pf_cats_${uid}`, JSON.stringify(['Pecho', 'Antiguo'])) }, ids.trainer)
  await abrirBiblioteca(page)

  await expect.poll(() => prefs(fake)?.valores.fav).toEqual(['ex_1'])
  expect(prefs(fake)!.valores.cats).toEqual(['Pecho', 'Antiguo'])
  await expect(page.getByRole('button', { name: 'Favoritos 1' })).toBeVisible()
})

test('si el servidor tiene lo más reciente de una lista, gana; si lo tiene este dispositivo, gana este', async ({ page, fake }) => {
  sembrar(fake)
  // Este dispositivo: favoritos viejos (marca 10) y grupos recientes (marca 900). El servidor: al revés.
  await page.addInitScript(uid => {
    localStorage.setItem(`pf_fav_${uid}`, JSON.stringify(['ex_1'])); localStorage.setItem(`pf_cats_${uid}`, JSON.stringify(['Pecho', 'Local reciente']))
    localStorage.setItem(`pf_prefs_ts_${uid}`, JSON.stringify({ fav: 10, cats: 900 }))
  }, ids.trainer)
  fake.seed('exercise_library_prefs', { trainer_id: ids.trainer, valores: { fav: ['ex_2'], cats: ['Pecho', 'Servidor viejo'] }, ts: { fav: 500, cats: 50 }, updated_at: 500 })
  await abrirBiblioteca(page)

  await expect.poll(() => local(page, 'pf_fav_')).toBe(JSON.stringify(['ex_2']))
  await page.getByRole('button', { name: 'Favoritos 1' }).click()
  await expect(page.getByRole('region', { name: /Todos los ejercicios|Resultados/ }).getByText('Curl de bíceps')).toBeVisible() // el favorito visible es el del servidor
  await expect(page.getByRole('region', { name: /Todos los ejercicios|Resultados/ }).getByText('Remo con mancuerna')).toHaveCount(0) // el servidor era más reciente en favoritos
  await expect.poll(() => prefs(fake)!.valores.cats).toEqual(['Pecho', 'Local reciente']) // y este dispositivo en grupos
  expect(prefs(fake)!.valores.fav).toEqual(['ex_2'])
})
