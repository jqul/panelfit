import { describe, it, expect } from 'vitest'
import { csvSeries, filasSeries, nombreArchivo } from './exportSeries'
import type { TrainingLogs, TrainingPlan } from '../types'

const ej = (name: string, extra = {}) => ({ name, sets: '3x5', weight: '', isMain: true, comment: '', ...extra })
const plan = { weeks: [{ days: [{ title: 'Día A', exercises: [ej('Sentadilla'), ej('Movilidad', { kind: 'libre' })] }] }] } as unknown as TrainingPlan

describe('filasSeries', () => {
  const logs: TrainingLogs = {
    ex_w0_d0_r0: { done: true, dateDone: '2026-11-03', sets: { 0: { weight: '100', reps: '5', rir: 2 }, 1: { weight: '102,5', reps: '3' }, 2: { weight: '', reps: '' } } },
    ex_w0_d0_r1: { done: true, dateDone: '2026-11-03', sets: { 0: { weight: '', reps: '10' } } }, // sesión libre: fuera
    ex_w1_d0_r0: { done: true, dateDone: '2026-11-01', substituteName: 'Prensa', noContar: true, sets: { 0: { weight: '200', reps: '12' } } },
    ex_w0_d0_r2: { done: false, sets: { 0: { weight: '50', reps: '5' } } }, // no hecho
  }
  it('una fila por serie con reps, en orden de fecha', () => {
    const f = filasSeries(logs, plan)
    expect(f.map(x => [x.fecha, x.ejercicio, x.serie])).toEqual([['2026-11-01', 'Prensa', 1], ['2026-11-03', 'Sentadilla', 1], ['2026-11-03', 'Sentadilla', 2]])
    expect(f[1]).toMatchObject({ semana: 1, dia: 'Día A', peso: 100, reps: 5, rir: 2, e1rm: 116.7, nota: '' })
    expect(f[2]).toMatchObject({ peso: 102.5, rir: '' })
    expect(f[0]).toMatchObject({ semana: 2, dia: '', e1rm: '', nota: 'no cuenta en el progreso' }) // más de 10 reps: sin 1RM
  })
})

describe('csvSeries', () => {
  it('separador ; con coma decimal, BOM y comillas donde hace falta', () => {
    const csv = csvSeries([{ fecha: '2026-11-03', semana: 1, dia: 'Día "A"; pierna', ejercicio: 'Sentadilla', serie: 1, peso: 102.5, reps: 3, rir: '', e1rm: 110.8, nota: '' }])
    expect(csv.startsWith('﻿Fecha;Semana;Día;Ejercicio;Serie;Peso (kg);Reps;RIR;1RM estimado (kg);Nota\r\n')).toBe(true)
    expect(csv).toContain('2026-11-03;1;"Día ""A""; pierna";Sentadilla;1;102,5;3;;110,8;\r\n')
  })
})

describe('nombreArchivo', () => {
  it('sin tildes ni espacios', () => {
    expect(nombreArchivo('María García', '2026-11-10')).toBe('progreso-maria-garcia-2026-11-10.csv')
  })
})
