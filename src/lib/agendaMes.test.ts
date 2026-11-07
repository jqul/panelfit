import { describe, it, expect } from 'vitest'
import { citasDeProfesional, semanasDelMes } from './agendaMes'

describe('semanasDelMes', () => {
  it('noviembre de 2026: empieza en domingo, así que la primera semana arranca el lunes 26 de octubre', () => {
    const s = semanasDelMes(new Date(2026, 10, 15), new Date(2026, 10, 7))
    expect(s).toHaveLength(6)
    expect(s.every(w => w.length === 7)).toBe(true)
    expect(s[0][0]).toMatchObject({ fecha: '2026-10-26', delMes: false })
    expect(s[0][6]).toMatchObject({ fecha: '2026-11-01', dia: 1, delMes: true })
    expect(s[5][6]).toMatchObject({ fecha: '2026-12-06', delMes: false })
    expect(s.flat().filter(d => d.hoy).map(d => d.fecha)).toEqual(['2026-11-07'])
  })
  it('un mes que empieza en lunes no añade días del anterior', () => {
    const s = semanasDelMes(new Date(2027, 1, 1)) // febrero 2027 empieza en lunes
    expect(s[0][0].fecha).toBe('2027-02-01')
    expect(s).toHaveLength(4)
  })
})

describe('citasDeProfesional', () => {
  const citas = [
    { id: 'a', client_id: 'c1' }, // de Ana (profesional p2)
    { id: 'b', client_id: 'c2' }, // sin asignar: del dueño
    { id: 'c', client_id: null }, // bloqueo
  ]
  const clientes = [{ id: 'c1', profesional_id: 'p2' }, { id: 'c2', profesional_id: null }]
  it('sin filtro, todas', () => {
    expect(citasDeProfesional(citas, clientes, '', 'dueño').map(c => c.id)).toEqual(['a', 'b', 'c'])
  })
  it('las del compañero: solo sus clientes', () => {
    expect(citasDeProfesional(citas, clientes, 'p2', 'dueño').map(c => c.id)).toEqual(['a'])
  })
  it('las del dueño: sus clientes, los sin asignar y los bloqueos', () => {
    expect(citasDeProfesional(citas, clientes, 'dueño', 'dueño').map(c => c.id)).toEqual(['b', 'c'])
  })
})
