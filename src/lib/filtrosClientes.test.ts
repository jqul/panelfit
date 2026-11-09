import { describe, it, expect } from 'vitest'
import { esNuevo, limpiarFiltros, FILTROS_POR_DEFECTO } from './filtrosClientes'

describe('limpiarFiltros', () => {
  it('sin nada guardado, lo de por defecto', () => {
    expect(limpiarFiltros(undefined)).toEqual(FILTROS_POR_DEFECTO)
  })
  it('conserva lo válido y descarta lo raro', () => {
    expect(limpiarFiltros({ estado: 'revisar', etiqueta: 'l1', profesional: '', orden: 'recent' }))
      .toEqual({ estado: 'revisar', etiqueta: 'l1', profesional: '', orden: 'recent' })
    expect(limpiarFiltros({ estado: 'otro', etiqueta: 3, profesional: null, orden: 'x' })).toEqual(FILTROS_POR_DEFECTO)
  })
})

describe('esNuevo', () => {
  const ahora = Date.UTC(2026, 10, 9)
  it('alta en los últimos 30 días', () => {
    expect(esNuevo(ahora - 5 * 86400000, ahora)).toBe(true)
    expect(esNuevo(ahora - 31 * 86400000, ahora)).toBe(false)
    expect(esNuevo(undefined, ahora)).toBe(false)
  })
})
