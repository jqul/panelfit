import { describe, it, expect } from 'vitest'
import { algunaBaja, filaCheckin, limpiarConfigCheckin, mediaEscala, nuevaPregunta, ORDEN_BASE } from './checkinConfig'

describe('limpiarConfigCheckin', () => {
  it('sin configurar, las cuatro escalas de siempre', () => {
    expect(limpiarConfigCheckin(undefined)).toEqual({ escalas: ORDEN_BASE, extra: [] })
    expect(limpiarConfigCheckin('basura')).toEqual({ escalas: ORDEN_BASE, extra: [] })
  })
  it('respeta las elegidas en el orden de siempre y descarta lo que no vale', () => {
    const c = limpiarConfigCheckin({
      escalas: ['stress', 'sleep', 'inventada'],
      extra: [{ id: 'x1', label: '  Hidratación ', emoji: '💧', bajo: 'Poca', alto: 'Mucha' }, { id: 'x1', label: 'Repetida' }, { label: '' }, null],
    })
    expect(c.escalas).toEqual(['sleep', 'stress'])
    expect(c.extra.map(e => [e.id, e.label])).toEqual([['x1', 'Hidratación'], ['x1_', 'Repetida']])
    expect(c.extra[1]).toMatchObject({ emoji: '•', bajo: 'Mal', alto: 'Muy bien' })
  })
  it('como mucho tres preguntas propias', () => {
    const extra = Array.from({ length: 5 }, (_, i) => ({ id: `x${i}`, label: `P${i}` }))
    expect(limpiarConfigCheckin({ escalas: [], extra }).extra).toHaveLength(3)
  })
  it('nunca queda vacío: sin ninguna pregunta, las de siempre', () => {
    expect(limpiarConfigCheckin({ escalas: [], extra: [] }).escalas).toEqual(ORDEN_BASE)
  })
})

describe('nuevaPregunta', () => {
  it('id que no choca con las que hay', () => {
    expect(nuevaPregunta({ escalas: [], extra: [{ id: 'x2', label: 'a', emoji: '', bajo: '', alto: '' }] }).id).toBe('x3')
  })
})

describe('filaCheckin', () => {
  it('solo lo preguntado; lo demás vacío, nunca un 3 inventado', () => {
    const c = limpiarConfigCheckin({ escalas: ['sleep'], extra: [{ id: 'x1', label: 'Ánimo' }] })
    expect(filaCheckin(c, { sleep: 4, x1: 2, stress: 1 })).toEqual({ motivation: null, sleep: 4, soreness: null, stress: null, extra: { x1: 2 } })
  })
  it('lo preguntado que no se ha tocado vale 3 (donde empieza el control)', () => {
    expect(filaCheckin(limpiarConfigCheckin(null), {})).toMatchObject({ motivation: 3, sleep: 3, soreness: 3, stress: 3 })
  })
})

describe('mediaEscala y algunaBaja', () => {
  it('la media ignora los días sin respuesta', () => {
    expect(mediaEscala([{ v: 4 }, { v: null }, { v: 3 }], r => r.v)).toBe(3.5)
    expect(mediaEscala([{ v: null }], r => r.v)).toBeNull()
  })
  it('un vacío no es una respuesta baja', () => {
    expect(algunaBaja(null, undefined, 4)).toBe(false)
    expect(algunaBaja(null, 2)).toBe(true)
  })
})
