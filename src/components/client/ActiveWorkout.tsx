import { useState, useEffect, useRef } from 'react'
import {
  X, ChevronDown, ChevronUp, Check, Clock, Trophy,
  Play, Pause, SkipForward, Video, ExternalLink, ChevronLeft,
  Plus, Minus, Dumbbell, Flame
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
    if (paused) return
    if (remaining <= 0) { onDone(); return }
    const t = setInterval(() => setRemaining(r => r - 1), 1000)
    return () => clearInterval(t)
  }, [remaining, paused])

  const pct = ((seconds - remaining) / seconds) * 100
  const min = Math.floor(remaining / 60)
  const sec = remaining % 60

  return (
    <div className="fixed inset-0 z-50 bg-ink/90 backdrop-blur-sm flex flex-col items-center justify-center gap-6 p-8">
      <p className="text-white/60 text-sm font-semibold uppercase tracking-widest">Descanso</p>

      {/* Círculo timer */}
      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="white" strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct / 100)}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-white font-serif font-bold text-4xl">
            {min > 0 ? `${min}:${sec.toString().padStart(2, '0')}` : sec}
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <button onClick={() => setPaused(p => !p)}
          className="flex items-center gap-2 px-5 py-3 bg-white/10 text-white rounded-2xl text-sm font-semibold hover:bg-white/20 transition-colors">
          {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          {paused ? 'Reanudar' : 'Pausar'}
        </button>
        <button onClick={onSkip}
          className="flex items-center gap-2 px-5 py-3 bg-white text-ink rounded-2xl text-sm font-bold hover:opacity-90 transition-opacity">
          <SkipForward className="w-4 h-4" /> Saltar
        </button>
      </div>

      <div className="flex gap-3">
        {[-30, -15, +15, +30].map(d => (
          <button key={d} onClick={() => setRemaining(r => Math.max(0, r + d))}
            className="px-3 py-2 bg-white/10 text-white rounded-xl text-xs font-semibold hover:bg-white/20">
            {d > 0 ? `+${d}s` : `${d}s`}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Fila de serie estilo Hevy ─────────────────────────────
function SetRow({
  setNum, weight, reps, done, prevWeight, prevReps, isMain,
  onWeightChange, onRepsChange, onToggle
}: {
  setNum: number
  weight: string
  reps: string
  done: boolean
  prevWeight?: string
  prevReps?: string
  isMain: boolean
  onWeightChange: (v: string) => void
  onRepsChange: (v: string) => void
  onToggle: () => void
}) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 transition-colors ${done ? 'bg-ok/5' : ''}`}>
      {/* Nº serie */}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
        done ? 'bg-ok text-white' : isMain ? 'bg-accent/10 text-accent' : 'bg-bg-alt text-muted'
      }`}>{setNum}</div>

      {/* Anterior */}
      <div className="w-16 text-center flex-shrink-0">
        {prevWeight ? (
          <p className="text-xs text-muted leading-tight">{prevWeight}<br /><span className="text-[9px]">× {prevReps}</span></p>
        ) : (
          <p className="text-xs text-muted">—</p>
        )}
      </div>

      {/* Kg */}
      <div className="flex-1">
        <div className="flex items-center gap-1 bg-bg border border-border rounded-xl overflow-hidden">
          <button onClick={() => onWeightChange(String(Math.max(0, parseFloat(weight || '0') - 1.25)))}
            className="px-2 py-2.5 text-muted hover:text-ink active:bg-bg-alt transition-colors flex-shrink-0">
            <Minus className="w-3 h-3" />
          </button>
          <input type="number" value={weight} onChange={e => onWeightChange(e.target.value)}
            inputMode="decimal" placeholder="0"
            className="flex-1 text-center text-sm font-semibold bg-transparent outline-none min-w-0 py-2"
          />
          <button onClick={() => onWeightChange(String(parseFloat(weight || '0') + 1.25))}
            className="px-2 py-2.5 text-muted hover:text-ink active:bg-bg-alt transition-colors flex-shrink-0">
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <p className="text-[9px] text-muted text-center mt-0.5">kg</p>
      </div>

      {/* Reps */}
      <div className="flex-1">
        <div className="flex items-center gap-1 bg-bg border border-border rounded-xl overflow-hidden">
          <button onClick={() => onRepsChange(String(Math.max(1, parseInt(reps || '1') - 1)))}
            className="px-2 py-2.5 text-muted hover:text-ink active:bg-bg-alt transition-colors flex-shrink-0">
            <Minus className="w-3 h-3" />
          </button>
          <input type="number" value={reps} onChange={e => onRepsChange(e.target.value)}
            inputMode="numeric" placeholder="0"
            className="flex-1 text-center text-sm font-semibold bg-transparent outline-none min-w-0 py-2"
          />
          <button onClick={() => onRepsChange(String(parseInt(reps || '0') + 1))}
            className="px-2 py-2.5 text-muted hover:text-ink active:bg-bg-alt transition-colors flex-shrink-0">
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <p className="text-[9px] text-muted text-center mt-0.5">reps</p>
      </div>

      {/* Check */}
      <button onClick={onToggle}
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 ${
          done ? 'bg-ok text-white' : 'bg-bg border-2 border-border text-muted hover:border-ok hover:text-ok'
        }`}>
        <Check className="w-5 h-5" />
      </button>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────
export function ActiveWorkout({ plan, weekIdx, dayIdx, logs, onLogsChange, onFinish }: Props) {
  const day = plan.weeks[weekIdx]?.days[dayIdx]
  const dayKey = `w${weekIdx}_d${dayIdx}`
  const [localLogs, setLocalLogs] = useState<TrainingLogs>({ ...logs })
  const [openEx, setOpenEx] = useState<number>(0) // ejercicio expandido
  const [restTimer, setRestTimer] = useState<{ active: boolean; secs: number } | null>(null)
  const [elapsedSecs, setElapsedSecs] = useState(0)
  const [showFinish, setShowFinish] = useState(false)
  const startTime = useRef(Date.now())

  // Temporizador general del entreno
  useEffect(() => {
    const t = setInterval(() => setElapsedSecs(Math.floor((Date.now() - startTime.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [])

  const formatElapsed = () => {
    const m = Math.floor(elapsedSecs / 60)
    const s = elapsedSecs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const getExKey = (ri: number) => `ex_${dayKey}_r${ri}`

  const updateSet = (ri: number, si: number, field: 'weight' | 'reps', value: string) => {
    const key = getExKey(ri)
    const today = new Date().toISOString().split('T')[0]
    const updated: TrainingLogs = {
      ...localLogs,
      [key]: {
        ...localLogs[key],
        sets: { ...(localLogs[key]?.sets || {}), [si]: { weight: field === 'weight' ? value : (localLogs[key]?.sets?.[si]?.weight || ''), reps: field === 'reps' ? value : (localLogs[key]?.sets?.[si]?.reps || '') } },
        done: localLogs[key]?.done || false,
        dateDone: today,
      }
    }
    setLocalLogs(updated)
    onLogsChange(updated)
  }

  const toggleSet = (ri: number, si: number) => {
    const key = getExKey(ri)
    const today = new Date().toISOString().split('T')[0]
    const ex = day.exercises[ri]
    const { numSets } = parseSet(ex.sets)
    const currentSets = localLogs[key]?.sets || {}
    const allSetsChecked = Array.from({ length: numSets }, (_, i) => currentSets[i])
      .filter(Boolean).length === numSets

    // Si es el último set que falta, marcar ejercicio como done
    const setsFilledCount = Object.values(currentSets).filter(s => s.weight || s.reps).length
    const isDone = si === numSets - 1 || setsFilledCount >= numSets - 1

    const updated: TrainingLogs = {
      ...localLogs,
      [key]: {
        ...localLogs[key],
        sets: { ...currentSets, [si]: { weight: currentSets[si]?.weight || '', reps: currentSets[si]?.reps || '' } },
        done: isDone,
        dateDone: today,
      }
    }
    setLocalLogs(updated)
    onLogsChange(updated)

    // Arrancar timer de descanso
    const restSecs = ex.isMain ? (plan.restMain || 180) : (plan.restAcc || 90)
    setRestTimer({ active: true, secs: restSecs })

    // Auto-pasar al siguiente ejercicio
    if (isDone && ri < day.exercises.length - 1) {
      setTimeout(() => setOpenEx(ri + 1), 300)
    }
  }

  const totalExs = day.exercises.length
  const doneExs = day.exercises.filter((_, ri) => localLogs[getExKey(ri)]?.done).length
  const pct = Math.round((doneExs / totalExs) * 100)

  // Records personales
  const isNewRecord = (ri: number) => {
    const key = getExKey(ri)
    const sets = Object.values(localLogs[key]?.sets || {})
    const currentBest = Math.max(...sets.map(s => parseFloat(s.weight || '0')))
    // Comparar con logs de días anteriores
    const allPrevBest = Object.entries(logs)
      .filter(([k]) => k.includes(`_r${ri}`) && k !== key)
      .flatMap(([, log]) => Object.values(log.sets || {}).map(s => parseFloat(s.weight || '0')))
    const prevBest = Math.max(0, ...allPrevBest)
    return currentBest > 0 && currentBest > prevBest
  }

  if (!day) return null

  return (
    <div className="fixed inset-0 z-40 bg-bg flex flex-col">
      {/* Timer de descanso overlay */}
      {restTimer?.active && (
        <RestTimer
          seconds={restTimer.secs}
          onDone={() => setRestTimer(null)}
          onSkip={() => setRestTimer(null)}
        />
      )}

      {/* Header */}
      <div className="bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => setShowFinish(true)}
            className="p-2 rounded-xl hover:bg-bg-alt text-muted hover:text-ink transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{day.title}</p>
            {day.focus && <p className="text-xs text-muted truncate">{day.focus}</p>}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono font-semibold">{formatElapsed()}</span>
          </div>
          <button onClick={() => setShowFinish(true)}
            className="px-3 py-2 bg-ok text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity">
            Terminar
          </button>
        </div>

        {/* Barra progreso */}
        <div className="px-4 pb-3">
          <div className="flex justify-between text-[10px] text-muted mb-1.5">
            <span>{doneExs}/{totalExs} ejercicios</span>
            <span className="font-bold text-ok">{pct}%</span>
          </div>
          <div className="h-2 bg-bg-alt rounded-full overflow-hidden">
            <div className="h-full bg-ok rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Lista ejercicios */}
      <div className="flex-1 overflow-y-auto">
        {day.exercises.map((ex, ri) => {
          const key = getExKey(ri)
          const log = localLogs[key]
          const { numSets, numReps } = parseSet(ex.sets)
          const isDone = log?.done
          const isOpen = openEx === ri
          const record = isNewRecord(ri)
          const ytId = ex.videoUrl ? getYTId(ex.videoUrl) : null

          // Sets previos (del último entreno con este ejercicio)
          const prevLog = Object.entries(logs).find(([k, l]) => k.includes(`_r${ri}`) && k !== key && l.dateDone)
          const prevSets = prevLog?.[1]?.sets || {}

          return (
            <div key={ri} className={`border-b border-border transition-colors ${isDone ? 'bg-ok/3' : ''}`}>
              {/* Header ejercicio */}
              <div
                className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-bg-alt transition-colors"
                onClick={() => setOpenEx(isOpen ? -1 : ri)}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  isDone ? 'bg-ok text-white' : ex.isMain ? 'bg-accent/10 text-accent' : 'bg-bg-alt text-muted'
                }`}>
                  {isDone ? <Check className="w-4 h-4" /> : ri + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{ex.name}</p>
                    {record && <Trophy className="w-3.5 h-3.5 text-warn flex-shrink-0" />}
                    {ex.isMain && <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-bold uppercase flex-shrink-0">Principal</span>}
                  </div>
                  <p className="text-xs text-muted">{ex.sets}{ex.weight ? ` · ${ex.weight}` : ''}</p>
                </div>

                {/* Miniatura vídeo */}
                {ytId && (
                  <a href={ex.videoUrl} target="_blank" rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="w-12 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-border">
                    <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`} className="w-full h-full object-cover" alt="" />
                  </a>
                )}

                {isOpen ? <ChevronUp className="w-4 h-4 text-muted flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" />}
              </div>

              {/* Sets expandidos */}
              {isOpen && (
                <div className="pb-2">
                  {/* Descripción */}
                  {ex.comment && (
                    <div className="mx-4 mb-2 p-3 bg-accent/5 border border-accent/20 rounded-xl">
                      <p className="text-xs text-ink/70 leading-relaxed">{ex.comment}</p>
                    </div>
                  )}

                  {/* Cabecera columnas */}
                  <div className="flex items-center gap-2 px-4 pb-1">
                    <div className="w-7 flex-shrink-0" />
                    <div className="w-16 text-center flex-shrink-0">
                      <p className="text-[9px] uppercase tracking-wider text-muted font-bold">Anterior</p>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-[9px] uppercase tracking-wider text-muted font-bold">Kg</p>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-[9px] uppercase tracking-wider text-muted font-bold">Reps</p>
                    </div>
                    <div className="w-10 flex-shrink-0" />
                  </div>

                  {/* Filas de series */}
                  {Array.from({ length: numSets }, (_, si) => {
                    const s = log?.sets?.[si] || {}
                    const prev = prevSets[si]
                    return (
                      <SetRow
                        key={si}
                        setNum={si + 1}
                        weight={s.weight || ''}
                        reps={s.reps || String(numReps)}
                        done={!!(log?.done && si <= numSets - 1)}
                        prevWeight={prev?.weight}
                        prevReps={prev?.reps}
                        isMain={ex.isMain}
                        onWeightChange={v => updateSet(ri, si, 'weight', v)}
                        onRepsChange={v => updateSet(ri, si, 'reps', v)}
                        onToggle={() => toggleSet(ri, si)}
                      />
                    )
                  })}

                  {/* Vídeos adicionales */}
                  {(ex.videoUrls || []).filter(u => u !== ex.videoUrl).length > 0 && (
                    <div className="px-4 pt-2 flex gap-2 flex-wrap">
                      {(ex.videoUrls || []).filter(u => u !== ex.videoUrl).map((url, vi) => {
                        const id = getYTId(url)
                        return id ? (
                          <a key={vi} href={url} target="_blank" rel="noreferrer"
                            className="w-16 h-10 rounded-lg overflow-hidden border border-border">
                            <img src={`https://img.youtube.com/vi/${id}/default.jpg`} className="w-full h-full object-cover" alt="" />
                          </a>
                        ) : null
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        <div className="h-32" />
      </div>

      {/* Modal finalizar */}
      {showFinish && (
        <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm flex items-end">
          <div className="w-full bg-card rounded-t-3xl p-6 space-y-4">
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-2" />
            <h3 className="font-serif font-bold text-xl text-center">¿Terminar entrenamiento?</h3>

            {/* Resumen */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Clock className="w-4 h-4 text-accent" />, value: formatElapsed(), label: 'Duración' },
                { icon: <Dumbbell className="w-4 h-4 text-ok" />, value: `${doneExs}/${totalExs}`, label: 'Ejercicios' },
                { icon: <Flame className="w-4 h-4 text-warn" />, value: `${pct}%`, label: 'Completado' },
              ].map((s, i) => (
                <div key={i} className="bg-bg rounded-2xl p-3 text-center">
                  <div className="flex justify-center mb-1">{s.icon}</div>
                  <p className="font-serif font-bold text-lg">{s.value}</p>
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
