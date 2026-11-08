import { describe, it, expect } from 'vitest'
import { contarRecords, hitosConseguidos, semanasCompletas } from './hitos'
import type { TrainingLogs, TrainingPlan } from '../types'

const ej = (name: string, extra: Record<string, unknown> = {}) => ({ name, sets: '3x5', weight: '', isMain: true, comment: '', ...extra })
const plan = {
  weeks: [
    { days: [{ exercises: [ej('Sentadilla')] }, { exercises: [ej('Press banca')] }] },
    { days: [{ exercises: [ej('Sentadilla', { testRM: true })] }, { exercises: [ej('Press banca')] }] },
  ],
} as unknown as TrainingPlan
const log = (fecha: string, peso: number, reps = 5) => ({ done: true, dateDone: fecha, sets: { 0: { weight: String(peso), reps: String(reps) } } })

describe('contarRecords', () => {
  it('cuenta cada vez que se supera la mejor marca anterior; la primera vez no es récord', () => {
    const logs: TrainingLogs = {
      ex_w0_d0_r0: log('2026-10-01', 100),
      ex_w1_d0_r0: log('2026-10-08', 110), // récord
      ex_w0_d1_r0: log('2026-10-02', 80),
      ex_w1_d1_r0: log('2026-10-09', 75), // no
    }
    expect(contarRecords(logs, plan)).toBe(1)
  })
})

describe('semanasCompletas', () => {
  it('una semana cuenta si cada día con ejercicios tiene algo hecho', () => {
    const logs: TrainingLogs = { ex_w0_d0_r0: log('2026-10-01', 100), ex_w0_d1_r0: log('2026-10-02', 80), ex_w1_d0_r0: log('2026-10-08', 100) }
    expect(semanasCompletas(logs, plan)).toBe(1)
    expect(semanasCompletas(logs, null)).toBe(0)
  })
})

describe('hitosConseguidos', () => {
  it('sin nada hecho, ningún hito', () => {
    expect(hitosConseguidos({}, plan)).toEqual([])
  })
  it('primer entreno, récord, semana completa, test de RM y competición terminada', () => {
    const logs: TrainingLogs = {
      ex_w0_d0_r0: log('2026-10-01', 100), ex_w0_d1_r0: log('2026-10-02', 80),
      ex_w1_d0_r0: log('2026-10-08', 120, 1), // test de RM: récord
    }
    const conComp = { ...plan, competicion: { fecha: '2026-11-01', nombre: 'Autonómico' } } as TrainingPlan
    expect(hitosConseguidos(logs, conComp, '2026-11-08').map(h => h.id))
      .toEqual(['primer_entreno', 'primer_record', 'semana_completa', 'test_rm', 'competicion'])
  })
  it('toneladas: 10 t movidas', () => {
    const logs: TrainingLogs = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`ex_w0_d0_r${i}`, { done: true, dateDone: '2026-10-01', sets: { 0: { weight: '200', reps: '5' } } }]))
    expect(hitosConseguidos(logs, null).find(h => h.id === 'toneladas_10')?.detalle).toBe('10 t movidas en total')
  })
  it('una competición que aún no ha llegado no cuenta', () => {
    const conComp = { ...plan, competicion: { fecha: '2026-12-01' } } as TrainingPlan
    expect(hitosConseguidos({ ex_w0_d0_r0: log('2026-10-01', 100) }, conComp, '2026-11-08').map(h => h.id)).toEqual(['primer_entreno'])
  })
})
