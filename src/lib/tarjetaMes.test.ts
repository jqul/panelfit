import { describe, it, expect } from 'vitest'
import { resumenMes, textoMes, nombreMes } from './tarjetaMes'
import type { TrainingLogs } from '../types'

const log = (fecha: string, nombre: string, peso: number, reps = 5) => ({ done: true, dateDone: fecha, substituteName: nombre, sets: { 0: { weight: String(peso), reps: String(reps) } } })

describe('resumenMes', () => {
  const logs: TrainingLogs = {
    ex_w0_d0_r0: log('2026-10-10', 'Sentadilla', 100),
    ex_w0_d0_r1: log('2026-10-10', 'Press banca', 80),
    ex_w1_d0_r0: log('2026-11-03', 'Sentadilla', 110), // récord: su 1RM estimado pasa de 116,7 a 128,3
    ex_w1_d0_r1: log('2026-11-03', 'Press banca', 75),  // no
    ex_w2_d0_r0: log('2026-11-10', 'Peso muerto', 140), // primera vez: no es récord
  }
  it('entrenos, volumen, series y récords del mes', () => {
    const r = resumenMes(logs, null, '2026-11')
    expect(r).toMatchObject({ sesiones: 2, volumen: 110 * 5 + 75 * 5 + 140 * 5, series: 3 })
    expect(r.records).toEqual([{ name: 'Sentadilla', ahora: 128.3, antes: 116.7 }])
  })
  it('un mes vacío', () => {
    expect(resumenMes(logs, null, '2026-09')).toMatchObject({ sesiones: 0, volumen: 0, series: 0, records: [] })
  })
})

describe('textoMes', () => {
  it('con la marca del entrenador', () => {
    const t = textoMes({ mes: '2026-11', sesiones: 12, volumen: 23450, series: 140, records: [{ name: 'Sentadilla', ahora: 128.3, antes: 116.7 }] }, 'DURISIMO')
    expect(t).toBe('📅 Mi noviembre de 2026 en números\n🏋️ 12 entrenos · 23,5 t movidas · 140 series\n🏆 Sentadilla 128,3 kg (+11,6)\nEntrenando con DURISIMO')
  })
  it('nombre del mes con mayúscula', () => {
    expect(nombreMes('2026-11')).toBe('Noviembre de 2026')
  })
})
