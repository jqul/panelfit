import { describe, it, expect } from 'vitest'
import { copiarSesion, semanaDeFecha, sesionesDelPlan } from './moverSesiones'

const dia = (title: string) => ({ title, focus: '', exercises: [{ name: title + ' ej', sets: '3x5', weight: '', comment: '', isMain: true }] })
// Semana 1 = lunes 26 oct; semana 2 = lunes 2 nov. El cliente entrena lunes, miércoles y viernes.
const plan = {
  clientId: 'c', type: 'x', restMain: 0, restAcc: 0, restWarn: 0, fechaInicio: '2026-10-26', diasElegidos: [0, 2, 4],
  weeks: [
    { label: 'S1', rpe: '', isCurrent: true, days: [dia('Día A'), dia('Día B'), dia('Día C')] },
    { label: 'S2', rpe: '', isCurrent: false, days: [dia('Día A'), dia('Día B'), dia('Día C')] },
  ],
} as any

describe('semanaDeFecha', () => {
  it('la semana del plan en que cae una fecha, o null fuera del plan', () => {
    expect(semanaDeFecha(plan, '2026-10-26')).toBe(0)
    expect(semanaDeFecha(plan, '2026-11-08')).toBe(1)
    expect(semanaDeFecha(plan, '2026-11-09')).toBeNull()
    expect(semanaDeFecha(plan, '2026-10-25')).toBeNull()
    expect(semanaDeFecha({ ...plan, fechaInicio: undefined }, '2026-10-26')).toBeNull()
  })
})

describe('copiarSesion', () => {
  it('añade una copia al final de la semana de la fecha y la fija ese día', () => {
    const p = copiarSesion(plan, 0, 1, '2026-11-07')!
    expect(p.weeks[1].days.map((d: any) => d.title)).toEqual(['Día A', 'Día B', 'Día C', 'Día B'])
    expect(p.fechasSesion).toEqual({ w1_d3: '2026-11-07' })
    // Los días que ya había no cambian de número ni de fecha
    expect(sesionesDelPlan(p).filter(s => s.w === 1).map(s => s.fecha)).toEqual(['2026-11-02', '2026-11-04', '2026-11-06', '2026-11-07'])
    // Es una copia: cambiarla no toca el original
    p.weeks[1].days[3].exercises[0].name = 'otro'
    expect(plan.weeks[0].days[1].exercises[0].name).toBe('Día B ej')
  })

  it('fuera del plan, nada', () => {
    expect(copiarSesion(plan, 0, 1, '2026-12-01')).toBeNull()
    expect(copiarSesion(plan, 5, 0, '2026-10-27')).toBeNull()
  })
})
