import { describe, it, expect } from 'vitest'
import { cumpleEn, cumpleanosEnRango, edadQueCumple, esSuCumple, textoFelicitacion } from './cumpleanos'

describe('cumpleEn', () => {
  it('el mismo día y mes en el año pedido', () => {
    expect(cumpleEn('1994-03-12', 2026)).toBe('2026-03-12')
  })
  it('el 29 de febrero cae el 28 en años no bisiestos', () => {
    expect(cumpleEn('2000-02-29', 2026)).toBe('2026-02-28')
    expect(cumpleEn('2000-02-29', 2028)).toBe('2028-02-29')
  })
  it('sin fecha o con una mal escrita, nada', () => {
    expect(cumpleEn(undefined, 2026)).toBeNull()
    expect(cumpleEn('12/03/1994', 2026)).toBeNull()
    expect(cumpleEn('1994-13-01', 2026)).toBeNull()
  })
})

describe('edadQueCumple', () => {
  it('años que cumple; nada si no tiene sentido', () => {
    expect(edadQueCumple('1994-03-12', 2026)).toBe(32)
    expect(edadQueCumple('2030-01-01', 2026)).toBeNull()
  })
})

describe('cumpleanosEnRango', () => {
  const clientes = [
    { id: 'a', name: 'Ana', fechanacimiento: '1990-12-31' },
    { id: 'b', name: 'Beto', fechanacimiento: '1985-01-02' },
    { id: 'c', name: 'Cris', fechanacimiento: null },
  ]
  it('agrupa por día, también si el rango cruza el año', () => {
    const r = cumpleanosEnRango(clientes, '2026-12-28', '2027-01-03')
    expect(Object.keys(r).sort()).toEqual(['2026-12-31', '2027-01-02'])
    expect(r['2026-12-31'][0]).toMatchObject({ cliente: { name: 'Ana' }, edad: 36 })
    expect(r['2027-01-02'][0].edad).toBe(42)
  })
  it('fuera del rango, nada', () => {
    expect(cumpleanosEnRango(clientes, '2026-06-01', '2026-06-07')).toEqual({})
  })
})

describe('esSuCumple', () => {
  it('compara con el día de hoy', () => {
    expect(esSuCumple('1994-03-12', '2026-03-12')).toBe(true)
    expect(esSuCumple('1994-03-12', '2026-03-13')).toBe(false)
  })
})

describe('textoFelicitacion', () => {
  it('lleva el nombre', () => {
    expect(textoFelicitacion('María')).toContain('¡Feliz cumpleaños, María!')
  })
})
