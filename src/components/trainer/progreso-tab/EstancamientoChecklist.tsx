import { useMemo, useState } from 'react'
import { CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react'
import type { TrainingLogs, TrainingPlan } from '../../../types'
import { historialPorEjercicio } from '../../../lib/historialEjercicio'
import { estaEstancado } from '../../../lib/revisionBloque'
import { datosDelEjercicio, adherenciaReciente, rirACargaFija } from '../../../lib/datosEstancamiento'
import { checklistEstancamiento, resumenChecklist, type EstadoPaso } from '../../../lib/checklistEstancamiento'
import { getEffectiveWeekIdx } from '../../../lib/planWeek'
import { semanasDePeso, avisoRitmo, PESAJES_MINIMOS } from '../../../lib/ritmoPeso'
import { useClientWeights } from '../../../lib/clientWeight'
import { useContextoEstancamiento } from '../../../hooks/useContextoEstancamiento'
import { localDateKey } from '../../../lib/dates'
import { EmptyState } from './helpers'

const MARCA: Record<EstadoPaso, { icono: typeof CheckCircle2; clase: string; texto: string }> = {
  senal: { icono: AlertTriangle, clase: 'text-warn', texto: 'Mirar' },
  normal: { icono: CheckCircle2, clase: 'text-ok', texto: 'Sin señal' },
  'sin-datos': { icono: HelpCircle, clase: 'text-muted', texto: 'Falta dato' },
}

// Ante un ejercicio que no sube: qué dicen los datos en cada paso (¿es real?, ¿comparable?, técnica, esfuerzo, volumen, recuperación,
// peso, adherencia). No receta: separa el dato de la hipótesis y deja la decisión al entrenador.
export function EstancamientoChecklist({ clientId, logs, plan }: { clientId: string; logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const historial = useMemo(() => historialPorEjercicio(logs, plan).filter(h => h.sesiones.length >= 2), [logs, plan])
  const primero = historial.find(h => estaEstancado(h.sesiones)) ?? historial[0]
  const [elegido, setElegido] = useState<string | null>(null)
  const nombre = elegido && historial.some(h => h.name === elegido) ? elegido : primero?.name
  const { recuperacion } = useContextoEstancamiento(clientId)
  const { weights } = useClientWeights(clientId)

  const actual = historial.find(h => h.name === nombre)
  const pasos = useMemo(() => {
    if (!actual) return []
    const hoy = localDateKey()
    const datos = datosDelEjercicio(logs, plan, actual.name, hoy)
    const semanas = semanasDePeso(weights)
    return checklistEstancamiento({
      sesiones: actual.sesiones,
      ...datos,
      cargaFija: rirACargaFija(logs, plan, actual.name),
      recuperacion,
      ritmoPeso: avisoRitmo(semanas),
      hayPeso: weights.length >= PESAJES_MINIMOS,
      adherenciaPct: plan ? adherenciaReciente(logs, plan, getEffectiveWeekIdx(plan, logs), hoy) : null,
    })
  }, [actual, logs, plan, recuperacion, weights])

  if (!historial.length) return <EmptyState icon={<HelpCircle className="w-8 h-8 opacity-30" />} text="Aún no hay ejercicios con historial" sub="Hacen falta al menos dos sesiones con peso de un mismo ejercicio" />
  const resumen = resumenChecklist(pasos)

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="estancamiento-ejercicio" className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Ejercicio</label>
        <select id="estancamiento-ejercicio" value={nombre} onChange={e => setElegido(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none">
          {historial.map(h => <option key={h.name} value={h.name}>{h.name}{estaEstancado(h.sesiones) ? ' · estancado' : ''}</option>)}
        </select>
      </div>

      <ol className="divide-y divide-border/50" aria-label="Lista de comprobación">
        {pasos.map((p, i) => {
          const m = MARCA[p.estado]
          const Icono = m.icono
          return (
            <li key={p.id} className="py-2.5 flex items-start gap-3">
              <Icono className={`w-4 h-4 mt-0.5 flex-shrink-0 ${m.clase}`} aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{i + 1}. {p.titulo} <span className={`ml-1 text-[11px] font-bold uppercase tracking-wider ${m.clase}`}>{m.texto}</span></p>
                <p className="text-xs text-muted">{p.pregunta}</p>
                <p className="text-sm mt-0.5">{p.dato}</p>
              </div>
            </li>
          )
        })}
      </ol>

      <p className="text-sm bg-bg-alt/60 rounded-xl px-4 py-3" role="note">{resumen.texto}</p>
      <p className="text-[11px] text-muted">Son datos para pensar, no un diagnóstico: una señal aislada no demuestra una causa. La hipótesis y la decisión son tuyas.</p>
    </div>
  )
}
