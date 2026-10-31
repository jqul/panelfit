import { useState, memo } from 'react'
import { Check, Zap, Gauge, CornerLeftDown } from 'lucide-react'
import { RIR_OPTIONS, getSuggestedWeightChange, getTargetRangeLabel, velocityLossPct } from '../../../lib/strength'
import { RirSelector } from './RirSelector'

interface SetRowProps {
  setNum: number
  initWeight: string
  initReps: string
  done: boolean
  rir?: number
  velocity?: number
  firstVelocity?: number  // velocidad de la primera serie de este ejercicio en la sesión — referencia para el % de pérdida
  prevWeight?: string
  prevReps?: string
  prevRir?: number
  weekRpe?: string
  isMain: boolean
  /** Lo que pide el plan para esta serie, p. ej. "8" o "6-8 @2" (reps @RIR). */
  planLabel?: string
  /** La serie que se está editando (o la siguiente que toca): solo ella enseña los ajustes rápidos. */
  activa?: boolean
  onActivar?: () => void
  showVelocity?: boolean  // anotar velocidad de barra (VBT); por defecto solo en ejercicios principales
  showTarget?: boolean  // "pesos sugeridos" — el entrenador puede desactivarlo en Ajustes
  onCommit: (weight: string, reps: string) => void
  onToggle: (weight: string, reps: string) => void
  onOpenCalc: (weight: string) => void
  onSetRir: (rir: number) => void
  onSetVelocity: (velocity: number | undefined) => void
}

// Una serie de la vista de lista, en una sola línea (nº · plan y lo anterior · kg · reps · ✓) para ver la rutina
// entera de un vistazo. Los ajustes rápidos (±2,5/±5 kg, ±1 rep, discos, repetir lo anterior) solo aparecen debajo
// de la serie activa, en vez de repetirse en todas.
export const SetRow = memo(({ setNum, initWeight, initReps, done, rir, velocity, firstVelocity, prevWeight, prevReps, prevRir, weekRpe, isMain, planLabel, activa = false, onActivar, showVelocity = isMain, showTarget = true, onCommit, onToggle, onOpenCalc, onSetRir, onSetVelocity }: SetRowProps) => {
  const [weight, setWeight] = useState(initWeight)
  const [reps, setReps] = useState(initReps)
  const [showRir, setShowRir] = useState(false)
  const [editingVelocity, setEditingVelocity] = useState(false)
  const [velocityInput, setVelocityInput] = useState('')

  // % de pérdida de velocidad frente a la primera serie de este ejercicio en la
  // sesión — indicador de fatiga neuromuscular (VBT) para autorregular el corte
  // de la serie (potencia: -10% · hipertrofia atlética: -20/-30%).
  const lossPct = velocity !== undefined && firstVelocity !== undefined ? velocityLossPct(velocity, firstVelocity) : null
  const lossColor = lossPct !== null && lossPct >= 20 ? '#ef4444' : lossPct !== null && lossPct >= 10 ? '#f59e0b' : null

  const commitVelocity = () => {
    const num = parseFloat(velocityInput)
    onSetVelocity(isNaN(num) || num <= 0 ? undefined : Math.round(num * 100) / 100)
    setEditingVelocity(false)
  }

  // Math.floor porque un RIR fraccionario (1.5) no calza con ningún o.value
  // entero — sin esto, la insignia perdía el color/descripción y volvía a
  // mostrar "Añadir RIR" como si no se hubiera registrado nada.
  const rirMeta = rir !== undefined ? RIR_OPTIONS.find(o => o.value === Math.floor(rir)) : null
  const suggestion = prevRir !== undefined ? getSuggestedWeightChange(prevRir, prevWeight, weekRpe) : null

  // Rango objetivo para hoy a partir de la autorregulación (ej. "75-77.5 kg")
  // — null si el entrenador ha desactivado "pesos sugeridos" en Ajustes.
  const prevW = parseFloat(prevWeight || '')
  const targetRange = showTarget ? getTargetRangeLabel(prevWeight, prevRir, weekRpe) : null

  // "Rellenar con anterior": con pesos sugeridos activos, copia el objetivo
  // calculado; si no, simplemente repite el peso de la vez anterior (el
  // entrenador prefiere ajustar él mismo la progresión, no un algoritmo).
  const fillFromPrevious = () => {
    if (!prevW) return
    const w = (showTarget && suggestion?.deltaKg)
      ? String(Math.max(0, suggestion.direction === 'up' ? prevW + suggestion.deltaKg : suggestion.direction === 'down' ? prevW - suggestion.deltaKg : prevW))
      : prevWeight!
    const r = prevReps || reps
    setWeight(w); setReps(r); onCommit(w, r)
  }

  // El 85% de los ajustes de carga entre series o semanas son de ±2.5kg o
  // ±5kg (el paso de disco más pequeño habitual, solo o doble) — botones
  // directos para esos dos saltos en vez de forzar a abrir el teclado del
  // sistema con las manos sudadas o con magnesio.
  const round1 = (n: number) => Math.round(n * 10) / 10
  const adjustWeight = (delta: number) => {
    const v = String(Math.max(0, round1((parseFloat(weight || prevWeight || '') || 0) + delta)))
    setWeight(v); onCommit(v, reps)
  }
  const adjustReps = (delta: number) => {
    const v = String(Math.max(0, (parseInt(reps) || 0) + delta))
    setReps(v); onCommit(weight, v)
  }

  // Casillas planas, sin borde: lo de la última vez va de fondo (placeholder) y el borde solo marca la serie activa
  const casilla = `w-full text-center text-[15px] font-semibold tabular-nums py-1.5 rounded-lg border outline-none placeholder:text-muted/50 placeholder:font-medium focus:border-accent ${
    done ? 'bg-transparent border-transparent text-ok' : activa ? 'bg-bg-alt border-accent/60' : 'bg-bg-alt/70 border-transparent'
  }`
  const paso = 'min-w-[36px] h-8 px-2 flex items-center justify-center text-xs font-bold rounded-lg bg-bg-alt text-muted active:scale-90 transition-transform'

  return (
    <>
      {showRir && (
        <RirSelector value={rir} onSelect={onSetRir} onClose={() => setShowRir(false)} />
      )}
      <div className={`px-3 py-1 transition-colors ${done ? 'bg-ok/10' : ''}`} onFocusCapture={onActivar}>
        <div className="grid grid-cols-[28px_1fr_72px_56px_36px] gap-1.5 items-center">
          {/* Nº serie */}
          <button type="button" onClick={onActivar} aria-label={`Ajustes de la serie ${setNum}`} tabIndex={-1}
            className={`h-7 flex items-center justify-center text-sm font-bold tabular-nums ${
              done ? 'text-ok' : activa ? 'text-accent' : 'text-muted'
            }`}>{setNum}</button>

          {/* Lo que pide el plan ("8 @2"); lo de la última vez va de fondo en las casillas */}
          <p className="text-sm text-muted text-center truncate min-w-0">{planLabel || (prevWeight ? `${prevWeight}×${prevReps}` : '—')}</p>

          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            onBlur={() => onCommit(weight, reps)}
            placeholder={prevWeight || '—'}
            aria-label={`Peso serie ${setNum}`}
            className={casilla}
          />

          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={e => setReps(e.target.value)}
            onBlur={() => onCommit(weight, reps)}
            placeholder={prevReps || '10'}
            aria-label={`Repeticiones serie ${setNum}`}
            className={casilla}
          />

          {/* Check */}
          <button
            onClick={() => onToggle(weight, reps)}
            aria-label={done ? `Marcar serie ${setNum} como no hecha` : `Marcar serie ${setNum} como hecha`}
            className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all active:scale-90 ${
              done ? 'bg-ok text-white' : 'bg-bg-alt text-muted hover:text-ok'
            }`}>
            <Check className="w-4 h-4" />
          </button>
        </div>

        {/* Ajustes rápidos: solo en la serie activa */}
        {activa && !done && (
          <div className="mt-1.5 space-y-1.5" role="group" aria-label={`Ajustes rápidos de la serie ${setNum}`}>
            <div className="flex items-center gap-1 flex-wrap">
              <button type="button" onClick={() => adjustWeight(-5)} className={paso} aria-label="Quitar 5 kg">−5</button>
              <button type="button" onClick={() => adjustWeight(-2.5)} className={paso} aria-label="Quitar 2,5 kg">−2,5</button>
              <button type="button" onClick={() => adjustWeight(2.5)} className={paso} aria-label="Añadir 2,5 kg">+2,5</button>
              <button type="button" onClick={() => adjustWeight(5)} className={paso} aria-label="Añadir 5 kg">+5</button>
              <span className="w-px h-6 bg-border mx-0.5" aria-hidden />
              <button type="button" onClick={() => adjustReps(-1)} className={paso} aria-label="Una repetición menos">−1 rep</button>
              <button type="button" onClick={() => adjustReps(1)} className={paso} aria-label="Una repetición más">+1 rep</button>
              <button type="button" onClick={() => onOpenCalc(weight)} className={paso}>Discos</button>
            </div>
            {(prevWeight || targetRange) && (
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                {targetRange && <span className="font-bold" style={{ color: suggestion?.color || 'var(--color-accent)' }} title="Objetivo de hoy">🎯 Hoy: {targetRange}</span>}
                {prevWeight && (
                  <button type="button" onClick={fillFromPrevious}
                    className="flex items-center gap-0.5 font-semibold text-accent active:scale-95 transition-transform py-1" style={{ minHeight: '28px' }}>
                    <CornerLeftDown className="w-3 h-3" /> {targetRange && suggestion?.deltaKg ? 'Usar lo recomendado' : `Repetir ${prevWeight}×${prevReps}`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Badges RIR / Velocidad (VBT) — aparecen debajo de la fila cuando la serie está marcada como hecha */}
        {done && (
          <div className="flex items-center justify-end gap-1.5 mt-1 pr-1 flex-wrap">
            {showVelocity && (
              editingVelocity ? (
                <input
                  type="number" inputMode="decimal" step="0.01" autoFocus
                  value={velocityInput}
                  onChange={e => setVelocityInput(e.target.value)}
                  onBlur={commitVelocity}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  placeholder="m/s"
                  aria-label="Velocidad en m/s"
                  className="w-16 text-center text-[11px] font-semibold py-1 rounded-full border border-accent outline-none"
                />
              ) : (
                <button
                  onClick={() => { setVelocityInput(velocity !== undefined ? String(velocity) : ''); setEditingVelocity(true) }}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95"
                  style={{
                    backgroundColor: velocity !== undefined ? (lossColor ? lossColor + '15' : 'color-mix(in srgb, var(--color-accent) 12%, transparent)') : 'var(--color-bg-alt)',
                    color: velocity !== undefined ? (lossColor || 'var(--color-accent)') : 'var(--color-muted)',
                  }}>
                  <Gauge className="w-2.5 h-2.5" />
                  {velocity !== undefined ? `${velocity} m/s${lossPct !== null && lossPct > 0.5 ? ` (-${lossPct}%)` : ''}` : '+ Velocidad'}
                </button>
              )
            )}
            <button onClick={() => setShowRir(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95"
              style={{
                backgroundColor: rirMeta ? rirMeta.color + '15' : 'var(--color-bg-alt)',
                color: rirMeta ? rirMeta.color : 'var(--color-muted)',
              }}>
              <Zap className="w-2.5 h-2.5" />
              {rirMeta ? `RIR ${rir} · ${rirMeta.desc}` : 'Añadir RIR'}
            </button>
          </div>
        )}
      </div>
    </>
  )
})
