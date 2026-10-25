import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoCliente } from './support/flows'

const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const ayer = () => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

const logsDelServidor = (fake: { rows: (t: string) => Record<string, any>[] }) =>
  (fake.rows('registros').find(r => r.clientId === ids.client)?.logs ?? {}) as Record<string, any>

test('registrar un entreno ya hecho: parte de lo programado, se corrige lo que cambió y se sube al servidor', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)

  await page.getByRole('button', { name: /Ya lo hiciste/ }).click()
  const hoja = page.getByRole('dialog', { name: 'Registrar entreno ya hecho' })
  // Los tres ejercicios del día, ya rellenados con lo programado
  await expect(hoja.getByText('3 × 5 · 80 kg')).toBeVisible()
  await expect(hoja.getByText('3 × 8 · 60 kg')).toBeVisible()
  await expect(hoja.getByText('2 × 12 · 15 kg')).toBeVisible()

  // No hizo el curl; el press de banca lo hizo con 82,5 kg
  await hoja.getByRole('checkbox', { name: /Curl de bíceps/ }).click()
  await hoja.getByRole('button', { name: 'Corregir Press banca' }).click()
  await hoja.getByLabel('Peso de Press banca').fill('82,5')
  await hoja.getByRole('button', { name: 'Guardar entreno (2)' }).click()

  await expect(page.getByText(/Entreno guardado \(2 ejercicios\)/)).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Registrar entreno ya hecho' })).toHaveCount(0)

  // En el servidor: lo hecho con la fecha de hoy y las series programadas; lo no hecho, sin registro, y el día cerrado
  await expect.poll(() => Object.keys(logsDelServidor(fake)).sort()).toEqual(['ex_w0_d0_r0', 'ex_w0_d0_r1', 'finished_w0_d0'])
  const logs = logsDelServidor(fake)
  expect(logs.ex_w0_d0_r0).toMatchObject({ done: true, dateDone: hoy() })
  expect(Object.values(logs.ex_w0_d0_r0.sets)).toEqual([{ weight: '82.5', reps: '5' }, { weight: '82.5', reps: '5' }, { weight: '82.5', reps: '5' }])
  expect(logs.ex_w0_d0_r1.sets[0]).toEqual({ weight: '60', reps: '8' })
  expect(logs.finished_w0_d0).toMatchObject({ sessionFinished: true, done: false })

  // El inicio ya no ofrece empezarlo ni registrarlo otra vez
  await expect(page.getByRole('button', { name: /Ya lo hiciste/ })).toHaveCount(0)
})

test('se puede registrar con la fecha de ayer; con todo hecho no hace falta cerrar el día', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)

  await page.getByRole('button', { name: /Ya lo hiciste/ }).click()
  const hoja = page.getByRole('dialog', { name: 'Registrar entreno ya hecho' })
  await hoja.getByRole('button', { name: 'Ayer' }).click()
  await hoja.getByRole('button', { name: 'Guardar entreno (3)' }).click()

  await expect.poll(() => Object.keys(logsDelServidor(fake)).sort()).toEqual(['ex_w0_d0_r0', 'ex_w0_d0_r1', 'ex_w0_d0_r2'])
  expect(logsDelServidor(fake).ex_w0_d0_r0.dateDone).toBe(ayer())
})

test('no deja guardar con datos inválidos ni sin ningún ejercicio marcado', async ({ page, fake }) => {
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  await entrarComoCliente(page)

  await page.getByRole('button', { name: /Ya lo hiciste/ }).click()
  const hoja = page.getByRole('dialog', { name: 'Registrar entreno ya hecho' })
  const guardar = hoja.getByRole('button', { name: /Guardar entreno/ })

  await hoja.getByRole('button', { name: 'Corregir Remo con barra' }).click()
  await hoja.getByLabel('Repeticiones de Remo con barra').fill('')
  await expect(guardar).toBeDisabled() // repeticiones vacías
  await hoja.getByLabel('Repeticiones de Remo con barra').fill('8')
  await expect(guardar).toBeEnabled()

  for (const n of ['Press banca', 'Remo con barra', 'Curl de bíceps']) await hoja.getByRole('checkbox', { name: new RegExp(n) }).click()
  await expect(guardar).toBeDisabled() // nada marcado
  expect(Object.keys(logsDelServidor(fake))).toEqual([])
})
