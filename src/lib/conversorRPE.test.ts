import { describe, it, expect } from 'vitest'
import { pct1RM, pesoPara, rirDeRpe, rpeDeRir, tablaRPE, unoRMDesde } from './conversorRPE'

describe('RPE y RIR', () => {
  it('son la misma escala al revés', () => {
    expect(rirDeRpe(8)).toBe(2)
    expect(rirDeRpe(9.5)).toBe(0.5)
    expect(rpeDeRir(3)).toBe(7)
    expect(rirDeRpe(12)).toBe(0) // se acota a 10
  })
})

describe('pct1RM', () => {
  it('1 al fallo es el 100 %; más reps o más reserva, menos %', () => {
    expect(pct1RM(1, 0)).toBe(100)
    expect(pct1RM(5, 0)).toBe(88.2)
    expect(pct1RM(3, 2)).toBe(88.2) // 3 @8 = 5 posibles, como 5 @10
    expect(pct1RM(8, 2)).toBe(76.9) // 10 posibles: 100 / (1 + 9/30)
  })
  it('fuera de rango, nada', () => {
    expect(pct1RM(0, 1)).toBeNull()
    expect(pct1RM(5, 7)).toBeNull()
  })
})

describe('pesos', () => {
  it('kilos para unas reps y un RIR, a 2,5 kg', () => {
    expect(pesoPara(200, 5, 2)).toBe(167.5) // 83,3 % → 166,7 → 167,5
    expect(pesoPara(0, 5, 2)).toBeNull()
  })
  it('1RM estimado desde un peso hecho', () => {
    expect(unoRMDesde(150, 5, 0)).toBe(170.1)
  })
})

describe('tablaRPE', () => {
  it('reps × RPE 10 a 6', () => {
    const t = tablaRPE(3)
    expect(t).toHaveLength(3)
    expect(t[0].pcts.map(p => p.rpe)).toEqual([10, 9, 8, 7, 6])
    expect(t[0].pcts[0].pct).toBe(100)
    expect(t[2].pcts[1].pct).toBe(m(3, 1))
  })
})
function m(reps: number, rir: number) { return pct1RM(reps, rir) }
