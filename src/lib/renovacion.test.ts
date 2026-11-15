import { describe, it, expect } from 'vitest'
import { mensajeRenovacion, tocaRenovar } from './renovacion'

describe('renovación', () => {
  it('toca en las 2 últimas semanas si no hay siguiente preparado', () => {
    expect(tocaRenovar(10, false)).toBe(true)
    expect(tocaRenovar(0, false)).toBe(true)
    expect(tocaRenovar(10, true)).toBe(false)
    expect(tocaRenovar(20, false)).toBe(false)
    expect(tocaRenovar(-3, false)).toBe(false) // ya terminó: eso es otra cosa
    expect(tocaRenovar(undefined, false)).toBe(false)
  })
  it('mensaje con el nombre, la fecha y la marca', () => {
    const m = mensajeRenovacion('María', '2026-11-30', 'DURISIMO')
    expect(m).toContain('Hola María!')
    expect(m).toContain('termina el lunes, 30 de noviembre')
    expect(m.endsWith('— DURISIMO')).toBe(true)
  })
})
