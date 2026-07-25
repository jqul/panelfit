import { useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import { TrainingPlan, TrainingLogs } from '../../../types'
import { getExName, EmptyState } from './helpers'

function monthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  const label = new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

interface MonthStats { sessions: number; volume: number; sets: number; prs: number }

export function MonthlyRecap({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const { thisMonth, lastMonth, thisKey, lastKey } = useMemo(() => {
    const now = new Date()
    const thisKey = monthKey(now)
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastKey = monthKey(lastMonthDate)

    const entries = Object.entries(logs)
      .filter(([, log]) => log.done && log.dateDone)
      .map(([key, log]) => ({ key, log, date: new Date(log.dateDone + 'T00:00:00'), name: getExName(key, plan) || key }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    const byMonth: Record<string, MonthStats & { sessionDates: Set<string> }> = {}
    const runningMax: Record<string, number> = {}

    entries.forEach(({ log, date, name }) => {
      const mk = monthKey(date)
      if (!byMonth[mk]) byMonth[mk] = { sessions: 0, volume: 0, sets: 0, prs: 0, sessionDates: new Set() }
      const bucket = byMonth[mk]
      bucket.sessionDates.add(log.dateDone!)
      const setsArr = Object.values(log.sets || {})
      bucket.sets += setsArr.length
      let maxWeightHere = 0
      setsArr.forEach((s: any) => {
        const w = parseFloat(s.weight) || 0
        const r = parseInt(s.reps) || 0
        bucket.volume += w * r
        if (w > maxWeightHere) maxWeightHere = w
      })
      const prevBest = runningMax[name] || 0
      if (maxWeightHere > 0 && maxWeightHere > prevBest) {
        bucket.prs += 1
        runningMax[name] = maxWeightHere
      }
    })

    const finalize = (mk: string): MonthStats => {
      const b = byMonth[mk]
      return b ? { sessions: b.sessionDates.size, volume: Math.round(b.volume), sets: b.sets, prs: b.prs } : { sessions: 0, volume: 0, sets: 0, prs: 0 }
    }

    return { thisMonth: finalize(thisKey), lastMonth: finalize(lastKey), thisKey, lastKey }
  }, [logs, plan])

  const hasAnyData = thisMonth.sessions > 0 || lastMonth.sessions > 0
  if (!hasAnyData) return <EmptyState icon={<CalendarDays className="w-8 h-8 opacity-30" />} text="Sin datos suficientes" sub="Necesita entrenos registrados este mes o el anterior" />

  const stats: { key: keyof MonthStats; label: string; unit: string }[] = [
    { key: 'sessions', label: 'Entrenos', unit: '' },
    { key: 'volume', label: 'Volumen total', unit: 'kg' },
    { key: 'sets', label: 'Series', unit: '' },
    { key: 'prs', label: 'Récords', unit: '' },
  ]

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted -mt-1">{monthLabel(thisKey)} vs. {monthLabel(lastKey)}</p>
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ key, label, unit }) => {
          const cur = thisMonth[key]
          const prev = lastMonth[key]
          const diff = cur - prev
          return (
            <div key={key} className="bg-bg rounded-xl p-4 text-center">
              <p className="text-2xl font-serif font-bold text-ink">{cur.toLocaleString()}{unit && ` ${unit}`}</p>
              <p className="text-[9px] text-muted uppercase tracking-wider mt-1">{label}</p>
              {prev > 0 || cur > 0 ? (
                <p className={`text-[10px] font-bold mt-1.5 ${diff > 0 ? 'text-ok' : diff < 0 ? 'text-warn' : 'text-muted'}`}>
                  {diff > 0 ? '↑' : diff < 0 ? '↓' : '='} {Math.abs(diff).toLocaleString()}{unit} vs. mes anterior
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-muted">Récords = nº de veces que se superó la mejor marca histórica de un ejercicio ese mes.</p>
    </div>
  )
}
