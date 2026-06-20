import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import { TrainingPlan, TrainingLogs } from '../../../types'
import { getExName, EmptyState } from './helpers'

export function RMChart({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const estimaciones = useMemo(() => {
    const best: Record<string, { rm: number; peso: number; reps: number; date: string }> = {}
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.done) return
      const name = getExName(key, plan)
      if (!name) return
      Object.values(log.sets || {}).forEach((s: any) => {
        const w = parseFloat(s.weight) || 0; const r = parseInt(s.reps) || 0
        if (!w || !r || r > 15) return
        const rm = Math.round(w * (1 + r / 30) * 10) / 10
        if (!best[name] || rm > best[name].rm) best[name] = { rm, peso: w, reps: r, date: log.dateDone || '' }
      })
    })
    return Object.entries(best).sort((a, b) => b[1].rm - a[1].rm).slice(0, 10)
  }, [logs, plan])

  if (!estimaciones.length) return <EmptyState icon={<TrendingUp className="w-8 h-8 opacity-30" />} text="Sin datos para calcular 1RM" sub="Necesita series con peso y repeticiones" />
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted mb-3">Fórmula Epley: 1RM = peso × (1 + reps/30)</p>
      <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
        {estimaciones.map(([name, { rm, peso, reps, date }], i) => (
          <div key={name} className="flex items-center gap-3 px-4 py-3">
            <span className="text-sm w-6 text-center flex-shrink-0 font-bold text-muted">{i+1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{name}</p>
              <p className="text-[10px] text-muted">{peso}kg × {reps} reps{date ? ` · ${new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}` : ''}</p>
            </div>
            <div className="text-right flex-shrink-0"><p className="text-sm font-bold text-accent">~{rm} kg</p><p className="text-[9px] text-muted uppercase">1RM est.</p></div>
          </div>
        ))}
      </div>
    </div>
  )
}
