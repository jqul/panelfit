import { RunSpec, TrainingLogs } from '../types'

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
    : `${m}:${String(r).padStart(2, '0')}`
}

/** "1:35" → 95, "95" → 95 (sin dos puntos se entienden segundos). undefined si no es válido. */
export function parseDuration(text: string): number | undefined {
  const t = text.trim().replace(',', '.')
  if (!t) return undefined
  if (!t.includes(':')) {
    const n = parseFloat(t)
    return isNaN(n) || n <= 0 ? undefined : Math.round(n)
  }
  const parts = t.split(':').map(p => parseInt(p, 10))
  if (parts.some(isNaN) || parts.length > 3) return undefined
  const sec = parts.reduce((acc, p) => acc * 60 + p, 0)
  return sec > 0 ? sec : undefined
}

export function paceSecPerKm(timeSec: number, distanceM: number): number | null {
  if (!timeSec || !distanceM) return null
  return (timeSec / distanceM) * 1000
}

export function formatPace(secPerKm: number | null): string {
  return secPerKm === null ? '—' : `${formatDuration(secPerKm)} /km`
}

export function formatDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} km`
  return `${Math.round(m)} m`
}

/** "6 × 200 m · rec 100 m" — para el editor y como nombre por defecto. */
export function runLabel(run: RunSpec): string {
  if (run.durationSec) return `Test ${formatDuration(run.durationSec)} · máxima distancia`
  if (run.reps <= 1) return `${formatDistance(run.distanceM)} seguidos`
  const rec = run.recoveryM ? ` · rec ${formatDistance(run.recoveryM)} andando` : ''
  return `${run.reps} × ${formatDistance(run.distanceM)}${rec}`
}

export const runDefaultName = (run: RunSpec) => `Pista: ${runLabel(run)}`

export interface RunSession {
  date: string
  distanceM: number
  timeSec: number
  paceSecPerKm: number | null
  isTest: boolean
}

/**
 * Sesiones de carrera a partir de los registros: cualquier serie con
 * distanceM cuenta (no hace falta mirar el plan, así el historial no se rompe
 * si el entrenador cambia el ejercicio después). El ritmo solo usa las series
 * que tienen distancia Y tiempo.
 */
export function summarizeRunSessions(logs: TrainingLogs): RunSession[] {
  const byDate: Record<string, { dist: number; distTimed: number; time: number; test: boolean }> = {}
  Object.entries(logs).forEach(([key, log]) => {
    if (!key.startsWith('ex_') || !log.dateDone) return
    Object.values(log.sets || {}).forEach(s => {
      if (!s.distanceM) return
      const d = (byDate[log.dateDone!] ||= { dist: 0, distTimed: 0, time: 0, test: false })
      d.dist += s.distanceM
      // Un tiempo imposible (0:03 en 400 m por un cronómetro pulsado sin querer)
      // sumaría distancia pero no debe falsear el ritmo: fuera de 2:20-25:00 /km se ignora.
      const p = s.timeSec ? paceSecPerKm(s.timeSec, s.distanceM) : null
      if (p !== null && p >= 140 && p <= 1500) { d.distTimed += s.distanceM; d.time += s.timeSec! }
      if (s.isTest) d.test = true
    })
  })
  return Object.entries(byDate)
    .map(([date, d]) => ({
      date, distanceM: d.dist, timeSec: d.time,
      paceSecPerKm: paceSecPerKm(d.time, d.distTimed), isTest: d.test,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
