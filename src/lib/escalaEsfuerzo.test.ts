import { describe, it, expect, beforeEach } from 'vitest'
import { valorEnEscala, etiquetaEsfuerzo, escalaEsfuerzo, guardarEscalaEsfuerzo } from './escalaEsfuerzo'

describe('escala de esfuerzo', () => {
  it('RPE = 10 − RIR, también con medios', () => {
    expect(valorEnEscala(2, 'rpe')).toBe('8')
    expect(valorEnEscala(1.5, 'rpe')).toBe('8,5')
    expect(valorEnEscala(0, 'rpe')).toBe('10')
    expect(valorEnEscala(5, 'rpe', true)).toBe('≤5')
    expect(valorEnEscala(5, 'rir', true)).toBe('5+')
  })
  it('etiquetas', () => {
    expect(etiquetaEsfuerzo(2, 'rir')).toBe('RIR 2')
    expect(etiquetaEsfuerzo(2, 'rpe')).toBe('RPE 8')
    expect(etiquetaEsfuerzo(1.4, 'rpe')).toBe('RPE 8,6')
  })
  describe('preferencia', () => {
    const mem: Record<string, string> = {}
    beforeEach(() => {
      for (const k of Object.keys(mem)) delete mem[k]
      ;(globalThis as { localStorage?: Storage }).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v } } as Storage
    })
    it('RIR por defecto; se recuerda RPE', () => {
      expect(escalaEsfuerzo()).toBe('rir')
      guardarEscalaEsfuerzo('rpe')
      expect(escalaEsfuerzo()).toBe('rpe')
    })
  })
})
