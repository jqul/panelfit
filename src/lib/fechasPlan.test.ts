import { describe, it, expect } from 'vitest'
import { diaDelTitulo, fechaPrevista, fechaSesion, lunesDe } from './fechasPlan'
import { sesionesDelPlan, moverSesion } from './moverSesiones'

const dia = (title: string) => ({ title, focus: '', exercises: [] })
// Empieza el miércoles 21 oct 2026: la semana 1 del plan es la del lunes 19.
const plan = {
  clientId: 'c', type: 'x', restMain: 0, restAcc: 0, restWarn: 0,
  fechaInicio: '2026-10-21', diasElegidos: [4, 0, 2],
  weeks: [
    { label: 'S1', rpe: '', isCurrent: true, days: [dia('Día A'), dia('Día B'), dia('Día C'), dia('Día D')] },
    { label: 'S2', rpe: '', isCurrent: false, days: [dia('JUEVES — Fuerza'), dia('Día B')] },
  ],
} as any

describe('fechas de las sesiones', () => {
  it('lee el día de la semana del título, con o sin tilde', () => {
    expect(diaDelTitulo('MIÉRCOLES — tirón')).toBe(2)
    expect(diaDelTitulo('Sábado largo')).toBe(5)
    expect(diaDelTitulo('Día A')).toBeNull()
  })

  it('la semana va de lunes a domingo', () => {
    expect(lunesDe('2026-10-21')).toBe('2026-10-19')
    expect(lunesDe('2026-10-25')).toBe('2026-10-19') // domingo
  })

  it('sin día en el título, la n-ésima sesión va al n-ésimo día elegido (ordenados)', () => {
    expect(fechaPrevista(plan, 0, 0)).toBe('2026-10-19') // lunes
    expect(fechaPrevista(plan, 0, 1)).toBe('2026-10-21') // miércoles
    expect(fechaPrevista(plan, 0, 2)).toBe('2026-10-23') // viernes
    expect(fechaPrevista(plan, 0, 3)).toBeNull()         // 4 sesiones y 3 días elegidos: la 4.ª no tiene día
  })

  it('el título manda sobre los días elegidos, dentro de su semana', () => {
    expect(fechaPrevista(plan, 1, 0)).toBe('2026-10-29') // jueves de la semana 2
    expect(fechaPrevista(plan, 1, 1)).toBe('2026-10-28') // 2.º día elegido de la semana 2
  })

  it('sin fecha de inicio no hay calendario', () => {
    expect(fechaPrevista({ ...plan, fechaInicio: undefined }, 0, 0)).toBeNull()
  })
})

describe('mover sesiones', () => {
  it('guarda solo la excepción y la fecha movida manda', () => {
    const p = moverSesion(plan, 0, 2, '2026-10-24')
    expect(p.fechasSesion).toEqual({ w0_d2: '2026-10-24' })
    expect(fechaSesion(p, 0, 2)).toBe('2026-10-24')
    expect(plan.fechasSesion).toBeUndefined() // no muta el original
  })

  it('volver a su día (o moverla a su día) deja el plan como estaba', () => {
    const movido = moverSesion(plan, 0, 2, '2026-10-24')
    expect(moverSesion(movido, 0, 2, null).fechasSesion).toBeUndefined()
    expect(moverSesion(movido, 0, 2, '2026-10-23').fechasSesion).toBeUndefined()
  })

  it('en el calendario: sin días fijados se propone el reparto habitual, y lo hecho va al día en que se hizo', () => {
    const sinDias = { ...plan, diasElegidos: undefined }
    const logs = { ex_w0_d0_r0: { done: true, dateDone: '2026-10-20' } } as any
    const s = sesionesDelPlan(sinDias, logs)
    expect(s[0]).toMatchObject({ fecha: '2026-10-20', hechaEl: '2026-10-20', propuesta: false }) // la hizo el martes
    expect(s[1]).toMatchObject({ fecha: '2026-10-20', propuesta: true })  // 4 sesiones: L, M, J, V → 2.ª el martes
    expect(s[3]).toMatchObject({ fecha: '2026-10-23', propuesta: true })
    expect(s[4]).toMatchObject({ fecha: '2026-10-29', propuesta: false }) // el título dice jueves: no es propuesta
    // Fijar una propuesta en su mismo día sí guarda la fecha (antes el plan no la tenía)
    expect(moverSesion(sinDias, 0, 1, '2026-10-20').fechasSesion).toEqual({ w0_d1: '2026-10-20' })
  })

  it('una sesión sin día se puede fechar a mano', () => {
    const p = moverSesion(plan, 0, 3, '2026-10-25')
    expect(sesionesDelPlan(p).find(s => s.clave === 'w0_d3')).toMatchObject({ fecha: '2026-10-25', movida: true, titulo: 'Día D' })
  })
})
