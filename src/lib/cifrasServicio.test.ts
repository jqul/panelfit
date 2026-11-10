import { describe, it, expect } from 'vitest'
import { cifrasServicio, moverMes } from './cifrasServicio'
import type { TrainingLogs, TrainingPlan } from '../types'

const ej = { name: 'X', sets: '3x5', weight: '', isMain: true, comment: '' }
const plan = { weeks: [{ days: [{ exercises: [ej, ej, ej, ej, ej] }, { exercises: [ej, ej] }] }] } as unknown as TrainingPlan
const hecho = (fecha: string) => ({ done: true, dateDone: fecha, sets: {} })

describe('cifrasServicio', () => {
  const logsAna: TrainingLogs = {
    // día 0: 5 de 5 (completa) el 3 de noviembre
    ex_w0_d0_r0: hecho('2026-11-03'), ex_w0_d0_r1: hecho('2026-11-03'), ex_w0_d0_r2: hecho('2026-11-03'), ex_w0_d0_r3: hecho('2026-11-03'), ex_w0_d0_r4: hecho('2026-11-03'),
    // día 1: 1 de 2 (a medias) el 5 de noviembre
    ex_w0_d1_r0: hecho('2026-11-05'),
  }
  const logsBeto: TrainingLogs = { ex_w0_d1_r0: hecho('2026-10-30'), ex_w0_d1_r1: hecho('2026-10-30') } // octubre
  const clientes = [{ id: 'a', plan, logs: logsAna }, { id: 'b', plan, logs: logsBeto }]
  const reacciones = [
    { clientId: 'a', date: '2026-11-03', emoji: '🔥' },
    { clientId: 'a', date: '2026-11-05', emoji: '😩' },
    { clientId: 'b', date: '2026-10-30', emoji: '💪' }, // otro mes
    { clientId: 'z', date: '2026-11-04', emoji: '🔥' }, // no es de los clientes
  ]
  const cargas = [{ client_id: 'a', date: '2026-11-03', rpe: 8 }, { client_id: 'a', date: '2026-11-05', rpe: 7 }, { client_id: 'b', date: '2026-10-30', rpe: 9 }]

  it('sesiones, completas, valoraciones y esfuerzo del mes', () => {
    const c = cifrasServicio(clientes, reacciones, cargas, '2026-11')
    expect(c).toMatchObject({ sesiones: 2, clientes: 1, completas: 1, pctCompletas: 50 })
    expect(c.reacciones).toMatchObject({ total: 2, positivas: 1, duras: 1, molestias: 0, pctPositivas: 50, porEmoji: { '🔥': 1, '😩': 1 } })
    expect(c.rpe).toEqual({ media: 7.5, n: 2 })
  })
  it('un mes sin nada', () => {
    const c = cifrasServicio(clientes, reacciones, cargas, '2026-09')
    expect(c).toMatchObject({ sesiones: 0, pctCompletas: null, reacciones: { total: 0, pctPositivas: null }, rpe: { media: null, n: 0 } })
  })
})

describe('moverMes', () => {
  it('cruza el año', () => {
    expect(moverMes('2026-01', -1)).toBe('2025-12')
    expect(moverMes('2026-12', 1)).toBe('2027-01')
  })
})
