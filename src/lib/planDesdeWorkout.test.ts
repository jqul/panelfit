import { describe, it, expect } from 'vitest'
import { planDesdeWorkout } from './planDesdeWorkout'
import type { TrainingPlan, TrainingTemplate } from '../types'

const semana = (label: string) => ({ label, rpe: '@7', isCurrent: false, days: [{ title: 'Día A', focus: '', exercises: [] }] })
const tmpl = { type: 'Fuerza', weeks: [semana('S1'), semana('S2')] } as unknown as TrainingTemplate

describe('planDesdeWorkout', () => {
  it('sin plan, crea uno con las semanas del workout y la fecha de inicio', () => {
    const p = planDesdeWorkout(tmpl, 'c1', '2026-11-02')
    expect(p.clientId).toBe('c1')
    expect(p.type).toBe('Fuerza')
    expect(p.weeks.map(w => w.label)).toEqual(['S1', 'S2'])
    expect(p.fechaInicio).toBe('2026-11-02')
  })
  it('con plan, cambia las semanas y conserva lo demás (mensajes, días elegidos...)', () => {
    const actual = { clientId: 'c1', type: 'General', restMain: 120, restAcc: 60, restWarn: 15, message: 'Hola', diasElegidos: [0, 2], weeks: [semana('Vieja')] } as unknown as TrainingPlan
    const p = planDesdeWorkout(tmpl, 'c1', '2026-11-02', actual)
    expect(p.message).toBe('Hola')
    expect(p.diasElegidos).toEqual([0, 2])
    expect(p.weeks.map(w => w.label)).toEqual(['S1', 'S2'])
    expect(p.type).toBe('Fuerza')
  })
  it('no comparte las semanas con el workout (editar el plan no toca la plantilla)', () => {
    const p = planDesdeWorkout(tmpl, 'c1', '2026-11-02', { weeks: [] } as unknown as TrainingPlan)
    p.weeks[0].label = 'cambiada'
    expect(tmpl.weeks[0].label).toBe('S1')
  })
})
