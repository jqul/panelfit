import { describe, it, expect } from 'vitest'
import { esNumerico, parseValor, cumple, progresoPct, completadosTras, formatoValor, type HabitoNum } from './habitoNumerico'

const pasos: HabitoNum = { id: 'p', meta: 10000, unidad: 'pasos' }
const sueno: HabitoNum = { id: 's', meta: 7, unidad: 'h' }
const agua: HabitoNum = { id: 'a' }

describe('esNumerico', () => {
  it('solo con una meta positiva', () => {
    expect(esNumerico(pasos)).toBe(true)
    expect(esNumerico(agua)).toBe(false)
    expect(esNumerico({ id: 'x', meta: null })).toBe(false)
    expect(esNumerico({ id: 'x', meta: 0 })).toBe(false)
  })
})

describe('parseValor', () => {
  it('lee números a la española', () => {
    expect(parseValor('10000')).toBe(10000)
    expect(parseValor('10.000')).toBe(10000)
    expect(parseValor('10,000')).toBe(10000)
    expect(parseValor('7,5')).toBe(7.5)
    expect(parseValor('7.5')).toBe(7.5)
    expect(parseValor(' 999.999 ')).toBe(999999)
    expect(parseValor('1.250.000')).toBeNull() // pasa del tope de 1.000.000
    expect(parseValor('8')).toBe(8)
    expect(parseValor('0')).toBe(0)
  })
  it('rechaza lo que no es un número válido', () => {
    expect(parseValor('')).toBeNull()
    expect(parseValor('abc')).toBeNull()
    expect(parseValor('-5')).toBeNull()
    expect(parseValor('7,5,2')).toBeNull()
    expect(parseValor('2000000')).toBeNull()
  })
})

describe('cumple y progresoPct', () => {
  it('cumple al llegar a la meta, no antes', () => {
    expect(cumple(9999, pasos)).toBe(false)
    expect(cumple(10000, pasos)).toBe(true)
    expect(cumple(12000, pasos)).toBe(true)
    expect(cumple(undefined, pasos)).toBe(false)
    expect(cumple(50, agua)).toBe(false)
  })
  it('el progreso va de 0 a 100 y no pasa de ahí', () => {
    expect(progresoPct(5000, pasos)).toBe(50)
    expect(progresoPct(20000, pasos)).toBe(100)
    expect(progresoPct(0, pasos)).toBe(0)
    expect(progresoPct(5, agua)).toBe(0)
  })
})

describe('completadosTras', () => {
  const habitos = [pasos, sueno, agua]
  it('marca solo los numéricos que cumplen y respeta las casillas', () => {
    expect(completadosTras(habitos, ['a'], { p: 10500, s: 6 }).sort()).toEqual(['a', 'p'])
  })
  it('desmarca un numérico que deja de cumplir, aunque estuviera en la lista', () => {
    expect(completadosTras(habitos, ['p', 'a'], { p: 3000 })).toEqual(['a'])
  })
  it('un numérico sin valor no está completo', () => {
    expect(completadosTras(habitos, ['s'], {})).toEqual([])
  })
  it('descarta ids de hábitos que ya no existen', () => {
    expect(completadosTras([agua], ['a', 'borrado'], {})).toEqual(['a'])
  })
})

describe('formatoValor', () => {
  it('pone el separador de miles solo a partir de 10.000 y la unidad', () => {
    expect(formatoValor(10450, 'pasos')).toBe('10.450 pasos')
    expect(formatoValor(7.5, 'h')).toBe('7,5 h')
    expect(formatoValor(155)).toBe('155')
  })
})
