import { describe, it, expect } from 'vitest'
import { getBadgeProgress } from './badges'
import { TrainingLogs } from '../types'

function logsFromDates(dates: string[]): TrainingLogs {
  const logs: TrainingLogs = {}
  dates.forEach((d, i) => { logs[`ex_w0_d0_r${i}`] = { sets: {}, done: true, dateDone: d } })
  return logs
}

describe('getBadgeProgress', () => {
  it('returns no earned badges with no sessions', () => {
    const p = getBadgeProgress({})
    expect(p.earned).toEqual([])
    expect(p.totalSessions).toBe(0)
    expect(p.maxStreak).toBe(0)
  })

  it('earns the 3-day streak badge for 3 consecutive days', () => {
    const p = getBadgeProgress(logsFromDates(['2026-01-01', '2026-01-02', '2026-01-03']))
    expect(p.maxStreak).toBe(3)
    expect(p.earned.some(b => b.id === 'streak_3')).toBe(true)
    expect(p.earned.some(b => b.id === 'streak_7')).toBe(false)
  })

  it('does not count non-consecutive days toward a streak', () => {
    const p = getBadgeProgress(logsFromDates(['2026-01-01', '2026-01-03', '2026-01-05']))
    expect(p.maxStreak).toBe(1)
  })

  it('earns session-count badges based on total distinct training days', () => {
    const dates = Array.from({ length: 10 }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`)
    const p = getBadgeProgress(logsFromDates(dates))
    expect(p.totalSessions).toBe(10)
    expect(p.earned.some(b => b.id === 'sessions_10')).toBe(true)
  })

  it('reports the next upcoming badge with current progress', () => {
    const p = getBadgeProgress(logsFromDates(['2026-01-01', '2026-01-02']))
    expect(p.nextStreak?.badge.id).toBe('streak_3')
    expect(p.nextStreak?.current).toBe(2)
  })
})
