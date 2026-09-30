import { describe, it, expect } from 'vitest'
import { computeJumpFatigue, worstJumpFatigue, JumpResultado } from './jumpFatigue'

function row(valor: number, fecha: string, testId = 't1', testName = 'Salto vertical (CMJ)'): JumpResultado {
  return { testId, testName, valor, fecha }
}

describe('computeJumpFatigue', () => {
  it('flags a real drop against the recent baseline', () => {
    const s = computeJumpFatigue([
      row(40, '2026-08-01'), row(42, '2026-08-08'), row(41, '2026-08-15'), row(36, '2026-08-22'),
    ])
    expect(s.hasData).toBe(true)
    expect(s.baseline).toBeCloseTo(41, 0) // media de 40,42,41
    expect(s.dropPct).toBeGreaterThan(8)
    expect(s.isDrop).toBe(true)
  })

  it('does not flag normal day-to-day variation', () => {
    const s = computeJumpFatigue([row(40, '2026-08-01'), row(41, '2026-08-08'), row(39.5, '2026-08-15')])
    expect(s.isDrop).toBe(false)
  })

  it('flags an improvement as no drop, not a negative drop treated as alarm', () => {
    const s = computeJumpFatigue([row(32, '2026-08-01'), row(36, '2026-08-08'), row(39, '2026-08-15')])
    expect(s.isDrop).toBe(false)
    expect(s.dropPct).toBeLessThan(0)
  })

  it('refuses to judge with too few samples — no baseline yet', () => {
    expect(computeJumpFatigue([row(40, '2026-08-01')]).hasData).toBe(false)
    expect(computeJumpFatigue([row(40, '2026-08-01'), row(30, '2026-08-08')]).hasData).toBe(false)
  })
})

describe('worstJumpFatigue', () => {
  it('picks the test with the biggest real drop across several jump tests', () => {
    const cmj = [row(40, '2026-08-01'), row(41, '2026-08-08'), row(41, '2026-08-15'), row(38, '2026-08-22')] // ~7%, no drop
    const dropJump = [row(1.6, '2026-08-01', 't2', 'Drop Jump (RSI)'), row(1.7, '2026-08-08', 't2', 'Drop Jump (RSI)'), row(1.65, '2026-08-15', 't2', 'Drop Jump (RSI)'), row(1.3, '2026-08-22', 't2', 'Drop Jump (RSI)')] // ~20%, drop
    const worst = worstJumpFatigue([cmj, dropJump])
    expect(worst.testName).toBe('Drop Jump (RSI)')
    expect(worst.isDrop).toBe(true)
  })

  it('returns no-data when nothing has enough history', () => {
    expect(worstJumpFatigue([[row(40, '2026-08-01')]]).hasData).toBe(false)
  })
})
