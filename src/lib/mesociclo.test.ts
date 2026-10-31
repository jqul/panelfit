import { describe, it, expect } from 'vitest'
import { bloqueDeSemana, objetivoPorNombre } from './mesociclo'
import type { WeekPlan } from '../types'

const sem = (extra: Partial<WeekPlan> = {}) => ({ label: 'S', rpe: '@7', isCurrent: false, days: [], ...extra }) as WeekPlan

describe('bloqueDeSemana', () => {
  const weeks = [
    sem(),                                                                       // sin bloque
    sem({ bloque: 'Bloque de fuerza · 4 semanas', objetivo: 'fuerza' }),
    sem({ bloque: 'Bloque de fuerza · 4 semanas', objetivo: 'fuerza' }),
    sem({ bloque: 'Bloque de fuerza · 4 semanas', objetivo: 'fuerza', isDeload: true }),
    sem({ objetivo: 'hipertrofia' }),                                            // objetivo puesto a mano
    sem({ objetivo: 'hipertrofia' }),
  ]
  it('qué semana de cuántas del bloque, con su objetivo', () => {
    expect(bloqueDeSemana(weeks, 2)).toEqual({ nombre: 'Bloque de fuerza · 4 semanas', objetivo: 'fuerza', semana: 2, total: 3, descarga: false })
    expect(bloqueDeSemana(weeks, 3)?.descarga).toBe(true)
  })
  it('sin nombre de bloque, el nombre sale del objetivo', () => {
    expect(bloqueDeSemana(weeks, 5)).toEqual({ nombre: 'Bloque de hipertrofia', objetivo: 'hipertrofia', semana: 2, total: 2, descarga: false })
  })
  it('una semana sin bloque ni objetivo no tiene bloque', () => {
    expect(bloqueDeSemana(weeks, 0)).toBeNull()
    expect(bloqueDeSemana(weeks, 9)).toBeNull()
  })
})

describe('objetivoPorNombre', () => {
  it('lo deduce del nombre de los bloques de siempre', () => {
    expect(objetivoPorNombre('Bloque de fuerza · 4 semanas')).toBe('fuerza')
    expect(objetivoPorNombre('Bloque de hipertrofia · 5 semanas')).toBe('hipertrofia')
    expect(objetivoPorNombre('Bloque de peaking · 3 semanas')).toBe('peaking')
    expect(objetivoPorNombre('Mi bloque raro')).toBeUndefined()
  })
})
