import { describe, it, expect } from 'vitest'
import { inicioParaTerminar, finDePlan, semanaQueEntra } from './fechaFin'

describe('plan con fecha de fin', () => {
  it('el inicio es el lunes que deja la última semana en la semana de la fecha de fin', () => {
    // Competición el domingo 20 dic 2026; plan de 4 semanas → empieza el lunes 23 nov
    expect(inicioParaTerminar('2026-12-20', 4)).toBe('2026-11-23')
    // Si la fecha de fin cae a mitad de semana, cuenta esa semana
    expect(inicioParaTerminar('2026-12-16', 4)).toBe('2026-11-23')
    expect(inicioParaTerminar('2026-12-16', 1)).toBe('2026-12-14')
  })
  it('y al revés, el domingo en que acaba', () => {
    expect(finDePlan('2026-11-23', 4)).toBe('2026-12-20')
    expect(finDePlan(inicioParaTerminar('2027-03-03', 6), 6)).toBe('2027-03-07')
  })
  it('si el inicio ya pasó, en qué semana entra', () => {
    const hoy = new Date(2026, 11, 2) // miércoles 2 dic
    expect(semanaQueEntra('2026-11-23', 4, hoy)).toBe(2)
    expect(semanaQueEntra('2026-12-07', 4, hoy)).toBeNull()
    expect(semanaQueEntra('2026-01-05', 4, hoy)).toBe(4) // no pasa de la última
  })
})
