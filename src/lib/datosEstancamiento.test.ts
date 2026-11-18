import { describe, it, expect } from 'vitest'
import { datosDelEjercicio, adherenciaReciente, rirACargaFija } from './datosEstancamiento'
import type { TrainingLogs, TrainingPlan } from '../types'

const ex = (name: string, extra: Record<string, unknown> = {}) => ({ name, sets: '3x5', weight: '', comment: '', isMain: false, ...extra })
const plan = (...dias: ReturnType<typeof ex>[][]): TrainingPlan => ({
  clientId: 'c', type: 'fuerza', restMain: 120, restAcc: 60, restWarn: 15, createdAt: 0, updatedAt: 0,
  weeks: [{ label: 'S1', rpe: '8', isCurrent: true, days: dias.map((exercises, i) => ({ title: `D${i}`, focus: '', exercises })) }],
} as unknown as TrainingPlan)
const log = (dateDone: string, sets: { weight: string; reps: string; rir?: number; tipo?: string }[], extra: Record<string, unknown> = {}) => ({
  done: true, dateDone, sets: Object.fromEntries(sets.map((s, i) => [i, s])), ...extra,
}) as unknown as TrainingLogs[string]

describe('datosDelEjercicio', () => {
  const p = plan([ex('Sentadilla', { rir: '1-2' })], [ex('Press banca')])
  it('RIR medio de las últimas sesiones frente al previsto del ejercicio; el calentamiento no cuenta', () => {
    const logs: TrainingLogs = {
      ex_w0_d0_r0: log('2026-11-16', [{ weight: '60', reps: '5', rir: 6, tipo: 'calentamiento' }, { weight: '100', reps: '5', rir: 3 }, { weight: '100', reps: '5', rir: 3 }]),
    }
    const d = datosDelEjercicio(logs, p, 'sentadilla', '2026-11-17')
    expect(d.esfuerzo).toEqual({ rirMedio: 3, objetivo: { min: 1, max: 2 } })
  })

  it('sin RIR registrado no se inventa: rirMedio es null; sin RIR previsto se usa el RPE de la semana', () => {
    const logs: TrainingLogs = { ex_w0_d1_r0: log('2026-11-16', [{ weight: '80', reps: '5' }]) }
    const d = datosDelEjercicio(logs, p, 'Press banca', '2026-11-17')
    expect(d.esfuerzo.rirMedio).toBeNull()
    expect(d.esfuerzo.objetivo).toEqual({ min: 2, max: 2 }) // RPE 8 → RIR 2
  })

  it('vídeo de ejecución: cuenta las sesiones recientes que lo traen', () => {
    const logs: TrainingLogs = { ex_w0_d0_r0: log('2026-11-16', [{ weight: '100', reps: '5' }], { videoEjecucion: 'https://v' }) }
    expect(datosDelEjercicio(logs, p, 'Sentadilla', '2026-11-17').sesionesConVideo).toBe(1)
  })

  it('carga: series y días por semana en las últimas 4 semanas, y null si no hay nada reciente', () => {
    const logs: TrainingLogs = {
      ex_w0_d0_r0: log('2026-11-16', [{ weight: '100', reps: '5' }, { weight: '100', reps: '5' }, { weight: '100', reps: '5' }, { weight: '100', reps: '5' }]),
      ex_w0_d0_r1: log('2026-10-01', [{ weight: '100', reps: '5' }]), // fuera de la ventana y de otro ejercicio
    }
    expect(datosDelEjercicio(logs, p, 'Sentadilla', '2026-11-17').carga).toEqual({ seriesPorSemana: 1, sesionesPorSemana: 0.25 })
    expect(datosDelEjercicio({}, p, 'Sentadilla', '2026-11-17').carga).toEqual({ seriesPorSemana: null, sesionesPorSemana: null })
  })

  it('un ejercicio sustituido cuenta para el que se hizo de verdad, y lo que el entrenador sacó de las estadísticas no cuenta', () => {
    const logs: TrainingLogs = {
      ex_w0_d0_r0: log('2026-11-16', [{ weight: '90', reps: '5', rir: 2 }], { substituteName: 'Sentadilla frontal' }),
      ex_w0_d1_r0: log('2026-11-16', [{ weight: '80', reps: '5', rir: 9 }], { noContar: true }),
    }
    expect(datosDelEjercicio(logs, p, 'Sentadilla frontal', '2026-11-17').esfuerzo.rirMedio).toBe(2)
    expect(datosDelEjercicio(logs, p, 'Press banca', '2026-11-17').esfuerzo.rirMedio).toBeNull()
  })
})

describe('adherenciaReciente', () => {
  const p = plan([ex('A')], [ex('B')]) // 2 días previstos por semana → 8 en 4 semanas
  it('días entrenados en 4 semanas entre los previstos', () => {
    const logs: TrainingLogs = { ex_w0_d0_r0: log('2026-11-16', []), ex_w0_d1_r0: log('2026-11-12', []), ex_w0_d0_r1: log('2026-11-12', []), ex_w0_d1_r1: log('2026-10-01', []) }
    expect(adherenciaReciente(logs, p, 0, '2026-11-17')).toBe(25) // 2 días distintos de 8
  })
  it('sin plan o sin días previstos no hay porcentaje', () => {
    expect(adherenciaReciente({}, null, 0, '2026-11-17')).toBeNull()
    expect(adherenciaReciente({}, plan(), 0, '2026-11-17')).toBeNull()
  })
})

describe('rirACargaFija', () => {
  const p = plan([ex('Sentadilla')])
  const ses = (dia: string, weight: string, reps: string, rir: number, key: string) => [key, log(dia, [{ weight, reps, rir }], { substituteName: 'Sentadilla' })] as const

  it('mismo peso y repeticiones en 3 sesiones: el RIR de la primera y el de la última', () => {
    const logs: TrainingLogs = Object.fromEntries([
      ses('2026-10-20', '100', '5', 1, 'ex_w0_d0_r0'), ses('2026-10-27', '100', '5', 2, 'ex_w0_d0_r1'), ses('2026-11-03', '100', '5', 3, 'ex_w0_d0_r2'),
    ])
    expect(rirACargaFija(logs, p, 'Sentadilla')).toEqual({ peso: 100, sesiones: 3, desde: '2026-10-20', rirInicial: 1, rirActual: 3 })
  })

  it('hacen falta 3 sesiones con ese peso, con RIR registrado: si no, null', () => {
    const dos: TrainingLogs = Object.fromEntries([ses('2026-10-20', '100', '5', 1, 'ex_w0_d0_r0'), ses('2026-10-27', '100', '5', 3, 'ex_w0_d0_r1')])
    expect(rirACargaFija(dos, p, 'Sentadilla')).toBeNull()
    const sinRir: TrainingLogs = Object.fromEntries([0, 1, 2].map(i => [`ex_w0_d0_r${i}`, log(`2026-10-2${i}`, [{ weight: '100', reps: '5' }], { substituteName: 'Sentadilla' })]))
    expect(rirACargaFija(sinRir, p, 'Sentadilla')).toBeNull()
  })

  it('solo se comparan sesiones con las mismas repeticiones (±1): con 8 reps en una no es lo mismo que 5', () => {
    const logs: TrainingLogs = Object.fromEntries([
      ses('2026-10-20', '100', '8', 0, 'ex_w0_d0_r0'), ses('2026-10-27', '100', '5', 2, 'ex_w0_d0_r1'), ses('2026-11-03', '100', '5', 3, 'ex_w0_d0_r2'),
    ])
    expect(rirACargaFija(logs, p, 'Sentadilla')).toBeNull() // quitando la de 8, solo quedan 2
  })

  it('con varios pesos elige el que más sesiones reúne, y a igualdad el más pesado', () => {
    const logs: TrainingLogs = Object.fromEntries([
      ses('2026-10-20', '90', '5', 2, 'ex_w0_d0_r0'), ses('2026-10-27', '90', '5', 2, 'ex_w0_d0_r1'), ses('2026-11-03', '90', '5', 3, 'ex_w0_d0_r2'),
      ses('2026-11-10', '100', '5', 1, 'ex_w0_d0_r3'),
    ])
    expect(rirACargaFija(logs, p, 'Sentadilla')?.peso).toBe(90)
  })

  it('el calentamiento no cuenta, aunque tenga el mismo peso', () => {
    const conCal = (dia: string, rirTrabajo: number) => log(dia, [{ weight: '100', reps: '5', rir: 9, tipo: 'calentamiento' }, { weight: '100', reps: '5', rir: rirTrabajo }], { substituteName: 'Sentadilla' })
    const logs: TrainingLogs = { ex_w0_d0_r0: conCal('2026-10-20', 1), ex_w0_d0_r1: conCal('2026-10-27', 2), ex_w0_d0_r2: conCal('2026-11-03', 3) }
    expect(rirACargaFija(logs, p, 'Sentadilla')?.rirInicial).toBe(1) // el calentamiento (RIR 9) no entra en la media
  })
})
