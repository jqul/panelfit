import { describe, it, expect } from 'vitest'
import { computeSessionLoadTrend, FITNESS_DIAS, LoadTrendPoint } from './loadRisk'
import { estadoForma, SEMANAS_MIN_FORMA } from './estadoForma'

// Las pruebas de tramos usan puntos sueltos: sin el mínimo de semanas.
const UNA = { minSemanas: 1 }

const p = (fitness: number, fatigue: number, date = '2026-10-26'): LoadTrendPoint => ({ date, fitness, fatigue, form: fitness - fatigue })

describe('estado de forma (como el "Form" de TrainingPeaks, en % de la forma física)', () => {
  it('cada tramo da su estado', () => {
    expect(estadoForma([p(100, 70)], UNA)?.clave).toBe('recargando')   // +30 %
    expect(estadoForma([p(100, 90)], UNA)?.clave).toBe('fresco')       // +10 %
    expect(estadoForma([p(100, 105)], UNA)?.clave).toBe('manteniendo') // −5 %
    expect(estadoForma([p(100, 120)], UNA)?.clave).toBe('productivo')  // −20 %
    expect(estadoForma([p(100, 140)], UNA)?.clave).toBe('sobrecarga')  // −40 %
  })

  it('vale igual con poca o mucha carga: solo cuenta la proporción', () => {
    expect(estadoForma([p(10, 14)], UNA)?.clave).toBe(estadoForma([p(10000, 14000)], UNA)?.clave)
  })

  it('sin forma física no inventa un estado', () => {
    expect(estadoForma([], UNA)).toBeNull()
    expect(estadoForma([p(0, 0)], UNA)).toBeNull()
  })

  it('con menos semanas de las necesarias no da estado (evita alarmas falsas)', () => {
    expect(estadoForma([p(100, 140), p(100, 140), p(100, 140)])).toBeNull()
    expect(estadoForma(Array(SEMANAS_MIN_FORMA).fill(p(100, 140)))?.clave).toBe('sobrecarga')
  })

  it('la rampa compara con la semana anterior', () => {
    expect(estadoForma([p(100, 100, '2026-10-19'), p(110, 110)], UNA)?.rampaPct).toBe(10)
    expect(estadoForma([p(110, 110)], UNA)?.rampaPct).toBeNull()
  })

  it('solo la sobrecarga es aviso; el cliente nunca ve números', () => {
    const s = estadoForma([p(100, 140)], UNA)!
    expect(s.tono).toBe('aviso')
    expect(s.fraseCliente).not.toMatch(/\d/)
  })
})

describe('tendencia con la carga de sesión (minutos × RPE)', () => {
  it('suma las sesiones del mismo día y la fatiga reacciona antes que la forma física', () => {
    const today = new Date('2026-10-26T12:00:00Z')
    const rows = []
    for (let i = 60; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10)
      if (i % 2 === 0) rows.push({ date: d, duration_min: 60, rpe: 6 })
    }
    // Una última semana muy dura: dos sesiones fuertes cada día.
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10)
      rows.push({ date: d, duration_min: 90, rpe: 9 }, { date: d, duration_min: 60, rpe: 8 })
    }
    const trend = computeSessionLoadTrend(rows, 12, today)
    const last = trend[trend.length - 1]
    expect(last.fatigue).toBeGreaterThan(last.fitness)
    expect(estadoForma(trend)?.clave).toBe('sobrecarga')
  })

  it('la forma física usa la ventana larga (42 días)', () => {
    expect(FITNESS_DIAS).toBe(42)
  })
})

describe('semanas anteriores al primer registro', () => {
  it('no se rellenan con la carga del primer día', () => {
    const today = new Date('2026-10-26T12:00:00Z')
    const rows = [10, 8, 6, 4, 2, 0].map(i => ({ date: new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10), duration_min: 60, rpe: 7 }))
    const trend = computeSessionLoadTrend(rows, 12, today)
    // 10 días de datos: solo las 2 últimas semanas tienen carga, no las 12.
    expect(trend.length).toBe(2)
    expect(estadoForma(trend)).toBeNull()
  })
})
