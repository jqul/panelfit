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
  // Un viernes (30 oct) con el plan por días: «JUEVES» ya hecho hoy, «VIERNES» sin hacer.
  const viernes30 = new Date(2026, 9, 30, 10)
  const planDias = (titulos: string[]) => ({ ...base, fechaInicio: '2026-10-26', weeks: [{ label: 'S', rpe: '', isCurrent: true, days: titulos.map(dia) }] }) as any
  const hecho = (w: number, d: number, fecha: string) => ({ [`ex_w${w}_d${d}_r0`]: { done: true, dateDone: fecha } }) as any

  it('sábado con toda la semana hecha y nada entrenado hoy: descanso, no vuelve al lunes', () => {
    const plan = planDias(['LUNES — EMPUJE', 'MARTES — TIRÓN', 'JUEVES — BANCA', 'VIERNES — PIERNA'])
    const logs = { ...hecho(0, 0, '2026-10-26'), ...hecho(0, 1, '2026-10-27'), ...hecho(0, 2, '2026-10-29'), ...hecho(0, 3, '2026-10-30') }
    expect(getTodaySession(plan, logs, new Date(2026, 9, 31, 10))).toBeNull()
  })

  it('sábado con la semana hecha y una sesión entrenada hoy: esa, hecha', () => {
    const plan = planDias(['LUNES — EMPUJE', 'VIERNES — PIERNA'])
    const logs = { ...hecho(0, 0, '2026-10-26'), ...hecho(0, 1, '2026-10-31') }
    expect(getTodaySession(plan, logs, new Date(2026, 9, 31, 10))?.dayKey).toBe('w0_d1')
  })

  it('hizo hoy (viernes) la sesión del jueves: Hoy enseña esa como hecha, no pide la del viernes', () => {
    const plan = planDias(['LUNES — EMPUJE', 'MARTES — TIRÓN', 'JUEVES — BANCA', 'VIERNES — PIERNA'])
    expect(getTodaySession(plan, hecho(0, 2, '2026-10-30'), viernes30)?.dayKey).toBe('w0_d2')
  })

  it('lo mismo con días sin nombre (Día A/B/C): hecha hoy otra, esa es la de hoy', () => {
    const plan = planDias(['Día A', 'Día B', 'Día C'])
    expect(getTodaySession(plan, hecho(0, 0, '2026-10-30'), viernes30)?.dayKey).toBe('w0_d0')
  })

  it('si la del jueves se hizo ayer, hoy sigue tocando la del viernes', () => {
    const plan = planDias(['LUNES — EMPUJE', 'MARTES — TIRÓN', 'JUEVES — BANCA', 'VIERNES — PIERNA'])
    expect(getTodaySession(plan, hecho(0, 2, '2026-10-29'), viernes30)?.dayKey).toBe('w0_d3')
  })

  it('una sesión de hoy a medias (sin terminar) no cuenta como hecha', () => {
    const plan = planDias(['LUNES — EMPUJE', 'JUEVES — BANCA', 'VIERNES — PIERNA'])
    const logs = { ex_w0_d1_r0: { done: false, dateDone: '2026-10-30' } } as any
    expect(getTodaySession(plan, logs, viernes30)?.dayKey).toBe('w0_d2')
  })

  it('si la del viernes ya está hecha, es la del viernes aunque hoy se hiciera otra más', () => {
    const plan = planDias(['LUNES — EMPUJE', 'JUEVES — BANCA', 'VIERNES — PIERNA'])
    const logs = { ...hecho(0, 1, '2026-10-30'), ...hecho(0, 2, '2026-10-30') }
    expect(getTodaySession(plan, logs, viernes30)?.dayKey).toBe('w0_d2')
  })

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
