import { describe, it, expect } from 'vitest'
import { latestPreviousLog, mismoEjercicioEnOtrasSemanas } from './previousSession'
import { TrainingLogs, WeekPlan } from '../types'

const log = (dateDone: string | undefined, weight: string) => ({ done: true, dateDone, sets: { 0: { weight, reps: '5' } } })
const pattern = /^ex_w\d+_d0_r0$/

describe('latestPreviousLog', () => {
  const logs = {
    ex_w0_d0_r0: log('2026-09-02', '100'),
    ex_w1_d0_r0: log('2026-09-21', '105'),
    ex_w2_d0_r0: log('2026-09-28', '95'),
    ex_w3_d0_r0: log('2026-10-05', '97.5'),
    ex_w0_d1_r0: log('2026-09-30', '999'), // otro día del plan: no cuenta
  } as unknown as TrainingLogs

  it('devuelve la sesión anterior más reciente, no la más antigua', () => {
    expect(latestPreviousLog(logs, pattern, 'ex_w3_d0_r0')?.sets[0].weight).toBe('95')
  })
  it('excluye la sesión actual y las que no tienen fecha', () => {
    const l = { ...logs, ex_w4_d0_r0: log(undefined, '1') } as unknown as TrainingLogs
    expect(latestPreviousLog(l, pattern, 'ex_w3_d0_r0')?.sets[0].weight).toBe('95')
  })
  it('null si no hay ninguna', () => {
    expect(latestPreviousLog({} as TrainingLogs, pattern, 'x')).toBeNull()
  })
})

describe('mismoEjercicioEnOtrasSemanas', () => {
  const ej = (name: string) => ({ name, sets: '3x5', weight: '', comment: '', isMain: false })
  const semana = (...nombres: string[]) => ({ label: 'S', rpe: '', isCurrent: false, days: [{ title: 'Lunes', focus: '', exercises: nombres.map(ej) }] })
  // Semana 0 y 1: sentadilla y banca. Semana 2: la sentadilla lleva detrás sus series de bajada (la banca baja a la posición 2).
  const weeks = [semana('Sentadilla pesada', 'Press banca pesado'), semana('Sentadilla pesada', 'Press banca pesado'), semana('Sentadilla pesada', 'Sentadilla pesada · series de bajada', 'Press banca pesado')] as unknown as WeekPlan[]
  const logs = {
    ex_w0_d0_r0: log('2026-10-05', '90'), ex_w0_d0_r1: log('2026-10-05', '70'),
    ex_w1_d0_r0: log('2026-10-12', '92.5'), ex_w1_d0_r1: log('2026-10-12', '72.5'),
  } as unknown as TrainingLogs

  it('con filas nuevas, la posición ya no es la referencia: las series de bajada no heredan la banca', () => {
    // posición 1 de la semana 2 = «series de bajada»: antes cogía la banca de la semana 1 (72.5 kg), ahora no hay historial
    expect(latestPreviousLog(logs, mismoEjercicioEnOtrasSemanas(weeks, 2, 0, 1), 'ex_w2_d0_r1')).toBeNull()
  })
  it('la banca, que ahora está en la posición 2, sí encuentra su historial en la posición 1', () => {
    expect(latestPreviousLog(logs, mismoEjercicioEnOtrasSemanas(weeks, 2, 0, 2), 'ex_w2_d0_r2')?.sets[0].weight).toBe('72.5')
  })
  it('el top set conserva su historial', () => {
    expect(latestPreviousLog(logs, mismoEjercicioEnOtrasSemanas(weeks, 2, 0, 0), 'ex_w2_d0_r0')?.sets[0].weight).toBe('92.5')
  })
  it('ignora mayúsculas y espacios y no mira otros días', () => {
    const w = [semana(' sentadilla pesada '), semana('Sentadilla Pesada')] as unknown as WeekPlan[]
    const l = { ex_w0_d0_r0: log('2026-10-05', '90'), ex_w0_d1_r0: log('2026-10-06', '999') } as unknown as TrainingLogs
    expect(latestPreviousLog(l, mismoEjercicioEnOtrasSemanas(w, 1, 0, 0), 'ex_w1_d0_r0')?.sets[0].weight).toBe('90')
  })
  it('si el plan no trae el ejercicio, vuelve a la posición de siempre', () => {
    expect(latestPreviousLog(logs, mismoEjercicioEnOtrasSemanas(undefined, 2, 0, 1), 'ex_w2_d0_r1')?.sets[0].weight).toBe('72.5')
  })
})
