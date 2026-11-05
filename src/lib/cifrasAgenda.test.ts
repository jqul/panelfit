import { describe, it, expect } from 'vitest'
import { cifrasMes } from './cifrasAgenda'

const ahora = new Date(2026, 10, 20, 12) // 20 nov
const ref = new Date(2026, 10, 1)
const d = (dia: number, mes = 10) => new Date(2026, mes, dia, 10).toISOString()

describe('cifrasMes', () => {
  const citas = [
    { start_at: d(3), status: 'completada', client_id: 'a' },
    { start_at: d(5), status: 'completada', client_id: 'b' },
    { start_at: d(7), status: 'ausente', client_id: 'a' },
    { start_at: d(9), status: 'cancelada', client_id: 'b' },
    { start_at: d(12), status: 'confirmada', client_id: 'a' }, // pasada sin marcar
    { start_at: d(25), status: 'confirmada', client_id: 'a' }, // futura
    { start_at: d(4), status: 'confirmada', client_id: null }, // bloqueo: no cuenta
    { start_at: d(28, 9), status: 'completada', client_id: 'a' }, // octubre
  ]
  const clases = [
    { start_at: d(10), aforo: 4, plazas: [{ estado: 'reservada', asistio: true }, { estado: 'reservada', asistio: false }, { estado: 'reservada', asistio: null }, { estado: 'espera' }] },
    { start_at: d(27), aforo: 4, plazas: [{ estado: 'reservada' }] }, // futura
    { start_at: d(15), aforo: 10, cancelada: true, plazas: [{ estado: 'reservada', asistio: true }] }, // cancelada: no cuenta
  ]
  it('citas del mes con cliente: vinieron, no vinieron, canceladas y sin marcar', () => {
    expect(cifrasMes(citas, clases, ref, ahora).citas).toEqual({ total: 5, vinieron: 2, noVinieron: 1, canceladas: 1, sinMarcar: 1 })
  })
  it('clases del mes: plazas, asistencia, sin pasar lista y ocupación', () => {
    expect(cifrasMes(citas, clases, ref, ahora).clases).toEqual({ total: 2, plazas: 4, vinieron: 1, noVinieron: 1, sinMarcar: 1, ocupacion: 50 })
  })
  it('asistencia de todo lo que tiene lista pasada', () => {
    expect(cifrasMes(citas, clases, ref, ahora).asistencia).toBe(60) // (2 + 1) / (2 + 1 + 1 + 1)
  })
  it('sin nada marcado, sin porcentaje', () => {
    expect(cifrasMes([], [], ref, ahora)).toMatchObject({ asistencia: null, clases: { ocupacion: null } })
  })
})
