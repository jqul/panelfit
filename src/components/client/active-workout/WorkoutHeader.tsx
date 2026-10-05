import { ChevronLeft, Clock, Flame, Focus } from 'lucide-react'
import { RIR_OPTIONS } from '../../../lib/strength'
import { FinishButton } from './FinishButton'

interface Props {
  title: string
  clientName?: string
  onBack: () => void
  onFinishClick: () => void
  elapsedLabel: string
  allComplete: boolean
  totalVolume: number
  totalSetsDone: number
  avgRir: number | null
  doneExs: number
  totalExs: number
  pct: number
  densityRate: number
  densityPct: number | null
  prevSessionVolume: number
  onToggleView?: () => void  // pasar a la vista de foco (una serie a la vez)
}

// Cabecera de la sesión activa: título + cronómetro + botón terminar, barra de
// stats (duración/volumen/series/RIR) y la densidad (kg/min en vivo frente a
// la sesión equivalente de la semana pasada).
export function WorkoutHeader({
  title, clientName, onBack, onFinishClick, elapsedLabel, allComplete,
  totalVolume, totalSetsDone, avgRir, doneExs, totalExs, pct, densityRate, densityPct, prevSessionVolume, onToggleView,
}: Props) {
  return (
    <div className="bg-card border-b border-border flex-shrink-0">
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={onBack} aria-label="Volver" className="p-2 rounded-xl hover:bg-bg-alt text-muted">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{title}</div>
          {clientName && <p className="text-[10px] text-muted truncate">Sesión de {clientName}</p>}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted mr-2">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-mono font-semibold tabular-nums">{elapsedLabel}</span>
        </div>
        {onToggleView && (
          <button onClick={onToggleView} aria-label="Modo foco: una serie a la vez" title="Modo foco"
            className="p-2 rounded-xl hover:bg-bg-alt text-muted"><Focus className="w-5 h-5" /></button>
        )}
        <FinishButton allComplete={allComplete} onClick={onFinishClick} />
      </div>

      {/* Stats bar */}
      <div className="flex items-center px-4 pb-3 gap-4 text-xs">
        <div><p className="text-muted">Duración</p><p className="font-bold text-accent tabular-nums">{elapsedLabel}</p></div>
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

      {/* Densidad de sesión — kg/min en vivo y tonelaje frente a la semana pasada */}
      {totalVolume > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-warn uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3 h-3" /> Densidad
            </p>
            <p className="text-[10px] text-muted font-bold tabular-nums">
              {densityRate > 0 && `${densityRate} kg/min · `}
              {densityPct !== null
                ? `${(totalVolume / 1000).toFixed(1)}t / ${(prevSessionVolume / 1000).toFixed(1)}t`
                : `${(totalVolume / 1000).toFixed(1)}t movidas`}
            </p>
          </div>
          {densityPct !== null && (
            <div className="w-full h-2 bg-bg-alt rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${densityPct}%`, background: 'linear-gradient(90deg, #e07b54, #f0a868)' }} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
