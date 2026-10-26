import { describe, it, expect } from 'vitest'
import { estimarMinutos, segundosDeEjercicio, versionCorta, presupuestosUtiles } from './duracionSesion'
import type { Exercise } from '../types'

const ej = (name: string, sets: string, extra: Partial<Exercise> = {}): Exercise => ({ name, sets, weight: '', comment: '', isMain: false, ...extra })
const plan = { restMain: 120, restAcc: 60 }

describe('duración de la sesión', () => {
  it('un ejercicio: series, descansos entre series y el de después, con los descansos del plan', () => {
    // 3 series: 3x40 + 2x120 + 120 = 480 s
    expect(segundosDeEjercicio(ej('Sentadilla', '3x5', { isMain: true }), plan)).toBe(480)
    // el descanso propio del ejercicio manda sobre el del plan, y `restAfter` sobre el último
    expect(segundosDeEjercicio(ej('Curl', '3x12', { restSets: 30, restAfter: 90 }), plan)).toBe(3 * 40 + 2 * 30 + 90)
  })

  it('sin reglas del plan usa 180 s para el principal y 90 para el resto (como el entreno en vivo)', () => {
    expect(segundosDeEjercicio(ej('A', '2x5', { isMain: true }))).toBe(2 * 40 + 180 + 180)
    expect(segundosDeEjercicio(ej('B', '2x5'))).toBe(2 * 40 + 90 + 90)
  })

  it('una superserie solo cuenta el descanso del primero', () => {
    const solas = estimarMinutos([ej('A', '3x10'), ej('B', '3x10')], plan)
    const juntas = estimarMinutos([ej('A', '3x10', { supersetId: 's1' }), ej('B', '3x10', { supersetId: 's1' })], plan)
    expect(juntas).toBeLessThan(solas)
  })

  it('redondea a 5 minutos y una lista vacía es 0', () => {
    expect(estimarMinutos([], plan)).toBe(0)
    expect(estimarMinutos([ej('A', '3x5', { isMain: true }), ej('B', '3x8'), ej('C', '2x12')], plan) % 5).toBe(0)
  })
})

describe('versión corta', () => {
  const sesion = [
    ej('Sentadilla', '4x5', { isMain: true }),   // 4x40 + 3x120 + 120 = 640 s
    ej('Prensa', '3x10'),                        // 3x40 + 2x60 + 60 = 300 s
    ej('Curl femoral', '3x12'),                  // 300 s
    ej('Gemelo', '3x15'),                        // 300 s
    ej('Abdominales', '3x15'),                   // 300 s
  ]

  it('los principales siempre; el resto en orden hasta donde llegue el tiempo, y lo que sobra es el final', () => {
    const v = versionCorta(sesion, plan, 20) // 20 min = 1200 s: 640 + 300 + 300 = 1240 > 1200 → Sentadilla + Prensa
    expect(v.hacer).toEqual([0, 1])
    expect(v.omitir).toEqual([2, 3, 4])
    expect(v.minutos).toBe(15)
  })

  it('un principal al final no se pierde aunque no quepa', () => {
    const v = versionCorta([ej('Curl', '3x12'), ej('Remo', '3x12'), ej('Peso muerto', '3x5', { isMain: true })], plan, 10)
    expect(v.hacer).toContain(2)
    expect(v.omitir).not.toContain(2)
  })

  it('si solo los principales ya pasan del tiempo, se hacen igual y los minutos lo dicen', () => {
    const v = versionCorta(sesion, plan, 5)
    expect(v.hacer).toEqual([0])
    expect(v.minutos).toBeGreaterThan(5)
  })

  it('si cabe entera, no se omite nada', () => {
    expect(versionCorta(sesion, plan, 120).omitir).toEqual([])
  })

  it('solo ofrece los presupuestos que dejan algo fuera', () => {
    expect(presupuestosUtiles([ej('A', '3x5', { isMain: true })], plan)).toEqual([]) // 8 min: cabe en todo
    expect(presupuestosUtiles(sesion, plan)).toEqual([]) // ~30 min en total: no hay nada que recortar
    const larga = [...sesion, ej('Hip thrust', '3x10'), ej('Extensión', '3x12'), ej('Zancadas', '3x10')] // ~45 min
    expect(presupuestosUtiles(larga, plan)).toEqual([30])
    expect(presupuestosUtiles([...larga, ej('Abductores', '3x15'), ej('Plancha', '3x30')], plan)).toEqual([30, 45]) // ~55 min
  })
})
