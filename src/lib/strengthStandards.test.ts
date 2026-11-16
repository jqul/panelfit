import { describe, it, expect } from 'vitest'
import { matchLiftKey, getStrengthStandard, umbralesKg } from './strengthStandards'

describe('matchLiftKey', () => {
  it('matches squat, bench and deadlift by common names', () => {
    expect(matchLiftKey('Sentadilla libre')).toBe('squat')
    expect(matchLiftKey('Press banca plano')).toBe('bench')
    expect(matchLiftKey('Peso muerto rumano')).toBe('deadlift')
  })

  it('returns null for unrelated exercises', () => {
    expect(matchLiftKey('Curl de bíceps')).toBeNull()
  })
})

describe('getStrengthStandard', () => {
  it('returns null without weight or bodyweight', () => {
    expect(getStrengthStandard('squat', 0, 80, 'm')).toBeNull()
    expect(getStrengthStandard('squat', 100, 0, 'm')).toBeNull()
  })

  it('classifies a beginner-level lift', () => {
    const r = getStrengthStandard('squat', 40, 80, 'm') // ratio 0.5
    expect(r?.level).toBe('principiante')
    expect(r?.nextLevel).toBe('novato')
  })

  it('classifies an advanced lift and computes progress toward elite', () => {
    const r = getStrengthStandard('squat', 180, 80, 'm') // ratio 2.25, between advanced(2.0) and elite(2.5)
    expect(r?.level).toBe('avanzado')
    expect(r?.nextLevel).toBe('elite')
    expect(r?.progressToNext).toBeGreaterThan(0)
    expect(r?.progressToNext).toBeLessThan(1)
  })

  it('caps at elite with no next level', () => {
    const r = getStrengthStandard('squat', 250, 80, 'm') // ratio 3.1
    expect(r?.level).toBe('elite')
    expect(r?.nextLevel).toBeNull()
    expect(r?.kgToNext).toBeNull()
  })
})

describe('umbralesKg', () => {
  it('los kilos de cada nivel para un peso corporal (redondeado a 0,5 kg)', () => {
    expect(umbralesKg('bench', 80, 'm')).toEqual([
      { level: 'principiante', kg: 40 }, { level: 'novato', kg: 60 }, { level: 'intermedio', kg: 80 },
      { level: 'avanzado', kg: 120 }, { level: 'elite', kg: 140 },
    ])
    expect(umbralesKg('bench', 0, 'm')).toEqual([])
  })
})

describe('nota de fuerza y equilibrio', () => {
  it('press militar reconocido', () => {
    expect(matchLiftKey('Press militar de pie')).toBe('press')
    expect(matchLiftKey('Press banca')).toBe('bench')
  })
  it('20 puntos por nivel, repartidos según el ratio', async () => {
    const { puntuacionFuerza } = await import('./strengthStandards')
    expect(puntuacionFuerza('squat', 100, 80, 'm')).toBe(50)   // ratio 1,25: a medio camino entre novato (1,0 = 40) e intermedio (1,5 = 60)
    expect(puntuacionFuerza('bench', 20, 80, 'm')).toBe(10)    // ratio 0,25: medio camino hacia principiante (0,5 = 20)
    expect(puntuacionFuerza('deadlift', 300, 80, 'm')).toBe(100)
    expect(puntuacionFuerza('squat', 100, 0, 'm')).toBeNull()
  })
  it('equilibrio: global y el que va 20 puntos o más por detrás', async () => {
    const { equilibrioFuerza } = await import('./strengthStandards')
    expect(equilibrioFuerza({ squat: 60, bench: 35, deadlift: 62 })).toEqual({ global: 52, flojo: 'bench', fuerte: 'deadlift', diferencia: 27 })
    expect(equilibrioFuerza({ squat: 60, bench: 55 })).toEqual({ global: 58, flojo: null, fuerte: null, diferencia: 5 })
    expect(equilibrioFuerza({})).toBeNull()
  })
})
