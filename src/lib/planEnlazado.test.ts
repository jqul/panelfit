import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'
vi.mock('./supabase', () => ({ supabase: {} }))
import { empiezaSiguiente, siguienteDesdeWorkout } from './planEnlazado'
import type { WeekPlan } from '../types'

const semanas = (n: number) => Array.from({ length: n }, () => ({ days: [] }) as unknown as WeekPlan)

describe('empiezaSiguiente', () => {
  it('el lunes después de la última semana', () => {
    expect(empiezaSiguiente({ fechaInicio: '2026-10-05', weeks: semanas(4) })).toBe('2026-11-02')
  })
  it('con un inicio a mitad de semana, cuenta desde su lunes (como las semanas del plan)', () => {
    expect(empiezaSiguiente({ fechaInicio: '2026-10-07', weeks: semanas(4) })).toBe('2026-11-02')
  })
  it('sin fecha de inicio o sin semanas, no se sabe', () => {
    expect(empiezaSiguiente({ weeks: semanas(4) })).toBeNull()
    expect(empiezaSiguiente({ fechaInicio: '2026-10-05', weeks: [] })).toBeNull()
  })
})

describe('siguienteDesdeWorkout', () => {
  it('copia las semanas: cambiar el workout después no cambia lo preparado', () => {
    const t = { id: 't1', name: 'Fuerza B', type: 'fuerza', weeks: semanas(2) }
    const s = siguienteDesdeWorkout(t)
    expect(s).toMatchObject({ nombre: 'Fuerza B', templateId: 't1', type: 'fuerza' })
    t.weeks.push(semanas(1)[0])
    expect(s.weeks).toHaveLength(2)
  })
})
