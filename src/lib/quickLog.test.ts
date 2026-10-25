import { describe, it, expect } from 'vitest'
import { plannedWeight, parseSets, buildRows, applyQuickLog, rowsAreValid, validReps, validWeight, addDays } from './quickLog'
import type { Exercise, TrainingLogs } from '../types'

const ex = (name: string, sets: string, weight = '', extra: Partial<Exercise> = {}): Exercise =>
  ({ name, sets, weight, isMain: false, comment: '', ...extra })
const DAY = { exercises: [
  ex('Press banca pesado', '3x5', '77.5kg'),
  ex('Press militar', '3x10 @7', '50 kg'),
  ex('Dominadas', '3x8', ''),
  ex('Sentadilla', '4x5', '80%'),
  ex('Pista: 3 × 600 m', '3x1', '', { kind: 'run' }),
] }
const KEY = 'w8_d0'

describe('registrar un entreno ya hecho', () => {
  it('interpreta el peso y las series del plan', () => {
    expect(plannedWeight('77.5kg')).toBe('77.5')
    expect(plannedWeight('82,5')).toBe('82.5')
    expect(plannedWeight(' 50 kg ')).toBe('50')
    expect(plannedWeight('80%')).toBe('') // porcentaje del 1RM: no hay kilos que rellenar
    expect(plannedWeight('al fallo')).toBe('')
    expect(plannedWeight(undefined)).toBe('')
    expect(parseSets('3×10 @7')).toEqual({ numSets: 3, numReps: 10 })
    expect(parseSets('2x5 @5')).toEqual({ numSets: 2, numReps: 5 })
    expect(parseSets('')).toEqual({ numSets: 3, numReps: 10 })
  })

  it('prerrellena cada ejercicio con lo programado; la pista y lo ya hecho no se incluyen', () => {
    const logs: TrainingLogs = { [`ex_${KEY}_r1`]: { sets: { 0: { weight: '52', reps: '8' } }, done: true, dateDone: '2026-10-26' } }
    const rows = buildRows(DAY, KEY, logs)
    expect(rows.map(r => [r.name, r.state, r.included, r.weight, r.reps, r.numSets])).toEqual([
      ['Press banca pesado', 'editable', true, '77.5', '5', 3],
      ['Press militar', 'ya-hecho', false, '50', '10', 3],
      ['Dominadas', 'editable', true, '', '8', 3],
      ['Sentadilla', 'editable', true, '', '5', 4],
      ['Pista: 3 × 600 m', 'pista', false, '', '1', 3],
    ])
  })

  it('guarda como hecho lo incluido, con la fecha elegida y una serie por cada programada', () => {
    const rows = buildRows(DAY, KEY, {})
    const out = applyQuickLog({}, KEY, rows, '2026-10-25')
    expect(out[`ex_${KEY}_r0`]).toEqual({ sets: { 0: { weight: '77.5', reps: '5' }, 1: { weight: '77.5', reps: '5' }, 2: { weight: '77.5', reps: '5' } }, done: true, dateDone: '2026-10-25' })
    expect(Object.keys(out[`ex_${KEY}_r3`].sets)).toHaveLength(4)
  })

  it('lo corregido por el cliente es lo que se guarda (coma decimal incluida)', () => {
    const rows = buildRows(DAY, KEY, {})
    rows[0].weight = '75,5'; rows[0].reps = '6'
    const out = applyQuickLog({}, KEY, rows, '2026-10-25')
    expect(out[`ex_${KEY}_r0`].sets[2]).toEqual({ weight: '75.5', reps: '6' })
  })

  it('lo no hecho (desmarcado o pista) deja la marca de sesión cerrada, como al terminar a medias', () => {
    const rows = buildRows(DAY, KEY, {})
    rows[2].included = false // no hizo dominadas
    const out = applyQuickLog({}, KEY, rows, '2026-10-25')
    expect(out[`ex_${KEY}_r2`]).toBeUndefined()
    expect(out[`finished_${KEY}`]).toEqual({ sets: {}, done: false, sessionFinished: true })
  })

  it('si todo queda hecho no hace falta la marca; y no pisa lo ya hecho ni otros días', () => {
    const previo: TrainingLogs = {
      [`ex_${KEY}_r1`]: { sets: { 0: { weight: '52', reps: '8', rir: 3 } }, done: true, dateDone: '2026-10-23', note: 'bien' },
      ['ex_w8_d1_r0']: { sets: {}, done: true, dateDone: '2026-10-24' },
    }
    const day = { exercises: DAY.exercises.slice(0, 3) }
    const out = applyQuickLog(previo, KEY, buildRows(day, KEY, previo), '2026-10-25')
    expect(out[`ex_${KEY}_r1`]).toBe(previo[`ex_${KEY}_r1`]) // idéntico: ni tocado
    expect(out['ex_w8_d1_r0']).toBe(previo['ex_w8_d1_r0'])
    expect(out[`finished_${KEY}`]).toBeUndefined()
  })

  it('conserva la nota o la sustitución que ya hubiera en un ejercicio no terminado', () => {
    const previo: TrainingLogs = { [`ex_${KEY}_r0`]: { sets: {}, done: false, note: 'me dolía la muñeca', substituteName: 'Press banca con mancuernas' } }
    const out = applyQuickLog(previo, KEY, buildRows({ exercises: [DAY.exercises[0]] }, KEY, previo), '2026-10-25')
    expect(out[`ex_${KEY}_r0`]).toMatchObject({ done: true, note: 'me dolía la muñeca', substituteName: 'Press banca con mancuernas' })
  })

  it('valida repeticiones y pesos antes de guardar', () => {
    expect(validReps('8')).toBe(true); expect(validReps('0')).toBe(false); expect(validReps('')).toBe(false); expect(validReps('8.5')).toBe(false)
    expect(validWeight('')).toBe(true); expect(validWeight('77,5')).toBe(true); expect(validWeight('abc')).toBe(false); expect(validWeight('1000')).toBe(false)
    const rows = buildRows(DAY, KEY, {})
    expect(rowsAreValid(rows)).toBe(true)
    rows[0].reps = ''
    expect(rowsAreValid(rows)).toBe(false)
    rows[0].included = false // lo desmarcado no se valida
    expect(rowsAreValid(rows)).toBe(true)
  })

  it('suma y resta días respetando el cambio de mes y de año', () => {
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-10-25', 0)).toBe('2026-10-25')
  })
})
