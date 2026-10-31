import { describe, it, expect } from 'vitest'
import { indiceProgreso, fmtPct } from './indiceProgreso'
import { TrainingLogs } from '../types'

const HOY = new Date(2026, 9, 31) // 31 oct 2026
let n = 0
const sesion = (date: string, name: string, weight: string, reps: string, extra: object = {}) =>
  [`ex_w${50 + n++}_d0_r0`, { done: true, dateDone: date, substituteName: name, sets: { 0: { weight, reps }, 1: { weight, reps } }, ...extra }] as const

describe('indiceProgreso', () => {
  it('compara las últimas 4 semanas con las 4 anteriores y explica cada parte', () => {
    const logs = Object.fromEntries([
      // Antes (6 sept – 3 oct): press 100×5 y sentadilla 120×5, dos sesiones
      sesion('2026-09-10', 'Press banca', '100', '5'),
      sesion('2026-09-20', 'Sentadilla', '120', '5'),
      // Ahora (4–31 oct): press 105×5, sentadilla 120×5, tres sesiones
      sesion('2026-10-10', 'Press banca', '105', '5', { sets: { 0: { weight: '105', reps: '5', rir: 2 }, 1: { weight: '105', reps: '5', rir: 1 } } }),
      sesion('2026-10-20', 'Sentadilla', '120', '5'),
      sesion('2026-10-28', 'Remo', '60', '10'),
    ]) as unknown as TrainingLogs
    const r = indiceProgreso(logs, null, HOY)!
    const parte = (id: string) => r.partes.find(p => p.id === id)!
    expect(parte('fuerza').pct).toBe(2.5)          // mediana de +5 % y 0 %
    expect(parte('fuerza').detalle).toContain('2 ejercicios repetidos')
    expect(parte('volumen').pct).toBe(56.8)        // 3450 kg frente a 2200 kg
    expect(parte('constancia').pct).toBe(50)       // 3 sesiones frente a 2
    // 0,6·2,5 + 0,25·50 (tope) + 0,15·50 = 21,5
    expect(r.indice).toBe(21.5)
    expect(r.estado).toBe('sube')
    expect(r.rirMedio).toBe(1.5)
  })

  it('sin ejercicios repetidos, volumen y constancia se reparten el peso', () => {
    const logs = Object.fromEntries([
      sesion('2026-09-15', 'Press banca', '100', '5'),
      sesion('2026-10-15', 'Remo', '50', '10'),
    ]) as unknown as TrainingLogs
    const r = indiceProgreso(logs, null, HOY)!
    expect(r.partes.find(p => p.id === 'fuerza')!.pct).toBeNull()
    expect(r.indice).toBe(0) // volumen 0 %, constancia 0 %
    expect(r.estado).toBe('estable')
  })

  it('sin sesiones en uno de los dos periodos, no hay índice', () => {
    const logs = Object.fromEntries([sesion('2026-10-15', 'Remo', '50', '10')]) as unknown as TrainingLogs
    expect(indiceProgreso(logs, null, HOY)).toBeNull()
  })

  it('fmtPct', () => {
    expect(fmtPct(4.25)).toBe('+4,3\u00a0%')
    expect(fmtPct(-3)).toBe('-3\u00a0%')
  })
})
