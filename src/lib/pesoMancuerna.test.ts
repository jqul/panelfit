import { describe, it, expect } from 'vitest'
import { ayudaPeso, convertirPeso, ejerciciosConMancuernas, esConMancuernas, porLadoDe, resolverPesoDia, unidadPeso } from './pesoMancuerna'
import { historialPorEjercicio } from './historialEjercicio'
import { ultimaSesion } from './progresionAuto'
import type { TrainingLogs, TrainingPlan } from '../types'

const ej = (name: string, extra = {}) => ({ name, sets: '3x10', weight: '', isMain: false, comment: '', ...extra })

describe('forma de apuntar el peso', () => {
  it('reconoce los ejercicios con mancuernas', () => {
    expect(esConMancuernas('Press banca con mancuernas')).toBe(true)
    expect(esConMancuernas('Swing con kettlebell')).toBe(true)
    expect(esConMancuernas('Press banca')).toBe(false)
  })
  it('el ejercicio manda; si no dice nada, el plan; por defecto, total', () => {
    expect(porLadoDe(ej('Remo con mancuernas'), null)).toBe(false)
    expect(porLadoDe(ej('Remo con mancuernas'), { pesoMancuernas: 'por_mancuerna' })).toBe(true)
    expect(porLadoDe(ej('Remo con mancuernas', { pesoPorLado: false }), { pesoMancuernas: 'por_mancuerna' })).toBe(false)
    expect(porLadoDe(ej('Prensa a una pierna', { pesoPorLado: true }), null)).toBe(true)
    expect(porLadoDe(ej('Sentadilla'), { pesoMancuernas: 'por_mancuerna' })).toBe(false) // con barra no cambia
  })
  it('el día sale ya resuelto', () => {
    const d = resolverPesoDia({ exercises: [ej('Curl con mancuernas'), ej('Sentadilla')] } as unknown as TrainingPlan['weeks'][number]['days'][number], { pesoMancuernas: 'por_mancuerna' })
    expect(d.exercises.map(e => e.pesoPorLado)).toEqual([true, false])
  })
  it('unidad y ayuda con ejemplo para el cliente', () => {
    expect(unidadPeso({ name: 'Curl con mancuernas', pesoPorLado: true })).toEqual({ corta: 'Kg/manc.', larga: 'kg por mancuerna' })
    expect(unidadPeso({ name: 'Curl con mancuernas', pesoPorLado: false }).larga).toBe('kg en total')
    expect(unidadPeso({ name: 'Sentadilla' }).larga).toBe('kg')
    expect(ayudaPeso({ name: 'Curl con mancuernas', pesoPorLado: true })).toContain('si coges dos de 20 kg, pon 20')
    expect(ayudaPeso({ name: 'Curl con mancuernas', pesoPorLado: false })).toContain('pon 40')
    expect(ayudaPeso({ name: 'Sentadilla' })).toBeNull()
  })
  it('convierte entre formas', () => {
    expect(convertirPeso(20, true, false)).toBe(40)
    expect(convertirPeso(40, false, true)).toBe(20)
    expect(convertirPeso(40, false, false)).toBe(40)
  })
  it('cuenta los ejercicios con mancuernas que siguen al plan', () => {
    const plan = { weeks: [{ days: [{ exercises: [ej('Curl con mancuernas'), ej('Remo con mancuernas', { pesoPorLado: true }), ej('Sentadilla')] }] }] } as unknown as TrainingPlan
    expect(ejerciciosConMancuernas(plan)).toBe(1)
  })
})

describe('historial y progresión con registros en formas distintas', () => {
  const logs: TrainingLogs = {
    // Antes lo apuntaba en total (dos de 20 → 40); ahora, por mancuerna
    ex_w0_d0_r0: { done: true, dateDone: '2026-11-01', substituteName: 'Press con mancuernas', sets: { 0: { weight: '40', reps: '10' } } },
    ex_w1_d0_r0: { done: true, dateDone: '2026-11-08', substituteName: 'Press con mancuernas', porLado: true, sets: { 0: { weight: '22', reps: '10' } } },
  }
  it('todo en la forma del registro más reciente; el volumen, el real', () => {
    const h = historialPorEjercicio(logs, null)[0]
    expect(h.porLado).toBe(true)
    expect(h.sesiones.map(s => s.mejor?.weight)).toEqual([22, 20])
    expect(h.sesiones.map(s => s.volumen)).toEqual([440, 400])
  })
  it('la última sesión, en la forma que se le pida', () => {
    expect(ultimaSesion(logs, null, 'Press con mancuernas', '2026-11-10')?.mejor?.weight).toBe(22)
    expect(ultimaSesion(logs, null, 'Press con mancuernas', '2026-11-10', false)?.mejor?.weight).toBe(44)
  })
})
