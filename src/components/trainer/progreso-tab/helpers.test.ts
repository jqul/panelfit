import { describe, it, expect } from 'vitest'
import { getMuscleGroup } from './helpers'

describe('getMuscleGroup', () => {
  it('curl abdominal es Core, no Bíceps', () => {
    expect(getMuscleGroup('Curl abdominal')).toBe('Core')
  })

  it('curl de bíceps sigue siendo Bíceps', () => {
    expect(getMuscleGroup('Curl de bíceps con barra')).toBe('Bíceps')
  })

  it('la biblioteca manda sobre las palabras clave', () => {
    expect(getMuscleGroup('Curl abdominal', new Map([['curl abdominal', 'Core']]))).toBe('Core')
  })
})
