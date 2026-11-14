import { describe, it, expect } from 'vitest'
import { RAMPA_ALTA, rampaActual, rampasSemanales, semanasRapidas, valorarRampa } from './rampaCarga'

const t = (...fitness: number[]) => fitness.map((f, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, fitness: f, fatigue: 0, form: 0 }))

describe('ritmo de subida', () => {
  it('% de cambio semana a semana', () => {
    expect(rampasSemanales(t(100, 110, 99))).toEqual([10, -10])
    expect(rampasSemanales(t(0, 50, 60))).toEqual([20]) // sin base no hay %
  })
  it('sin semanas suficientes no se fía', () => {
    expect(rampaActual(t(100, 150))).toBeNull()
    expect(semanasRapidas(t(100, 150))).toBe(0)
  })
  it('la última semana y cuántas seguidas van rápidas', () => {
    const trend = t(100, 101, 102, 103, 115, 130)
    expect(rampaActual(trend)).toBe(13)
    expect(semanasRapidas(trend)).toBe(2)
  })
  it('valoración', () => {
    expect(valorarRampa(RAMPA_ALTA + 1, 2)).toMatchObject({ nivel: 'rapida', tono: 'aviso' })
    expect(valorarRampa(RAMPA_ALTA + 1, 2).frase).toContain('2 semanas seguidas')
    expect(valorarRampa(7).nivel).toBe('firme')
    expect(valorarRampa(3).nivel).toBe('suave')
    expect(valorarRampa(0).nivel).toBe('estable')
    expect(valorarRampa(-8).nivel).toBe('baja')
  })
})
