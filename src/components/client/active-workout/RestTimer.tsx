import { useState, useEffect } from 'react'
import { Play, Pause, Check } from 'lucide-react'
import { NextSetInfo } from './utils'

// Aviso de fin de descanso — vibración + dos pitidos cortos (sin audio externo,
// solo Web Audio API). En iOS no hay Vibration API, pero el pitido sí suena.
function notifyRestDone() {
  try { navigator.vibrate?.(200) } catch {}
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const beep = (start: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.001, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.25)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + 0.25)
    }
    beep(0); beep(0.3)
    setTimeout(() => ctx.close(), 700)
  } catch {}
}

interface Props {
  seconds: number
  next: NextSetInfo | null
  onDone: () => void
  onSkip: () => void
}

// HUD de descanso — "modo tarima": pensado para leerse de pie, a 1-2 metros,
// con el móvil apoyado en el suelo o en el rack entre series pesadas. Todo lo
// que hace falta saber está aquí sin tener que agacharse ni desbloquear nada
// más: cuánto queda de descanso y qué serie viene (peso × reps objetivo).
export function RestTimer({ seconds, next, onDone, onSkip }: Props) {
  const [remaining, setRemaining] = useState(seconds)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || remaining <= 0) { if (remaining <= 0) { notifyRestDone(); onDone() }; return }
    const t = setInterval(() => setRemaining(r => r - 1), 1000)
    return () => clearInterval(t)
  }, [remaining, paused])

  const pct = ((seconds - remaining) / seconds) * 100
  const min = Math.floor(remaining / 60)
  const sec = remaining % 60

  return (
    <div className="fixed inset-0 z-50 bg-ink/95 backdrop-blur-sm flex flex-col items-center justify-center gap-6 p-6">
      <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Descanso</p>

      {next && (
        <div className="w-full max-w-sm bg-white/10 border border-white/15 rounded-2xl px-5 py-3.5 text-center">
          <p className="text-white/60 text-[11px] font-bold uppercase tracking-wider">
            {next.exerciseName} · Serie {next.setNum} de {next.totalSets}
          </p>
          <p className="text-white font-mono font-bold text-2xl tabular-nums mt-1">
            {next.weight ? `${next.weight}kg` : '—'} × {next.reps}
          </p>
          {next.targetLabel && (
            <p className="text-accent2 text-xs font-semibold mt-0.5">🎯 objetivo: {next.targetLabel}</p>
          )}
        </div>
      )}

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

      <div className="w-full max-w-sm flex flex-col gap-2.5">
        <button onClick={onSkip}
          className="w-full flex items-center justify-center gap-2 py-4 bg-white text-ink rounded-2xl text-base font-bold active:scale-[0.98] transition-transform"
          style={{ minHeight: '56px' }}>
          <Check className="w-5 h-5" /> Listo, siguiente serie
        </button>
        <button onClick={() => setPaused(p => !p)}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/10 text-white rounded-xl text-sm font-semibold">
          {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          {paused ? 'Reanudar' : 'Pausar'}
        </button>
      </div>
    </div>
  )
}
