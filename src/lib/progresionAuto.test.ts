import { describe, it, expect } from 'vitest'
import { calcularObjetivo, conRegla, objetivoDe, reglaDe, repsObjetivo, admiteProgresion, textoObjetivo } from './progresionAuto'
import type { Exercise, TrainingLogs, TrainingPlan } from '../types'

const ej = (sets: string, extra: Partial<Exercise> = {}): Exercise => ({ name: 'Press banca', sets, weight: '', isMain: true, comment: '', ...extra })
const sesion = (kg: number, reps: number[], date = '2026-11-01') => ({ date, series: reps.map(r => ({ weight: kg, reps: r })), mejor: { weight: kg, reps: Math.max(...reps) }, e1rm: 0, volumen: 0 })
const doble = { tipo: 'doble' as const, paso: 2.5, modo: 'sugerencia' as const }
const lineal = { tipo: 'lineal' as const, paso: 2.5, modo: 'sugerencia' as const }

describe('repsObjetivo y admiteProgresion', () => {
  it('lee reps fijas y rangos', () => {
    expect(repsObjetivo('4x5')).toEqual({ min: 5, max: 5 })
    expect(repsObjetivo('3×8-12')).toEqual({ min: 8, max: 12 })
    expect(repsObjetivo('al gusto')).toBeNull()
  })
  it('no se aplica a %, top set, test de RM ni carrera', () => {
    expect(admiteProgresion(ej('4x5'))).toBe(true)
    expect(admiteProgresion(ej('4x5', { weight: '80%' }))).toBe(false)
    expect(admiteProgresion(ej('4x3', { backoff: { pct: 85 } }))).toBe(false)
    expect(admiteProgresion(ej('1x1', { testRM: true }))).toBe(false)
  })
})

describe('doble progresión (3x8-12)', () => {
  const ex = ej('3x8-12')
  it('a medio camino: mismo peso, una rep más que la serie más floja', () => {
    expect(calcularObjetivo(ex, doble, sesion(60, [9, 8, 8]))).toMatchObject({ kg: 60, reps: 9, cambio: 'reps' })
  })
  it('una serie aún sin llegar a 12: no sube peso', () => {
    expect(calcularObjetivo(ex, doble, sesion(60, [12, 12, 11]))).toMatchObject({ kg: 60, reps: 12, cambio: 'reps' })
  })
  it('todas a 12: sube un paso y vuelve a 8', () => {
    expect(calcularObjetivo(ex, doble, sesion(60, [12, 12, 12]))).toMatchObject({ kg: 62.5, reps: 8, cambio: 'sube', deltaKg: 2.5 })
  })
  it('le costó más de lo previsto (RIR por debajo): mantiene', () => {
    expect(calcularObjetivo(ex, doble, sesion(62.5, [9, 8, 8]), 2, 1)).toMatchObject({ kg: 62.5, reps: 8, cambio: 'mantiene' })
  })
  it('ni la mejor serie llegó a 8: baja a un peso que pueda mover', () => {
    const o = calcularObjetivo(ex, doble, sesion(62.5, [7, 6, 6]))!
    expect(o.cambio).toBe('baja')
    expect(o.kg).toBeLessThan(62.5)
    expect(o.reps).toBe(8)
  })
})

describe('lineal (4x5)', () => {
  const ex = ej('4x5')
  it('todas las series completas: sube', () => {
    expect(calcularObjetivo(ex, lineal, sesion(100, [5, 5, 5, 5]))).toMatchObject({ kg: 102.5, reps: 5, cambio: 'sube' })
  })
  it('alguna se quedó corta: repite', () => {
    expect(calcularObjetivo(ex, lineal, sesion(100, [5, 5, 4, 4]))).toMatchObject({ kg: 100, cambio: 'mantiene' })
  })
  it('paso por defecto: 2,5 kg con 40 kg o más, 1 kg por debajo', () => {
    expect(calcularObjetivo(ex, { ...lineal, paso: 0 }, sesion(20, [5, 5, 5, 5]))!.kg).toBe(21)
  })
  it('solo cuentan las series del peso más alto (no el calentamiento)', () => {
    const s = { ...sesion(100, [5, 5, 5, 5]), series: [{ weight: 60, reps: 3 }, ...sesion(100, [5, 5, 5, 5]).series] }
    expect(calcularObjetivo(ex, lineal, s)).toMatchObject({ kg: 102.5, cambio: 'sube' })
  })
})

describe('reglas en el plan', () => {
  it('la del ejercicio manda sobre la del plan; "no" la apaga', () => {
    let plan = { progresion: conRegla({}, null, { tipo: 'auto', modo: 'guia' }) } as Pick<TrainingPlan, 'progresion'>
    expect(reglaDe(plan, 'Sentadilla')).toMatchObject({ tipo: 'auto', modo: 'guia' })
    plan = { progresion: conRegla(plan, 'Sentadilla', { tipo: 'no' }) }
    expect(reglaDe(plan, 'sentadilla ')).toBeNull()
    expect(reglaDe({}, 'Sentadilla')).toBeNull()
  })
  it('objetivoDe: usa la última sesión antes de hoy', () => {
    const plan = { clientId: 'c', type: '', restMain: 0, restAcc: 0, restWarn: 0, progresion: { defecto: { tipo: 'auto' } },
      weeks: [{ days: [{ exercises: [ej('3x8-12')] }] }, { days: [{ exercises: [ej('3x8-12')] }] }] } as unknown as TrainingPlan
    const logs: TrainingLogs = {
      ex_w0_d0_r0: { done: true, dateDone: '2026-11-01', sets: { 0: { weight: '60', reps: '10' }, 1: { weight: '60', reps: '9' }, 2: { weight: '60', reps: '9' } } },
      ex_w1_d0_r0: { done: true, dateDone: '2026-11-08', sets: { 0: { weight: '60', reps: '12' }, 1: { weight: '60', reps: '12' }, 2: { weight: '60', reps: '12' } } },
    }
    expect(objetivoDe(plan, logs, ej('3x8-12'), '2026-11-08')).toMatchObject({ kg: 60, reps: 10, modo: 'sugerencia' })
    const o = objetivoDe(plan, logs, ej('3x8-12'), '2026-11-09')!
    expect(textoObjetivo(o)).toBe('62,5 kg × 8 (+2,5)')
  })
})
