import { describe, it, expect } from 'vitest'
import { sesionesPorFecha, nivelPorPorcentaje, cumplimientoDia, ultimos7Dias, diaSemana } from './cumplimiento'

const ex = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `E${i}`, sets: '3x10', weight: '', isMain: false, comment: '' }))
const plan = { weeks: [{ label: 'S1', days: [{ title: 'A', exercises: ex(5) }, { title: 'B', exercises: ex(4) }] }] } as any
const hecho = (fecha: string) => ({ done: true, dateDone: fecha, sets: {} } as any)

describe('cumplimiento por día', () => {
  it('cuenta hechos frente a previstos de la sesión de ese día', () => {
    const logs = { ex_w0_d0_r0: hecho('2026-10-20'), ex_w0_d0_r1: hecho('2026-10-20'), ex_w0_d0_r2: hecho('2026-10-20'), ex_w0_d0_r3: hecho('2026-10-20') }
    expect(sesionesPorFecha(plan, logs)['2026-10-20']).toEqual({ hechos: 4, previstos: 5 })
  })

  it('suma dos sesiones el mismo día', () => {
    const logs = { ex_w0_d0_r0: hecho('2026-10-20'), ex_w0_d1_r0: hecho('2026-10-20') }
    expect(sesionesPorFecha(plan, logs)['2026-10-20']).toEqual({ hechos: 2, previstos: 9 })
  })

  it('ignora lo no hecho y las claves que no son de ejercicio', () => {
    const logs = { ex_w0_d0_r0: { done: false, dateDone: '2026-10-20' } as any, finished_w0_d0: { sessionFinished: true } as any }
    expect(sesionesPorFecha(plan, logs)).toEqual({})
  })

  it('cortes: ≥80 % completo, ≥50 % a medias, menos es poco', () => {
    expect(nivelPorPorcentaje(4, 5)).toBe('completo')
    expect(nivelPorPorcentaje(3, 5)).toBe('parcial')
    expect(nivelPorPorcentaje(2, 5)).toBe('bajo')
    expect(nivelPorPorcentaje(0, 5)).toBe('libre')
  })

  it('"no entrenó" solo en un día elegido, ya pasado y desde el inicio del plan', () => {
    const lunes = '2026-10-19'
    expect(diaSemana(lunes)).toBe(0)
    const op = { diasElegidos: [0], hoy: '2026-10-26' }
    expect(cumplimientoDia(lunes, {}, op).nivel).toBe('fallado')
    expect(cumplimientoDia('2026-10-20', {}, op).nivel).toBe('libre')            // martes: no tocaba
    expect(cumplimientoDia('2026-10-26', {}, op).nivel).toBe('libre')            // hoy: aún puede
    expect(cumplimientoDia(lunes, {}, { ...op, desde: '2026-10-21' }).nivel).toBe('libre') // antes del plan
    expect(cumplimientoDia(lunes, {}, { hoy: '2026-10-26' }).nivel).toBe('libre') // sin días elegidos no se sabe
  })

  it('últimos 7 días, de más antiguo a hoy', () => {
    const hoy = new Date('2026-10-26T10:00:00')
    const dias = ultimos7Dias({ ...plan, diasElegidos: [0] }, { ex_w0_d1_r0: hecho('2026-10-26'), ex_w0_d1_r1: hecho('2026-10-26'), ex_w0_d1_r2: hecho('2026-10-26'), ex_w0_d1_r3: hecho('2026-10-26') }, hoy)
    expect(dias.map(d => d.fecha)).toEqual(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26'])
    expect(dias[6].nivel).toBe('completo')
    expect(dias.filter(d => d.nivel === 'fallado')).toHaveLength(0) // el lunes 19 queda fuera de la ventana
  })
it('un día de entreno dentro de una ausencia avisada es "ausencia", no "no entrenó"', () => {
    const op = { diasElegidos: [0], hoy: '2026-10-26', ausencias: [{ desde: '2026-10-17', hasta: '2026-10-19' }] }
    expect(cumplimientoDia('2026-10-19', {}, op).nivel).toBe('ausente')            // lunes, último día de la ausencia
    expect(cumplimientoDia('2026-10-18', {}, op).nivel).toBe('ausente')            // aunque no tocara, se ve que estaba fuera
    expect(cumplimientoDia('2026-10-12', {}, op).nivel).toBe('fallado')            // lunes anterior: sigue contando
    // Si entrenó igualmente durante la ausencia, cuenta lo que hizo
    expect(cumplimientoDia('2026-10-19', { '2026-10-19': { hechos: 5, previstos: 5 } }, op).nivel).toBe('completo')
  })

  it('los 7 puntos respetan las ausencias', () => {
    const hoy = new Date('2026-10-27T10:00:00')
    const dias = ultimos7Dias({ ...plan, diasElegidos: [0, 2] }, {}, hoy, [{ desde: '2026-10-25', hasta: '2026-10-30' }])
    expect(dias.find(d => d.fecha === '2026-10-21')?.nivel).toBe('fallado')       // miércoles antes de irse
    expect(dias.find(d => d.fecha === '2026-10-26')?.nivel).toBe('ausente')       // lunes, fuera
    expect(dias.filter(d => d.nivel === 'ausente')).toHaveLength(3)                // 25, 26 y hoy 27
  })
})
