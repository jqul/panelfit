import { useState, useEffect, useRef, useCallback, memo } from 'react'
import {
  ChevronDown, Check, Clock, Trophy,
  Play, Pause, SkipForward, ChevronLeft,
  Plus, Dumbbell, Flame, Timer, Calculator, X, CheckCircle2, Zap, Video, Upload, Loader2
} from 'lucide-react'
import { TrainingPlan, TrainingLogs } from '../../types'
import { CalculadoraDiscos } from './CalculadoraDiscos'
import { supabase } from '../../lib/supabase'
import { rpeToTargetRIR, suggestNextLoad, estimate1RM, parsePercentWeight, resolveWeightFromPercent } from '../../lib/strength'
import { sendPush } from '../../lib/usePushNotifications'

interface Props {
  plan: TrainingPlan
  weekIdx: number
  dayIdx: number
  logs: TrainingLogs
  onLogsChange: (logs: TrainingLogs) => void
  onFinish: () => void
  trainerId?: string
}

function getYTId(url: string) {
  const m = url?.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

function parseSet(sets: string) {
  const m = sets?.match(/(\d+)[×x](\d+)/)
  return { numSets: m ? parseInt(m[1]) : 3, numReps: m ? parseInt(m[2]) : 10 }
}

// ── RIR (Repeticiones en Reserva) ─────────────────────────
// 0 = al fallo, 1-2 = casi al fallo, 3-4 = moderado, 5+ = fácil
const RIR_OPTIONS = [
  { value: 0, label: '0', desc: 'Al fallo', color: '#ef4444' },
  { value: 1, label: '1', desc: 'Casi al fallo', color: '#f97316' },
  { value: 2, label: '2', desc: 'Muy duro', color: '#f59e0b' },
  { value: 3, label: '3', desc: 'Duro', color: '#eab308' },
  { value: 4, label: '4', desc: 'Moderado', color: '#84cc16' },
  { value: 5, label: '5+', desc: 'Fácil', color: '#22c55e' },
]

// Autoregulación: si conocemos el RPE objetivo de la semana, comparamos el RIR
// real contra el RIR objetivo (igual que JuggernautAI). Sin RPE de plan, cae a
// una banda fija simple.
function getSuggestedWeightChange(rir: number | undefined, prevWeight?: string, weekRpe?: string): { pct: number; label: string; color: string } | null {
  if (rir === undefined || rir === null) return null

  const targetRIR = rpeToTargetRIR(weekRpe)
  const weight = parseFloat(prevWeight || '')
  if (targetRIR !== null && weight) {
    const s = suggestNextLoad(weight, rir, targetRIR)
    const color = s.direction === 'up' ? '#22c55e' : s.direction === 'down' ? '#ef4444' : '#f59e0b'
    const label = s.direction === 'up' ? `Subir +${s.deltaKg}kg` : s.direction === 'down' ? `Bajar -${s.deltaKg}kg` : 'Mantener peso'
    return { pct: s.direction === 'up' ? 5 : s.direction === 'down' ? -5 : 0, label, color }
  }

  if (rir <= 1) return { pct: -5, label: 'Bajar peso la próxima', color: '#ef4444' }
  if (rir <= 2) return { pct: 0, label: 'Mantener peso', color: '#f59e0b' }
  if (rir <= 3) return { pct: 2.5, label: 'Subir ligero', color: '#84cc16' }
  return { pct: 5, label: 'Subir peso', color: '#22c55e' }
}

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

// ── Selector RIR inline (aparece tras marcar check) ───────
function RirSelector({ value, onSelect, onClose }: { value: number | undefined; onSelect: (rir: number) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[55] bg-ink/60 flex items-end justify-center" onClick={onClose}>
      <div className="bg-card rounded-t-3xl w-full max-w-md p-5 space-y-3 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-1" />
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent" />
          <p className="text-sm font-bold">¿Cuánto te quedaba? (RIR)</p>
        </div>
        <p className="text-xs text-muted">Repeticiones en reserva — cuántas más podrías haber hecho</p>
        <div className="grid grid-cols-3 gap-2">
          {RIR_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => { onSelect(opt.value); onClose() }}
              className="flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all active:scale-95"
              style={{
                borderColor: value === opt.value ? opt.color : '#e5e7eb',
                backgroundColor: value === opt.value ? opt.color + '15' : 'transparent',
              }}>
              <span className="text-xl font-bold" style={{ color: opt.color }}>{opt.label}</span>
              <span className="text-[10px] text-muted text-center leading-tight">{opt.desc}</span>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full py-2.5 text-xs text-muted">Omitir</button>
      </div>
    </div>
  )
}

// ── Subida de vídeo de feedback (inspirado en TrueCoach) ──
function VideoFeedbackButton({ exerciseName, clientId, trainerId }: { exerciseName: string; clientId: string; trainerId: string }) {
  const [showModal, setShowModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const ext = file.name.split('.').pop() || 'mp4'
      const path = `${clientId}/${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('client-videos').upload(path, file)
      if (uploadErr) throw uploadErr
      const { data: urlData } = supabase.storage.from('client-videos').getPublicUrl(path)

      const row = {
        id: `vf_${Date.now()}`,
        trainer_id: trainerId,
        client_id: clientId,
        exercise_name: exerciseName,
        video_url: urlData.publicUrl,
        client_note: note.trim() || null,
        status: 'pendiente',
        created_at: Date.now(),
      }
      const { error: insertErr } = await supabase.from('video_feedback').insert(row)
      if (insertErr) throw insertErr

      setSent(true)
      setTimeout(() => { setShowModal(false); setSent(false); setNote('') }, 1800)
    } catch (e: any) {
      setError('No se pudo subir el vídeo. Inténtalo de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  if (!trainerId) return null

  return (
    <>
      <button onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-accent/10 text-accent active:scale-95 transition-all">
        <Video className="w-3 h-3" /> Pedir feedback
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[60] bg-ink/60 flex items-end justify-center" onClick={() => !uploading && setShowModal(false)}>
          <div className="bg-card rounded-t-3xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-1" />

            {sent ? (
              <div className="text-center py-6 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-ok mx-auto" />
                <p className="font-bold text-sm">Vídeo enviado a tu entrenador</p>
                <p className="text-xs text-muted">Te avisaremos cuando te comente la técnica</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-accent" />
                  <p className="text-sm font-bold">Vídeo de tu ejecución</p>
                </div>
                <p className="text-xs text-muted">Grábate haciendo {exerciseName} y tu entrenador te comentará la técnica</p>

                <input ref={fileRef} type="file" accept="video/*" capture="user" className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

                {uploading ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-accent">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-semibold">Subiendo vídeo...</span>
                  </div>
                ) : (
                  <>
                    <textarea value={note} onChange={e => setNote(e.target.value)}
                      placeholder="Nota para tu entrenador (opcional): ¿qué quieres que revise?"
                      rows={2}
                      className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none resize-none" />
                    <button onClick={() => fileRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-ink text-white rounded-2xl text-sm font-bold">
                      <Upload className="w-4 h-4" /> Grabar o elegir vídeo
                    </button>
                  </>
                )}
                {error && <p className="text-xs text-warn text-center">{error}</p>}
                {!uploading && (
                  <button onClick={() => setShowModal(false)} className="w-full py-2 text-xs text-muted">Cancelar</button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

interface SetRowProps {
  setNum: number
  initWeight: string
  initReps: string
  done: boolean
  rir?: number
  prevWeight?: string
  prevReps?: string
  prevRir?: number
  weekRpe?: string
  isMain: boolean
  onCommit: (weight: string, reps: string) => void
  onToggle: (weight: string, reps: string) => void
  onOpenCalc: (weight: string) => void
  onSetRir: (rir: number) => void
}

const SetRow = memo(({ setNum, initWeight, initReps, done, rir, prevWeight, prevReps, prevRir, weekRpe, isMain, onCommit, onToggle, onOpenCalc, onSetRir }: SetRowProps) => {
  const [weight, setWeight] = useState(initWeight)
  const [reps, setReps] = useState(initReps)
  const [showRir, setShowRir] = useState(false)

  const rirMeta = rir !== undefined ? RIR_OPTIONS.find(o => o.value === rir) : null
  const suggestion = prevRir !== undefined ? getSuggestedWeightChange(prevRir, prevWeight, weekRpe) : null

  return (
    <>
      {showRir && (
        <RirSelector value={rir} onSelect={onSetRir} onClose={() => setShowRir(false)} />
      )}
      <div className={`px-3 py-2 transition-colors ${done ? 'bg-ok/8' : ''}`}>
        <div className="grid grid-cols-[32px_1fr_80px_72px_40px] gap-1 items-center">
          {/* Nº serie */}
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mx-auto ${
            done ? 'bg-ok text-white' : isMain ? 'bg-accent/10 text-accent' : 'bg-bg-alt text-muted'
          }`}>{setNum}</div>

          {/* Anterior — con sugerencia de peso si hay RIR previo */}
          <div className="text-center leading-tight">
            <p className="text-xs text-muted">
              {prevWeight ? `${prevWeight}kg ×${prevReps}` : '—'}
            </p>
            {suggestion && (
              <p className="text-[9px] font-bold" style={{ color: suggestion.color }}>
                {suggestion.pct > 0 ? '↑' : suggestion.pct < 0 ? '↓' : '='} {suggestion.label}
              </p>
            )}
          </div>

          {/* KG — con botón calculadora */}
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              onBlur={() => onCommit(weight, reps)}
              placeholder={prevWeight || '0'}
              className={`w-full text-center text-sm font-semibold py-2 pr-6 rounded-xl border outline-none ${
                done ? 'bg-ok/10 border-ok/30 text-ok' : 'bg-bg border-border'
              }`}
            />
            <button
              type="button"
              onClick={() => onOpenCalc(weight)}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-accent transition-colors"
              title="Calculadora de discos">
              <Calculator className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reps */}
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={e => setReps(e.target.value)}
            onBlur={() => onCommit(weight, reps)}
            placeholder={prevReps || '10'}
            className={`w-full text-center text-sm font-semibold py-2 rounded-xl border outline-none ${
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

        {/* Badge RIR — aparece debajo de la fila cuando la serie está marcada como hecha */}
        {done && (
          <div className="flex items-center justify-end mt-1 pr-1">
            <button onClick={() => setShowRir(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-all active:scale-95"
              style={{
                backgroundColor: rirMeta ? rirMeta.color + '15' : '#f3f4f6',
                color: rirMeta ? rirMeta.color : '#9ca3af',
              }}>
              <Zap className="w-2.5 h-2.5" />
              {rirMeta ? `RIR ${rirMeta.label} · ${rirMeta.desc}` : 'Añadir RIR'}
            </button>
          </div>
        )}
      </div>
    </>
  )
})

const REACTION_EMOJIS = ['🔥', '💪', '😅', '😩', '👍']

export function ActiveWorkout({ plan, weekIdx, dayIdx, logs, onLogsChange, onFinish, trainerId }: Props) {
  const day = plan.weeks[weekIdx]?.days[dayIdx]
  const dayKey = `w${weekIdx}_d${dayIdx}`
  const [reactionEmoji, setReactionEmoji] = useState<string | null>(null)
  const [reactionComment, setReactionComment] = useState('')
  const [showReactionComment, setShowReactionComment] = useState(false)

  type SetState = { weight: string; reps: string; done: boolean; rir?: number }
  const [sets, setSets] = useState<Record<number, Record<number, SetState>>>(() => {
    const initial: Record<number, Record<number, SetState>> = {}
    day?.exercises.forEach((ex, ri) => {
      const key = `ex_${dayKey}_r${ri}`
      const log = logs[key]
      const { numSets, numReps } = parseSet(ex.sets)
      const totalSaved = Math.max(numSets, Object.keys(log?.sets || {}).length)
      initial[ri] = {}
      for (let si = 0; si < totalSaved; si++) {
        initial[ri][si] = {
          weight: log?.sets?.[si]?.weight || '',
          reps: log?.sets?.[si]?.reps || String(numReps),
          done: log?.done || false,
          rir: log?.sets?.[si]?.rir,
        }
      }
    })
    return initial
  })

  const logsRef = useRef(logs)
  useEffect(() => { logsRef.current = logs }, [logs])

  const [restTimer, setRestTimer] = useState<{ secs: number } | null>(null)
  const [elapsedSecs, setElapsedSecs] = useState(0)
  const [showFinish, setShowFinish] = useState(false)
  const [calcWeight, setCalcWeight] = useState<number | null>(null)
  const startTime = useRef(Date.now())
  const setsRef = useRef(sets)
  useEffect(() => { setsRef.current = sets }, [sets])

  useEffect(() => {
    const t = setInterval(() => setElapsedSecs(Math.floor((Date.now() - startTime.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [])

  const formatElapsed = () => {
    const m = Math.floor(elapsedSecs / 60)
    const s = elapsedSecs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const commitSet = useCallback((ri: number, si: number, weight: string, reps: string) => {
    setSets(prev => ({ ...prev, [ri]: { ...prev[ri], [si]: { ...prev[ri][si], weight, reps } } }))
    const key = `ex_${dayKey}_r${ri}`
    const today = new Date().toISOString().split('T')[0]
    const currentLogs = logsRef.current
    const prevRir = currentLogs[key]?.sets?.[si]?.rir
    onLogsChange({
      ...currentLogs,
      [key]: {
        ...currentLogs[key],
        sets: { ...(currentLogs[key]?.sets || {}), [si]: { weight, reps, ...(prevRir !== undefined ? { rir: prevRir } : {}) } },
        done: currentLogs[key]?.done || false,
        dateDone: today,
      }
    })
  }, [dayKey, onLogsChange])

  const setRir = useCallback((ri: number, si: number, rir: number) => {
    setSets(prev => ({ ...prev, [ri]: { ...prev[ri], [si]: { ...prev[ri][si], rir } } }))
    const key = `ex_${dayKey}_r${ri}`
    const currentLogs = logsRef.current
    const existingSet = currentLogs[key]?.sets?.[si] || { weight: '', reps: '' }
    onLogsChange({
      ...currentLogs,
      [key]: {
        ...currentLogs[key],
        sets: { ...(currentLogs[key]?.sets || {}), [si]: { ...existingSet, rir } },
      }
    })
  }, [dayKey, onLogsChange])

  const toggleSet = useCallback((ri: number, si: number, weight: string, reps: string) => {
    const ex = day.exercises[ri]
    const { numSets } = parseSet(ex.sets)
    const today = new Date().toISOString().split('T')[0]

    setSets(prev => {
      const newDone = !prev[ri]?.[si]?.done
      const updated = { ...prev, [ri]: { ...prev[ri], [si]: { weight, reps, done: newDone, rir: prev[ri]?.[si]?.rir } } }
      const totalSetsInEx = Math.max(numSets, Object.keys(updated[ri]).length); const allDone = Array.from({ length: totalSetsInEx }, (_, i) => updated[ri][i]?.done).every(Boolean)
      const key = `ex_${dayKey}_r${ri}`
      const setsData: Record<number, { weight: string; reps: string; rir?: number }> = {}
      for (let i = 0; i < Math.max(numSets, Object.keys(updated[ri]).length); i++) {
        setsData[i] = { weight: updated[ri][i]?.weight || '', reps: updated[ri][i]?.reps || '', ...(updated[ri][i]?.rir !== undefined ? { rir: updated[ri][i].rir } : {}) }
      }
      onLogsChange({ ...logsRef.current, [key]: { sets: setsData, done: allDone, dateDone: today } })
      return updated
    })

    // Iniciar timer de descanso solo si no tiene hideRest
    if (!setsRef.current[ri]?.[si]?.done && !ex.hideRest) {
      const restSecs = ex.restSets ?? (ex.isMain ? (plan.restMain || 180) : (plan.restAcc || 90))
      setRestTimer({ secs: restSecs })
    }
  }, [day, dayKey, onLogsChange, plan])

  const addSet = (ri: number) => {
    const { numReps } = parseSet(day.exercises[ri].sets)
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
    acc + Object.values(exSets).reduce((a, s) => a + (s.done ? (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0) : 0), 0), 0)
  const totalSetsDone = Object.values(sets).reduce((acc, exSets) => acc + Object.values(exSets).filter(s => s.done).length, 0)

  // Promedio de RIR de la sesión — útil como indicador de fatiga
  const allRirs = Object.values(sets).flatMap(exSets => Object.values(exSets).filter(s => s.done && s.rir !== undefined).map(s => s.rir as number))
  const avgRir = allRirs.length ? Math.round((allRirs.reduce((a, b) => a + b, 0) / allRirs.length) * 10) / 10 : null

  const isNewRecord = (ri: number) => {
    const currentBest = Math.max(0, ...Object.values(sets[ri] || {}).map(s => parseFloat(s.weight || '0')))
    const allPrevBest = Object.entries(logs)
      .filter(([k]) => k.includes(`_r${ri}`))
      .flatMap(([, log]) => Object.values(log.sets || {}).map((s: any) => parseFloat(s.weight || '0')))
    return currentBest > 0 && currentBest > Math.max(0, ...allPrevBest)
  }

  const getPrevSets = (ri: number) => {
    const key = `ex_${dayKey}_r${ri}`
    const prev = Object.entries(logs).find(([k, l]) => k.includes(`_r${ri}`) && k !== key && l.dateDone)
    return prev?.[1]?.sets || {}
  }

  // Mejor 1RM estimado histórico para un ejercicio (para programación por %1RM)
  const getBest1RM = (exName: string) => {
    let best = 0
    plan.weeks.forEach((week, wi) => {
      week.days.forEach((d, di) => {
        d.exercises.forEach((planEx, ei) => {
          if (planEx.name.toLowerCase() !== exName.toLowerCase()) return
          const log = logs[`ex_w${wi}_d${di}_r${ei}`]
          if (!log?.dateDone) return
          Object.values(log.sets || {}).forEach(s => {
            const rm = estimate1RM(parseFloat(s.weight) || 0, parseFloat(s.reps) || 0)
            if (rm > best) best = rm
          })
        })
      })
    })
    return best
  }

  if (!day) return null

  const allComplete = pct === 100

  return (
    <div className="fixed inset-0 z-40 bg-bg flex flex-col overflow-hidden">
      {restTimer && <RestTimer seconds={restTimer.secs} onDone={() => setRestTimer(null)} onSkip={() => setRestTimer(null)} />}
      {calcWeight !== null && <CalculadoraDiscos pesoObjetivo={calcWeight} onClose={() => setCalcWeight(null)} />}

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
          <button
            onClick={() => setShowFinish(true)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              allComplete
                ? 'bg-ok text-white shadow-md shadow-ok/30'
                : 'bg-accent text-white hover:opacity-90'
            }`}>
            {allComplete && <CheckCircle2 className="w-3.5 h-3.5" />}
            {allComplete ? '¡Terminar!' : 'Terminar'}
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center px-4 pb-3 gap-4 text-xs">
          <div><p className="text-muted">Duración</p><p className="font-bold text-accent tabular-nums">{formatElapsed()}</p></div>
          <div><p className="text-muted">Volumen</p><p className="font-bold">{totalVolume > 0 ? `${Math.round(totalVolume).toLocaleString()} kg` : '0 kg'}</p></div>
          <div><p className="text-muted">Series</p><p className="font-bold">{totalSetsDone}</p></div>
          {avgRir !== null && (
            <div><p className="text-muted">RIR medio</p><p className="font-bold" style={{ color: RIR_OPTIONS.find(o => Math.round(avgRir) === o.value)?.color || '#6e5438' }}>{avgRir}</p></div>
          )}
          <div className="flex-1 text-right">
            <p className="text-muted">{doneExs}/{totalExs} ejercicios</p>
            <div className="w-full h-1.5 bg-bg-alt rounded-full mt-1">
              <div className="h-full bg-ok rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Calentamiento si existe */}
      {(day.warmupExercises?.length || 0) > 0 && (
        <div className="bg-orange-50/60 border-b border-orange-100 px-4 py-3">
          <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" /> Calentamiento
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(day.warmupExercises || []).map((ex, i) => (
              <div key={i} className="flex-shrink-0 bg-white border border-orange-100 rounded-xl px-3 py-2 text-xs">
                <p className="font-semibold text-gray-700">{ex.name}</p>
                {ex.sets && <p className="text-orange-400">{ex.sets}{ex.weight ? ` · ${ex.weight}` : ''}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ejercicios */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
        {day.exercises.map((ex, ri) => {
          const { numSets, numReps } = parseSet(ex.sets)
          const exSets = sets[ri] || {}
          const totalExSets = Math.max(numSets, Object.keys(exSets).length)
          const allDone = Array.from({ length: totalExSets }, (_, si) => exSets[si]?.done).every(Boolean)
          const record = isNewRecord(ri)
          const prevSets = getPrevSets(ri)
          const ytId = ex.videoUrl ? getYTId(ex.videoUrl) : null
          const restSecs = ex.restSets ?? (ex.isMain ? (plan.restMain || 180) : (plan.restAcc || 90))
          const hideRest = ex.hideRest || false
          const restMin = Math.floor(restSecs / 60)
          const restSecR = restSecs % 60

          return (
            <div key={ri} className="border-b border-border">
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
                  {parsePercentWeight(ex.weight) !== null && (() => {
                    const best1RM = getBest1RM(ex.name)
                    const target = resolveWeightFromPercent(ex.weight, best1RM)
                    return target ? (
                      <p className="text-[10px] text-accent font-semibold mt-0.5">{ex.weight} ≈ {target}kg (según tu 1RM estimado)</p>
                    ) : (
                      <p className="text-[10px] text-muted mt-0.5">{ex.weight} — registra más series para calcular el peso</p>
                    )
                  })()}
                </div>
                <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" />
              </div>

              {ex.comment && <p className="mx-4 mb-2 text-xs text-muted italic leading-relaxed">"{ex.comment}"</p>}

              {/* Vídeo-feedback asíncrono */}
              {trainerId && (
                <div className="px-4 mb-3">
                  <VideoFeedbackButton exerciseName={ex.name} clientId={plan.clientId} trainerId={trainerId} />
                </div>
              )}

              {/* Descanso — solo si no está oculto */}
              {!hideRest && (
                <div className="flex items-center gap-1.5 px-4 mb-3">
                  <Timer className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs text-accent font-semibold">
                    Descanso: {restMin > 0 ? `${restMin}min ` : ''}{restSecR > 0 ? `${restSecR}s` : ''}
                  </span>
                </div>
              )}

              {/* Cabecera tabla */}
              <div className="grid grid-cols-[32px_1fr_80px_72px_40px] gap-1 px-3 pb-1">
                <p className="text-[9px] uppercase text-muted font-bold text-center">N</p>
                <p className="text-[9px] uppercase text-muted font-bold text-center">Anterior</p>
                <p className="text-[9px] uppercase text-muted font-bold text-center flex items-center justify-center gap-1">
                  KG <Calculator className="w-2.5 h-2.5 opacity-50" />
                </p>
                <p className="text-[9px] uppercase text-muted font-bold text-center">Reps</p>
                <div />
              </div>

              {Array.from({ length: totalExSets }, (_, si) => {
                const s = exSets[si] || { weight: '', reps: String(numReps), done: false }
                const prev = prevSets[si]
                return (
                  <SetRow
                    key={`${ri}-${si}`}
                    setNum={si + 1}
                    initWeight={s.weight}
                    initReps={s.reps}
                    done={s.done}
                    rir={s.rir}
                    prevWeight={prev?.weight}
                    prevReps={prev?.reps}
                    prevRir={prev?.rir}
                    weekRpe={plan.weeks?.[weekIdx]?.rpe}
                    isMain={ex.isMain}
                    onCommit={(w, r) => commitSet(ri, si, w, r)}
                    onToggle={(w, r) => toggleSet(ri, si, w, r)}
                    onOpenCalc={(w) => setCalcWeight(parseFloat(w) || 0)}
                    onSetRir={(rir) => setRir(ri, si, rir)}
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

        {/* Botón finalizar flotante al fondo — siempre visible */}
        <div className="px-4 py-6">
          <button
            onClick={() => setShowFinish(true)}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition-all ${
              allComplete
                ? 'bg-ok text-white shadow-lg shadow-ok/20'
                : 'bg-ink text-white hover:opacity-90'
            }`}
            style={{ minHeight: '56px' }}>
            {allComplete
              ? <><CheckCircle2 className="w-5 h-5" /> ¡Sesión completada! Terminar</>
              : <><X className="w-4 h-4" /> Terminar entrenamiento</>
            }
          </button>
        </div>

        <div className="h-8" />
      </div>

      {/* Modal confirmación terminar */}
      {showFinish && (
        <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm flex items-end">
          <div className="w-full bg-card rounded-t-3xl p-6 space-y-4">
            <div className="w-10 h-1 bg-border rounded-full mx-auto" />
            <h3 className="font-serif font-bold text-xl text-center">
              {allComplete ? '¡Sesión completada! 🏆' : '¿Terminar entrenamiento?'}
            </h3>
            {!allComplete && (
              <p className="text-sm text-muted text-center">
                Te quedan <span className="font-bold text-warn">{totalExs - doneExs} ejercicio{totalExs - doneExs !== 1 ? 's' : ''}</span> sin completar
              </p>
            )}
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
            {avgRir !== null && (
              <div className="flex items-center gap-2 bg-bg rounded-2xl px-4 py-3">
                <Zap className="w-4 h-4 text-accent flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted">RIR medio de la sesión</p>
                  <p className="text-sm font-bold">{avgRir} — {avgRir <= 1.5 ? 'Sesión muy intensa' : avgRir <= 3 ? 'Buena intensidad' : 'Margen de mejora'}</p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted text-center">¿Cómo te ha sentado?</p>
              <div className="flex justify-center gap-2">
                {REACTION_EMOJIS.map(emoji => (
                  <button key={emoji} onClick={() => { setReactionEmoji(emoji); setShowReactionComment(true) }}
                    className={`w-11 h-11 rounded-2xl text-xl flex items-center justify-center transition-all ${reactionEmoji === emoji ? 'bg-accent/15 ring-2 ring-accent' : 'bg-bg hover:bg-bg-alt'}`}>
                    {emoji}
                  </button>
                ))}
              </div>
              {showReactionComment && (
                <textarea value={reactionComment} onChange={e => setReactionComment(e.target.value)} rows={2}
                  placeholder="¿Algo que comentar? (opcional)"
                  className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none resize-none" />
              )}
            </div>
            <button onClick={async () => {
                if (allComplete && trainerId) sendPush({ trainerId }, 'Sesión completada 💪', `${day.title} terminado`)
                if (reactionEmoji) {
                  const today = new Date().toISOString().split('T')[0]
                  await supabase.from('session_reactions').insert({
                    clientId: plan.clientId, dayTitle: day.title, date: today,
                    emoji: reactionEmoji, comment: reactionComment.trim() || null,
                  })
                }
                onFinish()
              }}
              className={`w-full py-4 rounded-2xl font-bold text-base hover:opacity-90 active:scale-[0.98] transition-all ${
                allComplete ? 'bg-ok text-white' : 'bg-ink text-white'
              }`}>
              {allComplete ? '✓ Guardar y terminar' : 'Terminar igual'}
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
