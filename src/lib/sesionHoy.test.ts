import { describe, it, expect } from 'vitest'
import { getTodaySession } from './sesionHoy'

const ex = [{ name: 'Sentadilla', sets: '3x5', weight: '', isMain: true, comment: '' }]
const dia = (title: string) => ({ title, focus: '', exercises: ex })
// Semana 1 = lunes 19 oct; semana 2 = lunes 26 oct.
const base = {
  clientId: 'c', type: 'x', restMain: 0, restAcc: 0, restWarn: 0, fechaInicio: '2026-10-19',
  weeks: [
    { label: 'S1', rpe: '', isCurrent: true, days: [dia('Día A'), dia('Día B'), dia('Día C')] },
    { label: 'S2', rpe: '', isCurrent: false, days: [dia('Día A'), dia('Día B'), dia('Día C')] },
  ],
} as any
const miercoles28 = new Date(2026, 9, 28, 10)

describe('sesión de hoy', () => {
  it('sin movimientos, la siguiente sin terminar de la semana (como antes)', () => {
    expect(getTodaySession(base, {}, miercoles28)?.dayKey).toBe('w1_d0')
  })

  it('si el entrenador movió una sesión a hoy, esa manda (aunque sea de otra semana)', () => {
    const plan = { ...base, fechasSesion: { w0_d2: '2026-10-28' } }
    expect(getTodaySession(plan, {}, miercoles28)?.dayKey).toBe('w0_d2')
  })

  it('una sesión movida a hoy pero ya hecha no se repite', () => {
    const plan = { ...base, fechasSesion: { w0_d2: '2026-10-28' } }
    const logs = { ex_w0_d2_r0: { done: true, dateDone: '2026-10-27' } } as any
    expect(getTodaySession(plan, logs, miercoles28)?.dayKey).toBe('w1_d0')
  })

  it('las de esta semana movidas a otro día no se ofrecen hoy', () => {
    const plan = { ...base, fechasSesion: { w1_d0: '2026-10-30' } }
    expect(getTodaySession(plan, {}, miercoles28)?.dayKey).toBe('w1_d1')
  })

  it('con el día en el título, y esa sesión movida, no la toma por el título', () => {
    const plan = { ...base, weeks: [base.weeks[0], { ...base.weeks[1], days: [dia('Lunes'), dia('Miércoles'), dia('Viernes')] }], fechasSesion: { w1_d1: '2026-10-29' } }
    expect(getTodaySession(plan, {}, miercoles28)?.dayKey).toBe('w1_d0')
  })

  it('un plan que empieza más adelante no ofrece nada todavía', () => {
    expect(getTodaySession({ ...base, fechaInicio: '2026-11-02' }, {}, miercoles28)).toBeNull()
    // el mismo día de inicio, sí
    expect(getTodaySession({ ...base, fechaInicio: '2026-10-28' }, {}, miercoles28)?.dayKey).toBe('w0_d0')
  })

  it('aunque no haya empezado, una sesión movida a hoy a mano sí se ofrece', () => {
    const plan = { ...base, fechaInicio: '2026-11-02', fechasSesion: { w0_d0: '2026-10-28' } }
    expect(getTodaySession(plan, {}, miercoles28)?.dayKey).toBe('w0_d0')
  })
})
