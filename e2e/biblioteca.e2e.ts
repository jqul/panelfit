import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'
import type { FakeSupabase } from './support/fakeSupabase'
import type { Locator, Page } from '@playwright/test'

const fila = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id, trainer_id: ids.trainer, name, description: '', category: '', especialidades: [], videos: [], tags: [],
  use_count: 0, video_use_count: 0, created_at: 1, updated_at: 1, deleted_at: null, material: '', archived_at: null, alternativas: [], ...extra,
})

function sembrar(fake: FakeSupabase) {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('exercise_library',
    fila('ex_default_1_0', 'Press banca con barra', { category: 'Pecho', use_count: 5 }), // muy usado, sin vídeo ni indicaciones ni alternativa
    fila('ex_default_1_1', 'Sentadilla trasera', { category: 'Piernas', use_count: 4, description: 'Espalda neutra', alternativas: ['Prensa de piernas'], videos: [{ url: 'https://youtu.be/aaaaaaaaaaa' }] }), // completo
    fila('ex_default_1_2', 'Curl de bíceps', { category: 'Bíceps' }),
    fila('ex_1', 'Remo con mancuerna', { category: 'Espalda' }),
  )
}

/** Entra como entrenador (sin que la biblioteca de serie se vuelva a sembrar) y abre Ejercicios con la búsqueda global. */
async function abrirBiblioteca(page: Page) {
  await page.addInitScript(id => localStorage.setItem(`pf_library_default_topup_${id}`, '8'), ids.trainer)
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a ejercicios')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Ejercicios', level: 2 })).toBeVisible()
}

// La primera carga en frío compila el trozo diferido de la biblioteca: más margen que el resto.
test.setTimeout(120_000)

/**
 * Abre un menú ⋯ y espera a que aparezca su opción. El menú se cierra con cualquier scroll del contenedor (también los
 * reajustes de maquetación al cargar), así que se reintenta hasta que se queda abierto.
 */
async function abrirMenu(page: Page, trigger: Locator, opcion: string) {
  const item = page.getByRole('button', { name: opcion, exact: true })
  await trigger.scrollIntoViewIfNeeded()
  await expect(async () => {
    if (!(await item.isVisible())) await trigger.click()
    await expect(item).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 20_000 })
}

/** El menú ⋯ de una tarjeta de la lista (no de «Recomendados», donde la misma tarjeta aparece repetida). */
const menuDe = (page: Page, nombre: string) =>
  page.getByRole('region', { name: /Todos los ejercicios|Resultados/ }).getByRole('button', { name: `Acciones de ${nombre}` })
const menuHerramientas = (page: Page) => page.getByRole('button', { name: 'Más herramientas' })

const filas = (fake: FakeSupabase) => fake.rows('exercise_library')
const deLaBiblioteca = (fake: FakeSupabase, name: string) => filas(fake).find(r => r.name === name)

test('la biblioteca resume lo que usas, recomienda lo más usado y avisa de los huecos', async ({ page, fake }) => {
  sembrar(fake)
  await abrirBiblioteca(page)

  await expect(page.getByRole('button', { name: 'Todos 4' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Más usados 2' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sin vídeo 3' })).toBeVisible()

  // Recomendados: lo más usado primero
  const recomendados = page.getByRole('region', { name: 'Recomendados para ti' })
  await expect(recomendados.getByText('Press banca con barra')).toBeVisible()
  await expect(recomendados.getByText('Usado 5 veces')).toBeVisible()
  await expect(recomendados.getByText('Falta vídeo')).toBeVisible()
  await expect(recomendados.getByText('Completo')).toBeVisible() // la sentadilla
  await expect(recomendados.getByText('Base PanelFit').first()).toBeVisible()

  // Huecos de contenido solo entre los muy usados
  await expect(page.getByText('1 muy usado sin vídeo · 1 sin alternativa')).toBeVisible()
  await page.getByRole('button', { name: 'Ver pendientes' }).click()
  await expect(page.getByRole('button', { name: 'Pendientes 1' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('region', { name: 'Resultados' }).getByText('Press banca con barra')).toBeVisible()
  await expect(page.getByText('Sentadilla trasera')).toHaveCount(0)

  // Material deducido del nombre, sin que el entrenador lo haya escrito
  await page.getByRole('button', { name: 'Todos 4' }).click()
  await page.getByRole('group', { name: 'Material' }).getByRole('button', { name: 'Mancuerna' }).click()
  await expect(page.getByRole('region', { name: 'Resultados' }).getByText('Remo con mancuerna')).toBeVisible()
  await expect(page.getByText('Curl de bíceps')).toHaveCount(0)
})

test('archivar saca el ejercicio de los selectores sin borrarlo, y se puede restaurar', async ({ page, fake }) => {
  sembrar(fake)
  await abrirBiblioteca(page)

  await abrirMenu(page, menuDe(page, 'Remo con mancuerna'), 'Archivar')
  await page.getByRole('button', { name: 'Archivar', exact: true }).click()
  await expect(page.getByText(/«Remo con mancuerna» archivado/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Archivados 1' })).toBeVisible()
  await expect.poll(() => deLaBiblioteca(fake, 'Remo con mancuerna')?.archived_at).toBeTruthy()
  expect(deLaBiblioteca(fake, 'Remo con mancuerna')?.deleted_at).toBeNull() // archivar no es borrar

  // Ya no sale en la búsqueda global (la que alimenta los selectores con la biblioteca activa)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('remo con')
  await expect(page.getByText('Nada coincide')).toBeVisible()
  await page.keyboard.press('Escape')

  // En Archivados sigue, y se restaura
  await page.getByRole('button', { name: 'Archivados 1' }).click()
  await abrirMenu(page, menuDe(page, 'Remo con mancuerna'), 'Restaurar')
  await page.getByRole('button', { name: 'Restaurar', exact: true }).click()
  await expect.poll(() => deLaBiblioteca(fake, 'Remo con mancuerna')?.archived_at).toBeNull()
  await expect(page.getByRole('button', { name: 'Archivados' })).toHaveCount(0)
})

test('duplicar crea una variante con el mismo contenido y abre su ficha', async ({ page, fake }) => {
  sembrar(fake)
  await abrirBiblioteca(page)

  await abrirMenu(page, menuDe(page, 'Sentadilla trasera'), 'Duplicar')
  await page.getByRole('button', { name: 'Duplicar', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Editar Sentadilla trasera (copia)' })).toBeVisible()
  await expect(page.getByText('Personal').first()).toBeVisible() // lo que duplicas es tuyo, no del catálogo base
  const copia = deLaBiblioteca(fake, 'Sentadilla trasera (copia)')
  expect(copia).toMatchObject({ category: 'Piernas', description: 'Espalda neutra', alternativas: ['Prensa de piernas'] })
  expect(String(copia?.id)).not.toMatch(/^ex_default_/)
  expect(deLaBiblioteca(fake, 'Sentadilla trasera')).toBeTruthy() // el original sigue

  await page.getByLabel('Nombre *').fill('Sentadilla trasera con pausa')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect.poll(() => deLaBiblioteca(fake, 'Sentadilla trasera con pausa')?.id).toBe(copia?.id)
})

test('un ejercicio nuevo se crea en segundos con nombre, material y grupo', async ({ page, fake }) => {
  sembrar(fake)
  await abrirBiblioteca(page)

  await page.getByRole('button', { name: 'Nuevo ejercicio' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Nuevo ejercicio' })
  await dialogo.getByLabel('Nombre').fill('Press militar sentado')
  await dialogo.getByRole('group', { name: 'Material' }).getByRole('button', { name: 'Mancuerna' }).click()
  await dialogo.getByRole('group', { name: 'Grupo muscular' }).getByRole('button', { name: 'Hombros' }).click()
  await dialogo.getByRole('button', { name: 'Crear y añadir otro' }).click()
  await expect(dialogo.getByText('1 ejercicio creado')).toBeVisible()
  await expect(dialogo.getByLabel('Nombre')).toHaveValue('') // listo para el siguiente

  await dialogo.getByLabel('Nombre').fill('Face pull')
  await dialogo.getByRole('button', { name: 'Crear', exact: true }).click()

  await expect.poll(() => deLaBiblioteca(fake, 'Press militar sentado')).toMatchObject({ material: 'Mancuerna', category: 'Hombros', archived_at: null })
  await expect.poll(() => deLaBiblioteca(fake, 'Face pull')?.material).toBe('Polea') // sin elegirlo, se deduce del nombre
  expect(String(deLaBiblioteca(fake, 'Face pull')?.id)).toMatch(/^ex_\d+$/)
  await expect(page.getByRole('button', { name: 'Todos 6' })).toBeVisible()
})

test('importar una lista omite lo que ya tienes y crea el resto como personal', async ({ page, fake }) => {
  sembrar(fake)
  await abrirBiblioteca(page)

  await abrirMenu(page, menuHerramientas(page), 'Importar lista o CSV')
  await page.getByRole('button', { name: 'Importar lista o CSV', exact: true }).click()
  await page.getByLabel('Lista de ejercicios').fill('Press banca con barra\nPeso muerto rumano\nnombre;grupo\nElevaciones laterales;Hombros')
  // Sin cabecera en la primera línea, es una lista de nombres: cada línea es un ejercicio
  await expect(page.getByRole('status').filter({ hasText: 'nuevos' })).toContainText('3 nuevos')
  await expect(page.getByRole('status').filter({ hasText: 'nuevos' })).toContainText('1 ya existen')

  await page.getByRole('button', { name: 'Importar 3 ejercicios' }).click()
  await expect(page.getByText('3 ejercicios importados ✓')).toBeVisible()
  await expect.poll(() => filas(fake).filter(r => String(r.id).startsWith('ex_import_')).length).toBe(3)
  expect(filas(fake).filter(r => r.name === 'Press banca con barra')).toHaveLength(1) // no se duplicó
  await expect(page.getByRole('button', { name: 'Todos 7' })).toBeVisible()
})

test('un archivo que no es CSV se rechaza antes de leerlo', async ({ page, fake }) => {
  sembrar(fake)
  await abrirBiblioteca(page)
  await abrirMenu(page, menuHerramientas(page), 'Importar lista o CSV')
  await page.getByRole('button', { name: 'Importar lista o CSV', exact: true }).click()
  await page.getByLabel('Subir archivo CSV').setInputFiles({ name: 'lista.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('x') })
  await expect(page.getByRole('alert')).toContainText('Formato no soportado')
})
