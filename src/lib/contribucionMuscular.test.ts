import { describe, it, expect } from 'vitest'
import { contribucionesDe, limpiarContribuciones, sumarSeries, redondear, claveEjercicio, type VolumenGrupo } from './contribucionMuscular'

describe('contribucionesDe', () => {
  it('el grupo principal cuenta entero (directo) y los que ayudan, con el peso de partida', () => {
    expect(contribucionesDe('Press banca', 'Pecho')).toEqual([
      { grupo: 'Pecho', peso: 1 }, { grupo: 'Tríceps', peso: 0.5 }, { grupo: 'Hombros', peso: 0.5 },
    ])
    expect(contribucionesDe('Remo con barra', 'Espalda')).toEqual([{ grupo: 'Espalda', peso: 1 }, { grupo: 'Bíceps', peso: 0.5 }])
    expect(contribucionesDe('Sentadilla', 'Piernas')).toEqual([{ grupo: 'Piernas', peso: 1 }, { grupo: 'Glúteos', peso: 0.5 }])
  })

  it('un ejercicio de aislamiento o desconocido no recibe indirecto inventado', () => {
    expect(contribucionesDe('Curl de bíceps', 'Bíceps')).toEqual([{ grupo: 'Bíceps', peso: 1 }])
    expect(contribucionesDe('Aperturas con mancuernas', 'Pecho')).toEqual([{ grupo: 'Pecho', peso: 1 }])
    expect(contribucionesDe('Ejercicio raro', 'Otros')).toEqual([{ grupo: 'Otros', peso: 1 }])
  })

  it('el principal no se repite si coincide con un indirecto', () => {
    // Un press de hombro cuyo grupo ya es Tríceps (biblioteca rara): no se duplica
    const c = contribucionesDe('Press militar', 'Tríceps')
    expect(c.filter(x => x.grupo === 'Tríceps')).toHaveLength(1)
  })

  it('lo que cambió el entrenador manda sobre los valores de partida', () => {
    const propias = { [claveEjercicio('Press banca')]: [{ grupo: 'Pecho', peso: 1 }, { grupo: 'Tríceps', peso: 0.25 }] }
    expect(contribucionesDe('PRESS BANCA', 'Pecho', propias)).toEqual([{ grupo: 'Pecho', peso: 1 }, { grupo: 'Tríceps', peso: 0.25 }])
    expect(contribucionesDe('Press inclinado', 'Pecho', propias)[1]).toEqual({ grupo: 'Tríceps', peso: 0.5 }) // otro ejercicio, sin tocar
  })
})

describe('limpiarContribuciones', () => {
  it('acepta lo válido y acota los pesos entre 0 y 1', () => {
    const r = limpiarContribuciones({ 'Press Banca': [{ grupo: 'Pecho', peso: 1 }, { grupo: 'Tríceps', peso: 3 }, { grupo: 'Hombros', peso: -2 }] })
    expect(r['press banca']).toEqual([{ grupo: 'Pecho', peso: 1 }, { grupo: 'Tríceps', peso: 1 }, { grupo: 'Hombros', peso: 0 }])
  })
  it('descarta formas raras, grupos repetidos y pesos que no son números', () => {
    expect(limpiarContribuciones(null)).toEqual({})
    expect(limpiarContribuciones([1, 2])).toEqual({})
    expect(limpiarContribuciones({ a: 'x', b: [{ grupo: 5, peso: 1 }], c: [{ grupo: 'Pecho', peso: 'mucho' }] })).toEqual({})
    expect(limpiarContribuciones({ a: [{ grupo: 'Pecho', peso: 1 }, { grupo: 'Pecho', peso: 0.5 }] }).a).toEqual([{ grupo: 'Pecho', peso: 1 }])
  })
})

describe('sumarSeries', () => {
  it('reparte las series en directas e indirectas ponderadas', () => {
    const acum: Record<string, VolumenGrupo> = {}
    sumarSeries(acum, contribucionesDe('Press banca', 'Pecho'), 4)
    sumarSeries(acum, contribucionesDe('Press militar', 'Hombros'), 4)
    expect(acum.Pecho).toEqual({ directas: 4, indirectas: 0 })
    expect(acum.Hombros).toEqual({ directas: 4, indirectas: 2 })   // 4 directas del militar + 4 × 0,5 del banca
    expect(acum['Tríceps']).toEqual({ directas: 0, indirectas: 4 }) // 4 × 0,5 + 4 × 0,5
  })
  it('un peso 0 no cuenta y las series vacías no suman', () => {
    const acum: Record<string, VolumenGrupo> = {}
    sumarSeries(acum, [{ grupo: 'Pecho', peso: 1 }, { grupo: 'Tríceps', peso: 0 }], 3)
    sumarSeries(acum, [{ grupo: 'Pecho', peso: 1 }], 0)
    expect(acum).toEqual({ Pecho: { directas: 3, indirectas: 0 } })
  })
})

describe('redondear', () => {
  it('deja como mucho un decimal', () => { expect(redondear(4.5)).toBe(4.5); expect(redondear(4.25)).toBe(4.3); expect(redondear(6)).toBe(6) })
})
