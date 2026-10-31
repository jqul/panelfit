import { ChevronLeft, Clock, Flame, Focus, Sun, Moon } from 'lucide-react'
import { RIR_OPTIONS } from '../../../lib/strength'
import { FinishButton } from './FinishButton'
import { SyncBadge } from '../client-view/SyncStatus'

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
  /** Fondo oscuro del entreno (el mismo que en la vista de foco). */
  oscuro?: boolean
  onToggleOscuro?: () => void
}

// Cabecera de la sesión activa: título + cronómetro + botón terminar, barra de
// stats (duración/volumen/series/RIR) y la densidad (kg/min en vivo frente a
// la sesión equivalente de la semana pasada).
export function WorkoutHeader({
  title, clientName, onBack, onFinishClick, elapsedLabel, allComplete,
  totalVolume, totalSetsDone, avgRir, doneExs, totalExs, pct, densityRate, densityPct, prevSessionVolume, onToggleView, oscuro, onToggleOscuro,
}: Props) {
  return (
    <div className="bg-card border-b border-border flex-shrink-0">
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <button onClick={onBack} aria-label="Volver" className="p-2 rounded-xl hover:bg-bg-alt text-muted">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{title}</div>
          {clientName && <p className="text-[11px] text-muted truncate">Sesión de {clientName}</p>}
        </div>
        <SyncBadge />
        <div className="flex items-center gap-1 text-xs text-muted mr-2">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-mono font-semibold tabular-nums">{elapsedLabel}</span>
        </div>
        {onToggleOscuro && (
          <button onClick={onToggleOscuro} aria-label={oscuro ? 'Cambiar a fondo claro' : 'Cambiar a fondo oscuro'} aria-pressed={oscuro}
            className="p-2 rounded-xl hover:bg-bg-alt text-muted">{oscuro ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
        )}
        {onToggleView && (
          <button onClick={onToggleView} aria-label="Modo foco: una serie a la vez" title="Modo foco"
            className="p-2 rounded-xl hover:bg-bg-alt text-muted"><Focus className="w-5 h-5" /></button>
        )}
        <FinishButton allComplete={allComplete} onClick={onFinishClick} />
      </div>

      {/* Una sola línea de datos (el tiempo ya va arriba) y la barra de progreso fina debajo */}
      <div className="flex items-center gap-3 px-4 pb-1.5 text-xs text-muted tabular-nums">
        <span><b className="text-ink">{totalVolume > 0 ? `${Math.round(totalVolume).toLocaleString()} kg` : '0 kg'}</b></span>
        <span><b className="text-ink">{totalSetsDone}</b> series</span>
        {avgRir !== null && (
          <span>RIR <b style={{ color: RIR_OPTIONS.find(o => Math.round(avgRir) === o.value)?.color || '#6e5438' }}>{avgRir}</b></span>
        )}
        {/* Densidad de sesión — kg/min en vivo y tonelaje frente a la semana pasada */}
        {totalVolume > 0 && (densityRate > 0 || densityPct !== null) && (
          <span className="flex items-center gap-0.5 text-warn font-semibold" title="Densidad: kg por minuto y tonelaje frente a la semana pasada">
            <Flame className="w-3 h-3" />
            {densityRate > 0 && `${densityRate} kg/min`}
            {densityPct !== null && `${densityRate > 0 ? ' · ' : ''}${(totalVolume / 1000).toFixed(1)}t/${(prevSessionVolume / 1000).toFixed(1)}t`}
          </span>
        )}
        <span className="ml-auto">{doneExs}/{totalExs} ejercicios</span>
      </div>
      <div className="h-1 bg-bg-alt" aria-hidden>
        <div className="h-full bg-ok transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
