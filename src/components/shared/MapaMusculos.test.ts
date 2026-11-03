import { describe, it, expect } from 'vitest'
import { intensidadPorGrupo } from './MapaMusculos'

describe('intensidadPorGrupo', () => {
  it('el grupo con más series en 1 y los demás en proporción; sin dibujo (Otros) fuera', () => {
    expect(intensidadPorGrupo({ 'Pecho': 12, 'Espalda': 6, 'Piernas': 3, 'Otros': 20, 'Core': 0 }))
      .toEqual({ 'Pecho': 1, 'Espalda': 0.5, 'Piernas': 0.25 })
  })
  it('sin series, vacío', () => {
    expect(intensidadPorGrupo({})).toEqual({})
    expect(intensidadPorGrupo({ 'Otros': 5 })).toEqual({})
  })
})
