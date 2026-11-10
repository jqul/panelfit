import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'

const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// Un rodaje de ~2 km en 10 minutos, exportado como GPX con pulso
const gpx = (dia: string) => Buffer.from(`<?xml version="1.0"?>
<gpx xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"><trk><name>Rodaje suave</name><type>running</type><trkseg>
  <trkpt lat="40.4168" lon="-3.7038"><ele>650</ele><time>${dia}T08:00:00Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>140</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>
  <trkpt lat="40.4258" lon="-3.7038"><ele>660</ele><time>${dia}T08:05:00Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>150</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>
  <trkpt lat="40.4348" lon="-3.7038"><ele>655</ele><time>${dia}T08:10:00Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>160</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>
</trkseg></trk></gpx>`)

test('el cliente importa un entreno de su reloj en Progreso → Entrenos', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Progreso', exact: true }).click()
  await page.getByRole('tab', { name: 'Entrenos' }).click()

  const reloj = page.getByRole('region', { name: 'Entrenos del reloj' })
  await reloj.getByLabel('Archivo del reloj').setInputFiles({ name: 'rodaje.gpx', mimeType: 'application/gpx+xml', buffer: gpx(hoy()) })
  const leido = reloj.getByRole('group', { name: 'Entreno leído del reloj' })
  await expect(leido).toContainText('🏃 Rodaje suave · 2 km · 10:00 · 5:00 /km · ♥ 150')
  await leido.getByRole('button', { name: 'Guardar entreno' }).click()

  await expect(reloj.getByRole('list', { name: 'Lista de entrenos del reloj' })).toContainText('Rodaje suave')
  await expect.poll(() => fake.rows('actividades')[0]).toMatchObject({ client_id: ids.client, deporte: 'correr', duracion_s: 600, fc_media: 150, fecha: hoy() })
})

test('un archivo que no es del reloj se rechaza con un mensaje claro', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)
  await page.getByRole('button', { name: 'Progreso', exact: true }).click()
  await page.getByRole('tab', { name: 'Entrenos' }).click()
  const reloj = page.getByRole('region', { name: 'Entrenos del reloj' })
  await reloj.getByLabel('Archivo del reloj').setInputFiles({ name: 'foto.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('x') })
  await expect(reloj.getByRole('alert')).toContainText('.fit, .gpx o .tcx')
})

test('desde una tarea de cardio de hoy: importar del reloj la da por hecha', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('tareas_cliente', { id: 't-correr', client_id: ids.client, titulo: 'Correr 30 min', tipo: 'cardio', nota: '', enlace: '', fecha: hoy(), repetir: 'una', dias: [], hasta: null, origen: null })
  await entrarComoCliente(page)

  await page.getByRole('button', { name: 'Desde el reloj' }).click()
  await page.getByLabel('Archivo del reloj').setInputFiles({ name: 'rodaje.gpx', mimeType: 'application/gpx+xml', buffer: gpx(hoy()) })
  await expect(page.getByText('Se marcará «Correr 30 min» como hecha')).toBeVisible()
  await page.getByRole('button', { name: 'Guardar entreno' }).click()

  await expect(page.getByRole('checkbox', { name: 'Correr 30 min' })).toHaveAttribute('aria-checked', 'true')
  await expect.poll(() => fake.rows('tareas_hechas').length).toBe(1)
  expect(fake.rows('actividades')).toHaveLength(1)
})
