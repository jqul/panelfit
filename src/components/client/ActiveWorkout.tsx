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
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mx-auto ${
        done ? 'bg-ok text-white' : isMain ? 'bg-accent/10 text-accent' : 'bg-bg-alt text-muted'
      }`}>{setNum}</div>

      <p className="text-xs text-muted text-center leading-tight">
        {prevWeight ? `${prevWeight}kg ×${prevReps}` : '—'}
      </p>

      <input
        type="number"
        inputMode="decimal"
        value={weight}
        onChange={e => setWeight(e.target.value)}
        onBlur={() => onCommit(weight, reps)}
        placeholder={prevWeight || '0'}
        className={`w-full text-center text-sm font-semibold py-2 rounded-xl border outline-none ${
          done ? 'bg-ok/10 border-ok/30 text-ok' : 'bg-bg border-border'
        }`}
      />

      <input
        type="number"
        inputMode="numeric"
        value={reps}
        on
