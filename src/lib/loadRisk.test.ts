import { describe, it, expect } from 'vitest'
import { computeTrainingSignal, computeReadinessSignal, combineRisk } from './loadRisk'
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

  it('does not downgrade an alto level once escalated', () => {
    const r = combineRisk(
      { ...noTraining, avgRirThis: 1, hasData: true },
      { ...noReadiness, avgMotivation: 1, hasData: true }
    )
    expect(r.level).toBe('alto')
  })
})
