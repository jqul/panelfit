import { describe, it, expect } from 'vitest'
import { contarSeries } from './seriesEfectivas'

describe('contarSeries', () => {
  it('RIR 3 o menos cuenta; 4 o más no; sin RIR cuenta y se avisa; sin datos ni se cuenta', () => {
    expect(contarSeries([
      { weight: '80', reps: '8', rir: 2 },
      { weight: '80', reps: '8', rir: 3 },
      { weight: '70', reps: '8', rir: 5 },
      { weight: '80', reps: '6' },
      { weight: '', reps: '' },
      { weight: '', reps: '10', rir: 0 }, // peso corporal
    ])).toEqual({ todas: 5, efectivas: 4, faciles: 1, sinRir: 1 })
  })
  it('vacío', () => {
    expect(contarSeries([])).toEqual({ todas: 0, efectivas: 0, faciles: 0, sinRir: 0 })
  })
})

describe('contarSeries con tipo de serie', () => {
  it('el calentamiento no cuenta; «al fallo» es efectiva aunque no tenga RIR', () => {
    expect(contarSeries([
      { weight: '40', reps: '10', tipo: 'calentamiento' },
      { weight: '80', reps: '8', tipo: 'fallo' },
      { weight: '60', reps: '10', tipo: 'dropset' },
    ])).toEqual({ todas: 2, efectivas: 2, faciles: 0, sinRir: 1 })
  })
})
