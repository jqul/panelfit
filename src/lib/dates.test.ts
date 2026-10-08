import { describe, it, expect } from 'vitest'
import { localDateKey } from './dates'

describe('localDateKey', () => {
  it('da la fecha local de un día a medianoche, sin pasar por UTC', () => {
    // Un Date construido con componentes locales siempre debe dar esos mismos componentes,
    // en cualquier zona horaria (con toISOString() en UTC+1/+2 daría el día anterior).
    expect(localDateKey(new Date(2026, 9, 5))).toBe('2026-10-05')
    expect(localDateKey(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01')
    expect(localDateKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })
  it('rellena mes y día con ceros', () => {
    expect(localDateKey(new Date(2026, 2, 3))).toBe('2026-03-03')
  })
  it('sin argumento usa hoy', () => {
    expect(localDateKey()).toBe(localDateKey(new Date()))
  })
})

// Guardia: las fechas de calendario se calculan en local. `toISOString().split('T')[0]` (o
// .slice(0, 10)) da la fecha en UTC: en UTC+1/+2 un día a medianoche local sale como el día
// anterior y todo lo hecho entre medianoche y las 2 se registra con la fecha de ayer.
// Excepciones con motivo: dates.ts (lo explica), loadRisk (compara claves UTC en ambos lados
// a propósito) y demo-data (datos de ejemplo relativos a "ahora").
describe('fechas locales', () => {
  const PERMITIDOS = /(^|[\\/])(dates|loadRisk|demo-data)\.ts$|\.test\.tsx?$/
  const PATRON = /toISOString\(\)\s*\.\s*(split\(\s*['"]T['"]\s*\)\s*\[\s*0\s*\]|slice\(\s*0\s*,\s*10\s*\))/
  // Todos los fuentes como texto (Vite los resuelve en el test, sin necesidad de tipos de Node)
  const fuentes = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  it('ningún archivo calcula una fecha de calendario con toISOString()', () => {
    expect(Object.keys(fuentes).length).toBeGreaterThan(100) // que el glob de verdad ve los fuentes
    const infractores = Object.entries(fuentes).filter(([f, txt]) => !PERMITIDOS.test(f) && PATRON.test(txt)).map(([f]) => f)
    expect(infractores).toEqual([])
  })
})
