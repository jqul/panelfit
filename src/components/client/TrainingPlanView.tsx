import { useState } from 'react'
import { ChevronDown, ChevronUp, Play, Star, ExternalLink, CheckCircle2, Lock } from 'lucide-react'
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
    Math.max(0, plan.weeks?.findIndex(w => w.isCurrent) ?? 0)
  )
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({ 0: true })
  const [session, setSession] = useState<{ day: any; dayKey: string } | null>(null)
  const [expandedEx, setExpandedEx] = useState<string | null>(null)

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
      {/* Selector semanas */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {plan.weeks?.map((w, wi) => {
          const weekDone = w.days.reduce((acc, d, di) => {
            const dayKey = `w${wi}_d${di}`
            return acc + d.exercises.filter((_: any, ri: number) => logs[`ex_${dayKey}_r${ri}`]?.done).length
          }, 0)
          const weekTotal = w.days.reduce((acc, d) => acc + d.exercises.length, 0)
          const weekPct = weekTotal ? Math.round(weekDone / weekTotal * 100) : 0
          return (
            <button key={wi} onClick={() => setActiveWeekIdx(wi)}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                activeWeekIdx === wi ? 'bg-ink text-white' : 'bg-card border border-border text-muted hover:border-accent'
              }`}>
              <span>{w.label}</span>
              {w.isCurrent && <span className="w-1.5 h-1.5 bg-ok rounded-full" />}
              {weekPct === 100 && <CheckCircle2 className="w-3.5 h-3.5 text-ok" />}
            </button>
          )
        })}
      </div>

      {/* Info semana */}
      {week && (
        <div className="flex items-center gap-3 px-1">
          {week.rpe && (
            <span className="text-xs font-bold text-muted bg-card border border-border px-2 py-1 rounded-lg">
              Intensidad: {week.rpe}
            </span>
          )}
          {week.isCurrent && (
            <span className="text-xs font-bold text-ok bg-ok/10 border border-ok/20 px-2 py-1 rounded-lg">
              Semana actual
            </span>
          )}
        </div>
      )}

      {/* Días */}
      {week?.days?.map((day, di) => {
        const dayKey = `w${activeWeekIdx}_d${di}`
        const exDone = day.exercises.filter((_: any, ri: number) => logs[`ex_${dayKey}_r${ri}`]?.done).length
        const exTotal = day.exercises.length
        const pct = exTotal ? Math.round((exDone / exTotal) * 100) : 0
        const isOpen = openDays[di]
        const isCompleted = pct === 100

        return (
          <div key={di} className={`bg-card border rounded-2xl overflow-hidden transition-all ${
            isCompleted ? 'border-ok/30' : 'border-border'
          }`}>
            {/* Header día */}
            <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-bg-alt/50 transition-colors"
              onClick={() => setOpenDays(p => ({ ...p, [di]: !p[di] }))}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold border-2 transition-all ${
                isCompleted ? 'border-ok bg-ok text-white' :
                pct > 0 ? 'border-accent bg-accent/10 text-accent' :
                'border-border bg-bg-alt text-muted'
              }`}>
                {isCompleted ? '✓' : pct > 0 ? `${pct}%` : di + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{day.title}</p>
                {day.focus && <p className="text-xs text-muted truncate">{day.focus}</p>}
              </div>
              <span className="text-xs text-muted flex-shrink-0">{exDone}/{exTotal}</span>
              {isOpen ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
            </div>

            {/* Barra progreso */}
            {pct > 0 && pct < 100 && (
              <div className="h-0.5 bg-bg-alt">
                <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
              </div>
            )}

            {/* Ejercicios */}
            {isOpen && (
              <div className="border-t border-border">
                <div className="divide-y divide-border">
                  {day.exercises.map((ex: any, ri: number) => {
                    const log = logs[`ex_${dayKey}_r${ri}`]
                    const exKey = `${dayKey}_r${ri}`
                    const isExpanded = expandedEx === exKey
                    const allVideos = [ex.videoUrl, ...(ex.videoUrls || [])].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)

                    return (
                      <div key={ri} className={`${log?.done ? 'bg-ok/5' : ''}`}>
                        {/* Fila ejercicio */}
                        <div className={`flex items-center gap-3 px-4 py-3 ${log?.done ? 'opacity-70' : ''}`}
                          onClick={() => allVideos.length > 0 || ex.comment ? setExpandedEx(isExpanded ? null : exKey) : null}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                            log?.done ? 'bg-ok text-white' : 'bg-bg-alt text-muted'
                          }`}>
                            {log?.done ? '✓' : ri + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{ex.name}</p>
                            <p className="text-xs text-muted">{ex.sets}{ex.weight ? ` · ${ex.weight}` : ''}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {ex.isMain && <Star className="w-3.5 h-3.5 text-accent" aria-label="Ejercicio principal" />}
                            {allVideos.length > 0 && (
                              <span className="text-[10px] text-accent font-semibold bg-accent/10 px-1.5 py-0.5 rounded">
                                {allVideos.length} vídeo{allVideos.length > 1 ? 's' : ''}
                              </span>
                            )}
                            {(allVideos.length > 0 || ex.comment) && (
                              isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-muted" />
                            )}
                          </div>
                        </div>

                        {/* Detalle expandido */}
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3 bg-bg/30">
                            {/* Descripción técnica */}
                            {ex.comment && (
                              <div className="bg-card border border-border rounded-xl p-3">
                                <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">Indicaciones técnicas</p>
                                <p className="text-xs text-ink/80 leading-relaxed">{ex.comment}</p>
                              </div>
                            )}
                            {/* Vídeos */}
                            {allVideos.length > 0 && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-2">Vídeos de referencia</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {allVideos.map((url: string, vi: number) => {
                                    const ytId = getYTId(url)
                                    return ytId ? (
                                      <a key={vi} href={url} target="_blank" rel="noreferrer"
                                        className="relative rounded-xl overflow-hidden border border-border group">
                                        <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                                          className="w-full aspect-video object-cover"
                                          alt={`Vídeo ${vi + 1} de ${ex.name}`} />
                                        <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/30 transition-colors flex items-center justify-center">
                                          <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Play className="w-4 h-4 text-ink ml-0.5" />
                                          </div>
                                        </div>
                                      </a>
                                    ) : (
                                      <a key={vi} href={url} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-2 p-3 bg-card border border-border rounded-xl text-xs text-accent hover:border-accent transition-colors">
                                        <ExternalLink className="w-3.5 h-3.5" /> Ver vídeo
                                      </a>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                            {/* Series registradas */}
                            {log?.sets && Object.keys(log.sets).length > 0 && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-2">Series registradas</p>
                                <div className="flex gap-2 flex-wrap">
                                  {Object.values(log.sets).map((s: any, si: number) => (
                                    <span key={si} className="text-xs bg-ok/10 text-ok px-2.5 py-1 rounded-lg font-semibold">
                                      {s.weight}kg × {s.reps}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Botón empezar */}
                <div className="p-3 bg-bg/30">
                  <button onClick={() => setSession({ day, dayKey })}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all">
                    <Play className="w-4 h-4" />
                    {pct > 0 && pct < 100 ? 'Continuar sesión' : pct === 100 ? 'Repetir sesión' : 'Empezar sesión'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {!week?.days?.length && (
        <div className="text-center py-16 text-muted">
          <Lock className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-serif text-lg">Sin días en esta semana</p>
          <p className="text-sm mt-1">Tu entrenador aún no ha añadido ejercicios.</p>
        </div>
      )}
    </div>
  )
}
