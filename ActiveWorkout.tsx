import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ChevronDown, Check, Clock, Trophy,
  Play, Pause, SkipForward, ChevronLeft,
  Plus, Minus, Dumbbell, Flame, Timer, X
} from 'lucide-react'
import { TrainingPlan, TrainingLogs } from '../../types'

interface Props {
  plan: TrainingPlan
  weekIdx: number
  dayIdx: number
  logs: TrainingLogs
  onLogsChange: (logs: TrainingLogs) => void
  onFinish: () => void
}

function getYTId(url: string) {
  const m = url?.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

function parseSet(sets: string) {
  const m = sets?.match(/(\d+)[×x](\d+)/)
  return { numSets: m ? parseInt(m[1]) : 3, numReps: m ? parseInt(m[2]) : 10 }
}

// ── Timer de descanso ─────────────────────────────────────
function RestTimer({ seconds, onDone, onSkip }: { seconds: number; onDone: () => void; onSkip: () => void }) {
  const [remaining, setRemaining] = useState(seconds)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || remaining <= 0) {
      if (remaining <= 0) onDone()
      return
    }
    const t = setInterval(() => setRemaining(r => r - 1), 1000)
    return () => clearInterval(t)
  }, [remaining, paused])

  const pct = ((seconds - remaining) / seconds) * 100
  const min = Math.floor(remaining / 60)
  const sec = remaining % 60

  return (
    <div className="fixed inset-0 z-50 bg-ink/95 backdrop-blur-sm flex flex-col items-center justify-center gap-8 p-8">
      <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Descanso</p>

      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="white" strokeWidth="6"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct / 100)}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-white font-serif font-bold text-5xl tabular-nums">
            {min > 0 ? `${min}:${sec.toString().padStart(2, '0')}` : sec}
          </p>
          {min > 0 && <p className="text-white/40 text-xs mt-1">seg</p>}
        </div>
      </div>

      {/* Ajustes rápidos */}
      <div className="flex gap-2">
        {[-30, -15, +15, +30].map(d => (
          <button key={d} onClick={() => setRemaining(r => Math.max(0, r + d))}
            className="px-3 py-2 bg-white/10 text-white rounded-xl text-xs font-semibold hover:bg-white/20 active:bg-white/30 transition-colors">
            {d > 0 ? `+${d}s` : `${d}s`}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={() => setPaused(p => !p)}
          className="flex items-center gap-2 px-6 py-3.5 bg-white/10 text-white rounded-2xl text-sm font-semibold hover:bg-white/20 transition-colors">
          {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          {paused ? 'Reanudar' : 'Pausar'}
        </button>
        <button onClick={onSkip}
          className="flex items-center gap-2 px-6 py-3.5 bg-white text-ink rounded-2xl text-sm font-bold hover:opacity-90 active:scale-95 transition-all">
          <SkipForward className="w-4 h-4" /> Saltar
        </button>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────
export function ActiveWorkout({ plan, weekIdx, dayIdx, logs, onLogsChange, onFinish }: Props) {
  const day = plan.weeks[weekIdx]?.days[dayIdx]
  const dayKey = `w${weekIdx}_d${dayIdx}`

  // Estado de series: { [exIdx]: { [setIdx]: { weight, reps, done } } }
  const [sets, setSets] = useState<Record<number, Record<number, { weight: string; reps: string; done: boolean }>>>(() => {
    const initial: Record<number, Record<number, { weight: string; reps: string; done: boolean }>> = {}
    day?.exercises.forEach((ex, ri) => {
      const key = `ex_${dayKey}_r${ri}`
      const log = logs[key]
      const { numSets, numReps } = parseSet(ex.sets)
      initial[ri] = {}
      for (let si = 0; si < numSets; si++) {
        initial[ri][si] = {
          weight: log?.sets?.[si]?.weight || '',
          reps: log?.sets?.[si]?.reps || String(numReps),
          done: false,
        }
      }
    })
    return initial
  })

  const [restTimer, setRestTimer] = useState<{ secs: number } | null>(null)
  const [elapsedSecs, setElapsedSecs] = useState(0)
  const [showFinish, setShowFinish] = useState(false)
  const [totalVolume, setTotalVolume] = useState(0)
  const [totalSets, setTotalSets] = useState(0)
  const startTime = useRef(Date.now())
  const scrollRef = useRef<HTMLDivElement>(null)

  // Temporizador general
  useEffect(() => {
    const t = setInterval(() => setElapsedSecs(Math.floor((Date.now() - startTime.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [])

  const formatElapsed = () => {
    const m = Math.floor(elapsedSecs / 60)
    const s = elapsedSecs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Actualizar volumen y series totales
  useEffect(() => {
    let vol = 0, setsCount = 0
    Object.values(sets).forEach(exSets => {
      Object.values(exSets).forEach(s => {
        if (s.done) {
          vol += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)
          setsCount++
        }
      })
    })
    setTotalVolume(vol)
    setTotalSets(setsCount)
  }, [sets])

  // Actualizar logs sin cerrar teclado
  const updateSet = useCallback((ri: number, si: number, field: 'weight' | 'reps', value: string) => {
    setSets(prev => ({
      ...prev,
      [ri]: { ...prev[ri], [si]: { ...prev[ri][si], [field]: value } }
    }))
    // Sync a logs sin tocar el foco
    const key = `ex_${dayKey}_r${ri}`
    const today = new Date().toISOString().split('T')[0]
    const newLogs = {
      ...logs,
      [key]: {
        ...logs[key],
        sets: {
          ...(logs[key]?.sets || {}),
          [si]: {
            weight: field === 'weight' ? value : (logs[key]?.sets?.[si]?.weight || ''),
            reps: field === 'reps' ? value : (logs[key]?.sets?.[si]?.reps || ''),
          }
        },
        done: logs[key]?.done || false,
        dateDone: today,
      }
    }
    onLogsChange(newLogs)
  }, [logs, dayKey, onLogsChange])

  const toggleSetDone = useCallback((ri: number, si: number) => {
    const ex = day.exercises[ri]
    const { numSets } = parseSet(ex.sets)
    const today = new Date().toISOString().split('T')[0]

    setSets(prev => {
      const newSets = { ...prev, [ri]: { ...prev[ri], [si]: { ...prev[ri][si], done: !prev[ri][si]?.done } } }

      // Ver si el ejercicio está completado (todos los sets marcados)
      const allDone = Array.from({ length: numSets }, (_, i) => newSets[ri][i]?.done).every(Boolean)

      // Sync logs
      const key = `ex_${dayKey}_r${ri}`
      const setsData: Record<number, { weight: string; reps: string }> = {}
      for (let i = 0; i < numSets; i++) {
        setsData[i] = { weight: newSets[ri][i]?.weight || '', reps: newSets[ri][i]?.reps || '' }
      }
      const newLogs = {
        ...logs,
        [key]: { sets: setsData, done: allDone, dateDone: today }
      }
      onLogsChange(newLogs)

      return newSets
    })

    // Timer de descanso solo al marcar (no desmarcar)
    if (!sets[ri][si]?.done) {
      const restSecs = ex.isMain ? (plan.restMain || 180) : (plan.restAcc || 90)
      setRestTimer({ secs: restSecs })
    }
  }, [day, dayKey, logs, onLogsChange, plan, sets])

  const addSet = (ri: number) => {
    setSets(prev => {
      const exSets = prev[ri] || {}
      const nextIdx = Object.keys(exSets).length
      return { ...prev, [ri]: { ...exSets, [nextIdx]: { weight: '', reps: '10', done: false } } }
    })
  }

  // Stats
  const totalExs = day?.exercises.length || 0
  const doneExs = day?.exercises.filter((_, ri) => {
    const { numSets } = parseSet(day.exercises[ri].sets)
    return Array.from({ length: numSets }, (_, si) => sets[ri]?.[si]?.done).every(Boolean)
  }).length || 0
  const pct = totalExs ? Math.round((doneExs / totalExs) * 100) : 0

  const isNewRecord = (ri: number) => {
    const key = `ex_${dayKey}_r${ri}`
    const currentBest = Math.max(0, ...Object.values(sets[ri] || {}).map(s => parseFloat(s.weight || '0')))
    const allPrevBest = Object.entries(logs)
      .filter(([k]) => k.includes(`_r${ri}`) && k !== key)
      .flatMap(([, log]) => Object.values(log.sets || {}).map(s => parseFloat(s.weight || '0')))
    return currentBest > 0 && currentBest > Math.max(0, ...allPrevBest)
  }

  // Logs del entreno anterior para referencia
  const getPrevSets = (ri: number) => {
    const key = `ex_${dayKey}_r${ri}`
    const prev = Object.entries(logs).find(([k, l]) => k.includes(`_r${ri}`) && k !== key && l.dateDone)
    return prev?.[1]?.sets || {}
  }

  if (!day) return null

  return (
    <div className="fixed inset-0 z-40 bg-bg flex flex-col">
      {restTimer && (
        <RestTimer seconds={restTimer.secs} onDone={() => setRestTimer(null)} onSkip={() => setRestTimer(null)} />
      )}

      {/* Header estilo Hevy */}
      <div className="bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 px-4 py-3">
          <button onClick={() => setShowFinish(true)}
            className="p-2 rounded-xl hover:bg-bg-alt text-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 font-semibold text-sm truncate">{day.title}</div>
          <div className="flex items-center gap-1 text-xs text-muted mr-2">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono font-semibold tabular-nums">{formatElapsed()}</span>
          </div>
          <button onClick={() => setShowFinish(true)}
            className="px-4 py-2 bg-accent text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity">
            Terminar
          </button>
        </div>

        {/* Stats fila — igual que Hevy */}
        <div className="flex items-center px-4 pb-3 gap-6">
          <div>
            <p className="text-[10px] text-muted">Duración</p>
            <p className="text-sm font-bold text-accent tabular-nums">{formatElapsed()}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted">Volumen</p>
            <p className="text-sm font-bold">{totalVolume > 0 ? `${totalVolume.toLocaleString()} kg` : '0 kg'}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted">Series</p>
            <p className="text-sm font-bold">{totalSets}</p>
          </div>
          <div className="flex-1" />
          {/* Barra progreso */}
          <div className="text-right">
            <p className="text-[10px] text-muted">{doneExs}/{totalExs} ejercicios</p>
            <div className="w-24 h-1.5 bg-bg-alt rounded-full mt-1">
              <div className="h-full bg-ok rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Contenido — scroll */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {day.exercises.map((ex, ri) => {
          const { numSets, numReps } = parseSet(ex.sets)
          const exSets = sets[ri] || {}
          const allDone = Array.from({ length: Object.keys(exSets).length || numSets }, (_, si) => exSets[si]?.done).every(Boolean)
          const record = isNewRecord(ri)
          const prevSets = getPrevSets(ri)
          const ytId = ex.videoUrl ? getYTId(ex.videoUrl) : null
          const restSecs = ex.isMain ? (plan.restMain || 180) : (plan.restAcc || 90)
          const restMin = Math.floor(restSecs / 60)
          const restSecRem = restSecs % 60

          return (
            <div key={ri} className="border-b border-border">
              {/* Nombre ejercicio — estilo Hevy con imagen */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                {ytId ? (
                  <a href={ex.videoUrl} target="_blank" rel="noreferrer"
                    className="w-10 h-10 rounded-xl overflow-hidden border border-border flex-shrink-0">
                    <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`} className="w-full h-full object-cover" alt="" />
                  </a>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-bg-alt flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-5 h-5 text-muted" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold text-base ${allDone ? 'text-ok' : 'text-accent'}`}>{ex.name}</p>
                    {record && <Trophy className="w-4 h-4 text-warn flex-shrink-0" />}
                  </div>
                  {ex.isMain && <span className="text-[9px] text-accent font-bold uppercase tracking-wider">Principal</span>}
                </div>
                <button className="p-1.5 text-muted">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Indicaciones */}
              {ex.comment && (
                <p className="mx-4 mb-2 text-xs text-muted leading-relaxed">{ex.comment}</p>
              )}

              {/* Timer descanso */}
              <div className="flex items-center gap-1.5 px-4 mb-3">
                <Timer className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs text-accent font-semibold">
                  Descanso: {restMin > 0 ? `${restMin}min ` : ''}{restSecRem > 0 ? `${restSecRem}s` : ''}
                </span>
              </div>

              {/* Cabecera tabla series */}
              <div className="flex items-center gap-2 px-4 pb-1">
                <div className="w-8 text-center">
                  <p className="text-[9px] uppercase tracking-wider text-muted font-bold">Serie</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-[9px] uppercase tracking-wider text-muted font-bold">Anterior</p>
                </div>
                <div className="w-20 text-center flex-shrink-0">
                  <p className="text-[9px] uppercase tracking-wider text-muted font-bold">⊕ KG</p>
                </div>
                <div className="w-20 text-center flex-shrink-0">
                  <p className="text-[9px] uppercase tracking-wider text-muted font-bold">Reps</p>
                </div>
                <div className="w-8 flex-shrink-0" />
              </div>

              {/* Filas de series */}
              {Array.from({ length: Math.max(numSets, Object.keys(exSets).length) }, (_, si) => {
                const s = exSets[si] || { weight: '', reps: String(numReps), done: false }
                const prev = prevSets[si]

                return (
                  <div key={si}
                    className={`flex items-center gap-2 px-4 py-2 transition-colors ${s.done ? 'bg-ok/8' : ''}`}>

                    {/* Número serie */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      s.done ? 'bg-ok text-white' : 'bg-bg-alt text-muted'
                    }`}>{si + 1}</div>

                    {/* Anterior */}
                    <div className="flex-1 text-center">
                      <p className="text-xs text-muted">
                        {prev ? `${prev.weight}kg x ${prev.reps}` : '—'}
                      </p>
                    </div>

                    {/* KG — input directo sin botones para no cerrar teclado */}
                    <div className="w-20 flex-shrink-0">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={s.weight}
                        onChange={e => updateSet(ri, si, 'weight', e.target.value)}
                        placeholder={prev?.weight || '0'}
                        className={`w-full text-center text-sm font-semibold py-2 rounded-xl border outline-none transition-colors ${
                          s.done ? 'bg-ok/10 border-ok/30 text-ok' : 'bg-bg border-border'
                        }`}
                      />
                    </div>

                    {/* Reps */}
                    <div className="w-20 flex-shrink-0">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={s.reps}
                        onChange={e => updateSet(ri, si, 'reps', e.target.value)}
                        placeholder={prev?.reps || String(numReps)}
                        className={`w-full text-center text-sm font-semibold py-2 rounded-xl border outline-none transition-colors ${
                          s.done ? 'bg-ok/10 border-ok/30 text-ok' : 'bg-bg border-border'
                        }`}
                      />
                    </div>

                    {/* Check */}
                    <button onClick={() => toggleSetDone(ri, si)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
                        s.done ? 'bg-ok text-white' : 'bg-bg border-2 border-border text-muted hover:border-ok'
                      }`}>
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}

              {/* Añadir serie */}
              <button onClick={() => addSet(ri)}
                className="w-full flex items-center justify-center gap-2 py-3 text-muted hover:text-ink hover:bg-bg-alt transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" /> Agregar Serie
              </button>
            </div>
          )
        })}

        <div className="h-32" />
      </div>

      {/* Modal terminar */}
      {showFinish && (
        <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm flex items-end">
          <div className="w-full bg-card rounded-t-3xl p-6 space-y-4">
            <div className="w-10 h-1 bg-border rounded-full mx-auto" />
            <h3 className="font-serif font-bold text-xl text-center">¿Terminar entrenamiento?</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Clock className="w-4 h-4 text-accent" />, value: formatElapsed(), label: 'Duración' },
                { icon: <Dumbbell className="w-4 h-4 text-ok" />, value: `${doneExs}/${totalExs}`, label: 'Ejercicios' },
                { icon: <Flame className="w-4 h-4 text-warn" />, value: `${totalVolume > 0 ? Math.round(totalVolume).toLocaleString() : 0} kg`, label: 'Volumen' },
              ].map((s, i) => (
                <div key={i} className="bg-bg rounded-2xl p-3 text-center">
                  <div className="flex justify-center mb-1">{s.icon}</div>
                  <p className="font-serif font-bold text-base">{s.value}</p>
                  <p className="text-[10px] text-muted">{s.label}</p>
                </div>
              ))}
            </div>
            <button onClick={onFinish}
              className="w-full py-4 bg-ok text-white rounded-2xl font-bold text-base hover:opacity-90 active:scale-[0.98] transition-all">
              ✓ Terminar y guardar
            </button>
            <button onClick={() => setShowFinish(false)}
              className="w-full py-3 border border-border rounded-2xl text-sm font-medium text-muted hover:bg-bg-alt transition-colors">
              Seguir entrenando
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
