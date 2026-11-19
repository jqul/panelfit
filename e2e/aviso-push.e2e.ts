import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

const lead = (id: string, name: string, status: string, aviso_push: string | null) =>
  ({ id, trainer_id: ids.trainer, name, email: `${id}@example.com`, phone: null, message: null, status, created_at: Date.now() - 3600_000, referred_by_client_id: null, origen: 'programacion', aviso_push })

// El aviso push no puede ser el único sitio donde exista un contacto, pero el entrenador debe poder ver que NO salió: la etiqueta
// «Aviso push pendiente» solo aparece en contactos nuevos o «a revisar» sin push activado o con el envío fallido.
test('Contactos marca «Aviso push pendiente» solo cuando el push no salió, sin decir que llegó al móvil', async ({ page, fake }) => {
  test.setTimeout(120_000)
  expect.configure({ timeout: 30_000 })
  seedWorld(fake, { clientHasAccount: true, clientConsented: true })
  fake.seed('leads', lead('l-fallo', 'Ana Fallo', 'nuevo', 'fallido'))
  fake.seed('leads', lead('l-sinpush', 'Beto SinPush', 'revisar', 'sin_suscripcion'))
  fake.seed('leads', lead('l-ok', 'Carla Enviado', 'nuevo', 'enviado_al_proveedor'))
  fake.seed('leads', lead('l-parcial', 'Dani Parcial', 'nuevo', 'parcial'))
  fake.seed('leads', lead('l-atendido', 'Eva Atendida', 'contactado', 'fallido'))
  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('ir a contactos')
  await page.keyboard.press('Enter')

  const fila = (nombre: string) => page.getByRole('listitem').filter({ hasText: nombre })
  await expect(fila('Ana Fallo')).toContainText('Aviso push pendiente')
  await expect(fila('Ana Fallo')).toContainText('No se pudo enviar el aviso push')
  await expect(fila('Beto SinPush')).toContainText('Aviso push pendiente')
  await expect(fila('Beto SinPush')).toContainText('Push no configurado')
  // Aceptado por el servicio push (total o parcial): sin etiqueta (un contacto ya atendido ni sale en esta lista; lo cubre el test de la lógica)
  for (const n of ['Carla Enviado', 'Dani Parcial']) await expect(fila(n)).not.toContainText('Aviso push pendiente')
  // Nunca se afirma que llegara al móvil
  await expect(page.getByText(/llegó al móvil|te ha llegado/i)).toHaveCount(0)
  // Y aunque falle todo, el contacto sigue estando en Contactos
  await expect(fila('Ana Fallo')).toBeVisible()
})
