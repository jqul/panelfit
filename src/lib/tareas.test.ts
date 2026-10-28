import { describe, it, expect } from 'vitest'
import { tocaEl, tareasDelDia, describirRepeticion, diaSemanaDe, diaAnterior } from './tareas'

// 2026-11-03 es martes.
const semanal = { fecha: '2026-11-03', repetir: 'semanal' as const, dias: [1, 3], hasta: null }

describe('cuándo toca una tarea', () => {
  it('cuenta los días de lunes (0) a domingo (6)', () => {
    expect(diaSemanaDe('2026-11-02')).toBe(0)
    expect(diaSemanaDe('2026-11-08')).toBe(6)
  })

  it('una vez: solo su día', () => {
    const t = { fecha: '2026-11-03', repetir: 'una' as const, dias: [], hasta: null }
    expect(tocaEl(t, '2026-11-03')).toBe(true)
    expect(tocaEl(t, '2026-11-10')).toBe(false)
  })

  it('cada día, desde su fecha y hasta el "hasta" incluido', () => {
    const t = { fecha: '2026-11-03', repetir: 'diaria' as const, dias: [], hasta: '2026-11-05' }
    expect(tocaEl(t, '2026-11-02')).toBe(false)
    expect(tocaEl(t, '2026-11-05')).toBe(true)
    expect(tocaEl(t, '2026-11-06')).toBe(false)
  })

  it('semanal: solo los días elegidos y nunca antes de empezar', () => {
    expect(tocaEl(semanal, '2026-11-03')).toBe(true)  // martes
    expect(tocaEl(semanal, '2026-11-05')).toBe(true)  // jueves
    expect(tocaEl(semanal, '2026-11-04')).toBe(false) // miércoles
    expect(tocaEl(semanal, '2026-10-29')).toBe(false) // jueves anterior al inicio
    expect(tocaEl(semanal, '2027-03-02')).toBe(true)  // sin "hasta", sigue
  })

  it('filtra las de un día', () => {
    const otra = { ...semanal, repetir: 'una' as const, fecha: '2026-11-04', dias: [] }
    expect(tareasDelDia([semanal, otra], '2026-11-04')).toEqual([otra])
  })
})

describe('textos', () => {
  it('describe la repetición', () => {
    expect(describirRepeticion(semanal)).toBe('Los martes y jueves')
    expect(describirRepeticion(semanal, true)).toBe('M y J')
    expect(describirRepeticion({ repetir: 'semanal', dias: [0, 2, 4], hasta: null })).toBe('Los lunes, miércoles y viernes')
    expect(describirRepeticion({ repetir: 'semanal', dias: [0, 1, 2, 3, 4, 5, 6], hasta: null })).toBe('Cada día')
    expect(describirRepeticion({ repetir: 'diaria', dias: [], hasta: '2026-11-30' })).toBe('Cada día hasta el 30 nov')
    expect(describirRepeticion({ repetir: 'una', dias: [], hasta: null })).toBe('Una vez')
  })

  it('el día anterior cruza meses', () => {
    expect(diaAnterior('2026-12-01')).toBe('2026-11-30')
  })
})
