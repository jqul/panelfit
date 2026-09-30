import { useMemo } from 'react'
import { TrainingPlan, TrainingLogs } from '../../../types'
import { getExName } from './helpers'

export function RecordsTable({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const records = useMemo(() => {
    const r: Record<string, { best: number; date: string; reps: string }> = {}
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.done) return
      const name = getExName(key, plan)
      if (!name) return
      Object.values(log.sets || {}).forEach((s: any) => {
        const w = parseFloat(s.weight) || 0
        if (!r[name] || w > r[name].best) r[name] = { best: w, date: log.dateDone || '', reps: s.reps || '?' }
      })
    })
    return Object.entries(r).filter(([, v]) => v.best > 0).sort((a, b) => b[1].best - a[1].best)
  }, [logs, plan])

  if (!records.length) return <div className="text-center py-8 text-muted text-sm">Sin marcas personales registradas aún</div>
  return (
    <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
      {records.map(([name, rec], i) => (
        <div key={name} className="flex items-center gap-3 px-4 py-2.5">
          <span className="text-sm w-6 text-center flex-shrink-0">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-xs text-muted">{i+1}</span>}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{name}</p>
            {rec.date && <p className="text-[10px] text-muted">{new Date(rec.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
          </div>
          <div className="text-right flex-shrink-0"><p className="text-sm font-bold text-accent">{rec.best} kg</p><p className="text-[10px] text-muted">×{rec.reps}</p></div>
        </div>
      ))}
    </div>
  )
}
