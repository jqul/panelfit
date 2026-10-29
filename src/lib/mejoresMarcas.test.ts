import { describe, it, expect } from 'vitest'
import { mejoresMarcas } from './mejoresMarcas'
import type { TrainingLogs } from '../types'

const plan = { weeks: [{ days: [{ exercises: [{ name: 'Sentadilla' }, { name: 'Banca' }, { name: '400 m', kind: 'run' }] }] }] } as any
const log = (fecha: string, sets: [string, string][], extra: object = {}) =>
  ({ done: true, dateDone: fecha, sets: Object.fromEntries(sets.map(([weight, reps], i) => [i, { weight, reps }])), ...extra })

describe('mejoresMarcas', () => {
  // Las claves de registro son por posición; varias sesiones del mismo día del plan se distinguen por otra semana.
  const logs = {
    ex_w0_d0_r0: log('2026-03-02', [['100', '5'], ['110', '3']]),
    ex_w1_d0_r0: log('2026-05-04', [['120', '2']]),
    ex_w2_d0_r0: log('2025-12-01', [['130', '1']]),
    ex_w3_d0_r0: log('2026-06-01', [['110', '5']]),
    ex_w4_d0_r0: log('2026-07-01', [['90', '8']]),
    ex_w0_d0_r1: log('2026-03-02', [['80', '5']]),
    ex_w0_d0_r2: log('2026-03-02', [['', '']]),
  } as unknown as TrainingLogs
  const planLargo = { weeks: Array.from({ length: 5 }, () => plan.weeks[0]) } as any

  it('las tres mejores sesiones por ejercicio, una por día; a igual peso gana quien hizo más repeticiones', () => {
    const todas = mejoresMarcas(logs, planLargo)
    expect(todas.map(e => e.nombre)).toEqual(['Sentadilla', 'Banca'])
    expect(todas[0].podio).toEqual([
      { peso: 130, reps: 1, fecha: '2025-12-01' },
      { peso: 120, reps: 2, fecha: '2026-05-04' },
      { peso: 110, reps: 5, fecha: '2026-06-01' },
    ])
  })

  it('"este año" deja fuera lo anterior', () => {
    const anio = mejoresMarcas(logs, planLargo, '2026-01-01')
    expect(anio[0].podio.map(m => m.peso)).toEqual([120, 110, 110])
    expect(anio[0].podio[2]).toEqual({ peso: 110, reps: 3, fecha: '2026-03-02' })
  })

  it('las carreras y los sets sin peso no cuentan; lo sustituido cuenta con su nombre', () => {
    const conSustituto = { ex_w0_d0_r1: log('2026-03-02', [['30', '10']], { substituteName: 'Press con mancuernas' }) } as unknown as TrainingLogs
    expect(mejoresMarcas(conSustituto, plan).map(e => e.nombre)).toEqual(['Press con mancuernas'])
    expect(mejoresMarcas({ ex_w0_d0_r2: log('2026-03-02', [['50', '1']]) } as unknown as TrainingLogs, plan)).toEqual([])
  })
})
