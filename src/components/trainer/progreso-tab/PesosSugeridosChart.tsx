import { useMemo } from 'react'
import { Zap } from 'lucide-react'
import { TrainingPlan, TrainingLogs } from '../../../types'
import { getExName, EmptyState } from './helpers'

const RIR_SUGGESTION_PCT: Record<number, { pct: number; label: string; color: string }> = {
  0: { pct: -5,  label: 'Bajar peso', color: '#ef4444' },
  1: { pct: -2.5, label: 'Bajar ligero', color: '#f97316' },
  2: { pct: 0,   label: 'Mantener', color: '#f59e0b' },
  3: { pct: 0,   label: 'Mantener', color: '#eab308' },
  4: { pct: 2.5, label: 'Subir ligero', color: '#84cc16' },
  5: { pct: 5,   label: 'Subir peso', color: '#22c55e' },
}

export function PesosSugeridosChart({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const sugeridos = useMemo(() => {
    const lastByExercise: Record<string, { weight: number; reps: string; rir?: number; date: string }> = {}
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.done || !log.dateDone) return
      const name = getExName(key, plan)
      if (!name) return
      const setsArr = Object.values(log.sets || {})
      if (!setsArr.length) return
      // Tomar el set con mayor peso de esa sesión
      const best = setsArr.reduce((max, s) => (parseFloat(s.weight) || 0) > (parseFloat(max.weight) || 0) ? s : max, setsArr[0])
      const w = parseFloat(best.weight) || 0
      if (!w) return
      if (!lastByExercise[name] || log.dateDone > lastByExercise[name].date) {
        lastByExercise[name] = { weight: w, reps: best.reps || '', rir: best.rir, date: log.dateDone }
      }
    })
    return Object.entries(lastByExercise)
      .filter(([, v]) => v.rir !== undefined)
      .map(([name, v]) => {
        const suggestion = RIR_SUGGESTION_PCT[v.rir as number] || RIR_SUGGESTION_PCT[3]
        const suggestedWeight = Math.round((v.weight * (1 + suggestion.pct / 100)) * 4) / 4 // redondeo a 0.25kg
        return { name, ...v, suggestion, suggestedWeight }
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [logs, plan])

  if (!sugeridos.length) return (
    <EmptyState icon={<Zap className="w-8 h-8 opacity-30" />} text="Sin datos de RIR registrados aún"
      sub="El cliente debe indicar el RIR (repeticiones en reserva) al marcar cada serie" />
  )

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted mb-3">Sugerencia automática basada en el RIR de la última sesión de cada ejercicio</p>
      <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
        {sugeridos.map(({ name, weight, reps, rir, suggestion, suggestedWeight, date }) => (
          <div key={name} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{name}</p>
              <p className="text-[10px] text-muted">Último: {weight}kg × {reps} · RIR {rir} · {new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold" style={{ color: suggestion.color }}>{suggestedWeight} kg</p>
              <p className="text-[9px] font-semibold" style={{ color: suggestion.color }}>{suggestion.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
