import { describe, it, expect } from 'vitest'
import { cuentaEnProgreso } from './cuentaEnProgreso'
import { volumenLog } from './volumen'
import { historialPorEjercicio } from './historialEjercicio'
import { indiceProgreso } from './indiceProgreso'
import { collectSessionBests } from './progressSummary'
import { getExName } from '../components/trainer/progreso-tab/helpers'
import type { TrainingLogs } from '../types'

const sets = (w: string) => ({ 0: { weight: w, reps: '5' }, 1: { weight: w, reps: '5' } })

describe('registros marcados como «no contar»', () => {
  const logs = {
    ex_w50_d0_r0: { done: true, dateDone: '2026-09-15', substituteName: 'Press banca', sets: sets('100') },
    ex_w51_d0_r0: { done: true, dateDone: '2026-10-15', substituteName: 'Press banca', sets: sets('105') },
    ex_w52_d0_r0: { done: true, dateDone: '2026-10-20', substituteName: 'Press banca', sets: sets('800'), noContar: true }, // 800 por 80
  } as unknown as TrainingLogs

  it('el helper', () => {
    expect(cuentaEnProgreso(logs.ex_w51_d0_r0)).toBe(true)
    expect(cuentaEnProgreso(logs.ex_w52_d0_r0)).toBe(false)
    expect(cuentaEnProgreso(undefined)).toBe(true)
  })
  it('no suman volumen ni salen en las gráficas del entrenador', () => {
    expect(volumenLog(logs.ex_w52_d0_r0)).toBe(0)
    expect(getExName('ex_w52_d0_r0', null, logs.ex_w52_d0_r0)).toBeNull()
  })
  it('no cuentan para récords, historial ni índice (que dice cuántos hay fuera)', () => {
    expect(Math.max(...collectSessionBests(logs, null).map(b => b.weight))).toBe(105)
    expect(historialPorEjercicio(logs, null)[0].sesiones.map(s => s.date)).toEqual(['2026-10-15', '2026-09-15'])
    const i = indiceProgreso(logs, null, new Date(2026, 9, 31))!
    expect(i.excluidos).toBe(1)
    expect(i.partes.find(p => p.id === 'fuerza')!.pct).toBe(5)
  })
})
