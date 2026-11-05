import { describe, it, expect } from 'vitest'
import { describirRegla, evaluarRegla, limpiarReglas, type DatosCliente } from './alertasUmbral'

const vacio: DatosCliente = { pesos: [], checkins: [] }
const ck = (date: string, motivation: number | null) => ({ date, sleep: 3, soreness: 3, stress: 3, motivation })

describe('limpiarReglas', () => {
  it('tipos conocidos y valores en rango; lo demás fuera', () => {
    expect(limpiarReglas([
      { id: 'a', tipo: 'peso', kg: 2.25, dias: 7 },
      { tipo: 'checkin', escala: 'motivation', max: 9, dias: 3 },
      { tipo: 'checkin', escala: 'inventada', max: 2, dias: 3 },
      { tipo: 'inactivo', dias: 1 },
      { tipo: 'otra' },
    ])).toEqual([
      { id: 'a', tipo: 'peso', kg: 2.3, dias: 7 },
      { id: 'r2', tipo: 'checkin', escala: 'motivation', max: 4, dias: 3 },
      { id: 'r3', tipo: 'inactivo', dias: 2 },
    ])
    expect(limpiarReglas('x')).toEqual([])
  })
  it('una frase por regla', () => {
    expect(describirRegla({ id: 'a', tipo: 'peso', kg: 2, dias: 7 })).toBe('El peso cambia más de 2 kg en 7 días')
    expect(describirRegla({ id: 'b', tipo: 'checkin', escala: 'sleep', max: 2, dias: 3 })).toBe('Sueño a 2 o menos 3 días seguidos')
    expect(describirRegla({ id: 'c', tipo: 'inactivo', dias: 7 })).toBe('7 días sin entrenar')
  })
})

describe('evaluarRegla', () => {
  const hoy = '2026-11-05'
  it('peso: cambio de más de X kg dentro de la ventana', () => {
    const r = { id: 'a', tipo: 'peso' as const, kg: 2, dias: 7 }
    expect(evaluarRegla(r, { ...vacio, pesos: [{ date: '2026-10-31', weight: 80 }, { date: '2026-11-04', weight: 77.5 }] }, hoy)).toBe('⚖️ Peso −2,5 kg en 4 días')
    expect(evaluarRegla(r, { ...vacio, pesos: [{ date: '2026-10-31', weight: 80 }, { date: '2026-11-04', weight: 81.5 }] }, hoy)).toBeNull()
    // el primero queda fuera de los 7 días
    expect(evaluarRegla(r, { ...vacio, pesos: [{ date: '2026-10-20', weight: 85 }, { date: '2026-11-04', weight: 80 }] }, hoy)).toBeNull()
  })
  it('check-in: N días seguidos a X o menos, hasta hoy o ayer', () => {
    const r = { id: 'b', tipo: 'checkin' as const, escala: 'motivation' as const, max: 2, dias: 3 }
    expect(evaluarRegla(r, { ...vacio, checkins: [ck('2026-11-05', 2), ck('2026-11-04', 1), ck('2026-11-03', 2)] }, hoy)).toBe('📉 Energía a 2 o menos 3 días seguidos')
    expect(evaluarRegla(r, { ...vacio, checkins: [ck('2026-11-05', 2), ck('2026-11-04', 3), ck('2026-11-03', 2)] }, hoy)).toBeNull()
    expect(evaluarRegla(r, { ...vacio, checkins: [ck('2026-11-05', 2), ck('2026-11-03', 1), ck('2026-11-02', 2)] }, hoy)).toBeNull() // con un hueco
    expect(evaluarRegla(r, { ...vacio, checkins: [ck('2026-11-02', 2), ck('2026-11-01', 1), ck('2026-10-31', 2)] }, hoy)).toBeNull() // de hace días
    expect(evaluarRegla(r, { ...vacio, checkins: [ck('2026-11-05', null), ck('2026-11-04', 1)] }, hoy)).toBeNull() // escala que no se pregunta
  })
  it('inactivo: días desde el último entreno', () => {
    const r = { id: 'c', tipo: 'inactivo' as const, dias: 7 }
    expect(evaluarRegla(r, { ...vacio, ultimoEntreno: '2026-10-27' }, hoy)).toBe('💤 9 días sin entrenar')
    expect(evaluarRegla(r, { ...vacio, ultimoEntreno: '2026-11-01' }, hoy)).toBeNull()
    expect(evaluarRegla(r, { ...vacio, altaMs: new Date(2026, 9, 25, 10).getTime() }, hoy)).toBe('💤 Aún no ha entrenado (11 días de alta)')
    expect(evaluarRegla(r, { ...vacio, altaMs: new Date(2026, 10, 2, 10).getTime() }, hoy)).toBeNull()
  })
})
