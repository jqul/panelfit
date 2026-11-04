import { describe, it, expect } from 'vitest'
import { estadoPlan } from './estadoPlan'

const HOY = new Date(2026, 10, 4) // 4 nov 2026

describe('estadoPlan', () => {
  it('sin plan', () => {
    expect(estadoPlan({ hasPlan: false }, HOY)).toBe('sin-plan')
  })
  it('empieza pronto si su inicio aún no ha llegado', () => {
    expect(estadoPlan({ hasPlan: true, planStartDate: '2026-11-09', planEndDate: '2026-12-07' }, HOY)).toBe('empieza')
  })
  it('en curso, termina pronto (2 semanas) o terminado', () => {
    expect(estadoPlan({ hasPlan: true, planStartDate: '2026-10-05', planEndDate: '2026-12-28' }, HOY)).toBe('en-curso')
    expect(estadoPlan({ hasPlan: true, planStartDate: '2026-10-05', planEndDate: '2026-11-16' }, HOY)).toBe('termina')
    expect(estadoPlan({ hasPlan: true, planStartDate: '2026-10-05', planEndDate: '2026-11-18' }, HOY)).toBe('termina') // justo 14 días
    expect(estadoPlan({ hasPlan: true, planStartDate: '2026-09-07', planEndDate: '2026-11-02' }, HOY)).toBe('terminado')
    expect(estadoPlan({ hasPlan: true, planStartDate: '2026-09-07', planEndDate: '2026-11-04' }, HOY)).toBe('terminado') // hoy ya no hay semana
  })
  it('sin fechas, en curso', () => {
    expect(estadoPlan({ hasPlan: true }, HOY)).toBe('en-curso')
  })
})
