import { describe, it, expect } from 'vitest'
import { getEffectiveWeekIdx } from './planWeek'
import { TrainingPlan, TrainingLogs, WeekPlan, DayPlan } from '../types'

function day(title: string, n: number): DayPlan {
  return { title, focus: '', exercises: Array.from({ length: n }, (_, i) => ({ name: `Ej ${i}`, sets: '3x10', weight: '10kg', isMain: i === 0, comment: '', videoUrl: '' })) }
}
function week(label: string, isCurrent: boolean, days: DayPlan[]): WeekPlan {
  return { label, rpe: '@8', isCurrent, days }
}
function plan(weeks: WeekPlan[], fechaInicio?: string): TrainingPlan {
  return { clientId: 'c1', type: 'hipertrofia', restMain: 90, restAcc: 60, restWarn: 20, message: '', weeks, ...(fechaInicio ? { fechaInicio } : {}) }
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

  // Con fecha de inicio (plan de Javi: powerlifting 13 semanas, iniciado el
  // miércoles 2-sep-2026, isCurrent clavado en Semana 1 en la BD) manda el
  // calendario, con semanas de lunes a domingo, no la finalización de días.
  const INICIO = '2026-09-02'
  const semanas13 = () => Array.from({ length: 13 }, (_, i) => week(`Semana ${i + 1}`, i === 0, [day('Día A', 4)]))

  it('con fecha de inicio, avanza por calendario aunque isCurrent siga en la semana 1', () => {
    const p = plan(semanas13(), INICIO)
    expect(getEffectiveWeekIdx(p, {}, new Date(2026, 8, 16))).toBe(2) // miércoles 16-sep, sin ningún log
  })

  it('las semanas van de lunes a domingo: el cambio de semana es el lunes, no el día de la fecha de inicio', () => {
    const p = plan(semanas13(), INICIO)
    expect(getEffectiveWeekIdx(p, {}, new Date(2026, 8, 20))).toBe(2) // domingo 20-sep
    expect(getEffectiveWeekIdx(p, {}, new Date(2026, 8, 21))).toBe(3) // lunes 21-sep
    expect(getEffectiveWeekIdx(p, {}, new Date(2026, 8, 23))).toBe(3) // miércoles 23-sep: sigue la misma semana
    expect(getEffectiveWeekIdx(p, {}, new Date(2026, 8, 27))).toBe(3) // domingo 27-sep
    expect(getEffectiveWeekIdx(p, {}, new Date(2026, 8, 28))).toBe(4) // lunes 28-sep
  })

  it('la semana de la fecha de inicio es la semana 1 aunque empiece a mitad de semana', () => {
    const p = plan(semanas13(), INICIO)
    expect(getEffectiveWeekIdx(p, {}, new Date(2026, 8, 2))).toBe(0)
    expect(getEffectiveWeekIdx(p, {}, new Date(2026, 8, 6))).toBe(0) // domingo 6-sep
    expect(getEffectiveWeekIdx(p, {}, new Date(2026, 8, 7))).toBe(1) // lunes 7-sep
  })

  it('con fecha de inicio, avanza igual aunque la semana en curso no se completara del todo', () => {
    const weeks = [
      week('Semana 1', true, [day('Día A', 4)]),
      week('Semana 2', false, [day('Día A', 4)]),
    ]
    const p = plan(weeks, INICIO)
    // semana 1: solo 3 de 4 ejercicios de su único día — nunca llega a "completa"
    const logs: TrainingLogs = {
      ex_w0_d0_r0: { sets: {}, done: true },
      ex_w0_d0_r1: { sets: {}, done: true },
      ex_w0_d0_r2: { sets: {}, done: true },
    }
    expect(getEffectiveWeekIdx(p, logs, new Date(2026, 8, 9))).toBe(1)
  })

  it('con fecha de inicio, se queda en la última semana al superar la duración del plan', () => {
    const p = plan(semanas13(), INICIO)
    expect(getEffectiveWeekIdx(p, {}, new Date(2027, 5, 1))).toBe(12)
  })

  it('con fecha de inicio futura, se queda en la semana 1', () => {
    const p = plan(semanas13(), INICIO)
    expect(getEffectiveWeekIdx(p, {}, new Date(2026, 7, 1))).toBe(0)
  })
})
