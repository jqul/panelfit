import { describe, it, expect } from 'vitest'
import { resumen7d, fraseTendencia } from './tendencia7d'

const HOY = '2026-10-29'
const fila = (date: string, valor: number | null) => ({ date, valor })

describe('resumen7d', () => {
  it('media de los 7 días que acaban hoy frente a los 7 anteriores', () => {
    const r = resumen7d([fila('2026-10-29', 8), fila('2026-10-23', 6), fila('2026-10-22', 5), fila('2026-10-16', 5), fila('2026-10-15', 9)], HOY)
    expect(r).toEqual({ media: 7, mediaAntes: 5, n: 2, tendencia: 'sube' })
  })
  it('una diferencia pequeña es "igual"; sin semana anterior, no hay tendencia', () => {
    expect(resumen7d([fila('2026-10-28', 4), fila('2026-10-20', 4.2)], HOY).tendencia).toBe('igual')
    expect(resumen7d([fila('2026-10-28', 4)], HOY)).toEqual({ media: 4, mediaAntes: null, n: 1, tendencia: null })
  })
  it('ignora valores vacíos y lo que queda fuera de las dos semanas', () => {
    expect(resumen7d([fila('2026-10-28', null), fila('2026-10-30', 10), fila('2026-10-10', 1)], HOY)).toEqual({ media: null, mediaAntes: null, n: 0, tendencia: null })
  })
})

describe('fraseTendencia', () => {
  it('subir es buena noticia en sensaciones y aviso en esfuerzo', () => {
    expect(fraseTendencia('sube', true).tono).toBe('ok')
    expect(fraseTendencia('sube', false).tono).toBe('warn')
    expect(fraseTendencia('baja', true).tono).toBe('warn')
    expect(fraseTendencia('igual', true).tono).toBe('neutro')
    expect(fraseTendencia(null, true).texto).toMatch(/Sin semana anterior/)
  })
})
