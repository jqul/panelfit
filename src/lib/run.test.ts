import { describe, it, expect } from 'vitest'
import { formatDuration, parseDuration, paceSecPerKm, formatPace, formatDistance, runLabel, summarizeRunSessions } from './run'

describe('formatDuration / parseDuration', () => {
  it('formatea m:ss y h:mm:ss', () => {
    expect(formatDuration(95)).toBe('1:35')
    expect(formatDuration(720)).toBe('12:00')
    expect(formatDuration(3725)).toBe('1:02:05')
  })
  it('lee m:ss, segundos sueltos y descarta lo inválido', () => {
    expect(parseDuration('1:35')).toBe(95)
    expect(parseDuration('95')).toBe(95)
    expect(parseDuration('12:00')).toBe(720)
    expect(parseDuration('')).toBeUndefined()
    expect(parseDuration('abc')).toBeUndefined()
    expect(parseDuration('0:00')).toBeUndefined()
  })
})

describe('ritmo y distancia', () => {
  it('calcula el ritmo en min/km', () => {
    expect(paceSecPerKm(60, 200)).toBe(300) // 200 m en 1:00 → 5:00 /km
    expect(formatPace(300)).toBe('5:00 /km')
    expect(formatPace(paceSecPerKm(0, 200))).toBe('—')
  })
  it('formatea metros y kilómetros', () => {
    expect(formatDistance(200)).toBe('200 m')
    expect(formatDistance(2400)).toBe('2,4 km')
  })
})

describe('runLabel', () => {
  it('describe tiradas con recuperación, continuas y tests', () => {
    expect(runLabel({ reps: 6, distanceM: 200, recoveryM: 100 })).toBe('6 × 200 m · rec 100 m andando')
    expect(runLabel({ reps: 1, distanceM: 2000 })).toBe('2 km seguidos')
    expect(runLabel({ reps: 1, distanceM: 0, durationSec: 720 })).toContain('Test 12:00')
  })
})

describe('summarizeRunSessions', () => {
  it('suma distancia por día y calcula el ritmo solo con series con tiempo', () => {
    const logs = {
      ex_w0_d1_r5: { done: true, dateDone: '2026-09-24', sets: {
        0: { weight: '', reps: '1', distanceM: 200, timeSec: 60 },
        1: { weight: '', reps: '1', distanceM: 200, timeSec: 60 },
        2: { weight: '', reps: '1', distanceM: 200 }, // sin tiempo: suma distancia pero no ritmo
      } },
      ex_w0_d1_r0: { done: true, dateDone: '2026-09-24', sets: { 0: { weight: '100', reps: '5' } } }, // fuerza: se ignora
    }
    const [s] = summarizeRunSessions(logs)
    expect(s.distanceM).toBe(600)
    expect(s.paceSecPerKm).toBe(300)
    expect(s.isTest).toBe(false)
  })
  it('ignora para el ritmo los tiempos imposibles pero suma la distancia', () => {
    const logs = { ex_w0_d1_r5: { done: true, dateDone: '2026-09-24', sets: {
      0: { weight: '', reps: '1', distanceM: 400, timeSec: 150 },
      1: { weight: '', reps: '1', distanceM: 400, timeSec: 3 }, // cronómetro pulsado sin querer
    } } }
    const [s] = summarizeRunSessions(logs)
    expect(s.distanceM).toBe(800)
    expect(s.paceSecPerKm).toBe(375) // solo cuenta la primera tirada (2:30 los 400 m)
  })
  it('marca los tests', () => {
    const logs = { ex_w0_d0_r0: { done: true, dateDone: '2026-09-25', sets: { 0: { weight: '', reps: '1', distanceM: 2800, timeSec: 720, isTest: true } } } }
    expect(summarizeRunSessions(logs)[0].isTest).toBe(true)
  })
  it('sin carreras devuelve vacío', () => {
    expect(summarizeRunSessions({})).toEqual([])
  })
})
