import { describe, it, expect } from 'vitest'
import { canUse, getPlan, getClientLimit, PLANS } from './plans'

describe('canUse', () => {
  it('allows a feature included in the plan', () => {
    expect(canUse('surveys', 'pro')).toBe(true)
  })

  it('denies a feature not included in the plan', () => {
    expect(canUse('multi_trainer', 'pro')).toBe(false)
  })

  it('falls back to free plan when planName is missing', () => {
    expect(canUse('video_library', undefined)).toBe(true)
    expect(canUse('pdf_report', undefined)).toBe(false)
  })

  it('falls back to free plan when planName is unknown', () => {
    expect(canUse('video_library', 'nonexistent')).toBe(true)
  })
})

describe('getPlan', () => {
  it('returns the matching plan config', () => {
    expect(getPlan('studio')).toBe(PLANS.studio)
  })

  it('falls back to free for missing/unknown plan names', () => {
    expect(getPlan(null)).toBe(PLANS.free)
    expect(getPlan('bogus')).toBe(PLANS.free)
  })
})

describe('getClientLimit', () => {
  it('returns the configured limit for each plan', () => {
    expect(getClientLimit('free')).toBe(3)
    expect(getClientLimit('starter')).toBe(15)
    expect(getClientLimit('pro')).toBe(9999)
  })
})
