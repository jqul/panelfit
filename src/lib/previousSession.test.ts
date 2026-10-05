import { describe, it, expect } from 'vitest'
import { latestPreviousLog } from './previousSession'
import { TrainingLogs } from '../types'

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
