import { describe, it, expect } from 'vitest'
import { generateVamIntervals, vamIntervalAt, courseNavetteToVam, timedRunToVam } from './vam'

describe('vamIntervalAt', () => {
  it('computes speed and pace at a given %VAM', () => {
    const row = vamIntervalAt(16, 100) // VAM de 16 km/h, 100% = 16 km/h -> 3:45 min/km
    expect(row.speedKmh).toBe(16)
    expect(row.paceMinPerKm).toBe('3:45')
  })

  it('scales down for lower percentages and up for higher ones', () => {
    const at70 = vamIntervalAt(16, 70)
    const at130 = vamIntervalAt(16, 130)
    expect(at70.speedKmh).toBeCloseTo(11.2, 1)
    expect(at130.speedKmh).toBeCloseTo(20.8, 1)
    expect(at130.speedKmh).toBeGreaterThan(at70.speedKmh)
  })

  it('gives faster (lower) split times per distance at higher %VAM', () => {
    const at90 = vamIntervalAt(16, 90)
    const at120 = vamIntervalAt(16, 120)
    expect(at120.secPer400m).toBeLessThan(at90.secPer400m)
  })
})

describe('generateVamIntervals', () => {
  it('returns the standard field-sport zones by default', () => {
    const rows = generateVamIntervals(16)
    expect(rows.map(r => r.pct)).toEqual([70, 80, 90, 100, 110, 120, 130])
  })

  it('returns an empty table when there is no valid MAS yet', () => {
    expect(generateVamIntervals(0)).toEqual([])
    expect(generateVamIntervals(undefined as unknown as number)).toEqual([])
  })

  it('accepts custom percentages', () => {
    const rows = generateVamIntervals(15, [95, 105])
    expect(rows.map(r => r.pct)).toEqual([95, 105])
  })
})

describe('courseNavetteToVam', () => {
  it('estimates VAM from a beep-test stage', () => {
    expect(courseNavetteToVam(8)).toBeCloseTo(12, 1)
  })
})

describe('timedRunToVam', () => {
  it('computes average speed from a timed run as a field VAM estimate', () => {
    // 1000m en 4 minutos = 4 min/km = 15 km/h
    expect(timedRunToVam(1000, 240)).toBeCloseTo(15, 1)
  })

  it('guards against a zero/invalid time', () => {
    expect(timedRunToVam(1000, 0)).toBe(0)
  })
})
