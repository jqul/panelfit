import { Trophy } from 'lucide-react'
import type { TrainingPlan } from '../../types'
import { LEVANTAMIENTOS, diasHasta, faseHasta, limpiarCompeticion, totalPlanificado } from '../../lib/competicion'

const fmt = (n: number) => n.toLocaleString('es-ES')

// Hoy del cliente: su competición (la prepara el entrenador en el plan, lib/competicion) con la cuenta atrás, qué toca
// estas semanas y los intentos de cada levantamiento. Pasada la fecha, ya no sale.
export function CompeticionHoy({ plan }: { plan: TrainingPlan }) {
  const comp = limpiarCompeticion(plan.competicion)
  if (!comp) return null
  const dias = diasHasta(comp.fecha)
  if (dias < 0) return null
  const fase = faseHasta(dias)
  const conIntentos = LEVANTAMIENTOS.filter(l => (comp.intentos?.[l.id] ?? []).some(k => k > 0))
  const total = totalPlanificado(comp)

  return (
    <section aria-label="Tu competición" className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center flex-shrink-0" aria-hidden><Trophy className="w-4 h-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold truncate">{comp.nombre || 'Tu competición'}</span>
          <span className="block text-xs text-muted">{new Date(comp.fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </span>
        <span className="text-right flex-shrink-0">
          {dias <= 1
            ? <span className="font-serif font-bold text-base">{dias === 0 ? '¡Hoy!' : 'Mañana'}</span>
            : <><span className="block font-serif font-bold text-2xl leading-none tabular-nums">{dias}</span><span className="block text-[11px] text-muted mt-0.5">días</span></>}
        </span>
      </div>
      {fase && <p className="px-4 pb-2 text-xs font-semibold text-accent">{fase}</p>}
      {conIntentos.length > 0 && (
        <div className="border-t border-border px-4 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">Tus intentos</p>
          <ul className="space-y-1">
            {conIntentos.map(l => (
              <li key={l.id} className="flex items-center gap-2 text-sm">
                <span className="w-24 text-muted text-xs">{l.label}</span>
                {(comp.intentos?.[l.id] ?? [0, 0, 0]).map((kg, i) => (
                  <span key={i} className={`flex-1 text-center tabular-nums ${i === 2 ? 'font-bold' : 'font-semibold'}`}>{kg > 0 ? fmt(kg) : '—'}</span>
                ))}
              </li>
            ))}
          </ul>
          {total && <p className="text-xs text-muted mt-1.5">Total si entran los terceros: <strong className="text-ink">{fmt(total)} kg</strong></p>}
        </div>
      )}
    </section>
  )
}
