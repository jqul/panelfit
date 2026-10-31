import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { TrainingPlan, TrainingLogs } from '../../../types'
import { getExName, getMuscleGroup, useLibraryMuscleMap } from './helpers'
import { contarSeries } from '../../../lib/seriesEfectivas'
import { equilibrio, MINIMO_SERIES, type Patron } from '../../../lib/equilibrio'
import { localDateKey } from '../../../lib/dates'

const PATRONES: { id: Patron; label: string; color: string }[] = [
  { id: 'empuje', label: 'Empuje', color: '#6e5438' },
  { id: 'tiron', label: 'Tirón', color: '#4caf7d' },
  { id: 'pierna', label: 'Pierna', color: '#e0a854' },
]

export function DistribucionChart({ logs, plan, library }: { logs: TrainingLogs; plan?: TrainingPlan | null; library?: { name: string; category?: string }[] }) {
  const libraryMap = useLibraryMuscleMap(library)
  // Series por grupo (sin calentamientos): de siempre, para la distribución, y de las últimas 4 semanas, para el equilibrio
  const { data, eq } = useMemo(() => {
    const hace28 = new Date(); hace28.setDate(hace28.getDate() - 27)
    const desde = localDateKey(hace28)
    const counts: Record<string, number> = {}
    const recientes: Record<string, number> = {}
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.done) return
      const name = getExName(key, plan, log)
      if (!name) return
      const g = getMuscleGroup(name, libraryMap)
      const n = contarSeries(Object.values(log.sets || {})).todas || 1
      counts[g] = (counts[g] || 0) + n
      if (log.dateDone && log.dateDone >= desde) recientes[g] = (recientes[g] || 0) + n
    })
    return {
      data: Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value })),
      eq: equilibrio(recientes),
    }
  }, [logs, plan, libraryMap])

  if (!data.length) return <div className="text-center py-8 text-muted text-sm">Sin datos de ejercicios aún</div>
  const total = data.reduce((a, d) => a + d.value, 0)
  const COLORS = ['#6e5438','#4caf7d','#e0a854','#e07b54','#3b82f6','#8b5cf6','#ec4899','#64748b','#06b6d4']
  const totalEq = eq ? eq.series.empuje + eq.series.tiron + eq.series.pierna : 0
  return (
    <div className="space-y-3">
      {/* Equilibrio empuje / tirón / pierna de las últimas 4 semanas */}
      <div className="p-3 rounded-xl bg-bg-alt/50 space-y-2" aria-label="Equilibrio empuje, tirón y pierna">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Equilibrio · últimas 4 semanas</p>
        {!eq ? (
          <p className="text-xs text-muted">Hacen falta al menos {MINIMO_SERIES} series de empuje, tirón o pierna en las últimas 4 semanas.</p>
        ) : (<>
          <div className="flex h-2.5 rounded-full overflow-hidden" aria-hidden>
            {PATRONES.map(p => <div key={p.id} style={{ width: `${(eq.series[p.id] / totalEq) * 100}%`, backgroundColor: p.color }} />)}
          </div>
          <div className="flex justify-between text-xs">
            {PATRONES.map(p => (
              <span key={p.id} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="font-semibold">{p.label}</span> {eq.series[p.id]}
              </span>
            ))}
          </div>
          {eq.avisos.length === 0
            ? <p className="text-xs text-ok font-semibold">Equilibrado{eq.ratio !== null ? ` (empuje:tirón ${eq.ratio.toLocaleString('es-ES')}:1)` : ''}.</p>
            : eq.avisos.map(a => <p key={a} className="text-xs text-warn font-semibold flex items-start gap-1"><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" /> {a}</p>)}
        </>)}
      </div>

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
      <p className="text-[11px] text-muted pt-1">Basado en {total} series registradas</p>
    </div>
  )
}
