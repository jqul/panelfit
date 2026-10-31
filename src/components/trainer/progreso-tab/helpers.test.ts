import { describe, it, expect } from 'vitest'
import { getMuscleGroup, getExName } from './helpers'
import type { TrainingPlan } from '../../../types'

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

describe('getExName', () => {
  const plan = { weeks: [{ days: [{ exercises: [{ name: 'Press banca' }, { name: 'Series 400 m', kind: 'run' }] }] }] } as unknown as TrainingPlan
  it('el ejercicio del plan en esa posición', () => {
    expect(getExName('ex_w0_d0_r0', plan)).toBe('Press banca')
  })
  it('si ese día lo cambió por otro, el que hizo de verdad (aunque la semana ya no esté en el plan)', () => {
    expect(getExName('ex_w0_d0_r0', plan, { substituteName: 'Flexiones' })).toBe('Flexiones')
    expect(getExName('ex_w9_d0_r0', plan, { substituteName: 'Remo' })).toBe('Remo')
  })
  it('las carreras no cuentan, y sin plan ni sustitución no hay nombre', () => {
    expect(getExName('ex_w0_d0_r1', plan)).toBeNull()
    expect(getExName('ex_w9_d0_r0', plan)).toBeNull()
    expect(getExName('otra_cosa', plan, { substituteName: 'X' })).toBeNull()
  })
})
