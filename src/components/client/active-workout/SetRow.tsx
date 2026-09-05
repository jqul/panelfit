import { useState, memo } from 'react'
import { ChevronUp, ChevronDown, Check, Calculator, Zap, Gauge, CornerLeftDown } from 'lucide-react'
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
  onCommit: (weight: string, reps: string) => void
  onToggle: (weight: string, reps: string) => void
  onOpenCalc: (weight: string) => void
  onSetRir: (rir: number) => void
  onSetVelocity: (velocity: number | undefined) => void
}

export const SetRow = memo(({ setNum, initWeight, initReps, done, rir, velocity, firstVelocity, prevWeight, prevReps, prevRir, weekRpe, isMain, onCommit, onToggle, onOpenCalc, onSetRir, onSetVelocity }: SetRowProps) => {
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
  const prevW = parseFloat(prevWeight || '')
  const targetRange = getTargetRangeLabel(prevWeight, prevRir, weekRpe)

  // "Rellenar con anterior": copia el objetivo sugerido (o si no hay, la serie previa tal cual)
  const fillFromPrevious = () => {
    if (!prevW) return
    const w = suggestion?.deltaKg
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
    const v = String(Math.max(0, round1((parseFloat(weight) || 0) + delta)))
    setWeight(v); onCommit(v, reps)
  }

  return (
    <>
      {showRir && (
        <RirSelector value={rir} onSelect={onSetRir} onClose={() => setShowRir(false)} />
      )}
      <div className={`px-3 py-2 transition-colors ${done ? 'bg-ok/8' : ''}`}>
        <div className="grid grid-cols-[28px_1fr_100px_60px_36px] gap-1 items-center">
          {/* Nº serie */}
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mx-auto ${
            done ? 'bg-ok text-white' : isMain ? 'bg-accent/10 text-accent' : 'bg-bg-alt text-muted'
          }`}>{setNum}</div>

          {/* Anterior + objetivo sugerido para hoy */}
          <div className="text-center leading-tight">
            <p className="text-xs text-muted">
              {prevWeight ? `${prevWeight}kg ×${prevReps}` : '—'}
            </p>
            {targetRange && (
              <p className="text-[9px] font-bold" style={{ color: suggestion?.color || '#6e5438' }} title="Objetivo de hoy">
                🎯 {targetRange}
              </p>
            )}
            {!done && prevWeight && (
              <button type="button" onClick={fillFromPrevious}
                className="mt-0.5 flex items-center gap-0.5 mx-auto text-[9px] font-semibold text-accent active:scale-95 transition-transform">
                <CornerLeftDown className="w-2.5 h-2.5" /> Usar
              </button>
            )}
          </div>

          {/* KG — pasos rápidos ±2.5/±5 (el 85% de los ajustes reales) y calculadora */}
          <div className="flex flex-col items-stretch gap-1">
            <div className="flex gap-0.5">
              <button type="button" onClick={() => adjustWeight(5)} tabIndex={-1}
                className="flex-1 h-6 flex items-center justify-center text-[10px] font-bold rounded-md text-muted hover:text-accent hover:bg-accent/10 active:scale-90 transition-all">
                +5
              </button>
              <button type="button" onClick={() => adjustWeight(2.5)} tabIndex={-1}
                className="flex-1 h-6 flex items-center justify-center text-[10px] font-bold rounded-md text-muted hover:text-accent hover:bg-accent/10 active:scale-90 transition-all">
                +2.5
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                onBlur={() => onCommit(weight, reps)}
                placeholder={prevWeight || '0'}
                className={`w-full text-center text-sm font-semibold py-1.5 pr-6 rounded-xl border outline-none ${
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
            <div className="flex gap-0.5">
              <button type="button" onClick={() => adjustWeight(-2.5)} tabIndex={-1}
                className="flex-1 h-6 flex items-center justify-center text-[10px] font-bold rounded-md text-muted hover:text-accent hover:bg-accent/10 active:scale-90 transition-all">
                -2.5
              </button>
              <button type="button" onClick={() => adjustWeight(-5)} tabIndex={-1}
                className="flex-1 h-6 flex items-center justify-center text-[10px] font-bold rounded-md text-muted hover:text-accent hover:bg-accent/10 active:scale-90 transition-all">
                -5
              </button>
            </div>
          </div>

          {/* Reps — con paso rápido +/- */}
          <div className="flex flex-col items-stretch gap-0.5">
            <button type="button" onClick={() => { const v = String(Math.max(0, (parseInt(reps) || 0) + 1)); setReps(v); onCommit(weight, v) }}
              className="h-4 flex items-center justify-center text-muted hover:text-accent active:scale-90 transition-all" tabIndex={-1}>
              <ChevronUp className="w-3 h-3" />
            </button>
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={e => setReps(e.target.value)}
              onBlur={() => onCommit(weight, reps)}
              placeholder={prevReps || '10'}
              className={`w-full text-center text-sm font-semibold py-1.5 rounded-xl border outline-none ${
                done ? 'bg-ok/10 border-ok/30 text-ok' : 'bg-bg border-border'
              }`}
            />
            <button type="button" onClick={() => { const v = String(Math.max(0, (parseInt(reps) || 0) - 1)); setReps(v); onCommit(weight, v) }}
              className="h-4 flex items-center justify-center text-muted hover:text-accent active:scale-90 transition-all" tabIndex={-1}>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* Check */}
          <button
            onClick={() => onToggle(weight, reps)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all active:scale-90 ${
              done ? 'bg-ok text-white' : 'bg-bg border-2 border-border text-muted hover:border-ok'
            }`}>
            <Check className="w-4 h-4" />
          </button>
        </div>

        {/* Badges RIR / Velocidad (VBT) — aparecen debajo de la fila cuando la serie está marcada como hecha */}
        {done && (
          <div className="flex items-center justify-end gap-1.5 mt-1 pr-1 flex-wrap">
            {isMain && (
              editingVelocity ? (
                <input
                  type="number" inputMode="decimal" step="0.01" autoFocus
                  value={velocityInput}
                  onChange={e => setVelocityInput(e.target.value)}
                  onBlur={commitVelocity}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  placeholder="m/s"
                  className="w-16 text-center text-[10px] font-semibold py-1 rounded-full border border-accent outline-none"
                />
              ) : (
                <button
                  onClick={() => { setVelocityInput(velocity !== undefined ? String(velocity) : ''); setEditingVelocity(true) }}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-all active:scale-95"
                  style={{
                    backgroundColor: velocity !== undefined ? (lossColor ? lossColor + '15' : '#eef2ff') : '#f3f4f6',
                    color: velocity !== undefined ? (lossColor || '#6366f1') : '#9ca3af',
                  }}>
                  <Gauge className="w-2.5 h-2.5" />
                  {velocity !== undefined ? `${velocity} m/s${lossPct !== null && lossPct > 0.5 ? ` (-${lossPct}%)` : ''}` : '+ Velocidad'}
                </button>
              )
            )}
            <button onClick={() => setShowRir(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-all active:scale-95"
              style={{
                backgroundColor: rirMeta ? rirMeta.color + '15' : '#f3f4f6',
                color: rirMeta ? rirMeta.color : '#9ca3af',
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
