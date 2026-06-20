import { TrainingLogs } from '../types'

export interface Badge {
  id: string
  emoji: string
  label: string
  threshold: number
}

export const STREAK_BADGES: Badge[] = [
  { id: 'streak_3', emoji: '🔥', label: '3 días seguidos', threshold: 3 },
  { id: 'streak_7', emoji: '🔥', label: '1 semana seguida', threshold: 7 },
  { id: 'streak_30', emoji: '🏅', label: '1 mes seguido', threshold: 30 },
  { id: 'streak_100', emoji: '👑', label: '100 días seguidos', threshold: 100 },
]

export const SESSION_BADGES: Badge[] = [
  { id: 'sessions_10', emoji: '🎯', label: '10 sesiones', threshold: 10 },
  { id: 'sessions_50', emoji: '⭐', label: '50 sesiones', threshold: 50 },
  { id: 'sessions_100', emoji: '🏆', label: '100 sesiones', threshold: 100 },
  { id: 'sessions_250', emoji: '💎', label: '250 sesiones', threshold: 250 },
]

function calcMaxStreak(dates: string[]): number {
  if (!dates.length) return 0
  let maxRacha = 0, tempRacha = 1
  for (let i = 1; i < dates.length; i++) {
    const diff = (new Date(dates[i] + 'T00:00:00').getTime() - new Date(dates[i - 1] + 'T00:00:00').getTime()) / 86400000
    if (diff === 1) { tempRacha++; maxRacha = Math.max(maxRacha, tempRacha) } else tempRacha = 1
  }
  return Math.max(maxRacha, tempRacha)
}

export interface BadgeProgress {
  earned: Badge[]
  nextStreak: { badge: Badge; current: number } | null
  nextSessions: { badge: Badge; current: number } | null
  totalSessions: number
  maxStreak: number
}

export function getBadgeProgress(logs: TrainingLogs): BadgeProgress {
  const dates = [...new Set(Object.values(logs).filter(l => l.done && l.dateDone).map(l => l.dateDone as string))].sort()
  const totalSessions = dates.length
  const maxStreak = calcMaxStreak(dates)

  const earned = [
    ...STREAK_BADGES.filter(b => maxStreak >= b.threshold),
    ...SESSION_BADGES.filter(b => totalSessions >= b.threshold),
  ]

  const nextStreakBadge = STREAK_BADGES.find(b => maxStreak < b.threshold) || null
  const nextSessionsBadge = SESSION_BADGES.find(b => totalSessions < b.threshold) || null

  return {
    earned,
    nextStreak: nextStreakBadge ? { badge: nextStreakBadge, current: maxStreak } : null,
    nextSessions: nextSessionsBadge ? { badge: nextSessionsBadge, current: totalSessions } : null,
    totalSessions,
    maxStreak,
  }
}
