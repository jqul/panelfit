import { useState } from 'react'
import { ChevronDown, ChevronUp, Play, Video, Dumbbell } from 'lucide-react'
import { TrainingPlan, TrainingLogs } from '../../types'
import { ActiveWorkout } from './ActiveWorkout'
import { VideoModal } from './VideoModal'

interface Props {
  plan: TrainingPlan
  logs: TrainingLogs
  onLogsChange: (logs: TrainingLogs) => void
}

function getYTId(url: string) {
  const m = url?.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

export function TrainingPlanView({ plan, logs, onLogsChange }: Props) {
  const [activeWorkout, setActiveWorkout] = useState<{ weekIdx: number; dayIdx: number } | null>(null)
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({})
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  const currentWeek = plan.weeks?.find(w => w.isCurrent) || plan.weeks?.[0]
  const weekIdx = plan.weeks?.indexOf(currentWeek) ?? 0

  if (activeWorkout) return (
    <ActiveWorkout
      plan={plan}
      weekIdx={activeWorkout.weekIdx}
      dayIdx={activeWorkout.dayIdx}
      logs={logs}
      onLogsChange={onLogsChange}
      onFinish={() => setActiveWorkout(null)}
    />
  )

  if (!currentWeek) return (
    <div className="p-8 text-center text-muted">
      <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-serif text-lg">Sin plan asignado</p>
      <p className="text-sm mt-1">Tu entrenador aún no ha creado tu rutina.</p>
    </div>
  )

  return (
    <div className="pb-24">
      {videoUrl && <VideoModal url={videoUrl} onClose={() => setVideoUrl(null)} />}

      <div className="px-4 pt-5 pb-3">
        <p className="text-[10px] uppercase tracking-widest text-muted font-bold">Semana actual</p>
        <h2 className="font-serif font-bold text-xl mt-0.5">{currentWeek.label}</h2>
        {currentWeek.rpe && <p className="text-xs text-muted mt-0.5">Intensidad objetivo: {currentWeek.rpe}</p>}
      </div>

      <div className="px-4 space-y-3">
        {currentWeek.days.map((day, di) => {
          const dayKey = `w${weekIdx}_d${di}`
          const done = day.exercises.filter((_, ri) => logs[`ex_${dayKey}_r${ri}`]?.done).length
          const total = day.exercises.length
          const pct = total ? Math.round(done / total * 100) : 0
          const isOpen = openDays[dayKey]
          const isComplete = pct === 100

          return (
            <div key={di} className={`bg-card border rounded-2xl overflow-hidden transition-all ${isComplete ? 'border-ok/40' : 'border-border'}`}>
              <div className="flex items-center gap-3 px-4 py-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  isComplete ? 'bg-ok text-white' : pct > 0 ? 'bg-accent/10 text-accent border-2 border-accent/30' : 'bg-bg-alt text-muted'
                }`}>
                  {isComplete ? '✓' : di + 1}
                </div>
                <div className="flex-1 min-w-0" onClick={() => setOpenDays(p => ({ ...p, [dayKey]: !p[dayKey] }))}>
                  <p className="font-semibold text-sm">{day.title}</p>
                  {day.focus && <p className="text-xs text-muted truncate">{day.focus}</p>}
                  <p className="text-[10px] text-muted mt-0.5">{total} ejercicios · {done > 0 ? `${done}/${total} completados` : 'Sin empezar'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setActiveWorkout({ weekIdx, dayIdx: di })}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      isComplete ? 'bg-ok/10 text-ok border border-ok/30' :
                      pct > 0 ? 'bg-accent text-white' : 'bg-ink text-white'
                    }`}>
                    <Play className="w-3.5 h-3.5" />
                    {isComplete ? 'Repetir' : pct > 0 ? 'Continuar' : 'Empezar'}
                  </button>
                  <button onClick={() => setOpenDays(p => ({ ...p, [dayKey]: !p[dayKey] }))}
                    className="p-1.5 text-muted">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {pct > 0 && (
                <div className="px-4 pb-3 -mt-1">
                  <div className="h-1.5 bg-bg-alt rounded-full overflow-hidden">
                    <div className="h-full bg-ok rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}

              {isOpen && (
                <div className="border-t border-border divide-y divide-border">
                  {day.exercises.map((ex, ri) => {
                    const log = logs[`ex_${dayKey}_r${ri}`]
                    const ytId = ex.videoUrl ? getYTId(ex.videoUrl) : null
                    return (
                      <div key={ri} className={`flex items-center gap-3 px-4 py-3 ${log?.done ? 'opacity-60' : ''}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          log?.done ? 'bg-ok text-white' : 'bg-bg border border-border text-muted'
                        }`}>
                          {log?.done ? '✓' : ri + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ex.name}</p>
                          <p className="text-xs text-muted">{ex.sets}{ex.weight ? ` · ${ex.weight}` : ''}</p>
                          {ex.isMain && <span className="text-[9px] font-bold text-accent uppercase tracking-wider">Principal</span>}
                        </div>
                        {ytId && (
                          <button
                            onClick={() => setVideoUrl(ex.videoUrl!)}
                            className="w-12 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-border active:scale-95 transition-transform">
                            <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`} className="w-full h-full object-cover" alt="" />
                          </button>
                        )}
                        {log?.sets && Object.keys(log.sets).length > 0 && (
                          <div className="flex flex-col gap-0.5">
                            {Object.values(log.sets).slice(0, 3).map((s, si) => (
                              <span key={si} className="text-[9px] text-ok font-medium">{s.weight}×{s.reps}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
