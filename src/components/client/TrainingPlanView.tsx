import { useState } from 'react'
import { ChevronDown, ChevronUp, Play, Star, Video, CheckCircle2 } from 'lucide-react'
import { TrainingPlan, TrainingLogs } from '../../types'
import { TrainingSession } from '../trainer/TrainingSession'

interface Props {
  plan: TrainingPlan
  logs: TrainingLogs
  onLogsChange: (logs: TrainingLogs) => void
}

function getYTId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

export function TrainingPlanView({ plan, logs, onLogsChange }: Props) {
  const [activeWeekIdx, setActiveWeekIdx] = useState(
    Math.max(0, plan.weeks?.findIndex(w => w.isCurrent) || 0)
  )
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({ 0: true })
  const [session, setSession] = useState<{ day: any; dayKey: string } | null>(null)

  const week = plan.weeks?.[activeWeekIdx]

  if (session) {
    return (
      <TrainingSession
        day={session.day}
        dayKey={session.dayKey}
        plan={plan}
        logs={logs}
        onLogsChange={onLogsChange}
        onFinish={() => setSession(null)}
        onBack={() => setSession(null)}
      />
    )
  }

  return (
    <div className="py-4 px-4 space-y-4 max-w-xl mx-auto">
      {/* Selector de semanas */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {plan.weeks?.map((w, wi) => (
          <button
            key={wi}
            onClick={() => setActiveWeekIdx(wi)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeWeekIdx === wi
                ? 'bg-ink text-white'
                : 'bg-card border border-border text-muted hover:border-accent'
            }`}
          >
            {w.label}
            {w.isCurrent && <span className="ml-1.5 w-1.5 h-1.5 bg-ok rounded-full inline-block" />}
          </button>
        ))}
      </div>

      {/* Días */}
      {week?.days?.map((day, di) => {
        const dayKey = `w${activeWeekIdx}_d${di}`
        const exDone = day.exercises.filter((_: any, ri: number) => logs[`ex_${dayKey}_r${ri}`]?.done).length
        const exTotal = day.exercises.length
        const pct = exTotal ? Math.round((exDone / exTotal) * 100) : 0
        const isOpen = openDays[di]

        return (
          <div key={di} className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Header día */}
            <div
              className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-bg-alt/50 transition-colors"
              onClick={() => setOpenDays(p => ({ ...p, [di]: !p[di] }))}
            >
              {/* Círculo progreso */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold border-2 ${
                pct === 100 ? 'border-ok bg-ok/10 text-ok' : 'border-border bg-bg-alt text-muted'
              }`}>
                {pct === 100 ? '✓' : `${pct}%`}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{day.title}</p>
                {day.focus && <p className="text-xs text-muted truncate">{day.focus}</p>}
              </div>

              <span className="text-xs text-muted flex-shrink-0">{exDone}/{exTotal}</span>
              {isOpen ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
            </div>

            {/* Ejercicios */}
            {isOpen && (
              <div className="border-t border-border">
                <div className="divide-y divide-border">
                  {day.exercises.map((ex: any, ri: number) => {
                    const log = logs[`ex_${dayKey}_r${ri}`]
                    const ytId = ex.videoUrl ? getYTId(ex.videoUrl) : null

                    return (
                      <div key={ri} className={`flex items-center gap-3 px-4 py-3 ${log?.done ? 'opacity-60' : ''}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          log?.done ? 'bg-ok text-white' : 'bg-bg-alt text-muted'
                        }`}>
                          {log?.done ? '✓' : ri + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ex.name}</p>
                          <p className="text-xs text-muted">{ex.sets} {ex.weight ? `· ${ex.weight}` : ''}</p>
                        </div>
                        {ex.isMain && <Star className="w-3.5 h-3.5 text-accent flex-shrink-0" />}
                        {ytId && (
                          <a
                            href={ex.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="flex-shrink-0"
                          >
                            <img
                              src={`https://img.youtube.com/vi/${ytId}/default.jpg`}
                              className="w-10 h-7 object-cover rounded border border-border"
                              alt=""
                            />
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Botón empezar */}
                <div className="p-3 bg-bg/30">
                  <button
                    onClick={() => setSession({ day, dayKey })}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
                  >
                    <Play className="w-4 h-4" />
                    {pct > 0 ? 'Continuar' : 'Empezar sesión'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {!week?.days?.length && (
        <div className="text-center py-16 text-muted">
          <p className="font-serif text-lg">Sin días en esta semana</p>
          <p className="text-sm mt-1">Tu entrenador aún no ha añadido ejercicios.</p>
        </div>
      )}
    </div>
  )
}
