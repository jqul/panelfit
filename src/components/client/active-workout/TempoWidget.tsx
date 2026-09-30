import { useState, useEffect, useMemo } from 'react'
import { Play, Pause } from 'lucide-react'
import { parseTempo } from '../../../lib/tempo'

// Pitido corto por transición de fase (Web Audio, sin audio externo) — mismo
// patrón que el aviso de fin de descanso en RestTimer.tsx. Tono más agudo al
// entrar en la fase explosiva: una señal auditiva distinta para "ahora empuja".
function beep(freq: number) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.start(); osc.stop(ctx.currentTime + 0.15)
    setTimeout(() => ctx.close(), 300)
  } catch {}
}

// Marcador visual de tempo/cadencia — pensado para seguirlo con el rabillo
// del ojo mientras se está en mitad de la repetición, no para leerlo. El
// entrenador lo fija una vez en el plan (ej. "3-1-1-0"); aquí solo se marca
// el ritmo en bucle mientras dura la serie, el cliente lo arranca y lo para
// cuando quiere.
export function TempoWidget({ tempo }: { tempo?: string }) {
  // Memoizado: si no, cada re-render del padre (el cronómetro de la sesión
  // recalcula cada segundo) crea un array nuevo, y al estar en las deps del
  // efecto de abajo lo reinicia constantemente antes de que llegue a contar
  // — el widget se quedaba congelado en la primera fase para siempre.
  const phases = useMemo(() => parseTempo(tempo), [tempo])
  const [running, setRunning] = useState(false)
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (!running || !phases) return
    const phase = phases[phaseIdx]

    if (phase.explosive) {
      // Fase explosiva: no hay cuenta atrás que marcar, solo un instante de
      // aviso ("¡YA!") antes de pasar a la siguiente fase.
      const t = setTimeout(() => {
        setPhaseIdx(i => {
          const next = (i + 1) % phases.length
          try { navigator.vibrate?.(next === 0 ? 60 : 25) } catch {}
          beep(phases[next].explosive ? 1100 : 660)
          return next
        })
      }, 500)
      return () => clearTimeout(t)
    }

    if (phase.seconds <= 0) {
      // Fase de 0s que no es explosiva (ej. "3-0-1-0") — pasar directamente.
      setPhaseIdx(i => (i + 1) % phases.length)
      return
    }

    if (secondsLeft <= 0) { setSecondsLeft(phase.seconds); return }

    const t = setTimeout(() => {
      if (secondsLeft <= 1) {
        setPhaseIdx(i => {
          const next = (i + 1) % phases.length
          try { navigator.vibrate?.(next === 0 ? 60 : 25) } catch {}
          beep(phases[next].explosive ? 1100 : 660)
          return next
        })
        setSecondsLeft(0)
      } else {
        setSecondsLeft(s => s - 1)
      }
    }, 1000)
    return () => clearTimeout(t)
  }, [running, phaseIdx, secondsLeft, phases])

  if (!phases) return null

  const phase = phases[phaseIdx]
  const toggle = () => {
    if (!running) { setPhaseIdx(0); setSecondsLeft(phases[0].seconds) }
    setRunning(r => !r)
  }

  return (
    <div className="mx-4 mb-3 rounded-xl border overflow-hidden" style={{ borderColor: phase.color + '40' }}>
      <div className="flex items-center gap-3 px-3 py-2" style={{ backgroundColor: phase.color + '12' }}>
        <button onClick={toggle}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white active:scale-90 transition-transform"
          style={{ backgroundColor: phase.color }}>
          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: phase.color }}>Tempo {tempo}</p>
          <p className="text-sm font-bold truncate">
            {running ? (phase.explosive ? '¡Explosivo!' : phase.label) : 'Toca para marcar el ritmo'}
          </p>
        </div>
        {running && (
          <p className="text-3xl font-mono font-bold tabular-nums flex-shrink-0 w-10 text-center" style={{ color: phase.color }}>
            {phase.explosive ? '⚡' : secondsLeft}
          </p>
        )}
      </div>
      {running && (
        <div className="h-1 bg-bg-alt">
          <div className="h-full transition-all duration-1000" style={{
            width: phase.explosive ? '100%' : `${((phase.seconds - secondsLeft) / phase.seconds) * 100}%`,
            backgroundColor: phase.color,
          }} />
        </div>
      )}
    </div>
  )
}
