import { describe, it, expect } from 'vitest'
import { estaEstancado, revisionBloque, tocaRevisar } from './revisionBloque'
import type { TrainingLogs, TrainingPlan } from '../types'

const ej = (name: string) => ({ name, sets: '3x5', weight: '', isMain: true, comment: '' })
// 4 semanas desde el lunes 2026-10-05 (termina el lunes 2026-11-02); dos días por semana
const plan = {
  fechaInicio: '2026-10-05',
  weeks: Array.from({ length: 4 }, () => ({ days: [{ exercises: [ej('Sentadilla'), ej('Press banca')] }, { exercises: [ej('Peso muerto')] }] })),
} as unknown as TrainingPlan
const log = (fecha: string, kg: number) => ({ done: true, dateDone: fecha, sets: { 0: { weight: String(kg), reps: '5' } } })

describe('revisionBloque', () => {
  const logs: TrainingLogs = {
    // Sentadilla sube; press banca se estanca; peso muerto solo una vez
    ex_w0_d0_r0: log('2026-10-05', 100), ex_w1_d0_r0: log('2026-10-12', 105), ex_w2_d0_r0: log('2026-10-19', 110), ex_w3_d0_r0: log('2026-10-26', 112.5),
    ex_w0_d0_r1: log('2026-10-05', 80), ex_w1_d0_r1: log('2026-10-12', 80), ex_w2_d0_r1: log('2026-10-19', 77.5), ex_w3_d0_r1: log('2026-10-26', 80),
    ex_w0_d1_r0: log('2026-10-07', 140),
    ex_w9_d0_r0: log('2026-10-28', 200),   // semana que no es de este plan
    ex_w0_d1_r1: log('2026-09-01', 999),   // de antes de empezar
  }
  it('cumplimiento, los que suben y los estancados', () => {
    const r = revisionBloque(plan, logs, '2026-11-05')!
    expect(r).toMatchObject({ terminado: true, diasRestantes: 0, sesionesHechas: 5, sesionesPrevistas: 8, cumplimientoPct: 63 })
    expect(r.suben.map(e => e.name)).toEqual(['Sentadilla'])
    expect(r.suben[0].cambioPct).toBe(13)
    expect(r.estancados.map(e => e.name)).toEqual(['Press banca'])
    expect(r.ejercicios.map(e => e.name)).not.toContain('Peso muerto') // una sola sesión
  })
  it('se enseña en la última semana y después', () => {
    expect(tocaRevisar(revisionBloque(plan, logs, '2026-10-20'))).toBe(false)
    expect(tocaRevisar(revisionBloque(plan, logs, '2026-10-27'))).toBe(true)
    expect(revisionBloque({ ...plan, fechaInicio: undefined }, logs, '2026-11-05')).toBeNull()
  })
})

describe('estaEstancado', () => {
  const s = (e1rm: number, date: string) => ({ date, series: [], mejor: null, e1rm, volumen: 0 })
  it('las tres últimas no superan lo de antes', () => {
    // más reciente primero, como historialPorEjercicio
    expect(estaEstancado([s(90, 'd4'), s(91, 'd3'), s(92, 'd2'), s(93, 'd1')])).toBe(true)
    expect(estaEstancado([s(95, 'd4'), s(91, 'd3'), s(92, 'd2'), s(93, 'd1')])).toBe(false)
    expect(estaEstancado([s(90, 'd3'), s(91, 'd2'), s(92, 'd1')])).toBe(false) // pocas sesiones
  })
})
