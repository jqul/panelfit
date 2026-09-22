import { describe, it, expect } from 'vitest'
import { getEffectiveWeekIdx } from './planWeek'
import { TrainingPlan, TrainingLogs, WeekPlan, DayPlan } from '../types'

function day(title: string, n: number): DayPlan {
  return { title, focus: '', exercises: Array.from({ length: n }, (_, i) => ({ name: `Ej ${i}`, sets: '3x10', weight: '10kg', isMain: i === 0, comment: '', videoUrl: '' })) }
}
function week(label: string, isCurrent: boolean, days: DayPlan[]): WeekPlan {
  return { label, rpe: '@8', isCurrent, days }
}
function plan(weeks: WeekPlan[]): TrainingPlan {
  return { clientId: 'c1', restMain: 90, restAcc: 60, restWarn: 20, message: '', weeks }
}
function doneLog(weekIdx: number, dayIdx: number, exCount: number): TrainingLogs {
  const logs: TrainingLogs = {}
  for (let ri = 0; ri < exCount; ri++) logs[`ex_w${weekIdx}_d${dayIdx}_r${ri}`] = { sets: {}, done: true }
  return logs
}
function merge(...logs: TrainingLogs[]): TrainingLogs { return Object.assign({}, ...logs) }

describe('getEffectiveWeekIdx', () => {
  it('se queda en la semana actual si aún tiene días sin terminar', () => {
    const p = plan([
      week('Semana 1', false, [day('Día A', 2)]),
      week('Semana 2', true, [day('Día A', 2)]),
    ])
    const logs = doneLog(1, 0, 1) // solo 1 de 2 ejercicios hecho en la semana actual
    expect(getEffectiveWeekIdx(p, logs)).toBe(1)
  })

  it('avanza a la siguiente semana sin terminar cuando la actual está completa del todo', () => {
    const p = plan([
      week('Semana 1', true, [day('Día A', 2)]),
      week('Semana 2', false, [day('Día A', 2)]),
    ])
    const logs = doneLog(0, 0, 2) // semana 1 (actual) completa
    expect(getEffectiveWeekIdx(p, logs)).toBe(1)
  })

  it('sigue avanzando en cascada por varias semanas ya completas', () => {
    const p = plan([
      week('Semana 1', true, [day('Día A', 1)]),
      week('Semana 2', false, [day('Día A', 1)]),
      week('Semana 3', false, [day('Día A', 1)]),
    ])
    const logs = merge(doneLog(0, 0, 1), doneLog(1, 0, 1))
    expect(getEffectiveWeekIdx(p, logs)).toBe(2)
  })

  it('se queda en la última semana aunque esté completa (no hay más a donde avanzar)', () => {
    const p = plan([
      week('Semana 1', false, [day('Día A', 1)]),
      week('Semana 2', true, [day('Día A', 1)]),
    ])
    const logs = doneLog(1, 0, 1)
    expect(getEffectiveWeekIdx(p, logs)).toBe(1)
  })

  it('sin ninguna semana marcada isCurrent, empieza en la primera y avanza igual', () => {
    const p = plan([
      week('Semana 1', false, [day('Día A', 1)]),
      week('Semana 2', false, [day('Día A', 1)]),
    ])
    const logs = doneLog(0, 0, 1)
    expect(getEffectiveWeekIdx(p, logs)).toBe(1)
  })
})
