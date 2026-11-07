import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, entrarComoEntrenador } from './support/flows'

test('el entrenador añade un vídeo por enlace para sus clientes', async ({ page, fake }) => {
  seedWorld(fake)
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Documentos')
  await page.getByRole('option', { name: 'Ir a Documentos' }).click()

  const subir = page.getByRole('region', { name: 'Subir documento' })
  await subir.getByRole('radio', { name: 'Vídeo (enlace)' }).click()
  await subir.getByLabel('Enlace del vídeo').fill('youtube.com/watch?v=x')
  await expect(subir).toContainText('Pega el enlace completo del vídeo')
  await subir.getByLabel('Enlace del vídeo').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  await subir.getByLabel('Título').fill('Movilidad de cadera, 10 min')
  await subir.getByRole('button', { name: 'Añadir vídeo' }).click()

  await expect(page.getByText('«Movilidad de cadera, 10 min» añadido ✓')).toBeVisible()
  await expect(page.getByRole('list', { name: 'Tus documentos' })).toContainText('▶ YouTube')
  const doc = () => fake.rows('documentos')[0]
  await expect.poll(() => doc()?.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  expect(doc()).toMatchObject({ ruta: null, tipo: 'video', visibilidad: 'todos' })
  expect(fake.uploads).toHaveLength(0) // un vídeo por enlace no sube nada
})

test('el cliente ve el vídeo en Archivos y lo abre', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('documentos', {
    id: 'v1', trainer_id: ids.trainer, titulo: 'Clase de movilidad', descripcion: '', ruta: null, url: 'https://vimeo.com/123456',
    nombre: 'Clase de movilidad', tipo: 'video', tamano: 0, visibilidad: 'todos', etiquetas: [], created_at: '2026-11-01T10:00:00Z',
  })
  await entrarComoCliente(page)
  await page.getByRole('navigation').getByRole('button', { name: 'Más' }).click()
  const archivos = page.getByRole('region', { name: 'Archivos' })
  await expect(archivos).toContainText('Archivos y vídeos')
  await expect(archivos).toContainText('Vídeo · Vimeo')
  const popup = page.waitForEvent('popup')
  await archivos.getByRole('button', { name: 'Abrir Clase de movilidad' }).click()
  expect((await popup).url()).toContain('vimeo.com/123456')
})
