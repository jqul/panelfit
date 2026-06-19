import { ClipboardList, CheckCircle2, Dumbbell } from 'lucide-react'
import { TrainingPlan, TrainingLogs, LogSet } from '../../../types'

export function EntrenosTab({ logs, plan }: { logs: TrainingLogs; plan: TrainingPlan | null }) {
  const byDate: Record<string, { exName: string; sets: Record<number, LogSet>; key: string }[]> = {}
  Object.entries(logs).forEach(([key, log]) => {
    if (!log.dateDone) return
    const m = key.match(/ex_w(\d+)_d(\d+)_r(\d+)/)
    if (!m) return
    const wi = parseInt(m[1]), di = parseInt(m[2]), ri = parseInt(m[3])
    const exName = plan?.weeks?.[wi]?.days?.[di]?.exercises?.[ri]?.name || key
    if (!byDate[log.dateDone]) byDate[log.dateDone] = []
    byDate[log.dateDone].push({ exName, sets: log.sets, key })
  })
  const dates = Object.keys(byDate).sort().reverse()
  if (!dates.length) return <div className="text-center py-16 text-muted"><ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="font-serif text-lg">Sin entrenamientos aún</p></div>
  return (
    <div className="max-w-2xl space-y-4">
      <div><h3 className="font-serif font-bold text-lg">Historial</h3><p className="text-xs text-muted">{dates.length} días con actividad</p></div>
      {dates.map(fecha => (
        <div key={fecha} className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-bg-alt/30">
            <CheckCircle2 className="w-4 h-4 text-ok flex-shrink-0" />
            <p className="text-sm font-semibold capitalize flex-1">{new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <span className="text-xs text-muted">{byDate[fecha].length} ejercicios</span>
          </div>
          <div className="divide-y divide-border">
            {byDate[fecha].map(({ exName, sets, key }) => {
              const setsArr = Object.values(sets || {})
              const mejor = setsArr.reduce((max, s) => Math.max(max, parseFloat(s.weight) || 0), 0)
              return (
                <div key={key} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-bg flex items-center justify-center flex-shrink-0"><Dumbbell className="w-3.5 h-3.5 text-muted" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{exName}</p>
                    <div className="flex gap-1.5 mt-0.5 flex-wrap">{setsArr.map((s, si) => <span key={si} className="text-[9px] bg-bg-alt text-muted px-1.5 py-0.5 rounded">{s.weight}kg×{s.reps}</span>)}</div>
                  </div>
                  {mejor > 0 && <div className="text-right flex-shrink-0"><p className="text-xs font-bold text-accent">{mejor}kg</p><p className="text-[9px] text-muted">mejor</p></div>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
