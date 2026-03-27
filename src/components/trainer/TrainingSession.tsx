import { useState, useEffect, useCallback } from 'react'
import {
  X, ChevronLeft, ChevronRight, CheckCircle2,
  Play, SkipForward, List, Video, Star
} from 'lucide-react'
import { DayPlan, Exercise, TrainingPlan, ExerciseLog, TrainingLogs } from '../../types'

interface Props {
  day: DayPlan
  dayKey: string       // "w0_d0"
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

export function TrainingSession({ day, dayKey, plan, logs, onLogsChange, onFinish, onBack }: Props) {
  const [view, setView] = useState<'map' | 'action'>('map')
  const [activeIdx, setActiveIdx] = useState(0)
  const [timer, setTimer] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerDone, setTimerDone] = useState(false)

  const exercises = day.exercises

  // ── Timer ───────────────────────────────────────────
  useEffect(() => {
    if (!timerRunning) return
    if (timer <= 0) { setTimerRunning(false); setTimerDone(true); return }
    const id = setInterval(() => setTimer(t => t - 1), 1000)
    return () => clearInterval(id)
  }, [timerRunning, timer])

  const startTimer = (secs: number) => {
    setTimer(secs)
    setTimerRunning(true)
    setTimerDone(false)
  }

  const skipTimer = () => { setTimer(0); setTimerRunning(false); setTimerDone(false) }

  // ── Logs helpers ────────────────────────────────────
  const getLog = (ri: number): ExerciseLog => {
    const key = `ex_${dayKey}_r${ri}`
    return logs[key] || { sets: {}, done: false }
  }

  const updateLog = (ri: number, updates: Partial<ExerciseLog>) => {
    const key = `ex_${dayKey}_r${ri}`
    const current = getLog(ri)
    onLogsChange({ ...logs, [key]: { ...current, ...updates } })
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

    if (doneSeries < totalSeries) {
      // Marcar siguiente serie
      const nextIdx = doneSeries
      const sets = { ...log.sets, [nextIdx]: log.sets[nextIdx] || { weight: ex.weight || '', reps: ex.sets?.split('×')[1] || '' } }
      const allDone = Object.keys(sets).length >= totalSeries
      updateLog(ri, { sets, done: allDone, dateDone: allDone ? new Date().toISOString().split('T')[0] : undefined })
      // Iniciar descanso
      const restSecs = ex.isMain ? (plan.restMain || 180) : (plan.restAcc || 90)
      startTimer(restSecs)
      if (allDone && activeIdx < exercises.length - 1) {
        setTimeout(() => setActiveIdx(i => i + 1), 400)
      }
    }
  }

  const toggleExDone = (ri: number) => {
    const log = getLog(ri)
    updateLog(ri, { done: !log.done, dateDone: !log.done ? new Date().toISOString().split('T')[0] : undefined })
  }

  // ── Progreso global ──────────────────────────────────
  const totalDone = exercises.filter((_, ri) => getLog(ri).done).length
  const pct = exercises.length ? Math.round((totalDone / exercises.length) * 100) : 0

  // ── Vista mapa ───────────────────────────────────────
  const MapView = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {exercises.map((ex, ri) => {
        const log = getLog(ri)
        const totalSeries = parseInt(ex.sets?.split('×')[0] || '3')
        const doneSeries = Object.keys(log.sets).length
        const isRec = !log.done && exercises.slice(0, ri).every((_, i) => getLog(i).done)

        return (
          <div
            key={ri}
            onClick={() => { setActiveIdx(ri); setView('action') }}
            className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
              log.done
                ? 'bg-ok/5 border-ok/30 opacity-70'
                : isRec
                ? 'bg-card border-accent shadow-sm'
                : 'bg-card border-border hover:border-accent/50'
            }`}
          >
            {/* Estado */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
              log.done ? 'bg-ok text-white' : isRec ? 'bg-accent text-white' : 'bg-bg-alt text-muted'
            }`}>
              {log.done ? '✓' : isRec ? '▶' : ri + 1}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${isRec ? 'text-ink' : ''}`}>{ex.name}</p>
              <p className="text-xs text-muted">{ex.sets} {ex.weight ? `· ${ex.weight}` : ''}</p>
            </div>

            {/* Dots series */}
            <div className="flex gap-1">
              {Array.from({ length: totalSeries }).map((_, si) => (
                <div key={si} className={`w-2 h-2 rounded-full ${si < doneSeries ? 'bg-ok' : 'bg-border'}`} />
              ))}
            </div>

            {/* Miniatura YT */}
            {ex.videoUrl && getYTId(ex.videoUrl) && (
              <img
                src={`https://img.youtube.com/vi/${getYTId(ex.videoUrl)}/default.jpg`}
                className="w-10 h-7 object-cover rounded opacity-70"
                alt=""
              />
            )}

            {ex.isMain && <Star className="w-3.5 h-3.5 text-accent flex-shrink-0" />}
          </div>
        )
      })}
    </div>
  )

  // ── Vista acción ─────────────────────────────────────
  const ActionView = () => {
    const ex = exercises[activeIdx]
    const log = getLog(activeIdx)
    const totalSeries = parseInt(ex.sets?.split('×')[0] || '3')
    const doneSeries = Object.keys(log.sets).length
    const ytId = ex.videoUrl ? getYTId(ex.videoUrl) : null
    const restSecs = ex.isMain ? (plan.restMain || 180) : (plan.restAcc || 90)
    const nextSeriesLabel = doneSeries < totalSeries ? `Marcar serie ${doneSeries + 1}/${totalSeries}` : '✓ Completado'

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto p-6 space-y-6">
          {/* Nombre */}
          <div className="text-center">
            <h2 className="text-3xl font-serif font-bold">{ex.name}</h2>
            <p className="text-accent font-medium mt-1">{ex.weight} · {ex.sets}</p>
            {ex.comment && (
              <p className="text-sm text-muted italic mt-2 bg-bg-alt px-4 py-2 rounded-xl border border-border">
                "{ex.comment}"
              </p>
            )}
          </div>

          {/* Miniatura / vídeo */}
          {ytId && (
            <a
              href={ex.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl overflow-hidden border border-border relative group"
            >
              <img
                src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                className="w-full object-cover"
                alt="Ver técnica"
              />
              <div className="absolute inset-0 bg-ink/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Video className="w-10 h-10 text-white" />
              </div>
              <div className="absolute bottom-2 right-2 bg-ink/70 text-white text-xs px-2 py-1 rounded-lg">
                Ver técnica ↗
              </div>
            </a>
          )}

          {/* Grid de series */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Registrar series</p>
            <div className="space-y-2">
              {Array.from({ length: totalSeries }).map((_, si) => {
                const s = log.sets[si]
                const isDone = si < doneSeries
                return (
                  <div key={si} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                    isDone ? 'bg-ok/5 border border-ok/20' : 'bg-bg border border-border'
                  }`}>
                    <span className={`text-xs font-bold w-14 flex-shrink-0 ${isDone ? 'text-ok' : 'text-muted'}`}>
                      {isDone ? '✓' : ''} Serie {si + 1}
                    </span>
                    <input
                      type="number"
                      placeholder="kg"
                      value={s?.weight || ''}
                      onChange={e => updateSet(activeIdx, si, 'weight', e.target.value)}
                      className="flex-1 text-center text-lg font-serif bg-transparent outline-none border-b border-border focus:border-accent"
                    />
                    <span className="text-muted text-sm">×</span>
                    <input
                      type="number"
                      placeholder="reps"
                      value={s?.reps || ''}
                      onChange={e => updateSet(activeIdx, si, 'reps', e.target.value)}
                      className="flex-1 text-center text-lg font-serif bg-transparent outline-none border-b border-border focus:border-accent"
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Botón inteligente */}
          <button
            onClick={() => {
              if (doneSeries < totalSeries) markSeriesDone(activeIdx)
              else toggleExDone(activeIdx)
            }}
            className={`w-full py-4 rounded-2xl text-base font-bold transition-all ${
              log.done
                ? 'bg-ok/10 border-2 border-ok text-ok'
                : timerRunning
                ? 'bg-bg-alt border-2 border-border text-muted cursor-default'
                : 'bg-ink text-white hover:opacity-90 active:scale-[0.98]'
            }`}
            disabled={timerRunning}
          >
            {timerRunning
              ? `⏱ Descansando ${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, '0')}`
              : log.done
              ? '↩ Desmarcar completado'
              : nextSeriesLabel}
          </button>

          {timerRunning && (
            <button onClick={skipTimer} className="w-full text-xs text-muted hover:text-ink text-center py-1">
              Saltar descanso →
            </button>
          )}

          {timerDone && (
            <p className="text-center text-xs text-ok font-semibold animate-fade-in">
              ✓ ¡Descanso terminado! A por la siguiente serie.
            </p>
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
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors">
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

          <button
            onClick={() => setView(v => v === 'map' ? 'action' : 'map')}
            className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors"
          >
            {view === 'map' ? <ChevronRight className="w-5 h-5" /> : <List className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Contenido */}
      {view === 'map' ? <MapView /> : <ActionView />}

      {/* Footer navegación (solo en acción) */}
      {view === 'action' && (
        <footer className="bg-card border-t border-border p-3 flex gap-3 flex-shrink-0">
          <button
            disabled={activeIdx === 0}
            onClick={() => setActiveIdx(i => i - 1)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border rounded-xl text-sm font-medium text-muted hover:text-ink disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          {activeIdx < exercises.length - 1 ? (
            <button
              onClick={() => setActiveIdx(i => i + 1)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-ink text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onFinish}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-ok text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <CheckCircle2 className="w-4 h-4" /> Finalizar
            </button>
          )}
        </footer>
      )}
    </div>
  )
}
