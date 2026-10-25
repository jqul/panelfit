import { describe, it, expect } from 'vitest'
import { parseRirTarget, normalizeRirTarget, describeRirTarget, rirVsTarget } from './rirTarget'

describe('RIR objetivo', () => {
  it('interpreta un valor o un rango', () => {
    expect(parseRirTarget('2-3')).toEqual({ min: 2, max: 3 })
    expect(parseRirTarget('1')).toEqual({ min: 1, max: 1 })
    expect(parseRirTarget(' 0 – 1 ')).toEqual({ min: 0, max: 1 })
    expect(parseRirTarget('10')).toEqual({ min: 10, max: 10 })
  })

  it('rechaza lo que no es un RIR', () => {
    for (const mal of ['', '  ', 'abc', '3-2', '11', '2-12', '-1', '2-', '2,3', '2-3-4', null, undefined]) expect(parseRirTarget(mal as string), String(mal)).toBeNull()
  })

  it('normaliza para guardar; un valor inválido deja el campo vacío', () => {
    expect(normalizeRirTarget('2 - 3')).toBe('2-3')
    expect(normalizeRirTarget('3-3')).toBe('3')
    expect(normalizeRirTarget('02')).toBe('2')
    expect(normalizeRirTarget('raro')).toBe('')
  })

  it('lo explica en una frase con la concordancia correcta', () => {
    expect(describeRirTarget({ min: 2, max: 3 })).toEqual({ label: 'RIR 2-3', hint: 'te deben quedar entre 2 y 3 repeticiones en reserva' })
    expect(describeRirTarget({ min: 1, max: 1 }).hint).toBe('te debe quedar 1 repetición en reserva')
    expect(describeRirTarget({ min: 3, max: 3 }).hint).toBe('te deben quedar 3 repeticiones en reserva')
    expect(describeRirTarget({ min: 0, max: 0 }).hint).toBe('hasta el fallo técnico')
  })

  it('compara el RIR anotado con el objetivo, con un punto de margen hacia arriba', () => {
    const t = { min: 2, max: 3 }
    expect(rirVsTarget(2, t)).toBe('en-objetivo')
    expect(rirVsTarget(4, t)).toBe('en-objetivo') // un punto de margen
    expect(rirVsTarget(1, t)).toBe('mas-duro')
    expect(rirVsTarget(5, t)).toBe('mas-facil')
    expect(rirVsTarget(undefined, t)).toBe('sin-dato')
    expect(rirVsTarget(2, null)).toBe('sin-dato')
  })
})
