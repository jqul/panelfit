import { resumenSeries, type SerieLite } from './resumenSeries'

// Encima de las series de un ejercicio, en la vista de lista: lo hecho hoy (reps, volumen, kg máximo) y cuánto cambia
// frente a la última vez que lo hizo. Sin nada hecho hoy, guiones.
export function ResumenEjercicio({ hoy, antes, porLado = false }: { hoy: Record<number, SerieLite | undefined>; antes: Record<number, SerieLite | undefined>; porLado?: boolean }) {
  const h = resumenSeries(hoy, true, porLado)
  const a = resumenSeries(antes, false, porLado)
  const celda = (label: string, valor: number, previo: number, unidad = '') => {
    const pct = valor > 0 && previo > 0 ? Math.round(((valor - previo) / previo) * 100) : null
    return (
      <div className="flex items-baseline justify-center gap-1 min-w-0">
        <span className="text-[11px] uppercase text-muted font-bold tracking-wider">{label}</span>
        <span className="text-sm font-semibold tabular-nums truncate">
          {valor > 0 ? `${valor.toLocaleString('es-ES')}${unidad}` : '—'}
          {pct !== null && <span className={`ml-1 text-[11px] font-bold ${pct > 0 ? 'text-ok' : pct < 0 ? 'text-warn' : 'text-muted'}`}>{pct > 0 ? '+' : ''}{pct}%</span>}
        </span>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-3 gap-2 mx-3 mb-1 py-0.5" aria-label="Hoy frente a la última vez">
      {celda('Reps', h.reps, a.reps)}
      {celda('Vol', h.volumen, a.volumen)}
      {celda(porLado ? 'Máx/lado' : 'Máx kg', h.maxKg, a.maxKg)}
    </div>
  )
}
