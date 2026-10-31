import { resumenSeries, type SerieLite } from './resumenSeries'

// Encima de las series de un ejercicio, en la vista de lista: lo hecho hoy (reps, volumen, kg máximo) y cuánto cambia
// frente a la última vez que lo hizo. Sin nada hecho hoy, guiones.
export function ResumenEjercicio({ hoy, antes }: { hoy: Record<number, SerieLite | undefined>; antes: Record<number, SerieLite | undefined> }) {
  const h = resumenSeries(hoy, true)
  const a = resumenSeries(antes, false)
  const celda = (label: string, valor: number, previo: number, unidad = '') => {
    const pct = valor > 0 && previo > 0 ? Math.round(((valor - previo) / previo) * 100) : null
    return (
      <div className="text-center">
        <p className="text-[11px] uppercase text-muted font-bold tracking-wider">{label}</p>
        <p className="text-sm font-semibold tabular-nums">
          {valor > 0 ? `${valor.toLocaleString('es-ES')}${unidad}` : '—'}
          {pct !== null && <span className={`ml-1 text-[11px] font-bold ${pct > 0 ? 'text-ok' : pct < 0 ? 'text-warn' : 'text-muted'}`}>{pct > 0 ? '+' : ''}{pct}%</span>}
        </p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-3 gap-2 mx-4 mb-1.5 py-1" aria-label="Hoy frente a la última vez">
      {celda('Reps', h.reps, a.reps)}
      {celda('Vol', h.volumen, a.volumen)}
      {celda('Máx kg', h.maxKg, a.maxKg)}
    </div>
  )
}
