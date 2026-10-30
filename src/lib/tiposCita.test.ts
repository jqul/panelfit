import { describe, it, expect } from 'vitest'
import { limpiarTipos, nuevoTipo, COLORES_CITA } from './tiposCita'

describe('tipos de cita', () => {
  it('se queda con lo válido, sin repetir, con color de la paleta y duración razonable', () => {
    expect(limpiarTipos([
      { id: 't_a', nombre: ' Entreno  personal ', color: COLORES_CITA[1], duracion: 62 },
      { id: 't_a', nombre: 'Repetido', color: COLORES_CITA[0], duracion: 60 },
      { id: 't_b', nombre: 'Color raro', color: 'red', duracion: 1000 },
      { id: 'malo', nombre: 'Id raro' }, { id: 't_c', nombre: '' }, null,
    ])).toEqual([
      { id: 't_a', nombre: 'Entreno personal', color: COLORES_CITA[1], duracion: 60 },
      { id: 't_b', nombre: 'Color raro', color: COLORES_CITA[0], duracion: 60 },
    ])
    expect(limpiarTipos('nada')).toEqual([])
  })
  it('uno nuevo es válido', () => {
    const t = nuevoTipo('Valoración', COLORES_CITA[2], 45)
    expect(limpiarTipos([t])).toEqual([t])
    expect(t).toMatchObject({ nombre: 'Valoración', color: COLORES_CITA[2], duracion: 45 })
  })
})
