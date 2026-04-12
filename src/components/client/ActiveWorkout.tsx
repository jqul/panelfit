import { useState, useEffect, useRef, useCallback, memo } from 'react'
import {
  ChevronDown, Check, Clock, Trophy,
  Play, Pause, SkipForward, ChevronLeft,
  Plus, Dumbbell, Flame, Timer
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

// ── Timer descanso ────────────────────────────────────────
function RestTimer({ seconds, onDone, onSkip }: { seconds: number; onDone: () => void; onSkip: () => void }) {
  const [remaining, setRemaining] = useState(seconds)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || remaining <= 0) { if (remaining <= 0) onDone(); return }
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
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-white font-serif font-bold text-5xl tabular-nums">
            {min > 0 ? `${min}:${sec.toString().padStart(2, '0')}` : sec}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {[-30, -15, +15, +30].map(d => (
          <button key={d} onClick={() => setRemaining(r => Math.max(0, r + d))}
            className="px-3 py-2 bg-white/10 text-white rounded-xl text-xs font-semibold hover:bg-white/20">
            {d > 0 ? `+${d}s` : `${d}s`}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={() => setPaused(p => !p)}
          className="flex items-center gap-2 px-6 py-3.5 bg-white/10 text-white rounded-2xl text-sm font-semibold">
          {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          {paused ? 'Reanudar' : 'Pausar'}
        </button>
        <button onClick={onSkip}
          className="flex items-center gap-2 px-6 py-3.5 bg-white text-ink rounded-2xl text-sm font-bold">
          <SkipForward className="w-4 h-4" /> Saltar
        </button>
      </div>
    </div>
  )
}

// ── Fila de serie — componente aislado para evitar re-renders ─
interface SetRowProps {
  setNum: number
  initWeight: string
  initReps: string
  done: boolean
  prevWeight?: string
  prevReps?: string
  isMain: boolean
  onCommit: (weight: string, reps: string) => void
  onToggle: (weight: string, reps: string) => void
}

const SetRow = memo(({ setNum, initWeight, initReps, done, prevWeight, prevReps, isMain, onCommit, onToggle }: SetRowProps) => {
  const [weight, setWeight] = useState(initWeight)
  const [reps, setReps] = useState(initReps)

  return (
    <div className={`grid grid-cols-[32px_1fr_72px_72px_40px] gap-1 items-center px-3 py-2 transition-colors ${done ? 'bg-ok/8' : ''}`}>
      {/* N serie */}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mx-auto ${
        done ? 'bg-ok text-white' : isMain ? 'bg-accent/10 text-accent' : 'bg-bg-alt text-muted'
      }`}>{setNum}</div>

      {/* Anterior */}
      <p className="text-xs text-muted text-center leading-tight">
        {prevWeight ? `${prevWeight}kg\n×${prevReps}` : '—'}
      </p>

      {/* KG — estado local, no sube al padre hasta blur */}
      <input
        type="number"
        inputMode="decimal"
        value={weight}
        onChange={e => setWeight(e.target.value)}
        onBlur={() => onCommit(weight, reps)}
        placeholder={prevWeight || '0'}
        className={`w-full text-center text-sm font-semibold py-2 rounded-xl border outline-none transition-colors ${
          done ? 'bg-ok/10 border-ok/30 text-ok' : 'bg-bg border-border'
        }`}
      />

      {/* Reps — estado local */}
      <input
        type="number"
        inputMode="numeric"
        value={reps}
        onChange={e => setReps(e.target.value)}
        onBlur={() => onCommit(weight, reps)}
        placeholder={prevReps || '10'}
        className={`w-full text-center text-sm font-semibold py-2 rounded-xl border outline-none transition-colors ${
          done ? 'bg-ok/10 border-ok/30 text-ok' : 'bg-bg border-border'
        }`}
      />

      {/* Check */}
      <button
        onClick={() => onToggle(weight, reps)}
        className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all active:scale-90 ${
          done ? 'bg-ok text-white' : 'bg-bg border-2 border-border text-muted hover:border-ok'
        }`}>
        <Check className="w-4 h-4" />
      </button>
    </div>
  )
})

// ── Componente principal ──────────────────────────────────
export function ActiveWorkout({ plan, weekIdx, dayIdx, logs, onLogsChange, onFinish }: Props) {
  const day = plan.weeks[weekIdx]?.days[dayIdx]
  const dayKey = `w${weekIdx}_d${dayIdx}`

  // Estado de sets — solo done y valores commiteados
  type SetState = { weight: string; reps: string; done: boolean }
  const [sets, setSets] = useState<Record<number, Record<number, SetState>>>(() => {
    const initial: Record<number, Record<number, SetState>> = {}
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
  const startTime = useRef(Date.now())

  useEffect(() => {
    const t = setInterval(() => setElapsedSecs(Math.floor((Date.now() - startTime.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [])

  const formatElapsed = () => {
    const m = Math.floor(elapsedSecs / 60)
    const s = elapsedSecs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Guardar en logs cuando el usuario sale del input (onBlur)
  const commitSet = useCallback((ri: number, si: number, weight: string, reps: string) => {
    setSets(prev => ({
      ...prev,
      [ri]: { ...prev[ri], [si]: { ...prev[ri][si], weight, reps } }
    }))
    const key = `ex_${dayKey}_r${ri}`
    const today = new Date().toISOString().split('T')[0]
    const newLogs = {
      ...logs,
      [key]: {
        ...logs[key],
        sets: { ...(logs[key]?.sets || {}), [si]: { weight, reps } },
        done: logs[key]?.done || false,
        dateDone: today,
      }
    }
    onLogsChange(newLogs)
  }, [logs, dayKey, onLogsChange])

  // Marcar/desmarcar serie como hecha
  const toggleSet = useCallback((ri: number, si: number, weight: string, reps: string) => {
    const ex = day.exercises[ri]
    const { numSets } = parseSet(ex.sets)
    const today = new Date().toISOString().split('T')[0]

    setSets(prev => {
      const newDone = !prev[ri]?.[si]?.done
      const updated = {
        ...prev,
        [ri]: { ...prev[ri], [si]: { weight, reps, done: newDone } }
      }
      const allDone = Array.from({ length: numSets }, (_, i) => updated[ri][i]?.done).every(Boolean)
      const key = `ex_${dayKey}_r${ri}`
      const setsData: Record<number, { weight: string; reps: string }> = {}
      for (let i = 0; i < Math.max(numSets, Object.keys(updated[ri]).length); i++) {
        setsData[i] = { weight: updated[ri][i]?.weight || '', reps: updated[ri][i]?.reps || '' }
      }
      onLogsChange({ ...logs, [key]: { sets: setsData, done: allDone, dateDone: today } })
      return updated
    })

    if (!sets[ri]?.[si]?.done) {
      const restSecs = ex.isMain ? (plan.restMain || 180) : (plan.restAcc || 90)
      setRestTimer({ secs: restSecs })
    }
  }, [day, dayKey, logs, onLogsChange, plan, sets])

  const addSet = (ri: number) => {
    const ex = day.exercises[ri]
    const { numReps } = parseSet(ex.sets)
    setSets(prev => {
      const exSets = prev[ri] || {}
      const nextIdx = Object.keys(exSets).length
      const last = exSets[nextIdx - 1]
      return { ...prev, [ri]: { ...exSets, [nextIdx]: { weight: last?.weight || '', reps: last?.reps || String(numReps), done: false } } }
    })
  }

  const totalExs = day?.exercises.length || 0
  const doneExs = day?.exercises.filter((ex, ri) => {
    const { numSets } = parseSet(ex.sets)
    return Array.from({ length: numSets }, (_, si) => sets[ri]?.[si]?.done).every(Boolean)
  }).length || 0
  const pct = totalExs ? Math.round((doneExs / totalExs) * 100) : 0

  const totalVolume = Object.values(sets).reduce((acc, exSets) =>
    acc + Object.values(exSets).reduce((a, s) =>
      a + (s.done ? (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0) : 0), 0), 0)

  const totalSetsDone = Object.values(sets).reduce((acc, exSets) =>
    acc + Object.values(exSets).filter(s => s.done).length, 0)

  const isNewRecord = (ri: number) => {
    const key = `ex_${dayKey}_r${ri}`
    const currentBest = Math.max(0, ...Object.values(sets[ri] || {}).map(s => parseFloat(s.weight || '0')))
    const allPrevBest = Object.entries(logs)
      .filter(([k]) => k.includes(`_r${ri}`) && k !== key)
      .flatMap(([, log]) => Object.values(log.sets || {}).map((s: any) => parseFloat(s.weight || '0')))
    return currentBest > 0 && currentBest > Math.max(0, ...allPrevBest)
  }

  const getPrevSets = (ri: number) => {
    const key = `ex_${dayKey}_r${ri}`
    const prev = Object.entries(logs).find(([k, l]) => k.includes(`_r${ri}`) && k !== key && l.dateDone)
    return prev?.[1]?.sets || {}
  }

  if (!day) return null

  return (
    <div className="fixed inset-0 z-40 bg-bg flex flex-col">
      {restTimer && <RestTimer seconds={restTimer.secs} onDone={() => setRestTimer(null)} onSkip={() => setRestTimer(null)} />}

      {/* Header */}
      <div className="bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 px-4 py-3">
          <button onClick={() => setShowFinish(true)} className="p-2 rounded-xl hover:bg-bg-alt text-muted">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 font-semibold text-sm truncate">{day.title}</div>
          <div className="flex items-center gap-1 text-xs text-muted mr-2">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono font-semibold tabular-nums">{formatElapsed()}</span>
          </div>
          <button onClick={() => setShowFinish(true)}
            className="px-4 py-2 bg-accent text-white rounded-xl text-xs font-bold hover:opacity-90">
            Terminar
          </button>
        </div>
        <div className="flex items-center px-4 pb-3 gap-4 text-xs">
          <div><p className="text-muted">Duración</p><p className="font-bold text-accent tabular-nums">{formatElapsed()}</p></div>
          <div><p className="text-muted">Volumen</p><p className="font-bold">{totalVolume > 0 ? `${Math.round(totalVolume).toLocaleString()} kg` : '0 kg'}</p></div>
          <div><p className="text-muted">Series</p><p className="font-bold">{totalSetsDone}</p></div>
          <div className="flex-1 text-right">
            <p className="text-muted">{doneExs}/{totalExs} ejercicios</p>
            <div className="w-full h-1.5 bg-bg-alt rounded-full mt-1">
              <div className="h-full bg-ok rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Lista ejercicios */}
      <div className="flex-1 overflow-y-auto">
        {day.exercises.map((ex, ri) => {
          const { numSets, numReps } = parseSet(ex.sets)
          const exSets = sets[ri] || {}
          const totalExSets = Math.max(numSets, Object.keys(exSets).length)
          const allDone = Array.from({ length: totalExSets }, (_, si) => exSets[si]?.done).every(Boolean)
          const record = isNewRecord(ri)
          const prevSets = getPrevSets(ri)
          const ytId = ex.videoUrl ? getYTId(ex.videoUrl) : null
          const restSecs = ex.isMain ? (plan.restMain || 180) : (plan.restAcc || 90)
          const restMin = Math.floor(restSecs / 60)
          const restSecR = restSecs % 60

          return (
            <div key={ri} className="border-b border-border">
              {/* Header ejercicio */}
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
                <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" />
              </div>

              {ex.comment && <p className="mx-4 mb-2 text-xs text-muted leading-relaxed">{ex.comment}</p>}

              <div className="flex items-center gap-1.5 px-4 mb-3">
                <Timer className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs text-accent font-semibold">
                  Descanso: {restMin > 0 ? `${restMin}min ` : ''}{restSecR > 0 ? `${restSecR}s` : ''}
                </span>
              </div>

              {/* Cabecera columnas */}
              <div className="grid grid-cols-[32px_1fr_72px_72px_40px] gap-1 px-3 pb-1">
                <p className="text-[9px] uppercase text-muted font-bold text-center">N</p>
                <p className="text-[9px] uppercase text-muted font-bold text-center">Anterior</p>
                <p className="text-[9px] uppercase text-muted font-bold text-center">KG</p>
                <p className="text-[9px] uppercase text-muted font-bold text-center">Reps</p>
                <div />
              </div>

              {/* Filas de series — cada una es un componente memo independiente */}
              {Array.from({ length: totalExSets }, (_, si) => {
                const s = exSets[si] || { weight: '', reps: String(numReps), done: false }
                const prev = prevSets[si] as any
                return (
                  <SetRow
                    key={`${ri}-${si}`}
                    setNum={si + 1}
                    initWeight={s.weight}
                    initReps={s.reps}
                    done={s.done}
                    prevWeight={prev?.weight}
                    prevReps={prev?.reps}
                    isMain={ex.isMain}
                    onCommit={(w, r) => commitSet(ri, si, w, r)}
                    onToggle={(w, r) => toggleSet(ri, si, w, r)}
                  />
                )
              })}

              <button onClick={() => addSet(ri)}
                className="w-full flex items-center justify-center gap-2 py-3 text-muted hover:bg-bg-alt transition-colors text-sm font-medium">
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
