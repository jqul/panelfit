import { useState, useEffect, ReactNode } from 'react'
import { Gauge, ChevronLeft, ChevronRight, Check, Plus, Minus, Clock, List, MoreHorizontal, ChevronUp, Trophy, Repeat, CornerLeftDown, Flame } from 'lucide-react'
import { Exercise } from '../../../types'
import { parseSet } from './utils'
import { RIR_OPTIONS, getSuggestedWeightChange, getTargetRangeLabel, velocityLossPct, tracksVelocity } from '../../../lib/strength'

export interface FocusSet { weight: string; reps: string; done: boolean; rir?: number; velocity?: number }
interface PrevSet { weight?: string; reps?: string; rir?: number }

interface Props {
  title: string
  clientName?: string
  elapsedLabel: string
  pct: number
  exercises: Exercise[]
  sets: Record<number, Record<number, FocusSet>>
  prevSets: (ri: number) => Record<number, PrevSet>
  weekRpe?: string
  showTarget: boolean
  ri: number
  si: number
  substitutionName: (ri: number) => string | undefined
  isRecord: (ri: number) => boolean
  onSelect: (ri: number, si: number) => void
  onBack: () => void
  onFinishClick: () => void
  onToggleView: () => void
  onCommit: (ri: number, si: number, weight: string, reps: string) => void
  onToggle: (ri: number, si: number, weight: string, reps: string) => void
  onSetRir: (ri: number, si: number, rir: number) => void
  onSetVelocity: (ri: number, si: number, velocity: number | undefined) => void
  onAddSet: (ri: number) => void
  onOpenCalc: (weight: string) => void
  renderMore: (ri: number) => ReactNode
  renderRun: (ri: number) => ReactNode
  topExtras?: ReactNode
  allComplete: boolean
}

const round1 = (n: number) => Math.round(n * 10) / 10
const fmt = (s: string) => s.replace('.', ',')

// Peso fijo que el entrenador ha puesto en el plan ("97.5kg", "100"). Si es un
// porcentaje, un rango o texto libre ("RPE 8", "70%") no es un peso que se pueda
// precargar y devuelve null.
export function prescribedWeight(w?: string): string | null {
  const m = (w || '').trim().match(/^(\d+(?:[.,]\d+)?)\s*(?:kg)?$/i)
  return m ? m[1].replace(',', '.') : null
}

function totalSets(ex: Exercise, exSets: Record<number, FocusSet>) {
  return Math.max(parseSet(ex.sets).numSets, Object.keys(exSets).length)
}

// Vista centrada en lo único que importa durante el entreno: la serie que toca
// ahora. Una serie a la vez con números grandes, un botón enorme para marcarla
// y todo lo demás (historial, sustituir, molestias, vídeo...) detrás de "Más".
// Usa los mismos manejadores que la vista de lista, así que lo que registra es
// idéntico — solo cambia cómo se presenta.
export function FocusWorkout(p: Props) {
  const ex = p.exercises[p.ri]
  const { numReps } = parseSet(ex.sets)
  const exSets = p.sets[p.ri] || {}
  const total = totalSets(ex, exSets)
  const cur: FocusSet = exSets[p.si] || { weight: '', reps: String(numReps), done: false }
  const prev = p.prevSets(p.ri)[p.si]
  const isRun = ex.kind === 'run' && !!ex.run

  // Si esta serie aún no tiene peso, se parte del de la serie anterior de hoy y,
  // en la primera, del de la última vez: lo normal es repetir carga, ahorra
  // teclear y lo que se ve en grande es justo lo que se registra al pulsar HECHO.
  const lastWeight = (() => {
    for (let i = p.si - 1; i >= 0; i--) if (exSets[i]?.weight) return exSets[i].weight
    return prescribedWeight(ex.weight) || prev?.weight || ''
  })()
  const [weight, setWeight] = useState(cur.weight || lastWeight)
  const [reps, setReps] = useState(cur.reps)
  const [velInput, setVelInput] = useState(cur.velocity !== undefined ? String(cur.velocity) : '')
  const [velOpen, setVelOpen] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showExtras, setShowExtras] = useState(false)
  useEffect(() => {
    setWeight(cur.weight || lastWeight)
    setReps(cur.reps)
    setVelInput(cur.velocity !== undefined ? String(cur.velocity) : '')
    setVelOpen(false)
    setShowMore(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.ri, p.si])

  const prevW = parseFloat(prev?.weight || '')
  const suggestion = prev?.rir !== undefined ? getSuggestedWeightChange(prev.rir, prev.weight, p.weekRpe) : null
  const targetRange = p.showTarget ? getTargetRangeLabel(prev?.weight, prev?.rir, p.weekRpe) : null

  const useSuggested = () => {
    if (!prevW) return
    const w = (p.showTarget && suggestion?.deltaKg)
      ? String(Math.max(0, suggestion.direction === 'up' ? prevW + suggestion.deltaKg : suggestion.direction === 'down' ? prevW - suggestion.deltaKg : prevW))
      : prev!.weight!
    const r = prev?.reps || reps
    setWeight(w); setReps(r); p.onCommit(p.ri, p.si, w, r)
  }
  const adjustWeight = (d: number) => {
    const v = String(Math.max(0, round1((parseFloat(weight) || 0) + d)))
    setWeight(v); p.onCommit(p.ri, p.si, v, reps)
  }
  const adjustReps = (d: number) => {
    const v = String(Math.max(0, (parseInt(reps) || 0) + d))
    setReps(v); p.onCommit(p.ri, p.si, weight, v)
  }

  // Velocidad media (VBT). Visible en el ejercicio principal; en los demás,
  // plegada tras "+ Velocidad" para no estorbar. La
  // pérdida se compara con la primera serie de hoy a la MISMA carga: al subir
  // peso la velocidad cae sin que eso sea fatiga.
  const firstVelocity = (() => {
    for (let i = 0; i < p.si; i++) {
      const s = exSets[i]
      if (s?.done && s.velocity !== undefined && s.weight === weight) return s.velocity
    }
    return undefined
  })()
  const lossPct = cur.velocity !== undefined && firstVelocity !== undefined ? velocityLossPct(cur.velocity, firstVelocity) : null
  const commitVelocity = () => {
    const num = parseFloat(velInput.replace(',', '.'))
    const v = isNaN(num) || num <= 0 ? undefined : Math.round(num * 100) / 100
    setVelInput(v !== undefined ? String(v) : '')
    if (v !== cur.velocity) p.onSetVelocity(p.ri, p.si, v)
  }
  // iOS Safari no quita el foco del campo al tocar un botón, y sin blur no hay
  // guardado: HECHO y el cambio de serie/ejercicio guardan lo pendiente antes.
  const select = (ri: number, si: number) => { commitVelocity(); p.onSelect(ri, si) }

  const firstUndone = (ri: number) => {
    const s = p.sets[ri] || {}
    const t = totalSets(p.exercises[ri], s)
    for (let i = 0; i < t; i++) if (!s[i]?.done) return i
    return Math.max(0, t - 1)
  }
  const exDone = (ri: number) => {
    const s = p.sets[ri] || {}
    const t = totalSets(p.exercises[ri], s)
    return t > 0 && Array.from({ length: t }, (_, i) => s[i]?.done).every(Boolean)
  }
  const goEx = (delta: number) => {
    const next = p.ri + delta
    if (next >= 0 && next < p.exercises.length) select(next, firstUndone(next))
  }

  const sub = p.substitutionName(p.ri)

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Cabecera mínima */}
      <div className="bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 px-4 py-3">
          <button onClick={p.onBack} aria-label="Volver" className="p-2 rounded-xl hover:bg-bg-alt text-muted"><ChevronLeft className="w-5 h-5" /></button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{p.title}</p>
            <p className="text-[11px] text-muted truncate">{p.clientName ? `Sesión de ${p.clientName} · ` : ''}Ejercicio {p.ri + 1} de {p.exercises.length}</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono font-semibold tabular-nums">{p.elapsedLabel}</span>
          </div>
          <button onClick={p.onToggleView} aria-label="Ver todos los ejercicios en lista" title="Ver lista completa"
            className="p-2 rounded-xl hover:bg-bg-alt text-muted"><List className="w-5 h-5" /></button>
          <button onClick={p.onFinishClick}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${p.allComplete ? 'bg-ok text-white' : 'bg-accent text-white'}`}>
            {p.allComplete ? '¡Terminar!' : 'Terminar'}
          </button>
        </div>
        <div className="h-1 bg-bg-alt"><div className="h-full bg-ok transition-all" style={{ width: `${p.pct}%` }} /></div>
        {/* Un punto por ejercicio: hecho / actual / pendiente */}
        <div className="flex gap-1.5 px-4 py-2.5 overflow-x-auto">
          {p.exercises.map((_, i) => (
            <button key={i} onClick={() => select(i, firstUndone(i))} aria-label={`Ir al ejercicio ${i + 1}`}
              className={`h-2 rounded-full flex-shrink-0 transition-all ${i === p.ri ? 'w-8 bg-ink' : exDone(i) ? 'w-4 bg-ok' : 'w-4 bg-border'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
        {p.topExtras && (
          <div className="px-4 pt-3">
            <button onClick={() => setShowExtras(s => !s)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-semibold text-muted">
              <span className="flex items-center gap-2"><Flame className="w-4 h-4 text-warn" /> Calentamiento y pruebas</span>
              {showExtras ? <ChevronUp className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {showExtras && <div className="mt-2 rounded-xl overflow-hidden border border-border">{p.topExtras}</div>}
          </div>
        )}

        {/* Ejercicio actual */}
        <div className="flex items-center gap-2 px-4 pt-5">
          <button onClick={() => goEx(-1)} disabled={p.ri === 0} aria-label="Ejercicio anterior"
            className="p-2 rounded-xl text-muted disabled:opacity-20 hover:bg-bg-alt"><ChevronLeft className="w-5 h-5" /></button>
          <div className="flex-1 min-w-0 text-center">
            <div className="flex items-center justify-center gap-2">
              <h2 className={`font-serif font-bold text-2xl leading-tight ${sub ? 'line-through text-muted text-lg' : ''}`}>{ex.name}</h2>
              {p.isRecord(p.ri) && <Trophy className="w-5 h-5 text-warn flex-shrink-0" />}
            </div>
            {sub && <p className="flex items-center justify-center gap-1.5 font-serif font-bold text-2xl text-warn"><Repeat className="w-5 h-5" /> {sub}</p>}
            <p className="text-xs text-muted mt-1">
              {ex.isMain && <span className="font-bold text-accent uppercase tracking-wider mr-2">Principal</span>}
              {ex.sets}{ex.weight ? ` · ${ex.weight}` : ''}
            </p>
          </div>
          <button onClick={() => goEx(1)} disabled={p.ri === p.exercises.length - 1} aria-label="Ejercicio siguiente"
            className="p-2 rounded-xl text-muted disabled:opacity-20 hover:bg-bg-alt"><ChevronRight className="w-5 h-5" /></button>
        </div>
        {ex.comment && <p className="px-6 mt-2 text-center text-xs text-muted italic leading-relaxed">"{ex.comment}"</p>}

        {isRun ? (
          <div className="mt-4">{p.renderRun(p.ri)}</div>
        ) : (
          <>
            <p className="text-center text-sm font-bold uppercase tracking-widest text-accent mt-6">Serie {p.si + 1} de {total}</p>

            {/* Peso y repeticiones, grandes */}
            <div className={`mx-4 mt-3 rounded-3xl border p-5 transition-colors ${cur.done ? 'bg-ok/10 border-ok/30' : 'bg-card border-border'}`}>
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => adjustWeight(-2.5)} aria-label="Quitar 2,5 kg" className="w-12 h-12 rounded-2xl bg-bg border border-border font-bold text-sm text-muted active:scale-90 transition-transform">−2,5</button>
                <div className="text-center min-w-0 flex-1">
                  <input type="number" inputMode="decimal" value={weight} aria-label={`Peso serie ${p.si + 1}`}
                    onChange={e => setWeight(e.target.value)} onBlur={() => p.onCommit(p.ri, p.si, weight, reps)}
                    placeholder={prev?.weight || '0'}
                    className="w-full text-center bg-transparent font-serif font-bold text-6xl outline-none tabular-nums" />
                  <p className="text-xs text-muted -mt-1">kg</p>
                </div>
                <button onClick={() => adjustWeight(2.5)} aria-label="Añadir 2,5 kg" className="w-12 h-12 rounded-2xl bg-bg border border-border font-bold text-sm text-muted active:scale-90 transition-transform">+2,5</button>
              </div>
              <div className="flex justify-center gap-2 mt-2">
                <button onClick={() => adjustWeight(-5)} className="px-3 py-1.5 rounded-xl text-xs font-bold text-muted bg-bg-alt active:scale-90 transition-transform">−5</button>
                <button onClick={() => adjustWeight(5)} className="px-3 py-1.5 rounded-xl text-xs font-bold text-muted bg-bg-alt active:scale-90 transition-transform">+5</button>
                <button onClick={() => p.onOpenCalc(weight)} className="px-3 py-1.5 rounded-xl text-xs font-bold text-muted bg-bg-alt active:scale-90 transition-transform">Discos</button>
              </div>

              <div className="flex items-center justify-center gap-4 mt-5">
                <button onClick={() => adjustReps(-1)} aria-label="Una repetición menos" className="w-11 h-11 rounded-2xl bg-bg border border-border flex items-center justify-center text-muted active:scale-90 transition-transform"><Minus className="w-4 h-4" /></button>
                <div className="text-center">
                  <input type="number" inputMode="numeric" value={reps} aria-label={`Repeticiones serie ${p.si + 1}`}
                    onChange={e => setReps(e.target.value)} onBlur={() => p.onCommit(p.ri, p.si, weight, reps)}
                    placeholder={prev?.reps || String(numReps)}
                    className="w-24 text-center bg-transparent font-serif font-bold text-5xl outline-none tabular-nums" />
                  <p className="text-xs text-muted -mt-1">reps</p>
                </div>
                <button onClick={() => adjustReps(1)} aria-label="Una repetición más" className="w-11 h-11 rounded-2xl bg-bg border border-border flex items-center justify-center text-muted active:scale-90 transition-transform"><Plus className="w-4 h-4" /></button>
              </div>

              {/* Referencia: la última vez y lo recomendado hoy */}
              {(prev?.weight || targetRange) && (
                <div className="mt-5 pt-4 border-t border-border/60 text-center space-y-1.5">
                  {prev?.weight && <p className="text-xs text-muted">Última vez: {fmt(prev.weight)} kg × {prev.reps}{prev.rir !== undefined ? ` · RIR ${prev.rir}` : ''}</p>}
                  {targetRange && <p className="text-sm font-bold" style={{ color: suggestion?.color || '#6e5438' }}>🎯 Recomendado hoy: {fmt(targetRange)}</p>}
                  {!cur.done && prev?.weight && (
                    <button onClick={useSuggested} className="inline-flex items-center gap-1 text-sm font-semibold text-accent py-1">
                      <CornerLeftDown className="w-3.5 h-3.5" /> Usar {targetRange ? 'lo recomendado' : 'lo de la última vez'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* RIR — repeticiones que te quedaban */}
            <div className="mx-4 mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted text-center mb-2">¿Cuántas te quedaban? (RIR)</p>
              <div className="flex gap-1.5 justify-center">
                {RIR_OPTIONS.map(o => {
                  const active = cur.rir !== undefined && Math.floor(cur.rir) === o.value
                  return (
                    <button key={o.value} onClick={() => p.onSetRir(p.ri, p.si, o.value)} aria-pressed={active}
                      className="flex-1 max-w-[72px] py-2 rounded-xl text-sm font-bold border-2 transition-all active:scale-95"
                      style={active ? { backgroundColor: o.color, borderColor: o.color, color: '#fff' } : { borderColor: '#e2ddd4', color: '#8a8278' }}>
                      {o.value}
                    </button>
                  )
                })}
              </div>
              {cur.rir !== undefined && <p className="text-center text-xs text-muted mt-1.5">{RIR_OPTIONS.find(o => o.value === Math.floor(cur.rir!))?.desc}</p>}
            </div>

            {tracksVelocity(ex) && (ex.isMain || velOpen || cur.velocity !== undefined ? (
              <div className="mx-4 mt-4 flex items-center justify-center gap-2">
                <Gauge className="w-4 h-4 text-muted" />
                <label htmlFor="focus-velocity" className="text-[11px] font-bold uppercase tracking-wider text-muted">Velocidad (m/s)</label>
                <input id="focus-velocity" type="number" inputMode="decimal" step="0.01" value={velInput} placeholder="0,45"
                  onChange={e => setVelInput(e.target.value)} onBlur={commitVelocity}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  className="w-20 text-center text-sm font-semibold py-1.5 rounded-xl border border-border bg-card outline-none focus:border-accent tabular-nums" />
                {lossPct !== null && lossPct > 0.5 && <span className="text-xs font-bold text-warn">−{lossPct}%</span>}
              </div>
            ) : (
              <div className="mx-4 mt-3 flex justify-center">
                <button onClick={() => setVelOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted py-1.5 px-3 rounded-full bg-bg-alt">
                  <Gauge className="w-3.5 h-3.5" /> + Velocidad
                </button>
              </div>
            ))}

            {/* Marcar hecha */}
            <div className="px-4 mt-5">
              <button onClick={() => { commitVelocity(); p.onToggle(p.ri, p.si, weight, reps) }}
                className={`w-full flex items-center justify-center gap-2 py-5 rounded-3xl font-bold text-lg active:scale-[0.98] transition-all ${
                  cur.done ? 'bg-bg-alt text-muted border border-border' : 'bg-ink text-white shadow-lg'
                }`} style={{ minHeight: '64px' }}>
                {cur.done ? 'Serie hecha · desmarcar' : <><Check className="w-6 h-6" /> HECHO</>}
              </button>
            </div>

            {/* Series del ejercicio */}
            <div className="mx-4 mt-6 bg-card border border-border rounded-2xl divide-y divide-border/60 overflow-hidden">
              {Array.from({ length: total }, (_, i) => {
                const s = exSets[i]
                const pv = p.prevSets(p.ri)[i]
                const active = i === p.si
                return (
                  <button key={i} onClick={() => select(p.ri, i)} aria-label={`Ir a la serie ${i + 1}`}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${active ? 'bg-accent/8' : ''}`}>
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${s?.done ? 'bg-ok text-white' : active ? 'bg-ink text-white' : 'bg-bg-alt text-muted'}`}>
                      {s?.done ? <Check className="w-4 h-4" /> : i + 1}
                    </span>
                    <span className={`flex-1 text-sm ${s?.done ? 'font-semibold' : 'text-muted'}`}>
                      {s?.weight ? `${fmt(s.weight)} kg × ${s.reps}` : pv?.weight ? `${fmt(pv.weight)} kg × ${pv.reps} (última vez)` : '—'}
                    </span>
                    {s?.rir !== undefined && <span className="text-xs font-bold text-muted">RIR {s.rir}</span>}
                    {active && <span className="text-xs font-bold text-accent">←</span>}
                  </button>
                )
              })}
              <button onClick={() => p.onAddSet(p.ri)} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-muted hover:bg-bg-alt">
                <Plus className="w-4 h-4" /> Añadir serie
              </button>
            </div>
          </>
        )}

        {/* Todo lo avanzado, bajo demanda */}
        <div className="mx-4 mt-6 mb-10">
          <button onClick={() => setShowMore(s => !s)} aria-expanded={showMore}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-border text-sm font-semibold text-muted hover:border-accent hover:text-accent transition-colors">
            <MoreHorizontal className="w-4 h-4" /> {showMore ? 'Ocultar opciones' : 'Más: historial, cambiar ejercicio, molestias, vídeo'}
          </button>
          {showMore && <div className="mt-3 -mx-4">{p.renderMore(p.ri)}</div>}
        </div>
      </div>
    </div>
  )
}
