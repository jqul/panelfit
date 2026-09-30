import { useMemo } from 'react'
import { TrainingPlan, TrainingLogs } from '../../../types'
import { getExName, getMuscleGroup, useLibraryMuscleMap } from './helpers'

export function DistribucionChart({ logs, plan, library }: { logs: TrainingLogs; plan?: TrainingPlan | null; library?: { name: string; category?: string }[] }) {
  const libraryMap = useLibraryMuscleMap(library)
  const data = useMemo(() => {
    const counts: Record<string, number> = {}
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.done) return
      const name = getExName(key, plan)
      if (!name) return
      const g = getMuscleGroup(name, libraryMap)
      counts[g] = (counts[g] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
  }, [logs, plan, libraryMap])

  if (!data.length) return <div className="text-center py-8 text-muted text-sm">Sin datos de ejercicios aún</div>
  const total = data.reduce((a, d) => a + d.value, 0)
  const COLORS = ['#6e5438','#4caf7d','#e0a854','#e07b54','#3b82f6','#8b5cf6','#ec4899','#64748b','#06b6d4']
  return (
    <div className="space-y-3">
      {data.map(({ name, value }, i) => {
        const pct = Math.round((value / total) * 100)
        return (
          <div key={name} className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-xs font-semibold">{name}</p>
                <p className="text-xs text-muted">{value} series · {pct}%</p>
              </div>
              <div className="h-1.5 bg-bg-alt rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
              </div>
            </div>
          </div>
        )
      })}
      <p className="text-[10px] text-muted pt-1">Basado en {total} series registradas</p>
    </div>
  )
}
