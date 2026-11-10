import { TrendingUp } from 'lucide-react'
import type { TrainingLogs, TrainingPlan } from '../../../types'
import { localDateKey } from '../../../lib/dates'
import { getEffectiveWeekIdx } from '../../../lib/planWeek'
import { admiteProgresion, conRegla, objetivoDe, textoObjetivo } from '../../../lib/progresionAuto'
import { ProgresionRegla } from '../training-plan-editor/ProgresionRegla'

// Pestaña Plan → "Progresión automática": la regla de este cliente (por defecto para todos sus ejercicios; cada
// ejercicio puede tener la suya en el editor) y, como guía para el entrenador, el objetivo de la próxima sesión de cada
// ejercicio de la semana en curso con su motivo (lib/progresionAuto).
export function ProgresionPlan({ plan, logs, onPlanChange }: { plan: TrainingPlan; logs: TrainingLogs; onPlanChange: (p: TrainingPlan) => void }) {
  const hoy = localDateKey()
  const wi = Math.max(0, getEffectiveWeekIdx(plan, logs))
  const vistos = new Set<string>()
  const filas = (plan.weeks?.[wi]?.days || []).flatMap(d => d.exercises || [])
    .filter(ex => ex.name?.trim() && admiteProgresion(ex) && !vistos.has(ex.name.trim().toLowerCase()) && vistos.add(ex.name.trim().toLowerCase()))
    .map(ex => ({ ex, obj: objetivoDe(plan, logs, ex, hoy) }))
    .filter(f => f.obj)

  return (
    <section aria-label="Progresión automática" className="flex-shrink-0 mb-3 px-4 py-3 bg-card border border-border rounded-2xl space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-muted" aria-hidden />
        <p className="text-xs font-bold text-muted uppercase tracking-wider">Progresión automática</p>
      </div>
      <p className="text-xs text-muted -mt-1">El peso de la próxima sesión sale de lo que hizo la última vez. Esta es la regla de todo su plan; cada ejercicio puede tener la suya desde sus opciones en el editor.</p>
      <ProgresionRegla nombre="todo el plan" regla={plan.progresion?.defecto}
        onChange={r => onPlanChange({ ...plan, progresion: conRegla(plan, null, r) })} />
      {filas.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Próxima sesión (semana {wi + 1})</p>
          <ul aria-label="Objetivos de la próxima sesión" className="divide-y divide-border/60">
            {filas.map(({ ex, obj }) => (
              <li key={ex.name} className="py-1.5 flex items-baseline gap-2 flex-wrap" title={obj!.motivo}>
                <span className="text-sm font-semibold flex-1 min-w-[120px] truncate">{ex.name}</span>
                <span className={`text-sm font-bold ${obj!.cambio === 'sube' || obj!.cambio === 'reps' ? 'text-ok' : obj!.cambio === 'baja' ? 'text-warn' : 'text-ink'}`}>{textoObjetivo(obj!)}</span>
                <span className="basis-full text-[11px] text-muted">{obj!.motivo}{obj!.modo === 'guia' ? ' · solo lo ves tú' : obj!.modo === 'auto' ? ' · le sale puesto' : ' · lo ve como sugerencia'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
