import { describe, it, expect } from 'vitest'
import { sinEntrar } from './useClientStats'

describe('sinEntrar', () => {
  it('solo quien nunca abrió su enlace ni registró nada', () => {
    expect(sinEntrar({})).toBe(true)
    expect(sinEntrar({ plan_last_opened_at: '2026-10-01T10:00:00Z' })).toBe(false)
    expect(sinEntrar({ lastActive: '2026-10-20' })).toBe(false)
  })
})
