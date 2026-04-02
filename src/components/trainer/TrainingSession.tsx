import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, CheckCircle2, Play, List, Star, Trophy, Flame } from 'lucide-react'
import { DayPlan, TrainingPlan, ExerciseLog, TrainingLogs } from '../../types'

interface Props {
  day: DayPlan; dayKey: string; plan: TrainingPlan; logs: TrainingLogs
  onLogsChange: (logs: TrainingLogs) => void; onFinish: () => void; onBack: () => void
}

function getYTId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

function vibrate(p: number | number[]) { if ('vibrate' in navigator) navigator.vibrate(p) }

export function TrainingSession({ day, dayKey, plan, logs, onLogsChange, onFinish, onBack }: Props) {
  const [view, setView] = useState<'map' | 'action' | 'finish'>('map')
  const [activeIdx, setActiveIdx] = useState(0)
  const [timer, setTimer] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerDone, setTimerDone] = useState(false)
  const [sessionStart] = useState(Date.now())
  const exercises = day.exercises

  useEffect(() => {
    if (!timerRunning) return
    if (timer <= 0) { setTimerRunning(false); setTimerDone(true); vibrate([200, 100, 200]); return }
    if (timer === 3) vibrate(100)
    const id = setInterval(() => setTimer(t => t - 1), 1000)
    return () => clearInterval(id)
  }, [timerRunning, timer])

  const startTimer = (s: number) => { setTimer(s); setTimerRunning(true); setTimerDone(false) }
  const skipTimer = () => { setTimer(0); setTimerRunning(false); setTimerDone(false) }
  const getLog = (ri: number): ExerciseLog => logs[`ex_${dayKey}_r${ri}`] || { sets: {}, done: false }

  const updateLog = (ri: number, updates: Partial<ExerciseLog>) => {
    const key = `ex_${dayKey}_r${ri}`
    onLogsChange({ ...logs, [key]: { ...getLog(ri), ...updates } })
  }

  const updateSet = (ri: number, si: number, field: 'weight' | 'reps', value: string) => {
    const log = getLog(ri)
    updateLog(ri, { sets: { ...log.sets, [si]: { ...log.sets[si], [field]: value } } })
  }

  const markSeriesDone = (ri: number) => {
    const ex = exercises[ri]; const log = getLog(ri)
    const total = parseInt(ex.sets?.split('×')[0] || '3')
    const done = Object.keys(log.sets).length
    if (done >= total) return
    const prev = log.sets[done - 1]
    const sets = { ...log.sets, [done]: log.sets[done] || { weight: prev?.weight || ex.weight || '', reps: prev?.reps || ex.sets?.split('×')[1]?.trim() || '' } }
    const allDone = Object.keys(sets).length >= total
    updateLog(ri, { sets, done: allDone, dateDone: allDone ? new Date().toISOString().split('T')[0] : undefined })
    vibrate(50)
    startTimer(ex.isMain ? (plan.restMain || 180) : (plan.restAcc || 90))
    if (allDone && ri < exercises.length - 1) setTimeout(() => setActiveIdx(ri + 1), 600)
  }

  const toggleExDone = (ri: number) => {
    const log = getLog(ri)
    updateLog(ri, { done: !log.done, dateDone: !log.done ? new Date().toISOString().split('T')[0] : undefined })
    vibrate(50)
  }

  const totalDone = exercises.filter((_, ri) => getLog(ri).done).length
  const pct = exercises.length ? Math.round((totalDone / exercises.length) * 100) : 0

  // ── Fin ───────────────────────────────────────────────
  if (view === 'finish') {
    const mejores = exercises.map((ex, ri) => {
      const mejor = Object.values(getLog(ri).sets || {}).reduce((max: number, s: any) => Math.max(max, parseFloat(s.weight) || 0), 0)
      return { name: ex.name, mejor }
    }).filter(x => x.mejor > 0).sort((a, b) => b.mejor - a.mejor)
    const mins = Math.round((Date.now() - sessionStart) / 60000)

    return (
      <div className="fixed inset-0 bg-bg z-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-ok/10 rounded-full flex items-center justify-center mb-5">
          <Trophy className="w-10 h-10 text-ok" />
        </div>
        <h2 className="text-4xl font-serif font-bold mb-1">¡Sesión completada!</h2>
        <p className="text-muted text-sm mb-7">{day.title}</p>
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-5">
          {[
            { v: totalDone, l: 'Ejercicios', c: 'text-ok' },
            { v: `${mins}m`, l: 'Tiempo', c: 'text-accent' },
            { v: '🔥', l: 'Racha +1', c: 'text-warn' },
          ].map(s => (
            <div key={s.l} className="bg-card border border-border rounded-2xl p-4 text-center">
              <p className={`text-2xl font-serif font-bold ${s.c}`}>{s.v}</p>
              <p className="text-[10px] text-muted uppercase tracking-wider mt-1">{s.l}</p>
            </div>
          ))}
        </div>
        {mejores.length > 0 && (
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-4 mb-5 text-left">
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-3">Mejores pesos hoy</p>
            {mejores.slice(0, 3).map((m, i) => (
              <div key={i} className="flex justify-between py-1.5">
                <p className="text-sm truncate flex-1">{m.name}</p>
                <p className="text-sm font-bold text-accent ml-3">{m.mejor} kg</p>
              </div>
            ))}
          </div>
        )}
        <button onClick={onFinish} style={{ minHeight: '52px' }}
          className="w-full max-w-sm bg-ink text-white rounded-2xl font-bold text-base">
          Volver al inicio
        </button>
      </div>
    )
  }

  // ── Mapa ──────────────────────────────────────────────
  const MapView = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {exercises.map((ex, ri) => {
        const log = getLog(ri)
        const total = parseInt(ex.sets?.split('×')[0] || '3')
        const done = Object.keys(log.sets).length
        const isNext = !log.done && exercises.slice(0, ri).every((_, i) => getLog(i).done)
        return (
          <div key={ri} onClick={() => { setActiveIdx(ri); setView('action') }}
            className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer active:scale-[0.98] transition-all ${
              log.done ? 'bg-ok/5 border-ok/30 opacity-70' :
              isNext ? 'bg-card border-accent shadow-sm' : 'bg-card border-border'
            }`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
              log.done ? 'bg-ok text-white' : isNext ? 'bg-accent text-white' : 'bg-bg-alt text-muted'
            }`}>{log.done ? '✓' : isNext ? '▶' : ri + 1}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{ex.name}</p>
              <p className="text-xs text-muted">{ex.sets}{ex.weight ? ` · ${ex.weight}` : ''}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="flex gap-0.5">
                {Array.from({ length: Math.min(total, 6) }).map((_, si) => (
                  <div key={si} className={`w-1.5 h-1.5 rounded-full ${si < done ? 'bg-ok' : 'bg-border'}`} />
                ))}
              </div>
              {ex.isMain && <Star className="w-3.5 h-3.5 text-accent" />}
            </div>
          </div>
        )
      })}
    </div>
  )

  // ── Acción ────────────────────────────────────────────
  const ActionView = () => {
    const ex = exercises[activeIdx]
    const log = getLog(activeIdx)
    const totalSeries = parseInt(ex.sets?.split('×')[0] || '3')
    const doneSeries = Object.keys(log.sets).length
    const restTotal = ex.isMain ? (plan.restMain || 180) : (plan.restAcc || 90)
    const timerPct = timerRunning ? (timer / restTotal) * 100 : 0
    const allVideos = [ex.videoUrl, ...(ex.videoUrls || [])].filter(Boolean).filter((u, i, a) => a.indexOf(u) === i)

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-5 space-y-5 max-w-lg mx-auto">

          {/* Nombre y datos */}
          <div>
            {ex.isMain && <p className="text-[10px] uppercase tracking-widest text-accent font-bold mb-0.5">Principal</p>}
            <h2 className="text-3xl font-serif font-bold leading-tight">{ex.name}</h2>
            <p className="text-accent font-semibold mt-1 text-base">
              {ex.weight && <span>{ex.weight} · </span>}{ex.sets}
            </p>
            {ex.comment && <p className="text-xs text-muted italic mt-1.5 leading-relaxed">"{ex.comment}"</p>}
          </div>

          {/* Vídeo compacto */}
          {allVideos.length > 0 && getYTId(allVideos[0] as string) && (
            <a href={allVideos[0] as string} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
              <img src={`https://img.youtube.com/vi/${getYTId(allVideos[0] as string)}/default.jpg`}
                className="w-14 h-10 object-cover rounded-lg flex-shrink-0" alt="" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Ver técnica</p>
                <p className="text-xs text-muted">YouTube ↗</p>
              </div>
              <Play className="w-4 h-4 text-muted flex-shrink-0" />
            </a>
          )}

          {/* Timer */}
          {timerRunning && (
            <div className="bg-ink text-white rounded-2xl p-4 flex items-center gap-4">
              <div className="relative w-14 h-14 flex-shrink-0">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="23" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                  <circle cx="28" cy="28" r="23" fill="none" stroke="white" strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 23}`}
                    strokeDashoffset={`${2 * Math.PI * 23 * (1 - timerPct / 100)}`}
                    className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold tabular-nums">
                    {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold">Descansando...</p>
                <p className="text-xs text-white/60 mt-0.5">Serie {doneSeries}/{totalSeries} completada</p>
              </div>
              <button onClick={skipTimer}
                className="text-xs text-white/70 border border-white/20 rounded-lg px-3 py-2 flex-shrink-0 hover:bg-white/10">
                Saltar
              </button>
            </div>
          )}

          {timerDone && !timerRunning && (
            <div className="bg-ok text-white rounded-xl px-4 py-3 text-center">
              <p className="text-sm font-bold">✓ ¡A por la siguiente serie!</p>
            </div>
          )}

          {/* Series — diseño mejorado */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-bold uppercase tracking-widest text-muted">
                {doneSeries}/{totalSeries} series completadas
              </p>
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: totalSeries }).map((_, si) => {
                const s = log.sets[si]
                const isDone = si < doneSeries
                const isCurrent = si === doneSeries && !timerRunning && !log.done
                return (
                  <div key={si} className={`transition-all ${
                    isDone ? 'bg-ok/5' : isCurrent ? 'bg-bg' : 'opacity-35'
                  }`}>
                    {/* Label */}
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                        isDone ? 'bg-ok text-white' : isCurrent ? 'bg-ink text-white' : 'bg-bg-alt text-muted'
                      }`}>{isDone ? '✓' : si + 1}</div>
                      <p className={`text-xs font-semibold ${isCurrent ? 'text-ink' : 'text-muted'}`}>
                        {isDone ? `Serie ${si + 1} ✓` : isCurrent ? `Serie ${si + 1} — activa` : `Serie ${si + 1}`}
                      </p>
                    </div>
                    {/* Inputs */}
                    <div className="flex items-end px-4 pb-3 gap-2">
                      <div className="flex-1 text-center">
                        <p className="text-[9px] text-muted uppercase tracking-wider mb-0.5">kg</p>
                        <input type="number" inputMode="decimal" placeholder="—"
                          value={s?.weight || ''}
                          onChange={e => updateSet(activeIdx, si, 'weight', e.target.value)}
                          disabled={!isCurrent && !isDone}
                          aria-label={`Peso serie ${si + 1}`}
                          style={{ fontSize: isCurrent ? '28px' : '20px' }}
                          className={`w-full text-center font-serif font-bold bg-transparent outline-none disabled:opacity-50 ${
                            isCurrent ? 'text-ink' : isDone ? 'text-ok' : 'text-muted'
                          }`}
                        />
                      </div>
                      <p className="text-muted text-xl font-light pb-1 flex-shrink-0">×</p>
                      <div className="flex-1 text-center">
                        <p className="text-[9px] text-muted uppercase tracking-wider mb-0.5">reps</p>
                        <input type="number" inputMode="numeric" placeholder="—"
                          value={s?.reps || ''}
                          onChange={e => updateSet(activeIdx, si, 'reps', e.target.value)}
                          disabled={!isCurrent && !isDone}
                          aria-label={`Reps serie ${si + 1}`}
                          style={{ fontSize: isCurrent ? '28px' : '20px' }}
                          className={`w-full text-center font-serif font-bold bg-transparent outline-none disabled:opacity-50 ${
                            isCurrent ? 'text-ink' : isDone ? 'text-ok' : 'text-muted'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Botón */}
          {!timerRunning && (
            <button
              onClick={() => doneSeries < totalSeries ? markSeriesDone(activeIdx) : toggleExDone(activeIdx)}
              style={{ minHeight: '56px' }}
              className={`w-full rounded-2xl text-base font-bold active:scale-[0.98] transition-all ${
                log.done ? 'bg-ok/10 border-2 border-ok text-ok' : 'bg-ink text-white'
              }`}>
              {log.done ? '↩ Desmarcar'
                : doneSeries < totalSeries
                  ? `✓ Completar serie ${doneSeries + 1} de ${totalSeries}`
                  : '✓ Ejercicio completado'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-bg z-50 flex flex-col">
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

      {view === 'action' && (
        <footer className="bg-card border-t border-border p-3 flex gap-3 flex-shrink-0">
          <button disabled={activeIdx === 0} onClick={() => setActiveIdx(i => i - 1)}
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-border rounded-xl text-sm font-medium text-muted disabled:opacity-30"
            style={{ minHeight: '48px' }}>
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          {activeIdx < exercises.length - 1 ? (
            <button onClick={() => setActiveIdx(i => i + 1)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-ink text-white rounded-xl text-sm font-medium"
              style={{ minHeight: '48px' }}>
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => setView('finish')}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-ok text-white rounded-xl text-sm font-medium"
              style={{ minHeight: '48px' }}>
              <CheckCircle2 className="w-4 h-4" /> Finalizar
            </button>
          )}
        </footer>
      )}
    </div>
  )
}
