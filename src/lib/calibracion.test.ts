import { describe, it, expect } from 'vitest'
import { estadoCalibracion, revisionCalibracion, filasConAviso, DIAS_MAX_CALIBRACION } from './calibracion'
import type { TrainingLogs, TrainingPlan } from '../types'

const ex = (name: string, extra: Record<string, unknown> = {}) => ({ name, sets: '3x8', weight: '', comment: '', isMain: false, ...extra })
const plan = (extra: Record<string, unknown> = {}): TrainingPlan => ({
  clientId: 'c', type: 'hipertrofia', restMain: 120, restAcc: 60, restWarn: 15, createdAt: 0, updatedAt: 0,
  weeks: [{ label: 'S1', rpe: '8', isCurrent: true, days: [{ title: 'A', focus: '', exercises: [ex('Press banca', { rir: '2-3' }), ex('Sentadilla')] }] }],
  ...extra,
} as unknown as TrainingPlan)
const log = (dateDone: string, rirs: number[], extra: Record<string, unknown> = {}) => ({
  done: true, dateDone, sets: Object.fromEntries(rirs.map((rir, i) => [i, { weight: '50', reps: '8', rir }])), ...extra,
}) as unknown as TrainingLogs[string]

describe('estadoCalibracion', () => {
  it('sin entrenos y con plan reciente: calibrando; con un plan que empezó hace más de un mes, no', () => {
    expect(estadoCalibracion({}, plan(), '2026-11-19')).toMatchObject({ activa: true, sesionesHechas: 0, etiqueta: 'Calibrando · Semana 1 de 1' })
    expect(estadoCalibracion({}, plan({ fechaInicio: '2026-11-10' }), '2026-11-19').activa).toBe(true)
    expect(estadoCalibracion({}, plan({ fechaInicio: '2026-09-01' }), '2026-11-19').activa).toBe(false)
  })

  it('con entrenos: calibra durante las 2 semanas de su primera sesión y cuenta las sesiones', () => {
    const logs: TrainingLogs = { ex_w0_d0_r0: log('2026-11-12', [2]), ex_w0_d0_r1: log('2026-11-12', [2]), ex_w0_d1_r0: log('2026-11-15', [2]) }
    expect(estadoCalibracion(logs, plan(), '2026-11-19')).toMatchObject({ activa: true, sesionesHechas: 2 })
    const dia14 = `2026-11-${String(12 + DIAS_MAX_CALIBRACION).padStart(2, '0')}`
    expect(estadoCalibracion(logs, plan(), dia14).activa).toBe(true)
    expect(estadoCalibracion(logs, plan(), '2026-11-27').activa).toBe(false)
  })

  it('cuando el entrenador confirma las cargas, deja de calibrar; sin plan, tampoco', () => {
    const logs: TrainingLogs = { ex_w0_d0_r0: log('2026-11-12', [2]) }
    expect(estadoCalibracion(logs, plan({ calibracion: { confirmadaEl: '2026-11-15' } }), '2026-11-19').activa).toBe(false)
    expect(estadoCalibracion(logs, null, '2026-11-19').activa).toBe(false)
  })
})

describe('revisionCalibracion', () => {
  it('una fila por ejercicio con su sensación y su RIR medio; lo que llama la atención va primero', () => {
    const logs: TrainingLogs = {
      ex_w0_d0_r0: log('2026-11-12', [5, 5, 4], { sensacion: 'facil' }),
      ex_w0_d0_r1: log('2026-11-12', [2, 2, 2], { sensacion: 'correcto' }),
    }
    const filas = revisionCalibracion(logs, plan())
    expect(filas.map(f => f.ejercicio)).toEqual(['Press banca', 'Sentadilla'])
    expect(filas[0]).toMatchObject({ sensacion: 'facil', sesiones: 1 })
    expect(filas[0].avisos).toEqual(['Le resultó demasiado fácil: puede convenir subir la carga', 'RIR medio 4,7 frente a 2-3 previsto: va sobrado'])
    expect(filas[1].avisos).toEqual([])
    expect(filasConAviso(filas)).toBe(1)
  })

  it('«demasiado duro» y llegar muy justo se avisan; el calentamiento no cuenta para el RIR', () => {
    const duro = { done: true, dateDone: '2026-11-12', sensacion: 'duro', sets: { 0: { weight: '40', reps: '8', rir: 9, tipo: 'calentamiento' }, 1: { weight: '60', reps: '8', rir: 0 }, 2: { weight: '60', reps: '8', rir: 0 } } } as unknown as TrainingLogs[string]
    const filas = revisionCalibracion({ ex_w0_d0_r0: duro }, plan())
    expect(filas[0].rirMedio).toBe(0)
    expect(filas[0].avisos).toEqual(['Le resultó demasiado duro: puede convenir bajar la carga', 'RIR medio 0 frente a 2-3 previsto: llega muy justo'])
  })

  it('la sensación que cuenta es la más reciente; lo que el entrenador sacó de las estadísticas no entra', () => {
    const logs: TrainingLogs = {
      ex_w0_d0_r0: log('2026-11-10', [2], { sensacion: 'duro' }),
      ex_w0_d0_r1: log('2026-11-14', [2], { sensacion: 'correcto', substituteName: 'Press banca' }),
      ex_w0_d1_r0: log('2026-11-15', [9], { noContar: true }),
    }
    const press = revisionCalibracion(logs, plan()).find(f => f.ejercicio === 'Press banca')!
    expect(press.sensacion).toBe('correcto')
    expect(press.sesiones).toBe(2)
    expect(press.rirMedio).toBe(2)
  })
})
