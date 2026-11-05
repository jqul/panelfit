import { test, expect } from './support/test'
import { seedWorld, ids } from './support/seed'
import { entrarComoEntrenador } from './support/flows'

// Hace unas horas de hoy (si es muy temprano, de ayer a la misma hora: sigue siendo este mes casi siempre)
const haceH = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()

test('el entrenador pasa lista en una cita y en una clase, y las cifras del mes lo recogen', async ({ page, fake }) => {
  test.skip(new Date().getDate() === 1 && new Date().getHours() < 4, 'a primera hora del día 1 «hace unas horas» es el mes anterior')
  seedWorld(fake)
  fake.seed('citas', { id: 'c1', trainer_id: ids.trainer, client_id: ids.client, title: 'Revisión', start_at: haceH(2), end_at: haceH(1), status: 'confirmada', notes: '' })
  fake.seed('clases', { id: 'k1', trainer_id: ids.trainer, titulo: 'Funcional', start_at: haceH(3), end_at: haceH(2), aforo: 4, notas: '', cancelada: false })
  fake.seed('clase_plazas', { clase_id: 'k1', client_id: ids.client, estado: 'reservada', created_at: haceH(30) })

  await entrarComoEntrenador(page)
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox', { name: 'Buscar' }).fill('Ir al Calendario')
  await page.getByRole('option', { name: 'Ir al Calendario' }).click()

  const cifras = page.getByRole('region', { name: 'Cifras de la agenda' })
  await expect(cifras).toContainText('2 sin pasar lista')

  // La cita: no vino
  await page.getByRole('button', { name: 'No vino a Revisión' }).click()
  await expect(page.getByText('No vino', { exact: true }).first()).toBeVisible()
  await expect.poll(() => fake.rows('citas').find(c => c.id === 'c1')?.status).toBe('ausente')

  // La clase: vino
  await page.getByRole('button', { name: /Clases de grupo/ }).click()
  const lista = page.getByRole('group', { name: 'Asistencia de María García' })
  await lista.getByRole('button', { name: 'Vino', exact: true }).click()
  await expect(lista.getByRole('button', { name: 'Vino', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => fake.rows('clase_plazas').find(p => p.clase_id === 'k1')?.asistio).toBe(true)
  await expect(page.getByRole('listitem', { name: 'Clase Funcional' }).getByRole('button', { name: 'Apuntar' })).toHaveCount(0) // ya pasó: no se apunta a nadie

  // Las cifras: una vino y otra no → 50 %, y ya no queda nada sin pasar lista
  await page.keyboard.press('Escape')
  await expect(cifras).toContainText('50%')
  await expect(cifras).not.toContainText('sin pasar lista')
})
