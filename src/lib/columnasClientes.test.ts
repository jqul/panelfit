import { describe, it, expect } from 'vitest'
import { alternarColumna, limpiarColumnas, plantillaColumnas, POR_DEFECTO, textoAlta, textoPlan } from './columnasClientes'

describe('limpiarColumnas y alternarColumna', () => {
  it('sin nada guardado, las de siempre', () => {
    expect(limpiarColumnas(null)).toEqual(POR_DEFECTO)
    expect(limpiarColumnas('x')).toEqual(POR_DEFECTO)
  })
  it('en el orden de la tabla y sin inventadas', () => {
    expect(limpiarColumnas(['alertas', 'inventada', 'estado'])).toEqual(['estado', 'alertas'])
  })
  it('marcar una nueva la mete en su sitio; desmarcar la quita', () => {
    expect(alternarColumna(['estado', 'alertas'], 'plan')).toEqual(['estado', 'plan', 'alertas'])
    expect(alternarColumna(['estado', 'alertas'], 'estado')).toEqual(['alertas'])
  })
  it('se puede quedar solo el nombre', () => {
    expect(alternarColumna(['estado'], 'estado')).toEqual([])
    expect(limpiarColumnas([])).toEqual([])
  })
})

describe('plantillaColumnas', () => {
  it('cliente, las elegidas y los botones', () => {
    expect(plantillaColumnas(['estado', 'alta'])).toBe('minmax(0,2.2fr) minmax(0,1fr) minmax(0,0.8fr) auto')
    expect(plantillaColumnas([])).toBe('minmax(0,2.2fr) auto')
  })
})

describe('textoPlan', () => {
  const hoy = new Date(2026, 10, 4) // miércoles 4 nov
  it('cada punto del plan', () => {
    expect(textoPlan({ hasPlan: false }, hoy)).toBe('Sin plan')
    expect(textoPlan({ hasPlan: true, planStartDate: '2026-11-09', planEndDate: '2026-12-07' }, hoy)).toBe('Empieza el 9 nov')
    expect(textoPlan({ hasPlan: true, planStartDate: '2026-10-05', planEndDate: '2026-11-16' }, hoy)).toBe('Termina el 15 nov')
    expect(textoPlan({ hasPlan: true, planStartDate: '2026-10-05', planEndDate: '2026-12-28' }, hoy)).toBe('Hasta el 27 dic')
    expect(textoPlan({ hasPlan: true, planStartDate: '2026-09-07', planEndDate: '2026-10-05' }, hoy)).toBe('Terminado')
    expect(textoPlan({ hasPlan: true }, hoy)).toBe('En curso')
  })
})

describe('textoAlta', () => {
  it('fecha corta, o raya si no se sabe', () => {
    expect(textoAlta(new Date(2026, 9, 3).getTime())).toBe('3 oct 2026')
    expect(textoAlta(undefined)).toBe('—')
  })
})
