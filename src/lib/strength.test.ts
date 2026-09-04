import { describe, it, expect } from 'vitest'
import { estimate1RM, rpeToTargetRIR, suggestNextLoad, parsePercentWeight, resolveWeightFromPercent, estimateVelocityProfile, velocityLossPct, getVbtSuggestedWeightChange } from './strength'

describe('estimate1RM', () => {
  it('returns the weight itself for a single rep', () => {
    expect(estimate1RM(100, 1)).toBe(100)
  })

  it('estimates a higher 1RM for more reps at the same weight', () => {
    expect(estimate1RM(100, 5)).toBeCloseTo(116.67, 1)
    expect(estimate1RM(100, 10)).toBeCloseTo(133.33, 1)
  })

  it('returns 0 for missing weight or reps', () => {
    expect(estimate1RM(0, 5)).toBe(0)
    expect(estimate1RM(100, 0)).toBe(0)
  })
})

describe('rpeToTargetRIR', () => {
  it('converts an RPE string to its equivalent target RIR', () => {
    expect(rpeToTargetRIR('@7')).toBe(3)
    expect(rpeToTargetRIR('@8.5')).toBe(1.5)
    expect(rpeToTargetRIR('@10')).toBe(0)
  })

  it('returns null for missing or invalid input', () => {
    expect(rpeToTargetRIR(undefined)).toBeNull()
    expect(rpeToTargetRIR('')).toBeNull()
    expect(rpeToTargetRIR('@15')).toBeNull()
  })
})

describe('suggestNextLoad', () => {
  it('suggests increasing load when there was a lot of leftover margin', () => {
    const s = suggestNextLoad(100, 5, 3)
    expect(s.direction).toBe('up')
    expect(s.deltaKg).toBeGreaterThan(0)
  })

  it('suggests decreasing load when the set was harder than planned', () => {
    const s = suggestNextLoad(100, 1, 3)
    expect(s.direction).toBe('down')
  })

  it('suggests holding when right on target', () => {
    const s = suggestNextLoad(100, 3, 3)
    expect(s.direction).toBe('hold')
    expect(s.deltaKg).toBe(0)
  })

  it('holds when there is no previous weight to base a suggestion on', () => {
    expect(suggestNextLoad(0, 3, 3).direction).toBe('hold')
  })
})

describe('parsePercentWeight', () => {
  it('parses a percentage string', () => {
    expect(parsePercentWeight('75%')).toBe(75)
    expect(parsePercentWeight('82.5%')).toBe(82.5)
  })

  it('returns null for non-percentage weight fields', () => {
    expect(parsePercentWeight('80kg')).toBeNull()
    expect(parsePercentWeight('')).toBeNull()
    expect(parsePercentWeight('150%')).toBeNull()
  })
})

describe('resolveWeightFromPercent', () => {
  it('computes the target weight from a percentage and an estimated 1RM', () => {
    expect(resolveWeightFromPercent('75%', 100)).toBe(75)
    expect(resolveWeightFromPercent('80%', 137)).toBeCloseTo(109.5, 1)
  })

  it('returns null when the field is not a percentage or 1RM is unknown', () => {
    expect(resolveWeightFromPercent('80kg', 100)).toBeNull()
    expect(resolveWeightFromPercent('75%', 0)).toBeNull()
  })
})

describe('estimateVelocityProfile', () => {
  it('refuses to estimate from a single data point', () => {
    const p = estimateVelocityProfile([{ weight: 100, velocity: 0.5 }])
    expect(p.oneRM).toBeNull()
    expect(p.points).toBe(1)
  })

  it('fits a line through two distinct loads and extrapolates to the MVT', () => {
    // Recta exacta: peso = 133.33 - 66.67·velocidad → a 0.2 m/s, 1RM ≈ 120kg
    const p = estimateVelocityProfile([
      { weight: 100, velocity: 0.5 },
      { weight: 80, velocity: 0.8 },
    ], 0.2)
    expect(p.points).toBe(2)
    expect(p.oneRM).toBeCloseTo(120, 0)
    expect(p.slope).toBeLessThan(0) // más velocidad, menos peso
  })

  it('averages repeated sets at the same weight into a single point', () => {
    const p = estimateVelocityProfile([
      { weight: 100, velocity: 0.48 },
      { weight: 100, velocity: 0.52 }, // misma carga, otra serie — cuenta como 1 punto
      { weight: 80, velocity: 0.8 },
    ], 0.2)
    expect(p.points).toBe(2)
  })

  it('ignores sets with no velocity logged', () => {
    const p = estimateVelocityProfile([
      { weight: 100, velocity: 0.5 },
      { weight: 90, velocity: 0 },
    ])
    expect(p.points).toBe(1)
    expect(p.oneRM).toBeNull()
  })
})

describe('velocityLossPct', () => {
  it('computes the percentage drop from the first set of the exercise', () => {
    expect(velocityLossPct(0.7, 0.8)).toBeCloseTo(12.5, 1)
  })

  it('returns null without a valid first-set reference', () => {
    expect(velocityLossPct(0.7, 0)).toBeNull()
  })
})

describe('getVbtSuggestedWeightChange', () => {
  it('suggests lowering the load when today\'s velocity-1RM is well below the historical best', () => {
    const s = getVbtSuggestedWeightChange(90, 100, 80) // -10%
    expect(s?.direction).toBe('down')
    expect(s?.deltaKg).toBeCloseTo(8, 1) // 10% of 80kg
  })

  it('suggests raising the load when today is well above the historical best', () => {
    const s = getVbtSuggestedWeightChange(115, 100, 80) // +15%
    expect(s?.direction).toBe('up')
  })

  it('holds within a 10% band — measurement noise, not real fatigue', () => {
    const s = getVbtSuggestedWeightChange(95, 100, 80) // -5%
    expect(s?.direction).toBe('hold')
    expect(s?.deltaKg).toBe(0)
  })

  it('returns null without both a today and a historical profile', () => {
    expect(getVbtSuggestedWeightChange(null, 100, 80)).toBeNull()
    expect(getVbtSuggestedWeightChange(90, null, 80)).toBeNull()
  })
})
