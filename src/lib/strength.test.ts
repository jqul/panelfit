import { describe, it, expect } from 'vitest'
import { estimate1RM, rpeToTargetRIR, suggestNextLoad, parsePercentWeight, resolveWeightFromPercent } from './strength'

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
