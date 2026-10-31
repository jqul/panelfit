import { describe, it, expect } from 'vitest'
import { volumenSeries, volumenLog } from './volumen'
import { historialPorEjercicio } from './historialEjercicio'
import { TrainingLogs } from '../types'

describe('volumen', () => {
  it('kg × reps de cada serie (acepta coma decimal; sin reps no suma)', () => {
    expect(volumenSeries([{ weight: '20', reps: '10' }, { weight: '22,5', reps: '8' }, { weight: '30', reps: '' }])).toBe(380)
  })
  it('con peso por lado cuenta el doble', () => {
    expect(volumenSeries([{ weight: '20', reps: '10' }], true)).toBe(400)
    expect(volumenLog({ porLado: true, sets: { 0: { weight: '20', reps: '10' }, 1: { weight: '20', reps: '8' } } })).toBe(720)
    expect(volumenLog({ sets: { 0: { weight: '20', reps: '10' } } })).toBe(200)
    expect(volumenLog(undefined)).toBe(0)
  })
  it('el historial por ejercicio también lo cuenta doble, pero la mejor serie sigue siendo el peso de un lado', () => {
    const logs = { ex_w9_d0_r0: { done: true, dateDone: '2026-10-01', substituteName: 'Press con mancuernas', porLado: true, sets: { 0: { weight: '30', reps: '8' } } } } as unknown as TrainingLogs
    const [h] = historialPorEjercicio(logs, null)
    expect(h.sesiones[0].volumen).toBe(480)
    expect(h.sesiones[0].mejor).toEqual({ weight: 30, reps: 8 })
  })
})
