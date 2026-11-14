import { describe, it, expect } from 'vitest'
import { alternarGuardado, idComunidad, idPanelfit, limpiarGuardados } from './programasGuardados'

describe('programas guardados', () => {
  it('ids por origen', () => {
    expect(idPanelfit('fuerza-4')).toBe('pf:fuerza-4')
    expect(idComunidad('abc')).toBe('com:abc')
  })
  it('limpia lo guardado: solo ids válidos y sin repetir', () => {
    expect(limpiarGuardados(['pf:a', 'pf:a', 'com:b', 'otro', 3, null])).toEqual(['pf:a', 'com:b'])
    expect(limpiarGuardados('pf:a')).toEqual([])
  })
  it('alternar guarda o quita', () => {
    expect(alternarGuardado(['pf:a'], 'com:b')).toEqual(['pf:a', 'com:b'])
    expect(alternarGuardado(['pf:a', 'com:b'], 'pf:a')).toEqual(['com:b'])
  })
})
