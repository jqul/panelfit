import { TrainingLogs, TrainingPlan } from '../types'
import { localDateKey } from './dates'
import { getEffectiveWeekIdx } from './planWeek'

// Interpretación del progreso del cliente en frases y números sencillos (récords
// recientes, cuánto ha subido la fuerza, adherencia, racha), para enseñar la
// conclusión antes que los gráficos. Todo es puro: recibe logs y plan.

export interface SessionBest { name: string; date: string; weight: number; reps: number }
export interface RecordEvent { name: string; date: string; weight: number; reps: number; delta: number }

const KEY_RE = /^ex_w(\d+)_d(\d+)_r(\d+)$/

function exerciseName(key: string, plan: TrainingPlan | null | undefined, substitute?: string): string | null {
  if (substitute) return substitute
  const m = key.match(KEY_RE)
  if (!m || !plan) return null
  return plan.weeks?.[+m[1]]?.days?.[+m[2]]?.exercises?.[+m[3]]?.name || null
}

/** Mejor serie (por peso) de cada ejercicio en cada día entrenado. Ignora peso corporal (peso 0). */
export function collectSessionBests(logs: TrainingLogs, plan?: TrainingPlan | null): SessionBest[] {
  const byKey = new Map<string, SessionBest>()
  for (const [key, log] of Object.entries(logs)) {
    if (!log.done || !log.dateDone) continue
    const name = exerciseName(key, plan, log.substituteName)
    if (!name) continue
    for (const s of Object.values(log.sets || {}) as { weight: string; reps: string }[]) {
      const weight = parseFloat(s.weight) || 0
      if (weight <= 0) continue
      const reps = parseInt(s.reps) || 0
      const k = `${name}|${log.dateDone}`
      const cur = byKey.get(k)
      if (!cur || weight > cur.weight || (weight === cur.weight && reps > cur.reps)) {
        byKey.set(k, { name, date: log.dateDone, weight, reps })
      }
    }
  }
  return [...byKey.values()]
}

/** Cada vez que se superó la marca anterior de un ejercicio (la primera vez que se hace no cuenta como récord). Más recientes primero. */
export function recordHistory(bests: SessionBest[]): RecordEvent[] {
  const byName = new Map<string, SessionBest[]>()
  bests.forEach(b => byName.set(b.name, [...(byName.get(b.name) || []), b]))
  const events: RecordEvent[] = []
  for (const [name, list] of byName) {
    list.sort((a, b) => a.date.localeCompare(b.date))
    let max = 0
    for (const b of list) {
      if (max > 0 && b.weight > max) events.push({ name, date: b.date, weight: b.weight, reps: b.reps, delta: Math.round((b.weight - max) * 10) / 10 })
      max = Math.max(max, b.weight)
    }
  }
  return events.sort((a, b) => b.date.localeCompare(a.date) || b.delta - a.delta)
}

/** El récord más reciente de los últimos `days` días (por defecto 30), o null. Para el "último logro" del inicio. */
export function latestAchievement(bests: SessionBest[], now: Date = new Date(), days = 30): RecordEvent | null {
  const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - days)
  const from = localDateKey(cutoff)
  return recordHistory(bests).find(e => e.date >= from) ?? null
}

/**
 * Variación media de fuerza en los últimos `days` días: por cada ejercicio con al
 * menos dos sesiones en la ventana, compara el peso de la primera con el mejor
 * de la ventana. null si no hay ejercicios comparables.
 */
export function strengthChange(bests: SessionBest[], now: Date = new Date(), days = 56): { pct: number; exercises: number } | null {
  const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - days)
  const from = localDateKey(cutoff)
  const byName = new Map<string, SessionBest[]>()
  bests.filter(b => b.date >= from).forEach(b => byName.set(b.name, [...(byName.get(b.name) || []), b]))
  const changes: number[] = []
  for (const list of byName.values()) {
    if (new Set(list.map(b => b.date)).size < 2) continue
    list.sort((a, b) => a.date.localeCompare(b.date))
    const first = list[0].weight
    const peak = Math.max(...list.map(b => b.weight))
    changes.push(((peak - first) / first) * 100)
  }
  if (!changes.length) return null
  return { pct: Math.round(changes.reduce((a, c) => a + c, 0) / changes.length), exercises: changes.length }
}

/** % de sesiones hechas en los últimos 28 días frente a las que tocaban según el plan. null si no hay plan. */
export function adherence28(plan: TrainingPlan | null | undefined, logs: TrainingLogs, now: Date = new Date()): number | null {
  if (!plan?.weeks?.length) return null
  const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 27)
  const from = localDateKey(cutoff), to = localDateKey(now)
  const days = new Set(Object.values(logs).filter(l => l.done && l.dateDone && l.dateDone >= from && l.dateDone <= to).map(l => l.dateDone))
  const week = plan.weeks[getEffectiveWeekIdx(plan, logs, now)]
  const perWeek = week?.days?.filter(d => d.exercises?.length).length || plan.diasSemana || 3
  return Math.min(100, Math.round((days.size / (perWeek * 4)) * 100))
}

/**
 * Días consecutivos entrenados hasta hoy. Con `countToday` hoy cuenta aunque aún
 * no esté guardado (al terminar la sesión). Con `grace` la racha no se da por
 * rota solo porque hoy todavía no hayas entrenado: sigue viva con lo de ayer
 * hasta que acabe el día (si no, marcaría 0 cada mañana).
 */
export function streakDays(logs: TrainingLogs, now: Date = new Date(), countToday = false, grace = false): number {
  const dates = new Set(Object.values(logs).filter(l => l.done && l.dateDone).map(l => l.dateDone!))
  if (countToday) dates.add(localDateKey(now))
  let streak = 0
  const d = new Date(now)
  if (grace && !dates.has(localDateKey(d))) d.setDate(d.getDate() - 1)
  while (dates.has(localDateKey(d))) { streak++; d.setDate(d.getDate() - 1) }
  return streak
}
