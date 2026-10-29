import { describe, it, expect } from 'vitest'
import { mezclarPrograma, tieneCambiosPropios, diaRegistrado, diaPasado } from './actualizarPrograma'
import type { DayPlan, TrainingLogs, TrainingPlan, WeekPlan } from '../types'

const dia = (title: string, ej = title): DayPlan => ({ title, focus: '', exercises: [{ name: ej } as any] })
const semana = (label: string, titulos: string[]): WeekPlan => ({ label, rpe: '', isCurrent: false, days: titulos.map(t => dia(t)) })

// Semanas desde el lunes 2026-10-19; el cliente entrena lunes, miércoles y viernes.
const planDe = (weeks: WeekPlan[], extra: Partial<TrainingPlan> = {}): TrainingPlan => ({
  clientId: 'c1', type: 'Fuerza', restMain: 180, restAcc: 90, restWarn: 30,
  fechaInicio: '2026-10-19', diasElegidos: [0, 2, 4], programId: 'p1', programName: 'Viejo', weeks, ...extra,
})
const HOY = '2026-10-28' // miércoles de la semana 2

describe('días que no se tocan', () => {
  it('un día con series registradas o cerrado', () => {
    const logs = { ex_w1_d0_r0: { done: true } } as unknown as TrainingLogs
    expect(diaRegistrado(logs, 1, 0)).toBe(true)
    expect(diaRegistrado(logs, 1, 1)).toBe(false)
    expect(diaRegistrado({ finished_w0_d2: { sessionFinished: true } } as unknown as TrainingLogs, 0, 2)).toBe(true)
    // ex_w1_d1 no debe confundirse con ex_w1_d10
    expect(diaRegistrado({ ex_w1_d10_r0: {} } as unknown as TrainingLogs, 1, 1)).toBe(false)
  })

  it('un día cuya fecha ya pasó; hoy todavía no', () => {
    const plan = planDe([semana('S1', ['A', 'B', 'C']), semana('S2', ['A', 'B', 'C'])])
    expect(diaPasado(plan, 0, 2, HOY)).toBe(true)  // viernes 23
    expect(diaPasado(plan, 1, 0, HOY)).toBe(true)  // lunes 26
    expect(diaPasado(plan, 1, 1, HOY)).toBe(false) // miércoles 28 = hoy
    expect(diaPasado(plan, 1, 2, HOY)).toBe(false)
  })
})

describe('mezclarPrograma', () => {
  const viejo = [semana('S1', ['A', 'B', 'C']), semana('S2', ['A', 'B', 'C']), semana('S3', ['A', 'B', 'C'])]
  const nuevo = [semana('N1', ['X', 'Y', 'Z']), semana('N2', ['X', 'Y', 'Z']), semana('N3', ['X', 'Y', 'Z'])]

  it('cambia solo lo que está por venir', () => {
    const { plan, cambiados } = mezclarPrograma(planDe(viejo), nuevo, {}, HOY, 'Nuevo')
    expect(plan.weeks.map(w => w.days.map(d => d.title))).toEqual([['A', 'B', 'C'], ['A', 'Y', 'Z'], ['X', 'Y', 'Z']])
    expect(cambiados).toBe(5)
    expect(plan.programName).toBe('Nuevo')
    expect(plan.weeks[1].label).toBe('N2')
  })

  it('un día de hoy ya empezado se conserva', () => {
    const logs = { ex_w1_d1_r0: { done: true } } as unknown as TrainingLogs
    const { plan } = mezclarPrograma(planDe(viejo), nuevo, logs, HOY)
    expect(plan.weeks[1].days.map(d => d.title)).toEqual(['A', 'B', 'Z'])
  })

  it('programa más largo añade semanas; más corto quita las que no tienen nada', () => {
    const largo = mezclarPrograma(planDe(viejo), [...nuevo, semana('N4', ['X'])], {}, HOY).plan
    expect(largo.weeks).toHaveLength(4)
    const corto = mezclarPrograma(planDe(viejo), nuevo.slice(0, 1), {}, HOY).plan
    // La semana 2 tiene el lunes pasado: se queda entera; la 3 se quita.
    expect(corto.weeks.map(w => w.days.map(d => d.title))).toEqual([['A', 'B', 'C'], ['A', 'B', 'C']])
  })

  it('con menos días no se mueve el número de un día ya registrado', () => {
    const plan = planDe([semana('S1', ['A', 'B', 'C', 'D'])], { fechaInicio: '2026-11-02', diasElegidos: [0, 1, 2, 3] })
    const logs = { finished_w0_d3: { sessionFinished: true } } as unknown as TrainingLogs
    const { plan: out } = mezclarPrograma(plan, [semana('N1', ['X', 'Y'])], logs, HOY)
    expect(out.weeks[0].days.map(d => d.title)).toEqual(['X', 'Y', 'C', 'D'])
  })

  it('olvida las sesiones movidas que ya no existen', () => {
    const plan = planDe(viejo, { fechasSesion: { w2_d1: '2026-11-06', w2_d2: '2026-11-07' } })
    const nuevas = [nuevo[0], nuevo[1], semana('N3', ['X', 'Y'])]
    const { plan: out } = mezclarPrograma(plan, nuevas, {}, HOY)
    expect(out.fechasSesion).toEqual({ w2_d1: '2026-11-06' })
  })

  it('no cambia el plan de entrada', () => {
    const p = planDe(viejo)
    const copia = JSON.stringify(p)
    mezclarPrograma(p, nuevo, {}, HOY)
    expect(JSON.stringify(p)).toBe(copia)
  })
})

describe('tieneCambiosPropios', () => {
  const viejo = [semana('S1', ['A', 'B', 'C']), semana('S2', ['A', 'B', 'C'])]

  it('no, si lo por venir es lo que daba el programa', () => {
    expect(tieneCambiosPropios(planDe(viejo), {}, viejo, HOY)).toBe(false)
  })

  it('sí, si el entrenador cambió un día por venir', () => {
    const editado = planDe([viejo[0], { ...viejo[1], days: [viejo[1].days[0], viejo[1].days[1], dia('C', 'Otro')] }])
    expect(tieneCambiosPropios(editado, {}, viejo, HOY)).toBe(true)
  })

  it('no cuenta lo que ya pasó', () => {
    const editado = planDe([{ ...viejo[0], days: [dia('Cambiado'), viejo[0].days[1], viejo[0].days[2]] }, viejo[1]])
    expect(tieneCambiosPropios(editado, {}, viejo, HOY)).toBe(false)
  })
})
