import { describe, it, expect } from 'vitest'
import { diasPorSemana, ejerciciosEstancados, tendenciaAbandono } from './tendencias'
import type { TrainingLogs } from '../types'

describe('días por semana', () => {
  it('de lunes a domingo, de la más antigua a la actual', () => {
    // hoy: sábado 2026-11-14 (semana del 9); semanas: 19 oct, 26 oct, 2 nov, 9 nov
    expect(diasPorSemana(['2026-10-20', '2026-10-22', '2026-10-27', '2026-11-03', '2026-11-03', '2026-11-10'], '2026-11-14'))
      .toEqual([2, 1, 1, 1])
  })
})

describe('tendencia de abandono', () => {
  const hoy = '2026-11-14'
  it('3 → 2 → 1 en las tres semanas completas anteriores', () => {
    const f = ['2026-10-19', '2026-10-21', '2026-10-23', '2026-10-27', '2026-10-29', '2026-11-04']
    expect(tendenciaAbandono(f, hoy)).toEqual([3, 2, 1])
  })
  it('sin bajada clara, nada', () => {
    expect(tendenciaAbandono(['2026-10-19', '2026-10-21', '2026-10-27', '2026-11-03', '2026-11-05'], hoy)).toBeNull() // 2 → 1 → 2
    expect(tendenciaAbandono(['2026-10-19', '2026-10-21', '2026-10-23', '2026-10-27', '2026-10-29', '2026-11-03', '2026-11-05'], hoy)).toBeNull() // 3 → 2 → 2
    expect(tendenciaAbandono(['2026-10-19'], hoy)).toBeNull() // entrenaba poco
  })
})

describe('ejercicios estancados', () => {
  const log = (fecha: string, kg: number) => ({ done: true, dateDone: fecha, substituteName: 'Press banca', sets: { 0: { weight: String(kg), reps: '5' } } })
  const logs: TrainingLogs = { a: log('2026-10-01', 80), b: log('2026-10-08', 80), c: log('2026-10-15', 77.5), d: log('2026-11-10', 80) }
  it('lleva 3 sesiones sin superar lo de antes y se ha entrenado hace poco', () => {
    expect(ejerciciosEstancados(logs, null, '2026-10-24')).toEqual(['Press banca'])
    expect(ejerciciosEstancados(logs, null, '2026-11-12')).toEqual([]) // no se ha entrenado desde entonces
  })
})
