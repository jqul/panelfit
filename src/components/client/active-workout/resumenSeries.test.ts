import { describe, it, expect } from 'vitest'
import { resumenSeries } from './resumenSeries'

describe('resumenSeries', () => {
  const series = {
    0: { weight: '100', reps: '5', done: true },
    1: { weight: '102,5', reps: '4', done: true },
    2: { weight: '105', reps: '3', done: false },
    3: { weight: '', reps: '8', done: true }, // sin peso (peso corporal): cuenta reps, no volumen
  }
  it('hoy solo cuentan las series marcadas', () => {
    expect(resumenSeries(series, true)).toEqual({ reps: 17, volumen: 910, maxKg: 102.5 })
  })
  it('la vez anterior cuentan todas las que tienen datos', () => {
    expect(resumenSeries(series, false)).toEqual({ reps: 20, volumen: 1225, maxKg: 105 })
  })
  it('sin series, ceros', () => {
    expect(resumenSeries({}, true)).toEqual({ reps: 0, volumen: 0, maxKg: 0 })
  })
})

describe('resumenSeries y calentamiento', () => {
  it('el calentamiento no cuenta en reps, volumen ni kg máximo', () => {
    expect(resumenSeries({ 0: { weight: '60', reps: '10', done: true, tipo: 'calentamiento' }, 1: { weight: '50', reps: '5', done: true } }, true))
      .toEqual({ reps: 5, volumen: 250, maxKg: 50 })
  })
})
