import { describe, it, expect } from 'vitest'
import { conMarca, ejerciciosConMarca, marcaDeReferencia, textoOrigen } from './marcaRM'
import type { TrainingLogs, TrainingPlan } from '../types'

const ej = (name: string, extra: Record<string, unknown> = {}) => ({ name, sets: '3x5', weight: '', isMain: true, comment: '', ...extra })
// Semana 1: sentadilla normal; semana 2: test de RM de sentadilla; semana 3: sentadilla al 80 %
const plan = {
  weeks: [
    { days: [{ exercises: [ej('Sentadilla')] }] },
    { days: [{ exercises: [ej('Sentadilla', { testRM: true, sets: '1x1' })] }] },
    { days: [{ exercises: [ej('Sentadilla', { weight: '80%' }), ej('Press banca', { weight: '75%' })] }] },
  ],
} as unknown as TrainingPlan

const logs: TrainingLogs = {
  ex_w0_d0_r0: { done: true, dateDone: '2026-10-01', sets: { 0: { weight: '150', reps: '5' } } }, // e1RM 175
  ex_w1_d0_r0: { done: true, dateDone: '2026-10-20', sets: { 0: { weight: '120', reps: '1', tipo: 'calentamiento' }, 1: { weight: '170', reps: '1' } } },
}

describe('marcaDeReferencia', () => {
  it('el test de RM manda aunque el historial estime más', () => {
    expect(marcaDeReferencia('Sentadilla', plan, logs)).toEqual({ kg: 170, fecha: '2026-10-20', origen: 'test' })
  })
  it('una marca a mano más reciente que el test gana; una más antigua, no', () => {
    expect(marcaDeReferencia('Sentadilla', { ...plan, marcas: { sentadilla: { kg: 180, fecha: '2026-11-01' } } }, logs))
      .toEqual({ kg: 180, fecha: '2026-11-01', origen: 'manual' })
    expect(marcaDeReferencia('Sentadilla', { ...plan, marcas: { sentadilla: { kg: 180, fecha: '2026-09-01' } } }, logs)?.origen).toBe('test')
  })
  it('sin test ni marca, el mejor 1RM estimado de siempre', () => {
    const sinTest = { weeks: [plan.weeks[0]] } as unknown as TrainingPlan
    expect(marcaDeReferencia('Sentadilla', sinTest, logs)).toEqual({ kg: 175, origen: 'estimado' })
  })
  it('una sesión marcada como no contar no fija marca', () => {
    const l = { ...logs, ex_w1_d0_r0: { ...logs.ex_w1_d0_r0, noContar: true } }
    expect(marcaDeReferencia('Sentadilla', plan, l)?.origen).toBe('estimado')
  })
  it('nada registrado, nada', () => {
    expect(marcaDeReferencia('Press banca', plan, logs)).toBeNull()
  })
})

describe('textoOrigen', () => {
  it('dice de dónde sale', () => {
    expect(textoOrigen({ kg: 170, fecha: '2026-10-20', origen: 'test' })).toBe('según tu test del 20 oct')
    expect(textoOrigen({ kg: 180, fecha: '2026-11-01', origen: 'manual' })).toBe('según tu marca del 1 nov')
    expect(textoOrigen({ kg: 175, origen: 'estimado' })).toBe('según tu 1RM estimado')
  })
})

describe('ejerciciosConMarca y conMarca', () => {
  it('los que van por % o tienen test, sin repetir', () => {
    expect(ejerciciosConMarca(plan)).toEqual(['Sentadilla', 'Press banca'])
  })
  it('pone y quita una marca a mano por nombre', () => {
    const m = conMarca(undefined, 'Press Banca', 102.5, '2026-11-05')
    expect(m).toEqual({ 'press banca': { kg: 102.5, fecha: '2026-11-05' } })
    expect(conMarca(m, 'press banca', null, '2026-11-05')).toEqual({})
  })
})
