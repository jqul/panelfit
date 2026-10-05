import { describe, it, expect } from 'vitest'
import { collectSessionBests, recordHistory, strengthChange, adherence28, streakDays } from './progressSummary'
import { TrainingLogs, TrainingPlan } from '../types'

const ex = (name: string) => ({ name, sets: '3×5', weight: '', isMain: true, comment: '' })
const plan = {
  clientId: 'c', type: 'x', restMain: 0, restAcc: 0, restWarn: 0, diasSemana: 3, fechaInicio: '2026-09-01',
  weeks: [{ label: 'S1', rpe: '', isCurrent: true, days: [{ title: 'A', focus: '', exercises: [ex('Press banca'), ex('Sentadilla')] }, { title: 'B', focus: '', exercises: [ex('Remo')] }] }],
} as unknown as TrainingPlan

const log = (dateDone: string, sets: [string, string][], extra: object = {}) =>
  ({ done: true, dateDone, sets: Object.fromEntries(sets.map(([weight, reps], i) => [i, { weight, reps }])), ...extra })

const logs = {
  ex_w0_d0_r0: log('2026-09-10', [['80', '5'], ['77.5', '5']]),
  ex_w0_d0_r1: log('2026-09-10', [['100', '5']]),
} as unknown as TrainingLogs

describe('collectSessionBests', () => {
  it('toma la serie más pesada de cada ejercicio y día, e ignora peso corporal', () => {
    const b = collectSessionBests({ ...logs, ex_w0_d1_r0: log('2026-09-11', [['0', '12']]) } as unknown as TrainingLogs, plan)
    expect(b.find(x => x.name === 'Press banca')).toMatchObject({ weight: 80, reps: 5, date: '2026-09-10' })
    expect(b.some(x => x.name === 'Remo')).toBe(false)
  })
  it('usa el ejercicio sustituido si lo hay', () => {
    const b = collectSessionBests({ ex_w0_d0_r0: log('2026-09-10', [['60', '8']], { substituteName: 'Press mancuernas' }) } as unknown as TrainingLogs, plan)
    expect(b[0].name).toBe('Press mancuernas')
  })
})

describe('recordHistory', () => {
  const bests = [
    { name: 'Press', date: '2026-09-01', weight: 80, reps: 5 },
    { name: 'Press', date: '2026-09-08', weight: 80, reps: 5 },
    { name: 'Press', date: '2026-09-15', weight: 82.5, reps: 5 },
    { name: 'Press', date: '2026-09-22', weight: 85, reps: 3 },
    { name: 'Sentadilla', date: '2026-09-22', weight: 100, reps: 5 },
  ]
  it('solo cuenta cuando se supera la marca anterior, con la diferencia', () => {
    const r = recordHistory(bests)
    expect(r.map(e => [e.name, e.delta])).toEqual([['Press', 2.5], ['Press', 2.5]])
    expect(r[0].date).toBe('2026-09-22')
  })
  it('la primera vez que se hace un ejercicio no es récord', () => {
    expect(recordHistory([{ name: 'X', date: '2026-09-01', weight: 50, reps: 5 }])).toEqual([])
  })
})

describe('strengthChange', () => {
  const now = new Date(2026, 8, 30)
  it('promedia la subida de los ejercicios con al menos dos sesiones en la ventana', () => {
    const r = strengthChange([
      { name: 'A', date: '2026-09-01', weight: 100, reps: 5 }, { name: 'A', date: '2026-09-20', weight: 110, reps: 5 },
      { name: 'B', date: '2026-09-02', weight: 50, reps: 8 }, { name: 'B', date: '2026-09-25', weight: 50, reps: 8 },
      { name: 'C', date: '2026-09-25', weight: 70, reps: 5 },
    ], now)
    expect(r).toEqual({ pct: 5, exercises: 2 })
  })
  it('ignora sesiones fuera de la ventana y devuelve null sin datos comparables', () => {
    expect(strengthChange([{ name: 'A', date: '2026-01-01', weight: 100, reps: 5 }, { name: 'A', date: '2026-09-20', weight: 120, reps: 5 }], now)).toBeNull()
  })
})

describe('adherence28', () => {
  const now = new Date(2026, 8, 30)
  it('sesiones distintas en 28 días entre las esperadas (días del plan × 4)', () => {
    const l = { a: log('2026-09-10', [['1', '1']]), b: log('2026-09-12', [['1', '1']]), c: log('2026-09-20', [['1', '1']]), d: log('2026-08-01', [['1', '1']]) } as unknown as TrainingLogs
    expect(adherence28(plan, l, now)).toBe(38) // 3 días / (2 días × 4)
  })
  it('null sin plan', () => {
    expect(adherence28(null, logs, now)).toBeNull()
  })
})

describe('streakDays', () => {
  const now = new Date(2026, 8, 30)
  it('cuenta días consecutivos hasta hoy', () => {
    const l = { a: log('2026-09-30', [['1', '1']]), b: log('2026-09-29', [['1', '1']]), c: log('2026-09-27', [['1', '1']]) } as unknown as TrainingLogs
    expect(streakDays(l, now)).toBe(2)
  })
  it('con countToday suma hoy aunque aún no esté guardado', () => {
    const l = { b: log('2026-09-29', [['1', '1']]) } as unknown as TrainingLogs
    expect(streakDays(l, now)).toBe(0)
    expect(streakDays(l, now, true)).toBe(2)
  })
})
