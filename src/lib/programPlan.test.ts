import { describe, it, expect } from 'vitest'
import { programToPlanWeeks, workoutTemplateIds, type ProgramWeekLike, type TemplatesById } from './programPlan'
import type { WeekPlan, Exercise } from '../types'

const ex = (name: string): Exercise => ({ name, sets: '3x8', weight: '', isMain: false, comment: '' })
const tday = (title: string, ...names: string[]) => ({ title, focus: '', exercises: names.map(ex) })
const tweek = (days: ReturnType<typeof tday>[], extra: Partial<WeekPlan> = {}): WeekPlan => ({ label: 'S', rpe: '', isCurrent: false, days, ...extra })
const task = (type: string, title: string, data?: Record<string, any>) => ({ type, title, data })
const pweek = (label: string, ...days: ReturnType<typeof task>[][]): ProgramWeekLike => ({ label, days: days.map(tasks => ({ tasks })) })

const power: TemplatesById = {
  power: { weeks: [
    tweek([tday('LUNES — EMPUJE', 'Sentadilla', 'Banca'), tday('MARTES — TIRÓN', 'Peso muerto'), tday('JUEVES', 'Banca parada')], { rpe: '@5' }),
    tweek([tday('S2 LUNES', 'Sentadilla 2')], { rpe: '@7', isDeload: true }),
  ] },
  uno: { weeks: [tweek([tday('DÍA 1', 'Press militar')])] },
}
const wk = (id: string, name = 'W') => task('workout', name, { templateId: id, templateName: name })

describe('workoutTemplateIds', () => {
  it('lista los workouts una sola vez e ignora otras tareas', () => {
    const weeks = [pweek('S1', [wk('a'), task('cardio', 'Correr')], [wk('a'), wk('b')]), pweek('S2', [wk('b')])]
    expect(workoutTemplateIds(weeks)).toEqual(['a', 'b'])
    expect(workoutTemplateIds(undefined)).toEqual([])
  })
})

describe('programToPlanWeeks', () => {
  it('copia los ejercicios del workout y usa el título del día de la plantilla', () => {
    const { weeks, missing } = programToPlanWeeks([pweek('S1', [wk('uno', 'dia 1')])], power)
    expect(missing).toEqual([])
    expect(weeks[0].days[0].title).toBe('DÍA 1')
    expect(weeks[0].days[0].exercises.map(e => e.name)).toEqual(['Press militar'])
  })

  it('la misma plantilla en varios días toma días consecutivos y vuelve al primero', () => {
    const { weeks } = programToPlanWeeks([pweek('S1', [wk('power')], [wk('power')], [wk('power')], [wk('power')])], power)
    expect(weeks[0].days.map(d => d.title)).toEqual(['LUNES — EMPUJE', 'MARTES — TIRÓN', 'JUEVES', 'LUNES — EMPUJE'])
    expect(weeks[0].days[1].exercises.map(e => e.name)).toEqual(['Peso muerto'])
  })

  it('la semana i del programa usa la semana i de la plantilla y repite la última si se acaba', () => {
    const { weeks } = programToPlanWeeks([pweek('S1', [wk('power')]), pweek('S2', [wk('power')]), pweek('S3', [wk('power')])], power)
    expect(weeks.map(w => w.days[0].title)).toEqual(['LUNES — EMPUJE', 'S2 LUNES', 'S2 LUNES'])
    expect(weeks.map(w => w.rpe)).toEqual(['@5', '@7', '@7'])
    expect(weeks.map(w => !!w.isDeload)).toEqual([false, true, true])
  })

  it('el contador de usos se reinicia en cada semana', () => {
    const { weeks } = programToPlanWeeks([pweek('S1', [wk('power')], [wk('power')]), pweek('S2', [wk('power')])], power)
    expect(weeks[0].days[1].title).toBe('MARTES — TIRÓN')
    expect(weeks[1].days[0].title).toBe('S2 LUNES')
  })

  it('un workout que ya no existe deja el día sin ejercicios, con el título de la tarea, y se avisa', () => {
    const { weeks, missing } = programToPlanWeeks([pweek('S1', [wk('borrado', 'Mi workout')], [wk('uno')])], power)
    expect(missing).toEqual(['Mi workout'])
    expect(weeks[0].days[0]).toMatchObject({ title: 'Mi workout', exercises: [] })
    expect(weeks[0].days[1].exercises).toHaveLength(1)
  })

  it('una plantilla sin días se trata como inexistente', () => {
    const { missing } = programToPlanWeeks([pweek('S1', [wk('vacia', 'Vacía')])], { vacia: { weeks: [tweek([])] } })
    expect(missing).toEqual(['Vacía'])
  })

  it('las tareas sin workout referenciado (o de otro tipo) se comportan como antes', () => {
    const { weeks, missing } = programToPlanWeeks([pweek('S1', [task('workout', 'Full body', { objective: 'x' }), task('cardio', 'Correr')], [], [task('mensaje', 'Ánimo')])], power)
    expect(missing).toEqual([])
    expect(weeks[0].days[0]).toEqual({ title: 'Full body', focus: 'Correr', exercises: [] })
    expect(weeks[0].days[1]).toEqual({ title: 'Día', focus: '', exercises: [] })
    expect(weeks[0].days[2].focus).toBe('Ánimo')
  })

  it('dos workouts en el mismo día suman sus ejercicios y el título es el del primero', () => {
    const { weeks } = programToPlanWeeks([pweek('S1', [wk('power'), wk('uno')])], power)
    expect(weeks[0].days[0].title).toBe('LUNES — EMPUJE')
    expect(weeks[0].days[0].exercises.map(e => e.name)).toEqual(['Sentadilla', 'Banca', 'Press militar'])
  })

  it('copia profunda: cambiar el plan no toca la plantilla', () => {
    const { weeks } = programToPlanWeeks([pweek('S1', [wk('uno')])], power)
    weeks[0].days[0].exercises[0].name = 'CAMBIADO'
    expect(power.uno!.weeks![0].days[0].exercises[0].name).toBe('Press militar')
  })

  it('solo la primera semana queda como actual', () => {
    const { weeks } = programToPlanWeeks([pweek('S1'), pweek('S2')], power)
    expect(weeks.map(w => w.isCurrent)).toEqual([true, false])
    expect(programToPlanWeeks(undefined, power)).toEqual({ weeks: [], missing: [] })
  })
})
