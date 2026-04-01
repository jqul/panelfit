import { useState, useEffect, useCallback } from 'react'
import {
  X, ChevronLeft, ChevronRight, CheckCircle2,
  Play, List, Star, Trophy, Flame, ExternalLink, Volume2
} from 'lucide-react'
import { DayPlan, Exercise, TrainingPlan, ExerciseLog, TrainingLogs } from '../../types'

interface Props {
  day: DayPlan
  dayKey: string
  plan: TrainingPlan
  logs: TrainingLogs
  onLogsChange: (logs: TrainingLogs) => void
  onFinish: () => void
  onBack: () => void
}

function getYTId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

function vibrate(pattern: number | number[]) {
  if ('vibrate' in navigator) navigator.vibrate(pattern)
}

export function TrainingSession({ day, dayKey, plan, logs, onLogsChange, onFinish, onBack }: Props) {
  const [view, setView] = useState<'map' | 'action' | 'finish'>('map')
  const [activeIdx, setActiveIdx] = useState(0)
  const [timer, setTimer] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerDone, setTimerDone] = useState(false)
  const [sessionStart] = useState(Date.now())

  const exercises = day.exercises

  // ── Timer ─────────────────────────────────────────────
  useEffect(() => {
    if (!timerRunning) return
    if (timer <= 0) {
      setTimerRunning(false)
      setTimerDone(true)
      vibrate([200, 100, 200]) // vibrar al terminar descanso
      return
    }
    // Vibrar cuando quedan 3 segundos
    if (timer === 3) vibrate(100)
    const id = setInterval(() => setTimer(t => t - 1), 1000)
    return () => clearInterval(id)
  }, [timerRunning, timer])

  const startTimer = (secs: number) => {
    setTimer(secs); setTimerRunning(true); setTimerDone(false)
  }
  const skipTimer = () => { setTimer(0); setTimerRunning(false); setTimerDone(false) }

  // ── Logs ──────────────────────────────────────────────
  const getLog = (ri: number): ExerciseLog => logs[`ex_${dayKey}_r${ri}`] || { sets: {}, done: false }

  const updateLog = (ri: number, updates: Partial<ExerciseLog>) => {
    const key = `ex_${dayKey}_r${ri}`
    onLogsChange({ ...logs, [key]: { ...getLog(ri), ...updates } })
  }

  const updateSet = (ri: number, setIdx: number, field: 'weight' | 'reps', value: string) => {
    const log = getLog(ri)
    const sets = { ...log.sets, [setIdx]: { ...log.sets[setIdx], [field]: value } }
    updateLog(ri, { sets })
  }

  const markSeriesDone = (ri: number) => {
    const ex = exercises[ri]
    const log = getLog(ri)
    const totalSeries = parseInt(ex.sets?.split('×')[0] || '3')
    const doneSeries = Object.keys(log.sets).length
    if (doneSeries >= totalSeries) return

    const prevSet = log.sets[doneSeries - 1]
    const sets = {
      ...log.sets,
      [doneSeries]: log.sets[doneSeries] || {
        weight: prevSet?.weight || ex.weight || '',
        reps: prevSet?.reps || ex.sets?.split('×')[1]?.trim() || ''
      }
    }
    const allDone = Object.keys(sets).length >= totalSeries
    updateLog(ri, { sets, done: allDone, dateDone: allDone ? new Date().toISOString().split('T')[0] : undefined })
    vibrate(50)

    const restSecs = ex.isMain ? (plan.restMain || 180) : (plan.restAcc || 90)
    startTimer(restSecs)

    if (allDone && ri < exercises.length - 1) {
      setTimeout(() => setActiveIdx(ri + 1), 600)
    }
  }

  const toggleExDone = (ri: number) => {
    const log = getLog(ri)
    updateLog(ri, { done: !log.done, dateDone: !log.done ? new Date().toISOString().split('T')[0] : undefined })
    vibrate(50)
  }

  const totalDone = exercises.filter((_, ri) => getLog(ri).done).length
  const pct = exercises.length ? Math.round((totalDone / exercises.length) * 100) : 0
  const sessionMinutes = Math.round((Date.now() - sessionStart) / 60000)

  // ── Pantalla de fin ───────────────────────────────────
  if (view === 'finish') {
    const totalSeries = exercises.reduce((acc, ex) => {
      const n = parseInt(ex.sets?.split('×')[0] || '0')
      return acc + n
    }, 0)
    const mejores = exercises.map((ex, ri) => {
      const log = getLog(ri)
      const mejor = Object.values(log.sets || {}).reduce((max: number, s: any) => Math.max(max, parseFloat(s.weight) || 0), 0)
      return { name: ex.name, mejor }
    }).filter(x => x.mejor > 0).sort((a, b) => b.mejor - a.mejor)

    return (
      <div className="fixed inset-0 bg-bg z-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-ok/10 rounded-full flex items-center justify-center mb-6">
          <Trophy className="w-10 h-10 text-ok" />
        </div>
        <h2 className="text-4xl font-serif font-bold mb-2">¡Sesión completada!</h2>
        <p className="text-muted text-sm mb-8">{day.title}</p>

        <div className="grid grid-cols-3 gap-4 w-full max-w-sm mb-8">
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-2xl font-serif font-bold text-ok">{totalDone}</p>
            <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Ejercicios</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-2xl font-serif font-bold text-accent">{sessionMinutes}m</p>
            <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Tiempo</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-2xl font-serif font-bold text-warn"><Flame className="w-5 h-5 inline" /></p>
            <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Racha +1</p>
          </div>
        </div>

        {mejores.length > 0 && (
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-4 mb-8 text-left">
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-3">Mejores pesos hoy</p>
            {mejores.slice(0, 3).map((m, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <p className="text-sm truncate flex-1">{m.name}</p>
                <p className="text-sm font-bold text-accent ml-3">{m.mejor} kg</p>
              </div>
            ))}
          </div>
        )}

        <button onClick={onFinish}
          className="w-full max-w-sm py-4 bg-ink text-white rounded-2xl font-bold text-base hover:opacity-90 transition-opacity">
          Volver al inicio
        </button>
      </div>
    )
  }

  // ── Vista mapa ────────────────────────────────────────
  const MapView = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {exercises.map((ex, ri) => {
        const log = getLog(ri)
        const totalSeries = parseInt(ex.sets?.split('×')[0] || '3')
        const doneSeries = Object.keys(log.sets).length
        const isNext = !log.done && exercises.slice(0, ri).every((_, i) => getLog(i).done)

        return (
          <div key={ri} onClick={() => { setActiveIdx(ri); setView('action') }}
            className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${
              log.done ? 'bg-ok/5 border-ok/30 opacity-70' :
              isNext ? 'bg-card border-accent shadow-sm' :
              'bg-card border-border hover:border-accent/50'
            }`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
              log.done ? 'bg-ok text-white' : isNext ? 'bg-accent text-white' : 'bg-bg-alt text-muted'
            }`}>
              {log.done ? '✓' : isNext ? '▶' : ri + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{ex.name}</p>
              <p className="text-xs text-muted">{ex.sets}{ex.weight ? ` · ${ex.weight}` : ''}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex gap-0.5">
                {Array.from({ length: Math.min(totalSeries, 6) }).map((_, si) => (
                  <div key={si} className={`w-1.5 h-1.5 rounded-full ${si < doneSeries ? 'bg-ok' : 'bg-border'}`} />
                ))}
              </div>
              {ex.isMain && <Star className="w-3.5 h-3.5 text-accent" />}
              {ex.videoUrl && getYTId(ex.videoUrl) && (
                <img src={`https://img.youtube.com/vi/${getYTId(ex.videoUrl)}/default.jpg`}
                  className="w-10 h-7 object-cover rounded opacity-60" alt="" />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  // ── Vista acción ──────────────────────────────────────
  const ActionView = () => {
    const ex = exercises[activeIdx]
    const log = getLog(activeIdx)
    const totalSeries = parseInt(ex.sets?.split('×')[0] || '3')
    const doneSeries = Object.keys(log.sets).length
    const allVideos = [ex.videoUrl, ...(ex.videoUrls || [])].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)

    const timerPct = timer > 0 ? (timer / (ex.isMain ? (plan.restMain || 180) : (plan.restAcc || 90))) * 100 : 0

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto p-5 space-y-5">

          {/* Nombre y datos */}
          <div className="text-center">
            {ex.isMain && (
              <p className="text-[10px] uppercase tracking-widest text-accent font-bold mb-1">Ejercicio principal</p>
            )}
            <h2 className="text-3xl font-serif font-bold">{ex.name}</h2>
            <p className="text-accent font-semibold mt-1">
              {ex.weight && <span>{ex.weight} · </span>}{ex.sets}
            </p>
          </div>

          {/* Descripción técnica */}
          {ex.comment && (
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-3">
              <p className="text-xs text-accent/80 leading-relaxed italic">"{ex.comment}"</p>
            </div>
          )}

          {/* Vídeos */}
          {allVideos.length > 0 && (
            <div className={`grid gap-2 ${allVideos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {allVideos.slice(0, 2).map((url: string, vi: number) => {
                const ytId = getYTId(url)
                return ytId ? (
                  <a key={vi} href={url} target="_blank" rel="noreferrer"
                    className="relative rounded-xl overflow-hidden border border-border group"
                    aria-label={`Ver vídeo ${vi + 1} de ${ex.name}`}>
                    <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                      className="w-full aspect-video object-cover" alt="" />
                    <div className="absolute inset-0 bg-ink/30 flex items-center justify-center">
                      <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                        <Play className="w-4 h-4 text-ink ml-0.5" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-ink/70 text-white text-[10px] px-2 py-0.5 rounded font-semibold">
                      Ver técnica
                    </div>
                  </a>
                ) : null
              })}
            </div>
          )}

          {/* Grid series */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Series</p>
            <div className="space-y-2">
              {Array.from({ length: totalSeries }).map((_, si) => {
                const s = log.sets[si]
                const isDone = si < doneSeries
                const isCurrent = si === doneSeries
                return (
                  <div key={si} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isDone ? 'bg-ok/5 border border-ok/20' :
                    isCurrent ? 'bg-accent/5 border border-accent/20' :
                    'bg-bg border border-border opacity-50'
                  }`}>
                    <span className={`text-xs font-bold w-16 flex-shrink-0 ${
                      isDone ? 'text-ok' : isCurrent ? 'text-accent' : 'text-muted'
                    }`}>
                      {isDone ? '✓ ' : ''}{si + 1}ª serie
                    </span>
                    <input type="number" placeholder="kg" value={s?.weight || ''}
                      onChange={e => updateSet(activeIdx, si, 'weight', e.target.value)}
                      disabled={!isCurrent && !isDone}
                      aria-label={`Peso serie ${si + 1}`}
                      className="flex-1 text-center text-xl font-serif bg-transparent outline-none border-b border-border focus:border-accent disabled:opacity-50"
                    />
                    <span className="text-muted">×</span>
                    <input type="number" placeholder="reps" value={s?.reps || ''}
                      onChange={e => updateSet(activeIdx, si, 'reps', e.target.value)}
                      disabled={!isCurrent && !isDone}
                      aria-label={`Repeticiones serie ${si + 1}`}
                      className="flex-1 text-center text-xl font-serif bg-transparent outline-none border-b border-border focus:border-accent disabled:opacity-50"
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Timer visual */}
          {timerRunning && (
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <div className="relative w-20 h-20 mx-auto mb-2">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#d8d4ca" strokeWidth="6" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#6e5438" strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - timerPct / 100)}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-serif font-bold">
                    {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted">Descansando...</p>
              <button onClick={skipTimer} className="mt-2 text-xs text-accent hover:underline">
                Saltar descanso →
              </button>
            </div>
          )}

          {timerDone && !timerRunning && (
            <div className="bg-ok/10 border border-ok/20 rounded-xl px-4 py-3 text-center animate-fade-in">
              <p className="text-sm font-semibold text-ok">✓ ¡Descanso terminado! A por la siguiente serie.</p>
            </div>
          )}

          {/* Botón inteligente */}
          {!timerRunning && (
            <button
              onClick={() => doneSeries < totalSeries ? markSeriesDone(activeIdx) : toggleExDone(activeIdx)}
              className={`w-full py-4 rounded-2xl text-base font-bold transition-all active:scale-[0.98] ${
                log.done ? 'bg-ok/10 border-2 border-ok text-ok' : 'bg-ink text-white hover:opacity-90'
              }`}>
              {log.done ? '↩ Desmarcar' :
               doneSeries < totalSeries ? `✓ Serie ${doneSeries + 1} completada` : '✓ Ejercicio completado'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-bg z-50 flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center h-14 px-4 gap-3">
          <button onClick={onBack} aria-label="Volver"
            className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted uppercase font-bold tracking-widest truncate">{day.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 h-1.5 bg-bg-alt rounded-full overflow-hidden">
                <div className="h-full bg-ok rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-muted flex-shrink-0">{totalDone}/{exercises.length}</span>
            </div>
          </div>
          <button onClick={() => setView(v => v === 'map' ? 'action' : 'map')}
            aria-label={view === 'map' ? 'Ir al ejercicio' : 'Ver lista'}
            className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors">
            {view === 'map' ? <ChevronRight className="w-5 h-5" /> : <List className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {view === 'map' ? <MapView /> : <ActionView />}

      {/* Footer */}
      {view === 'action' && (
        <footer className="bg-card border-t border-border p-3 flex gap-3 flex-shrink-0">
          <button disabled={activeIdx === 0} onClick={() => setActiveIdx(i => i - 1)}
            aria-label="Ejercicio anterior"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border rounded-xl text-sm font-medium text-muted hover:text-ink disabled:opacity-30 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          {activeIdx < exercises.length - 1 ? (
            <button onClick={() => setActiveIdx(i => i + 1)}
              aria-label="Siguiente ejercicio"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-ink text-white rounded-xl text-sm font-medium hover:opacity-90">
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => setView('finish')}
              aria-label="Finalizar sesión"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-ok text-white rounded-xl text-sm font-medium hover:opacity-90">
              <CheckCircle2 className="w-4 h-4" /> Finalizar
            </button>
          )}
        </footer>
      )}
    </div>
  )
}
