import { describe, it, expect } from 'vitest'
import { quitarNotasDelPlan, anadirEtiquetaANotas, tieneNotas } from './notasPrivadas'

describe('quitarNotasDelPlan', () => {
  it('quita coachNotes y deja el resto del plan igual, sin mutar el original', () => {
    const plan = { clientId: 'c1', type: 'fuerza', restMain: 180, weeks: [], coachNotes: 'rodilla' }
    const limpio = quitarNotasDelPlan(plan)
    expect('coachNotes' in limpio).toBe(false)
    expect(limpio).toEqual({ clientId: 'c1', type: 'fuerza', restMain: 180, weeks: [] })
    expect(plan.coachNotes).toBe('rodilla')
  })
  it('un plan sin la clave se devuelve tal cual', () => {
    const plan = { clientId: 'c1', type: 'fuerza' }
    expect(quitarNotasDelPlan(plan)).toBe(plan)
  })
})

describe('anadirEtiquetaANotas', () => {
  it('añade la etiqueta en su propia línea', () => {
    expect(anadirEtiquetaANotas('Hola', '⚠️ Lesión')).toBe('Hola\n[⚠️ Lesión] ')
  })
})

describe('tieneNotas', () => {
  it('distingue notas reales de vacías o solo espacios', () => {
    expect(tieneNotas('ojo')).toBe(true)
    expect(tieneNotas('  \n ')).toBe(false)
    expect(tieneNotas('')).toBe(false)
    expect(tieneNotas(null)).toBe(false)
    expect(tieneNotas(undefined)).toBe(false)
  })
})
