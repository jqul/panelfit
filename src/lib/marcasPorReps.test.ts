import { describe, it, expect } from 'vitest'
import { marcasPorReps } from './marcasPorReps'

const s = (date: string, ...series: [number, number][]) => ({ date, series: series.map(([weight, reps]) => ({ weight, reps })), mejor: null, e1rm: 0, volumen: 0 })

describe('marcasPorReps', () => {
  const sesiones = [
    s('2026-11-08', [100, 5], [110, 2]),
    s('2026-10-01', [120, 1], [90, 8]),
  ]
  it('para cada N, lo más pesado con N reps o más', () => {
    expect(marcasPorReps(sesiones, 8)).toEqual([
      { reps: 1, kg: 120, fecha: '2026-10-01' },
      { reps: 2, kg: 110, fecha: '2026-11-08' },
      { reps: 3, kg: 100, fecha: '2026-11-08' },
      { reps: 4, kg: 100, fecha: '2026-11-08' },
      { reps: 5, kg: 100, fecha: '2026-11-08' },
      { reps: 6, kg: 90, fecha: '2026-10-01' },
      { reps: 7, kg: 90, fecha: '2026-10-01' },
      { reps: 8, kg: 90, fecha: '2026-10-01' },
    ])
  })
  it('desde una fecha; sin peso no cuenta', () => {
    expect(marcasPorReps(sesiones, 3, '2026-11-01').map(m => m.kg)).toEqual([110, 110, 100])
    expect(marcasPorReps([s('2026-11-08', [0, 15])])).toEqual([])
  })
})
