import { describe, it, expect } from 'vitest'
import { etiquetaSerie, limpiarBackoff, pesoBackoff, precargarBackoff, repsIniciales, resumenSeries } from './backoff'

describe('limpiarBackoff', () => {
  it('% entre 50 y 98, reps opcionales', () => {
    expect(limpiarBackoff({ pct: 85, reps: ' 5 ' })).toEqual({ pct: 85, reps: '5' })
    expect(limpiarBackoff({ pct: '90' })).toEqual({ pct: 90 })
    expect(limpiarBackoff({ pct: 30 })).toBeUndefined()
    expect(limpiarBackoff({ pct: 100 })).toBeUndefined()
    expect(limpiarBackoff(null)).toBeUndefined()
  })
})

describe('pesoBackoff', () => {
  it('el % del top set, al disco más cercano', () => {
    expect(pesoBackoff('180', 85)).toBe('152.5') // 153 → 152,5
    expect(pesoBackoff('200', 90)).toBe('180')
    expect(pesoBackoff('102,5', 80)).toBe('82.5')
  })
  it('con poco peso, de kilo en kilo', () => {
    expect(pesoBackoff('30', 85)).toBe('26') // 25,5 → 26
  })
  it('sin top set no hay peso', () => {
    expect(pesoBackoff('', 85)).toBe('')
    expect(pesoBackoff(undefined, 85)).toBe('')
  })
})

describe('repsIniciales y etiquetaSerie', () => {
  it('primer número de las reps', () => {
    expect(repsIniciales('6-8')).toBe('6')
    expect(repsIniciales(undefined)).toBeNull()
  })
  it('Top en la primera y % en las bajadas', () => {
    const b = { pct: 85, reps: '5' }
    expect(etiquetaSerie(0, b, '3', '1')).toBe('Top 3 @1')
    expect(etiquetaSerie(2, b, '3', '1')).toBe('5 · 85%')
    expect(etiquetaSerie(1, { pct: 90 }, '3')).toBe('3 · 90%')
    expect(etiquetaSerie(1, undefined, '8', '2')).toBe('8 @2')
  })
})

describe('precargarBackoff', () => {
  const b = { pct: 85, reps: '5' }
  it('precarga peso y reps de las bajadas sin hacer', () => {
    const r = precargarBackoff({ 0: { weight: '180', reps: '3', done: true } }, 4, b, '3')
    expect([1, 2, 3].map(i => [r[i].weight, r[i].reps])).toEqual([['152.5', '5'], ['152.5', '5'], ['152.5', '5']])
  })
  it('respeta las hechas y el peso que puso el cliente', () => {
    const r = precargarBackoff({
      0: { weight: '180', reps: '3', done: true },
      1: { weight: '150', reps: '5', done: true },
      2: { weight: '140', reps: '5', done: false },
    }, 4, b, '3')
    expect(r[1].weight).toBe('150')
    expect(r[2].weight).toBe('140')
    expect(r[3].weight).toBe('152.5')
  })
  it('si cambia el top set, recalcula la bajada que pusimos nosotros', () => {
    const antes = { 1: '152.5' }
    const r = precargarBackoff({ 0: { weight: '190', reps: '3', done: true }, 1: { weight: '152.5', reps: '5', done: false } }, 2, b, '3', antes)
    expect(r[1].weight).toBe('162.5') // 161,5 → 162,5
  })
  it('sin peso en el top set no toca nada', () => {
    const s = { 0: { weight: '', reps: '3', done: true } }
    expect(precargarBackoff(s, 3, b, '3')).toEqual(s)
  })
})

describe('resumenSeries', () => {
  it('explica el top set y las bajadas', () => {
    expect(resumenSeries({ sets: '4x3', backoff: { pct: 85, reps: '5' } })).toBe('Top set de 3 + 3 bajadas de 5 al 85 %')
    expect(resumenSeries({ sets: '2x1', backoff: { pct: 90 } })).toBe('Top set de 1 + 1 bajada de 1 al 90 %')
    expect(resumenSeries({ sets: '3x8' })).toBe('3x8')
  })
})
