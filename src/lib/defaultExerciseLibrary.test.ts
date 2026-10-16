import { describe, it, expect } from 'vitest'
import { DEFAULT_EXERCISE_LIBRARY, GYM_BASICS } from './defaultExerciseLibrary'

const CATEGORIES = new Set(['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Antebrazo', 'Piernas', 'Glúteos', 'Core', 'Cardio', 'Funcional/Olímpico'])

describe('biblioteca de ejercicios de serie', () => {
  it('no repite nombres (el top-up compara por nombre en minúsculas y duplicaría filas)', () => {
    const seen = new Map<string, number>()
    DEFAULT_EXERCISE_LIBRARY.forEach(e => seen.set(e.name.toLowerCase(), (seen.get(e.name.toLowerCase()) || 0) + 1))
    expect([...seen].filter(([, n]) => n > 1).map(([name]) => name)).toEqual([])
  })

  it('todas las entradas tienen nombre y una categoría conocida', () => {
    const malas = DEFAULT_EXERCISE_LIBRARY.filter(e => !e.name.trim() || !CATEGORIES.has(e.category))
    expect(malas).toEqual([])
  })

  it('cada básico de GYM_BASICS existe en la biblioteca', () => {
    const names = new Set(DEFAULT_EXERCISE_LIBRARY.map(e => e.name))
    expect(GYM_BASICS.filter(n => !names.has(n))).toEqual([])
  })
})
