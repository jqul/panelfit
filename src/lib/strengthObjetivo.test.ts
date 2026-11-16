import { describe, it, expect } from 'vitest'
import { objetivoRir, desvioRir, suggestNextLoad, getSuggestedWeightChange, getTargetRangeLabel } from './strength'

// El peso sugerido se decide por la DESVIACIÓN respecto al esfuerzo previsto, y lo previsto es el RIR del ejercicio
// (el que ve el cliente) si lo hay, y si no el RPE de la semana.

describe('objetivoRir', () => {
  it('el RIR del ejercicio manda sobre el RPE de la semana', () => {
    expect(objetivoRir('2-3', '@9')).toEqual({ min: 2, max: 3 })
    expect(objetivoRir(1, '@7')).toEqual({ min: 1, max: 1 })
  })
  it('sin RIR en el ejercicio, sale del RPE de la semana (RIR = 10 − RPE)', () => {
    expect(objetivoRir(undefined, '@7')).toEqual({ min: 3, max: 3 })
    expect(objetivoRir('', '@8.5')).toEqual({ min: 1.5, max: 1.5 })
  })
  it('un RIR del ejercicio ilegible no rompe nada: se usa la semana, y sin nada, no hay objetivo', () => {
    expect(objetivoRir('abc', '@8')).toEqual({ min: 2, max: 2 })
    expect(objetivoRir(undefined, undefined)).toBeNull()
  })
})

describe('desvioRir', () => {
  const t = { min: 2, max: 3 }
  it('dentro del rango no hay desviación', () => {
    expect([2, 2.5, 3].map(r => desvioRir(r, t))).toEqual([0, 0, 0])
  })
  it('fuera: positivo = más margen del previsto, negativo = más duro', () => {
    expect(desvioRir(5, t)).toBe(2)
    expect(desvioRir(4, t)).toBe(1)
    expect(desvioRir(1, t)).toBe(-1)
    expect(desvioRir(0, t)).toBe(-2)
  })
})

describe('suggestNextLoad con rango', () => {
  const t = { min: 2, max: 3 }
  it('dentro del rango: mantiene', () => {
    expect(suggestNextLoad(100, 3, t).direction).toBe('hold')
    expect(suggestNextLoad(100, 2, t).direction).toBe('hold')
  })
  it('sobra margen: sube poco con 1 de más y más con 2 o más', () => {
    expect(suggestNextLoad(100, 4, t)).toMatchObject({ direction: 'up', deltaKg: 2.5 })
    expect(suggestNextLoad(100, 5, t)).toMatchObject({ direction: 'up', deltaKg: 5 })
  })
  it('más duro de lo previsto: con 1 de menos mantiene; con 2 o más baja', () => {
    expect(suggestNextLoad(100, 1, t).direction).toBe('hold')
    expect(suggestNextLoad(100, 0, t)).toMatchObject({ direction: 'down', deltaKg: 5 })
  })
  it('un objetivo numérico se comporta como siempre', () => {
    expect(suggestNextLoad(100, 5, 3)).toMatchObject({ direction: 'up', deltaKg: 5 })
    expect(suggestNextLoad(100, 3, 3).direction).toBe('hold')
  })
})

describe('getSuggestedWeightChange con el RIR del ejercicio', () => {
  it('el mismo RIR 3 sube con el RPE @9 de la semana (previsto RIR 1) pero mantiene si el ejercicio pide RIR 2-3', () => {
    expect(getSuggestedWeightChange(3, '100', '@9')?.direction).toBe('up')
    expect(getSuggestedWeightChange(3, '100', '@9', '2-3')?.direction).toBe('hold')
  })
  it('un RIR 1 baja si el ejercicio pide RIR 3-4 aunque la semana pidiera @9', () => {
    expect(getSuggestedWeightChange(0, '100', '@9', '3-4')?.direction).toBe('down')
    expect(getSuggestedWeightChange(1, '100', '@9')?.direction).toBe('hold')
  })
  it('sin objetivo ni de ejercicio ni de semana usa la regla antigua por RIR', () => {
    expect(getSuggestedWeightChange(4, '100')?.direction).toBe('up')
  })
})

describe('getTargetRangeLabel con el RIR del ejercicio', () => {
  it('dentro del RIR previsto el rango es el peso de la última vez', () => {
    expect(getTargetRangeLabel('100', 3, '@9', '2-3')).toBe('100kg')
  })
  it('con más margen del previsto propone subir', () => {
    expect(getTargetRangeLabel('100', 5, '@9', '2-3')).toBe('100-105kg')
  })
})
