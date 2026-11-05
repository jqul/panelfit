import { describe, it, expect } from 'vitest'
import { esLibre, nuevaSesionLibre, parrafos } from './sesionLibre'
import { historialPorEjercicio } from './historialEjercicio'
import { resumenSeries } from './backoff'
import { tracksVelocity } from './strength'
import type { TrainingPlan } from '../types'

describe('sesión libre', () => {
  it('un bloque de una sola "serie", sin kilos ni descanso', () => {
    const s = nuevaSesionLibre('Movilidad')
    expect(s).toMatchObject({ name: 'Movilidad', sets: '1x1', weight: '', kind: 'libre', hideRest: true })
    expect(esLibre(s)).toBe(true)
    expect(esLibre({ kind: 'run' })).toBe(false)
  })
  it('párrafos separados por líneas vacías', () => {
    expect(parrafos('10 min de cadera\n\n3 rondas:\nplancha 30 s\n\n')).toEqual(['10 min de cadera', '3 rondas:\nplancha 30 s'])
    expect(parrafos(undefined)).toEqual([])
  })
  it('no dice series ni registra velocidad', () => {
    expect(resumenSeries(nuevaSesionLibre())).toBe('Sesión libre')
    expect(tracksVelocity(nuevaSesionLibre())).toBe(false)
  })
  it('no sale en el historial por ejercicio', () => {
    const plan = { weeks: [{ days: [{ exercises: [nuevaSesionLibre('Movilidad'), { name: 'Sentadilla', sets: '3x5', weight: '', isMain: true, comment: '' }] }] }] } as unknown as TrainingPlan
    const h = historialPorEjercicio({
      ex_w0_d0_r0: { done: true, dateDone: '2026-11-04', sets: { 0: { weight: '', reps: '1' } } },
      ex_w0_d0_r1: { done: true, dateDone: '2026-11-04', sets: { 0: { weight: '100', reps: '5' } } },
    }, plan)
    expect(h.map(e => e.name)).toEqual(['Sentadilla'])
  })
})
