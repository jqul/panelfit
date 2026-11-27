import { test, expect as expectBase } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'
import type { Page } from '@playwright/test'

// La biblioteca de ejercicios guarda una copia en el navegador. Esa copia puede estar vieja: abrir PanelFit en un dispositivo
// no puede deshacer lo que se editó desde otro, ni volver a sembrar la biblioteca de serie cuando la lectura falla.

const fila = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id, trainer_id: ids.trainer, name, description: '', category: 'Espalda', especialidades: [], videos: [], tags: [],
  use_count: 0, video_use_count: 0, created_at: 1, updated_at: 1, deleted_at: null, material: '', archived_at: null, alternativas: [], ...extra,
})
// Lo mismo, tal como queda en la copia del navegador
const enCopia = (id: string, name: string) => ({
  id, trainerId: ids.trainer, name, description: '', category: 'Espalda', especialidades: [], videos: [], tags: [], createdAt: 1, material: '', useCount: 0, archivedAt: null, alternativas: [],
})

test.setTimeout(120_000) // la primera carga compila en frío
const expect = expectBase.configure({ timeout: 30_000 })

function sembrar(fake: FakeSupabase) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('exercise_library', fila('ex_1', 'Remo con mancuerna'), fila('ex_2', 'Curl de bíceps'))
}

/** Sin la ampliación de serie (no es lo que se prueba aquí) y apuntando cada escritura en la biblioteca. */
async function preparar(page: Page) {
  await page.addInitScript(id => localStorage.setItem(`pf_library_default_topup_${id}`, '8'), ids.trainer)
  const escrituras: string[] = []
  page.on('request', r => { if (r.url().includes('/rest/v1/exercise_library?') || r.url().endsWith('/rest/v1/exercise_library')) { if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method())) escrituras.push(r.method()) } })
  return escrituras
}

const enServidor = (fake: FakeSupabase, id: string) => fake.rows('exercise_library').find(r => r.id === id)
const nombresEnCopia = (page: Page) => page.evaluate(k => (JSON.parse(localStorage.getItem(k) || '[]') as { name: string }[]).map(e => e.name), `pf_library_${ids.trainer}`)

test('dispositivo nuevo: la segunda vez que se abre no devuelve al servidor su copia vieja', async ({ page, fake }) => {
  sembrar(fake)
  const escrituras = await preparar(page)
  await entrarComoEntrenador(page)
  await expect.poll(() => nombresEnCopia(page)).toEqual(['Curl de bíceps', 'Remo con mancuerna']) // primera carga: se queda una copia

  // Desde otro dispositivo se renombra uno y se archiva el otro
  Object.assign(enServidor(fake, 'ex_1')!, { name: 'Remo con mancuerna a una mano', updated_at: 500 })
  Object.assign(enServidor(fake, 'ex_2')!, { archived_at: 500, updated_at: 500 })

  await page.reload()
  await expect.poll(() => nombresEnCopia(page)).toContain('Remo con mancuerna a una mano') // la segunda carga ha terminado de leer
  expect(enServidor(fake, 'ex_1')!.name).toBe('Remo con mancuerna a una mano')
  expect(enServidor(fake, 'ex_2')!.archived_at).toBe(500)
  expect(escrituras).toEqual([])
})

test('un dispositivo que ya tenía una copia vieja sin marcar tampoco pisa el servidor', async ({ page, fake }) => {
  sembrar(fake)
  Object.assign(enServidor(fake, 'ex_1')!, { name: 'Remo editado en otro sitio', updated_at: 500 })
  Object.assign(enServidor(fake, 'ex_2')!, { archived_at: 500, updated_at: 500 })
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [`pf_library_${ids.trainer}`, JSON.stringify([enCopia('ex_1', 'Remo con mancuerna'), enCopia('ex_2', 'Curl de bíceps')])])
  await preparar(page)
  await entrarComoEntrenador(page)

  await expect.poll(() => nombresEnCopia(page)).toContain('Remo editado en otro sitio')
  expect(enServidor(fake, 'ex_1')!.name).toBe('Remo editado en otro sitio')
  expect(enServidor(fake, 'ex_1')!.updated_at).toBe(500)
  expect(enServidor(fake, 'ex_2')!.archived_at).toBe(500)
})

test('lo que solo existía en el dispositivo (de cuando no había base de datos) se sigue subiendo, sin tocar lo demás', async ({ page, fake }) => {
  sembrar(fake)
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [`pf_library_${ids.trainer}`, JSON.stringify([enCopia('ex_1', 'Nombre antiguo del remo'), enCopia('ex_viejo', 'Dominada con lastre')])])
  await preparar(page)
  await entrarComoEntrenador(page)

  await expect.poll(() => enServidor(fake, 'ex_viejo')?.name).toBe('Dominada con lastre')
  expect(enServidor(fake, 'ex_1')!.name).toBe('Remo con mancuerna')
})

test('si falla la lectura en un dispositivo nuevo, no se siembra la biblioteca de serie encima de la que ya hay', async ({ page, fake }) => {
  sembrar(fake)
  const escrituras = await preparar(page)
  await page.route('**/rest/v1/exercise_library?**', r => (r.request().method() === 'GET' ? r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"caído"}' }) : r.fallback()))
  const fallo = page.waitForEvent('console', { predicate: m => m.text().includes('syncFromSupabase error'), timeout: 60_000 })
  await entrarComoEntrenador(page)
  await fallo

  // La siembra, si ocurriera, llega después de cargar las descripciones: se le da margen
  await page.waitForTimeout(4_000)
  expect(escrituras).toEqual([])
  expect(fake.rows('exercise_library')).toHaveLength(2)
})
