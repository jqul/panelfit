import { describe, it, expect } from 'vitest'
import { resumenSemanal, diasDeLaSemana } from './resumenSemanal'

describe('diasDeLaSemana', () => {
  it('del lunes a hoy', () => {
    expect(diasDeLaSemana(new Date(2026, 10, 4))).toEqual(['2026-11-02', '2026-11-03', '2026-11-04']) // miércoles
    expect(diasDeLaSemana(new Date(2026, 10, 2))).toEqual(['2026-11-02']) // lunes
  })
})

describe('resumenSemanal', () => {
  const dias = ['2026-11-02', '2026-11-03', '2026-11-04']
  it('cada parte con lo hecho de lo previsto, y la media', () => {
    const r = resumenSemanal({
      dias,
      entrenos: { hechas: 1, previstas: 3 },
      habitos: { total: 2, hechosPorDia: { '2026-11-02': 2, '2026-11-03': 1, '2026-11-04': 5 } }, // un día con más de los que hay: tope
      tareas: {
        lista: [{ id: 't1', fecha: '2026-11-02', repetir: 'diaria', dias: [], hasta: null }, { id: 't2', fecha: '2026-11-04', repetir: 'una', dias: [], hasta: null }],
        hechas: [{ tarea_id: 't1', fecha: '2026-11-02' }, { tarea_id: 't1', fecha: '2026-11-04' }, { tarea_id: 't2', fecha: '2026-11-04' }],
      },
      checkins: ['2026-11-03'],
    })
    expect(r.partes.map(p => [p.id, p.hechas, p.previstas, p.pct])).toEqual([
      ['entrenos', 1, 3, 33], ['habitos', 5, 6, 83], ['tareas', 3, 4, 75], ['checkin', 1, 3, 33],
    ])
    expect(r.pct).toBe(56) // (33 + 83 + 75 + 33) / 4
  })
  it('lo que no tiene nada previsto no sale; sin nada, sin porcentaje', () => {
    const r = resumenSemanal({ dias, entrenos: { hechas: 0, previstas: 0 }, habitos: { total: 0, hechosPorDia: {} } })
    expect(r).toEqual({ partes: [], pct: null })
  })
})
