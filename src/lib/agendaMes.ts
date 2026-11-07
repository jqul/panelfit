import { localDateKey } from './dates'

// Agenda en vista de mes y por profesional del equipo. Puro, para probarlo.

export interface DiaMes { fecha: string; dia: number; delMes: boolean; hoy: boolean }

/** Las semanas (de lunes a domingo) que cubren el mes de `ref`, con los días de los meses de al lado para completar. */
export function semanasDelMes(ref: Date, hoy: Date = new Date()): DiaMes[][] {
  const primero = new Date(ref.getFullYear(), ref.getMonth(), 1)
  const inicio = new Date(primero); inicio.setDate(1 - ((primero.getDay() + 6) % 7))
  const ultimo = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
  const hoyKey = localDateKey(hoy)
  const semanas: DiaMes[][] = []
  const d = new Date(inicio)
  while (d <= ultimo || semanas.length === 0 || semanas[semanas.length - 1].length < 7) {
    if (!semanas.length || semanas[semanas.length - 1].length === 7) {
      if (d > ultimo) break
      semanas.push([])
    }
    const fecha = localDateKey(d)
    semanas[semanas.length - 1].push({ fecha, dia: d.getDate(), delMes: d.getMonth() === ref.getMonth(), hoy: fecha === hoyKey })
    d.setDate(d.getDate() + 1)
  }
  return semanas
}

/**
 * Las citas de un profesional: las de los clientes asignados a él. Un cliente sin asignar es del dueño (`ownerId`).
 * Con `profesional` vacío, todas. Los bloqueos sin cliente solo salen en "todos" y en los del dueño.
 */
export function citasDeProfesional<C extends { client_id: string | null }>(
  citas: C[], clientes: { id: string; profesional_id?: string | null }[], profesional: string, ownerId: string,
): C[] {
  if (!profesional) return citas
  const de = new Map(clientes.map(c => [c.id, c.profesional_id || ownerId]))
  return citas.filter(c => (c.client_id ? (de.get(c.client_id) ?? ownerId) === profesional : profesional === ownerId))
}
