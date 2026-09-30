import { describe, it, expect } from 'vitest'
import { matchLiftKey, getStrengthStandard } from './strengthStandards'

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
