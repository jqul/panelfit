import { describe, it, expect } from 'vitest'
import { computeTrainingSignal, computeReadinessSignal, combineRisk, computeACWR, computeSessionLoadACWR, worseAcwr } from './loadRisk'
import { TrainingLogs } from '../types'

function logWithRir(dateDone: string, rir: number, weight = 100, reps = 5): TrainingLogs[string] {
  return { sets: { 0: { weight: String(weight), reps: String(reps), rir } }, done: true, dateDone }
}

describe('computeTrainingSignal', () => {
  it('reports no data when nothing is logged', () => {
    expect(computeTrainingSignal({}).hasData).toBe(false)
  })

  it('averages RIR for the current week', () => {
    const today = new Date().toISOString().split('T')[0]
    const logs: TrainingLogs = { a: logWithRir(today, 4), b: logWithRir(today, 2) }
    const s = computeTrainingSignal(logs)
    expect(s.hasData).toBe(true)
    expect(s.avgRirThis).toBe(3)
  })
})

describe('computeReadinessSignal', () => {
  it('reports no data with an empty list', () => {
    expect(computeReadinessSignal([]).hasData).toBe(false)
  })

  it('averages each metric', () => {
    const rows = [
      { sleep: 4, soreness: 3, stress: 2, motivation: 5 },
      { sleep: 2, soreness: 1, stress: 4, motivation: 3 },
    ]
    const s = computeReadinessSignal(rows)
    expect(s.avgSleep).toBe(3)
    expect(s.avgSoreness).toBe(2)
    expect(s.avgStress).toBe(3)
    expect(s.avgMotivation).toBe(4)
  })
})

describe('computeACWR', () => {
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  it('reports no data with empty logs', () => {
    expect(computeACWR({}).hasData).toBe(false)
  })

  it('returns ratio 1 when acute load equals chronic load', () => {
    const today = new Date('2026-06-22T00:00:00Z')
    const logs: TrainingLogs = {}
    for (let i = 0; i < 28; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i)
      logs[`d${i}`] = logWithRir(fmt(d), 3, 100, 5) // 500 tonnage/día todos los días
    }
    const acwr = computeACWR(logs, today)
    expect(acwr.acute).toBe(500)
    expect(acwr.chronic).toBe(500)
    expect(acwr.ratio).toBe(1)
  })

  it('does not inflate the ratio for a brand-new client with less than 28 days of history', () => {
    const today = new Date('2026-06-22T00:00:00Z')
    const logs: TrainingLogs = {}
    for (let i = 0; i < 7; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i)
      logs[`d${i}`] = logWithRir(fmt(d), 3, 100, 5) // 500 tonnage/día, primeros 7 días del cliente
    }
    const acwr = computeACWR(logs, today)
    // Sin acortar la ventana crónica a los días reales de historial, esto saldría ~4x inflado.
    expect(acwr.ratio).toBe(1)
  })

  it('smooths the old "step effect" — a spike from 8 days ago (just past a naive 7-day window) still shows up, decayed', () => {
    const today = new Date('2026-06-22T00:00:00Z')
    const logs: TrainingLogs = {}
    // Carga base los 20 días antes del pico
    for (let i = 9; i <= 28; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i)
      logs[`base${i}`] = logWithRir(fmt(d), 3, 60, 5) // 300 tonelaje/día
    }
    // Pico de carga hace 8 días — con una media móvil de 7 días esto ya no
    // contaría NADA en el agudo (fuera de la ventana). Con EWMA su influencia
    // decae de forma gradual en vez de desaparecer de golpe.
    const spikeDate = new Date(today); spikeDate.setDate(today.getDate() - 8)
    logs['spike'] = logWithRir(fmt(spikeDate), 0, 300, 10) // 3000 tonelaje ese día
    // Días 0-7 sin entrenar, para aislar el efecto de ese único pico.
    const acwr = computeACWR(logs, today)
    expect(acwr.acute).toBeGreaterThan(0)
  })

  it('flags a spike when recent load is much higher than the chronic average', () => {
    const today = new Date('2026-06-22T00:00:00Z')
    const logs: TrainingLogs = {}
    for (let i = 7; i < 28; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i)
      logs[`old${i}`] = logWithRir(fmt(d), 3, 50, 5) // carga base baja
    }
    for (let i = 0; i < 7; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i)
      logs[`new${i}`] = logWithRir(fmt(d), 1, 200, 10) // pico reciente
    }
    const acwr = computeACWR(logs, today)
    expect(acwr.ratio).not.toBeNull()
    expect(acwr.ratio as number).toBeGreaterThan(1.5)
  })
})

describe('computeSessionLoadACWR', () => {
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  it('reports no data with no sessions', () => {
    expect(computeSessionLoadACWR([]).hasData).toBe(false)
  })

  it('flags a spike from sRPE alone, even with zero tonnage — the whole point for field/track work', () => {
    const today = new Date('2026-06-22T00:00:00Z')
    const rows = []
    for (let i = 7; i < 28; i += 2) {
      const d = new Date(today); d.setDate(today.getDate() - i)
      rows.push({ date: fmt(d), duration_min: 45, rpe: 5 }) // carga base moderada
    }
    for (let i = 0; i < 6; i += 2) {
      const d = new Date(today); d.setDate(today.getDate() - i)
      rows.push({ date: fmt(d), duration_min: 90, rpe: 9 }) // pico reciente (sprints)
    }
    const acwr = computeSessionLoadACWR(rows, today)
    expect(acwr.ratio).not.toBeNull()
    expect(acwr.ratio as number).toBeGreaterThan(1.5)
    expect(acwr.source).toBe('sRPE')
  })
})

describe('worseAcwr', () => {
  it('picks whichever ratio is further from 1 (the "óptima" center)', () => {
    const calm = { acute: 100, chronic: 100, ratio: 1.05, hasData: true, source: 'tonelaje' as const }
    const spiking = { acute: 500, chronic: 200, ratio: 2.5, hasData: true, source: 'sRPE' as const }
    expect(worseAcwr(calm, spiking)).toBe(spiking)
    expect(worseAcwr(spiking, calm)).toBe(spiking)
  })

  it('falls back to whichever signal actually has data', () => {
    const noData = { acute: 0, chronic: 0, ratio: null, hasData: false }
    const withData = { acute: 100, chronic: 100, ratio: 1.05, hasData: true, source: 'tonelaje' as const }
    expect(worseAcwr(noData, withData)).toBe(withData)
    expect(worseAcwr(withData, noData)).toBe(withData)
  })
})

describe('combineRisk', () => {
  const noTraining = { avgRirThis: null, avgRirLast: null, volChangePct: null, sesionesThisWeek: 0, hasData: false }
  const noReadiness = { avgSleep: null, avgSoreness: null, avgStress: null, avgMotivation: null, hasData: false }

  it('is low risk with no signals', () => {
    expect(combineRisk(noTraining, noReadiness).level).toBe('bajo')
  })

  it('escalates to alto when RIR is very low', () => {
    const r = combineRisk({ ...noTraining, avgRirThis: 1, hasData: true }, noReadiness)
    expect(r.level).toBe('alto')
    expect(r.reasons.length).toBeGreaterThan(0)
  })

  it('escalates to alto from poor sleep alone, even with fine training data', () => {
    const r = combineRisk({ ...noTraining, avgRirThis: 4, hasData: true }, { ...noReadiness, avgSleep: 1, hasData: true })
    expect(r.level).toBe('alto')
  })

  it('escalates to moderado on volume spike', () => {
    const r = combineRisk({ ...noTraining, volChangePct: 40, hasData: true }, noReadiness)
    expect(r.level).toBe('moderado')
  })

  it('escalates to alto when ACWR ratio exceeds 1.5', () => {
    const r = combineRisk(noTraining, noReadiness, { acute: 800, chronic: 500, ratio: 1.6, hasData: true })
    expect(r.level).toBe('alto')
  })

  it('does not downgrade an alto level once escalated', () => {
    const r = combineRisk(
      { ...noTraining, avgRirThis: 1, hasData: true },
      { ...noReadiness, avgMotivation: 1, hasData: true }
    )
    expect(r.level).toBe('alto')
  })
})
