import { useMemo } from 'react'
import type { TrainingLogs, TrainingPlan } from '../../../types'
import { recomendarSiguiente, ETIQUETA_RECOMENDACION, type Confianza } from '../../../lib/recomendacionProgresion'

const num = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')
const fecha = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
const ETIQUETA_CONFIANZA: Record<Confianza, string> = { baja: 'Confianza baja', media: 'Confianza media', alta: 'Confianza alta' }

// «Siguiente exposición» (lib/recomendacionProgresion), debajo del historial del ejercicio: qué hacer la próxima vez y por qué, con las
// últimas exposiciones comparables a la vista. ORIENTATIVA: no cambia el plan ni se aplica sola, y mientras no haya historial suficiente (o
// venga de la primera semana) lo dice. Los umbrales son provisionales hasta tener sesiones reales de calibración.
export function SiguienteExposicionCard({ logs, plan, ejercicio, material }: { logs: TrainingLogs; plan?: TrainingPlan | null; ejercicio: string; material?: string | null }) {
  const r = useMemo(() => recomendarSiguiente(logs, plan, ejercicio, { material }), [logs, plan, ejercicio, material])
  const sinDatos = r.tipo === 'datos-insuficientes'
  return (
    <section aria-label="Siguiente exposición" className="rounded-2xl border border-border bg-bg-alt/40 p-4 space-y-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <h4 className="text-sm font-bold flex-1">Siguiente exposición</h4>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${r.provisional ? 'bg-warn/10 text-warn' : 'bg-ok/10 text-ok'}`}>
          {r.provisional ? 'Orientación provisional' : ETIQUETA_CONFIANZA[r.confianza]}
        </span>
      </div>
      {!sinDatos && (
        <p className="text-base font-semibold">
          {ETIQUETA_RECOMENDACION[r.tipo]}{r.kgSugerido !== null && <span className="text-accent"> · {num(r.kgSugerido)} kg</span>}
        </p>
      )}
      <p className="text-sm">{r.explicacion}</p>
      {r.provisional && !sinDatos && <p className="text-xs text-muted">{ETIQUETA_CONFIANZA[r.confianza]}: {r.exposiciones.some(e => e.deCalibracion) ? 'incluye sesiones de la primera semana de calibración.' : 'pocos datos todavía.'}</p>}
      {r.exposiciones.length > 0 && (
        <ul className="text-xs text-muted divide-y divide-border/50" aria-label="Últimas exposiciones comparables">
          {r.exposiciones.map(e => (
            <li key={e.fecha} className="py-1 flex items-center gap-2">
              <span className="w-14 flex-shrink-0">{fecha(e.fecha)}</span>
              <span className="flex-1 text-ink">{num(e.kg)} kg × {e.reps.join('/')}</span>
              <span>{e.rirMedio !== null ? `RIR ${num(e.rirMedio)}` : 'sin RIR'}</span>
              {e.deCalibracion && <span className="text-[11px] font-bold text-warn">calibración</span>}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-muted">Orientativa: no cambia el plan ni se aplica sola. Solo cuentan series normales a la carga de trabajo (sin calentamientos, dropsets ni sustituciones). Política {r.politicaVersion}.</p>
    </section>
  )
}
