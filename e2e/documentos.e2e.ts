import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente, entrarComoEntrenador } from './support/flows'

const PDF = Buffer.from('%PDF-1.4\n%e2e\n')

test('el entrenador sube un documento solo para los clientes de una etiqueta', async ({ page, fake }) => {
  seedWorld(fake)
  fake.seed('labels', { id: 'lbl-online', trainer_id: ids.trainer, name: 'Online', color: '#000', emoji: '💻', created_at: 1 })
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Documentos')
  await page.getByRole('option', { name: 'Ir a Documentos' }).click()

  const subir = page.getByRole('region', { name: 'Subir documento' })
  await subir.getByLabel('Archivo').setInputFiles({ name: 'Guía_de_técnica.pdf', mimeType: 'application/pdf', buffer: PDF })
  await expect(subir.getByLabel('Título')).toHaveValue('Guía de técnica')
  await subir.getByRole('radio', { name: 'Solo algunas etiquetas' }).click()
  await subir.getByRole('button', { name: '💻 Online' }).click()
  await subir.getByRole('button', { name: 'Subir documento' }).click()

  await expect(page.getByText('«Guía de técnica» subido ✓')).toBeVisible()
  const lista = page.getByRole('list', { name: 'Tus documentos' })
  await expect(lista).toContainText('Clientes con Online')
  const doc = () => fake.rows('documentos')[0]
  await expect.poll(() => doc()?.visibilidad).toBe('etiquetas')
  expect(doc()?.etiquetas).toEqual(['lbl-online'])
  expect(doc()?.ruta).toMatch(new RegExp(`^${ids.trainer}/[0-9a-f-]+-Guia_de_tecnica\\.pdf$`))
  expect(fake.uploads.some(u => u.bucket === 'documentos' && u.path === doc()?.ruta)).toBe(true)

  // Lo oculta: deja de verlo nadie
  await lista.getByRole('button', { name: 'Cambiar quién lo ve' }).click()
  await lista.getByRole('radio', { name: 'Oculto' }).click()
  await expect(lista).toContainText('Oculto: solo tú')
  await expect.poll(() => doc()?.visibilidad).toBe('oculto')
})

test('un archivo que no se admite no se sube', async ({ page, fake }) => {
  seedWorld(fake)
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir a Documentos')
  await page.getByRole('option', { name: 'Ir a Documentos' }).click()
  await page.getByLabel('Archivo').setInputFiles({ name: 'virus.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('x') })
  await expect(page.getByText('Ese tipo de archivo no se admite', { exact: false })).toBeVisible()
  await expect(page.getByLabel('Título')).toHaveCount(0)
})

test('el cliente abre en Más los archivos que le ha compartido su entrenador', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  const ruta = `${ids.trainer}/d1-normas.pdf`
  fake.seed('documentos', {
    id: 'd1', trainer_id: ids.trainer, titulo: 'Normas del centro', descripcion: 'Horarios y uso del material', ruta,
    nombre: 'normas.pdf', tipo: 'application/pdf', tamano: 2048, visibilidad: 'todos', etiquetas: [], created_at: '2026-11-01T10:00:00Z',
  })
  fake.storage['documentos'] = [ruta]
  await entrarComoCliente(page)
  await page.getByRole('navigation').getByRole('button', { name: 'Más' }).click()

  const archivos = page.getByRole('region', { name: 'Archivos' })
  await expect(archivos).toContainText('Normas del centro')
  await expect(archivos).toContainText('Horarios y uso del material')
  const popup = page.waitForEvent('popup')
  await archivos.getByRole('button', { name: 'Abrir Normas del centro' }).click()
  await (await popup).waitForLoadState().catch(() => {})
  await expect.poll(() => fake.signedReads).toContain(`documentos/${ruta}`)
})
