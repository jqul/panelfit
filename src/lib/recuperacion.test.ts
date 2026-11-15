import { describe, it, expect } from 'vitest'
import { esHabitoSueno, mediasSemanales, cardioPorSemana, ultimasSemanas, type RegistroDia } from './recuperacion'

describe('esHabitoSueno', () => {
  it('por la unidad o por el nombre, y solo con meta numérica', () => {
    expect(esHabitoSueno({ id: 'a', text: 'Dormir', meta: 7, unidad: 'h' })).toBe(true)
    expect(esHabitoSueno({ id: 'a', text: 'Descanso', meta: 8, unidad: 'horas' })).toBe(true)
    expect(esHabitoSueno({ id: 'a', text: 'Sueño de calidad', meta: 7 })).toBe(true)
    expect(esHabitoSueno({ id: 'a', text: 'Dormir', meta: null })).toBe(false) // casilla sí/no: no hay horas
    expect(esHabitoSueno({ id: 'a', text: 'Pasos', meta: 10000, unidad: 'pasos' })).toBe(false)
  })
})

describe('mediasSemanales', () => {
  const regs: RegistroDia[] = [
    { date: '2026-11-09', valores: { d: 7 } },   // lunes
    { date: '2026-11-11', valores: { d: 5 } },
    { date: '2026-11-13', valores: { d: 6, p: 9000 } },
    { date: '2026-11-16', valores: { d: 8 } },   // semana siguiente
    { date: '2026-11-17', valores: { p: 5000 } }, // sin dato de sueño ese día
    { date: '2026-11-18', valores: null },
  ]
  it('media de los días apuntados de cada semana, diciendo cuántos fueron', () => {
    const m = mediasSemanales(regs, 'd')
    expect(m['2026-11-09']).toEqual({ media: 6, dias: 3, min: 5, max: 7 })
    expect(m['2026-11-16']).toEqual({ media: 8, dias: 1, min: 8, max: 8 })
  })
  it('un día sin dato no cuenta como 0, pero un 0 apuntado sí', () => {
    expect(mediasSemanales(regs, 'p')['2026-11-16']).toEqual({ media: 5000, dias: 1, min: 5000, max: 5000 })
    const con0 = mediasSemanales([{ date: '2026-11-09', valores: { d: 0 } }, { date: '2026-11-10', valores: { d: 8 } }], 'd')
    expect(con0['2026-11-09']).toMatchObject({ media: 4, dias: 2 })
  })
  it('ignora valores negativos o que no son números', () => {
    expect(mediasSemanales([{ date: '2026-11-09', valores: { d: -3 } }, { date: '2026-11-10', valores: { d: NaN } }], 'd')).toEqual({})
  })
})

describe('cardioPorSemana', () => {
  it('suma minutos, sesiones, distancia y minutos por deporte; la fuerza no es cardio', () => {
    const r = cardioPorSemana([
      { fecha: '2026-11-10', deporte: 'correr', duracionS: 2400, distanciaM: 6000 },
      { fecha: '2026-11-12', deporte: 'bici', duracionS: 3600, distanciaM: 25000 },
      { fecha: '2026-11-13', deporte: 'fuerza', duracionS: 3000, distanciaM: null },
      { fecha: '2026-11-17', deporte: 'caminar', duracionS: 1800, distanciaM: null },
    ])
    expect(r['2026-11-09']).toEqual({ minutos: 100, sesiones: 2, distanciaKm: 31, porDeporte: { correr: 40, bici: 60 } })
    expect(r['2026-11-16']).toEqual({ minutos: 30, sesiones: 1, distanciaKm: 0, porDeporte: { caminar: 30 } })
  })
  it('una actividad sin duración no cuenta', () => {
    expect(cardioPorSemana([{ fecha: '2026-11-10', deporte: 'correr', duracionS: 0, distanciaM: 1000 }])).toEqual({})
  })
})

describe('ultimasSemanas', () => {
  it('une las semanas de varias fuentes, ordenadas y recortadas a las últimas n', () => {
    expect(ultimasSemanas([{ '2026-11-02': 1, '2026-11-16': 1 }, { '2026-11-09': 1 }, {}], 2)).toEqual(['2026-11-09', '2026-11-16'])
  })
})
