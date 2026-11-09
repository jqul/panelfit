import { describe, it, expect } from 'vitest'
import { kg } from './formatoKg'
import { esPesoKg, getTargetRangeLabel } from './strength'

describe('kg', () => {
  it('coma decimal y sin ceros de más', () => {
    expect(kg(122.5)).toBe('122,5')
    expect(kg('122.5')).toBe('122,5')
    expect(kg('80')).toBe('80')
    expect(kg(1000)).toBe('1000')
    expect(kg(82.25)).toBe('82,25')
  })
  it('lo que no es un número, tal cual; vacío si no hay nada', () => {
    expect(kg('80%')).toBe('80%')
    expect(kg(undefined)).toBe('')
  })
})

describe('peso registrado', () => {
  it('un porcentaje no es un peso: no hay recomendación a partir de él', () => {
    expect(esPesoKg('80%')).toBe(false)
    expect(esPesoKg('82,5')).toBe(true)
    expect(getTargetRangeLabel('80%', 2)).toBeNull()
  })
})
