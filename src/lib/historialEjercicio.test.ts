import { describe, it, expect } from 'vitest'
import { historialPorEjercicio, cambioE1rm } from './historialEjercicio'
import { TrainingLogs, TrainingPlan } from '../types'

const ej = (name: string) => ({ name, sets: '3x5', weight: '', comment: '', isMain: false })
const plan = { weeks: [
  { days: [{ title: 'A', exercises: [ej('Press banca'), ej('Remo')] }] },
  { days: [{ title: 'A', exercises: [ej('Press banca'), ej('Remo')] }] },
] } as unknown as TrainingPlan

const sets = (...s: [string, string][]) => Object.fromEntries(s.map(([weight, reps], i) => [i, { weight, reps }]))

describe('historialPorEjercicio', () => {
  const logs = {
    ex_w0_d0_r0: { done: true, dateDone: '2026-10-01', sets: sets(['80', '5'], ['82,5', '5'], ['82.5', '3']) },
    ex_w1_d0_r0: { done: true, dateDone: '2026-10-08', sets: sets(['85', '5'], ['85', '4']) },
    ex_w0_d0_r1: { done: true, dateDone: '2026-10-01', sets: sets(['60', '8']) },
    ex_w1_d0_r1: { done: true, dateDone: '2026-10-08', substituteName: 'Remo en máquina', sets: sets(['50', '10']) },
    ex_w9_d0_r0: { done: false, dateDone: '2026-10-09', sets: sets(['200', '1']) }, // sin terminar: no cuenta
  } as unknown as TrainingLogs

  const h = historialPorEjercicio(logs, plan)

  it('agrupa por ejercicio, más reciente primero, y la sustitución cuenta para lo que hizo', () => {
    expect(h.map(e => e.name)).toEqual(['Press banca', 'Remo en máquina', 'Remo'])
    expect(h[0].sesiones.map(s => s.date)).toEqual(['2026-10-08', '2026-10-01'])
  })

  it('mejor serie, 1RM estimado y volumen del día (acepta coma decimal)', () => {
    const dia1 = h[0].sesiones[1]
    expect(dia1.mejor).toEqual({ weight: 82.5, reps: 5 })
    expect(dia1.e1rm).toBe(96.3) // 82,5 × (1 + 5/30)
    expect(dia1.volumen).toBe(400 + 412.5 + 247.5)
  })

  it('cambio del 1RM estimado entre la primera y la última sesión', () => {
    expect(cambioE1rm(h[0].sesiones)).toBe(2.9) // 99,2 − 96,3
    expect(cambioE1rm(h[1].sesiones)).toBeNull()
  })

  it('sin logs, lista vacía', () => {
    expect(historialPorEjercicio({} as TrainingLogs, plan)).toEqual([])
  })
})
