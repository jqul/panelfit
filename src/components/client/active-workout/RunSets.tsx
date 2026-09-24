import { useState, useEffect } from 'react'
import { Check, Play, Square } from 'lucide-react'
import { RunSpec } from '../../../types'
import { formatDuration, parseDuration, paceSecPerKm, formatPace, formatDistance } from '../../../lib/run'

interface RunSetState { done: boolean; timeSec?: number; distanceM?: number }
interface PrevRunSet { timeSec?: number; distanceM?: number }

interface Props {
  run: RunSpec
  totalSets: number
  sets: Record<number, RunSetState>
  prevSets: Record<number, PrevRunSet>
  onSetData: (si: number, patch: { timeSec?: number; distanceM?: number; isTest?: boolean }) => void
  onToggle: (si: number) => void
}

// Una fila por tirada: tiempo (a mano o con cronómetro) → ritmo al momento.
// En un test de tiempo fijo (Cooper) la fila pide la distancia alcanzada.
export function RunSets({ run, totalSets, sets, prevSets, onSetData, onToggle }: Props) {
  const isTest = !!run.durationSec
  const [running, setRunning] = useState<{ si: number; startedAt: number } | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [running])

  const stop = () => {
    if (!running) return
    const sec = Math.max(1, Math.round((Date.now() - running.startedAt) / 1000))
    onSetData(running.si, { timeSec: sec })
    setRunning(null)
  }

  const doneSets = Object.entries(sets).filter(([, s]) => s.done)
  const totalDist = doneSets.reduce((a, [, s]) => a + (s.distanceM || 0), 0)
  const timed = doneSets.filter(([, s]) => s.timeSec && s.distanceM)
  const timedDist = timed.reduce((a, [, s]) => a + (s.distanceM || 0), 0)
  const timedSec = timed.reduce((a, [, s]) => a + (s.timeSec || 0), 0)

  return (
    <div>
      <div className="grid grid-cols-[28px_1fr_108px_36px] gap-1 px-3 pb-1">
        <p className="text-[9px] uppercase text-muted font-bold text-center">{isTest ? 'Test' : 'Tirada'}</p>
        <p className="text-[9px] uppercase text-muted font-bold text-center">Objetivo</p>
        <p className="text-[9px] uppercase text-muted font-bold text-center">{isTest ? 'Metros' : 'Tiempo'}</p>
        <div />
      </div>

      {Array.from({ length: totalSets }, (_, si) => {
        const s = sets[si] || { done: false }
        const prev = prevSets[si]
        const isRunning = running?.si === si
        const liveSec = isRunning ? Math.max(0, Math.round((now - running!.startedAt) / 1000)) : undefined
        const pace = !isTest ? paceSecPerKm(s.timeSec || 0, run.distanceM) : paceSecPerKm(run.durationSec || 0, s.distanceM || 0)
        const prevPace = prev ? (isTest ? paceSecPerKm(run.durationSec || 0, prev.distanceM || 0) : paceSecPerKm(prev.timeSec || 0, run.distanceM)) : null

        return (
          <div key={si} className={`px-3 py-2.5 transition-colors ${s.done ? 'bg-ok/8' : ''}`}>
            <div className="grid grid-cols-[28px_1fr_108px_36px] gap-1 items-center">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mx-auto ${s.done ? 'bg-ok text-white' : 'bg-accent/10 text-accent'}`}>{si + 1}</div>

              <div className="text-center leading-tight">
                <p className="text-base font-bold">
                  {isTest ? `${formatDuration(run.durationSec!)} a tope` : formatDistance(run.distanceM)}
                </p>
                {!isTest && !!run.recoveryM && si < totalSets - 1 && (
                  <p className="text-[11px] text-muted">luego {formatDistance(run.recoveryM)} andando</p>
                )}
                {run.intensity && si === 0 && <p className="text-[10px] text-accent font-semibold">{run.intensity}</p>}
                {(s.done || s.timeSec || s.distanceM) && pace !== null && (
                  <p className="text-xs font-bold text-ok">{formatPace(pace)}</p>
                )}
                {prev && (prev.timeSec || prev.distanceM) && (
                  <p className="text-[10px] text-muted">
                    Anterior: {isTest ? formatDistance(prev.distanceM || 0) : formatDuration(prev.timeSec || 0)}{prevPace !== null && !isTest ? ` · ${formatPace(prevPace)}` : ''}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1">
                {isTest ? (
                  <input type="number" inputMode="numeric" defaultValue={s.distanceM || ''} placeholder="m"
                    onBlur={e => { const n = parseInt(e.target.value); onSetData(si, { distanceM: isNaN(n) || n <= 0 ? undefined : n, timeSec: run.durationSec, isTest: true }) }}
                    className={`w-full text-center text-base font-semibold py-2 rounded-xl border outline-none ${s.done ? 'bg-ok/10 border-ok/30 text-ok' : 'bg-bg border-border'}`} />
                ) : (
                  <>
                    <input key={isRunning ? `${si}-live-${liveSec}` : `${si}-${s.timeSec ?? ''}`} inputMode="numeric" placeholder="m:ss"
                      defaultValue={isRunning ? formatDuration(liveSec!) : s.timeSec ? formatDuration(s.timeSec) : ''}
                      readOnly={isRunning}
                      onBlur={e => { const t = parseDuration(e.target.value); if (t !== s.timeSec) onSetData(si, { timeSec: t }) }}
                      className={`w-full min-w-0 text-center text-base font-semibold py-2 rounded-xl border outline-none ${s.done ? 'bg-ok/10 border-ok/30 text-ok' : isRunning ? 'bg-accent/10 border-accent/40 text-accent' : 'bg-bg border-border'}`} />
                    <button type="button" onClick={() => (isRunning ? stop() : setRunning({ si, startedAt: Date.now() }))}
                      aria-label={isRunning ? 'Parar cronómetro' : 'Empezar cronómetro'}
                      className={`w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center active:scale-90 transition-all ${isRunning ? 'bg-warn text-white' : 'bg-accent/10 text-accent'}`}>
                      {isRunning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  </>
                )}
              </div>

              <button onClick={() => { if (isRunning) stop(); onToggle(si) }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all active:scale-90 ${s.done ? 'bg-ok text-white' : 'bg-bg border-2 border-border text-muted hover:border-ok'}`}>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      })}

      {doneSets.length > 0 && (
        <div className="mx-3 mb-3 mt-1 grid grid-cols-2 gap-2">
          <div className="bg-bg rounded-xl p-2.5 text-center">
            <p className="text-base font-bold text-accent">{formatDistance(isTest ? (sets[0]?.distanceM || 0) : totalDist)}</p>
            <p className="text-[9px] text-muted uppercase tracking-wider">{isTest ? 'Distancia' : 'Distancia total'}</p>
          </div>
          <div className="bg-bg rounded-xl p-2.5 text-center">
            <p className="text-base font-bold text-ink">{formatPace(paceSecPerKm(timedSec, timedDist))}</p>
            <p className="text-[9px] text-muted uppercase tracking-wider">Ritmo medio</p>
          </div>
        </div>
      )}
    </div>
  )
}
