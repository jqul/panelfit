import { describe, it, expect } from 'vitest'
import { parseTempo } from './tempo'

describe('parseTempo', () => {
  it('parses a standard 4-number tempo', () => {
    const phases = parseTempo('3-1-1-0')
    expect(phases).not.toBeNull()
    expect(phases!.map(p => p.seconds)).toEqual([3, 1, 1, 0])
    expect(phases!.map(p => p.explosive)).toEqual([false, false, false, false])
  })

  it('marks an "X" phase as explosive', () => {
    const phases = parseTempo('3-0-X-0')
    expect(phases![2].explosive).toBe(true)
    expect(phases![2].seconds).toBe(0)
  })

  it('is case-insensitive for the explosive marker', () => {
    expect(parseTempo('2-1-x-0')![2].explosive).toBe(true)
  })

  it('returns null for missing or empty input', () => {
    expect(parseTempo(undefined)).toBeNull()
    expect(parseTempo(null)).toBeNull()
    expect(parseTempo('')).toBeNull()
  })

  it('returns null for the wrong number of phases', () => {
    expect(parseTempo('3-1-1')).toBeNull()
    expect(parseTempo('3-1-1-0-0')).toBeNull()
  })

  it('returns null for non-numeric, non-X phases', () => {
    expect(parseTempo('3-1-rápido-0')).toBeNull()
  })

  it('returns null when every phase is a real zero (nothing to cue)', () => {
    expect(parseTempo('0-0-0-0')).toBeNull()
  })

  it('accepts an all-explosive tempo (e.g. Olympic lifting cues)', () => {
    const phases = parseTempo('X-0-X-0')
    expect(phases![0].explosive).toBe(true)
    expect(phases![2].explosive).toBe(true)
  })
})
