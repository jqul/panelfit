import { describe, it, expect } from 'vitest'
import { diasHasta, ejercicioProbable, faseHasta, intentosSugeridos, limpiarCompeticion, puntosDots, puntosGL, totalPlanificado } from './competicion'

describe('intentosSugeridos', () => {
  it('91 / 96 / 101 % de la marca, a 2,5 kg', () => {
    expect(intentosSugeridos(200)).toEqual([182.5, 192.5, 202.5])
    expect(intentosSugeridos(100)).toEqual([90, 95, 100])
  })
  it('siempre suben, aunque el redondeo los iguale', () => {
    const [a, b, c] = intentosSugeridos(30)
    expect(b).toBeGreaterThan(a)
    expect(c).toBeGreaterThan(b)
  })
  it('sin marca, sin intentos', () => {
    expect(intentosSugeridos(0)).toEqual([0, 0, 0])
  })
})

describe('ejercicioProbable', () => {
  const nombres = ['Sentadilla búlgara', 'Sentadilla', 'Press banca', 'Peso muerto rumano', 'Peso muerto']
  it('el que encaja con el nombre más corto', () => {
    expect(ejercicioProbable('sentadilla', nombres)).toBe('Sentadilla')
    expect(ejercicioProbable('banca', nombres)).toBe('Press banca')
    expect(ejercicioProbable('muerto', nombres)).toBe('Peso muerto')
    expect(ejercicioProbable('banca', ['Remo'])).toBeUndefined()
  })
})

describe('total y puntos', () => {
  const intentos = { sentadilla: [200, 210, 220] as [number, number, number], banca: [130, 137.5, 142.5] as [number, number, number], muerto: [240, 252.5, 262.5] as [number, number, number] }
  it('total con los terceros (o con los que se pidan); null si falta alguno', () => {
    expect(totalPlanificado({ intentos })).toBe(625)
    expect(totalPlanificado({ intentos }, 0)).toBe(570)
    expect(totalPlanificado({ intentos: { sentadilla: [200, 210, 220] } })).toBeNull()
  })
  it('DOTS (2019): 700 kg con 83 kg ≈ 472,6 (hombre)', () => {
    expect(puntosDots(700, 83, 'h')).toBeCloseTo(472.6, 0)
  })
  it('DOTS (2019): 400 kg con 63 kg ≈ 430,2 (mujer)', () => {
    expect(puntosDots(400, 63, 'm')).toBeCloseTo(430.2, 0)
  })
  it('IPF GL clásico: 700 kg con 83 kg ≈ 96,9 (hombre)', () => {
    expect(puntosGL(700, 83, 'h')).toBeCloseTo(96.9, 0)
  })
  it('sin peso corporal no hay puntos', () => {
    expect(puntosDots(700, 0, 'h')).toBeNull()
    expect(puntosGL(700, 0, 'h')).toBeNull()
  })
})

describe('días y fase', () => {
  const hoy = new Date(2026, 10, 5)
  it('días hasta la fecha', () => {
    expect(diasHasta('2026-11-05', hoy)).toBe(0)
    expect(diasHasta('2026-12-05', hoy)).toBe(30)
    expect(diasHasta('2026-11-01', hoy)).toBe(-4)
  })
  it('descarga la última semana, peaking las tres de antes', () => {
    expect(faseHasta(5)).toMatch(/descarga/)
    expect(faseHasta(20)).toMatch(/Peaking/)
    expect(faseHasta(60)).toBeNull()
    expect(faseHasta(-1)).toBeNull()
  })
})

describe('limpiarCompeticion', () => {
  it('sin fecha válida no hay competición', () => {
    expect(limpiarCompeticion({ nombre: 'Nacional' })).toBeUndefined()
    expect(limpiarCompeticion(null)).toBeUndefined()
  })
  it('limpia sexo, peso e intentos', () => {
    expect(limpiarCompeticion({ fecha: '2026-12-12', nombre: ' Open ', sexo: 'x', pesoCorporal: -3, intentos: { banca: [100, 'a', 110] }, ejercicios: { banca: ' Press banca ' } }))
      .toEqual({ fecha: '2026-12-12', nombre: 'Open', ejercicios: { banca: 'Press banca' }, intentos: { banca: [100, 0, 110] } })
  })
})
