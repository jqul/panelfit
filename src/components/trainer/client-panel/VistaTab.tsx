import { Eye } from 'lucide-react'
import { TrainingPlan, TrainingLogs } from '../../../types'

export function VistaTab({ plan, logs }: { plan: TrainingPlan | null; logs: TrainingLogs }) {
  if (!plan?.weeks?.length) return <div className="text-center py-16 text-muted"><Eye className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="font-serif text-lg">Sin plan asignado</p></div>
  const currentWeek = plan.weeks.find(w => w.isCurrent) || plan.weeks[0]
  const weekIdx = plan.weeks.indexOf(currentWeek)
  return (
    <div className="max-w-2xl space-y-4">
      <div><h3 className="font-serif font-bold text-lg">Vista del cliente</h3><p className="text-xs text-muted mt-0.5">Semana activa: <span className="font-semibold text-ink">{currentWeek.label}</span></p></div>
      {currentWeek.days.map((day, di) => {
        const dayKey = `w${weekIdx}_d${di}`
        const done = day.exercises.filter((_, ri) => logs[`ex_${dayKey}_r${ri}`]?.done).length
        const total = day.exercises.length
        const pct = total ? Math.round(done / total * 100) : 0
        return (
          <div key={di} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${pct === 100 ? 'bg-ok text-white' : 'bg-bg-alt text-muted'}`}>{pct === 100 ? '✓' : `${pct}%`}</div>
              <div className="flex-1"><p className="font-semibold text-sm">{day.title}</p>{day.focus && <p className="text-xs text-muted">{day.focus}</p>}</div>
              <span className="text-xs text-muted">{done}/{total}</span>
            </div>
            <div className="divide-y divide-border">
              {day.exercises.map((ex, ri) => {
                const log = logs[`ex_${dayKey}_r${ri}`]
                return (
                  <div key={ri} className={`flex items-center gap-3 px-4 py-2.5 ${log?.done ? 'opacity-50' : ''}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${log?.done ? 'bg-ok text-white' : 'bg-bg-alt text-muted'}`}>{log?.done ? '✓' : ri + 1}</div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{ex.name}</p><p className="text-xs text-muted">{ex.sets}{ex.weight ? ` · ${ex.weight}` : ''}</p></div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
