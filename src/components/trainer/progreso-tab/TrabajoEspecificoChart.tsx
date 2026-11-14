import { useMemo } from 'react'
import { Activity } from 'lucide-react'
import { TrainingPlan, TrainingLogs } from '../../../types'
import { getExName, EmptyState } from './helpers'
import { localDateKey } from '../../../lib/dates'
import {
  LEVANTAMIENTOS, semanaVacia, sumarTrabajo, trabajoDeSeries, type TrabajoSemana, type TrabajoSerie,
} from '../../../lib/papelEjercicio'

// ── Trabajo específico por semana ─────────────────────────────
// Series y repeticiones de sentadilla, banca y peso muerto, separando lo de competición de las variantes, más todo lo
// accesorio. El papel de cada ejercicio es el que marcó el entrenador en el plan; si no marcó ninguno, se deduce del
// nombre (lib/papelEjercicio). Si el cliente cambió el ejercicio ese día, el papel del plan ya no vale y se deduce.
// Ojo: el papel NO es el músculo. Una sentadilla de competición es trabajo específico de sentadilla y a la vez
// cuenta para el volumen de las piernas (gráfica «Volumen por grupo»).

const SEMANAS_VISIBLES = 6

const lunesDe = (iso: string) => {
  const d = new Date(iso + 'T00:00:00')
  const day = d.getDay()
  const lunes = new Date(d); lunes.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  return localDateKey(lunes)
}

const celda = (t: TrabajoSerie) => (t.series === 0 ? '—' : `${t.series} · ${t.reps}`)

export function TrabajoEspecificoChart({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const semanas = useMemo(() => {
    const porSemana: Record<string, TrabajoSemana> = {}
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.done || !log.dateDone) return
      const name = getExName(key, plan, log)
      if (!name) return
      const m = key.match(/ex_w(\d+)_d(\d+)_r(\d+)/)
      const fila = m ? plan?.weeks?.[+m[1]]?.days?.[+m[2]]?.exercises?.[+m[3]] : undefined
      // Si lo cambió por otro, la marca del plan era del ejercicio original
      const papel = log.substituteName?.trim() ? undefined : fila?.papel
      const t = trabajoDeSeries(Object.values(log.sets || {}))
      const semana = porSemana[lunesDe(log.dateDone)] ?? (porSemana[lunesDe(log.dateDone)] = semanaVacia())
      sumarTrabajo(semana, { name, papel }, t.series, t.reps)
    })
    return Object.entries(porSemana).sort(([a], [b]) => a.localeCompare(b)).slice(-SEMANAS_VISIBLES)
  }, [logs, plan])

  if (!semanas.length) return <EmptyState icon={<Activity className="w-8 h-8 opacity-30" />} text="Sin datos suficientes" sub="Aparece al completar entrenos" />

  const etiquetaSemana = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  const hayAlgo = (f: (s: TrabajoSemana) => TrabajoSerie) => semanas.some(([, s]) => f(s).series > 0)

  const filas: { clave: string; etiqueta: string; sub?: string; valor: (s: TrabajoSemana) => TrabajoSerie }[] = []
  for (const l of LEVANTAMIENTOS) {
    if (hayAlgo(s => s.porLevantamiento[l.id].competicion)) filas.push({ clave: `${l.id}-c`, etiqueta: l.label, sub: 'Competición', valor: s => s.porLevantamiento[l.id].competicion })
    if (hayAlgo(s => s.porLevantamiento[l.id].variante)) filas.push({ clave: `${l.id}-v`, etiqueta: l.label, sub: 'Variantes', valor: s => s.porLevantamiento[l.id].variante })
  }
  filas.push({ clave: 'acc', etiqueta: 'Accesorios', sub: 'Todos', valor: s => s.accesorio })

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Series y repeticiones por semana, por levantamiento y papel del ejercicio</caption>
          <thead>
            <tr className="text-left text-[11px] text-muted uppercase tracking-wider">
              <th scope="col" className="py-1.5 pr-3 font-semibold">Ejercicio</th>
              {semanas.map(([iso]) => <th key={iso} scope="col" className="py-1.5 px-2 text-right font-semibold whitespace-nowrap">{etiquetaSemana(iso)}</th>)}
            </tr>
          </thead>
          <tbody>
            {filas.map(f => (
              <tr key={f.clave} className="border-t border-border/50">
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  <span className="font-semibold">{f.etiqueta}</span> <span className="text-muted text-xs">{f.sub}</span>
                </th>
                {semanas.map(([iso, s]) => (
                  <td key={iso} className="py-2 px-2 text-right tabular-nums whitespace-nowrap">{celda(f.valor(s))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted leading-snug">
        Cada celda es «series · repeticiones» de lo hecho esa semana (sin calentamiento). El papel lo marca el entrenador en
        cada ejercicio del plan; si no lo marcó, se deduce del nombre. Es una ayuda para repartir el trabajo, no una medida exacta
        del estímulo: mira también el esfuerzo (RIR/RPE) de esas series.
      </p>
    </div>
  )
}
