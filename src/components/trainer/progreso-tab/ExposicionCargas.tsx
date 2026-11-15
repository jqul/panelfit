import { useMemo, useState } from 'react'
import { TrainingPlan, TrainingLogs } from '../../../types'
import { getExName } from './helpers'
import { LEVANTAMIENTOS, levantamientoDe, papelDe, type Levantamiento } from '../../../lib/papelEjercicio'
import { hecha } from '../../../lib/seriesEfectivas'
import { esCalentamiento } from '../../../lib/tipoSerie'
import {
  UMBRALES, exposicionPorSemana, exposicionVacia, type Umbral, type SesionLevantamiento, type Exposicion,
} from '../../../lib/exposicionCargas'

// Exposición a cargas altas (lib/exposicionCargas): de las repeticiones de cada semana, cuántas pasan del 70, 80 o 90 %
// del 1RM estimado. Cada sesión se juzga con el 1RM que tenía el levantador entonces, no con el de hoy.

const num = (v?: string) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0 }

export function ExposicionCargas({ logs, plan, semanas }: { logs: TrainingLogs; plan?: TrainingPlan | null; semanas: string[] }) {
  const [umbral, setUmbral] = useState<Umbral>(80)

  // Todas las sesiones de cada levantamiento (también las de semanas que no se ven, para poder calcular la referencia)
  const resultado = useMemo(() => {
    const porLev: Record<Levantamiento, SesionLevantamiento[]> = { sentadilla: [], banca: [], peso_muerto: [] }
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.done || !log.dateDone) return
      const name = getExName(key, plan, log)
      if (!name) return
      const lev = levantamientoDe(name)
      if (!lev) return
      const m = key.match(/ex_w(\d+)_d(\d+)_r(\d+)/)
      const fila = m ? plan?.weeks?.[+m[1]]?.days?.[+m[2]]?.exercises?.[+m[3]] : undefined
      const papel = papelDe({ name, papel: log.substituteName?.trim() ? undefined : fila?.papel })
      if (papel === 'accesorio') return
      const series = Object.values(log.sets || {})
        .filter(s => s && hecha(s) && !esCalentamiento(s))
        .map(s => ({ weight: num(s.weight), reps: parseInt(String(s.reps ?? '')) || 0, rir: typeof s.rir === 'number' ? s.rir : undefined }))
      if (series.length) porLev[lev].push({ fecha: log.dateDone, papel, series })
    })
    return LEVANTAMIENTOS.map(l => ({ ...l, semanas: exposicionPorSemana(porLev[l.id]) })).filter(l => Object.keys(l.semanas).length > 0)
  }, [logs, plan])

  if (!resultado.length) return null

  const filas = resultado.flatMap(l => (['competicion', 'variante'] as const)
    .filter(p => semanas.some(s => (l.semanas[s]?.[p]?.reps ?? 0) > 0))
    .map(p => ({ clave: `${l.id}-${p}`, etiqueta: l.label, sub: p === 'competicion' ? 'Competición' : 'Variantes', valor: (s: string): Exposicion => l.semanas[s]?.[p] ?? exposicionVacia() })))
  if (!filas.length) return null
  const propias = filas.some(f => semanas.some(s => f.valor(s).conReferenciaPropia > 0))
  const sinRef = filas.some(f => semanas.some(s => f.valor(s).sinReferencia > 0))

  return (
    <div className="space-y-2 pt-2 border-t border-border/50" data-testid="exposicion-cargas">
      <p className="text-sm font-bold">Exposición a cargas altas</p>
      <div className="inline-flex p-0.5 bg-bg-alt rounded-xl" role="group" aria-label="Umbral de intensidad">
        {UMBRALES.map(u => (
          <button key={u} type="button" onClick={() => setUmbral(u)} aria-pressed={umbral === u}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${umbral === u ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
            ≥ {u} %
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Repeticiones por encima del {umbral} % del 1RM estimado, sobre el total de repeticiones de la semana</caption>
          <thead>
            <tr className="text-left text-[11px] text-muted uppercase tracking-wider">
              <th scope="col" className="py-1.5 pr-3 font-semibold">Levantamiento</th>
              {semanas.map(s => <th key={s} scope="col" className="py-1.5 px-2 text-right font-semibold whitespace-nowrap">{new Date(s + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</th>)}
            </tr>
          </thead>
          <tbody>
            {filas.map(f => (
              <tr key={f.clave} className="border-t border-border/50">
                <th scope="row" className="py-2 pr-3 text-left font-normal"><span className="font-semibold">{f.etiqueta}</span> <span className="text-muted text-xs">{f.sub}</span></th>
                {semanas.map(s => {
                  const e = f.valor(s)
                  return <td key={s} className="py-2 px-2 text-right tabular-nums whitespace-nowrap">{e.reps === 0 ? '—' : `${e.porUmbral[umbral]} / ${e.reps}`}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted leading-snug">
        Cada celda es «repeticiones por encima del {umbral} % / repeticiones totales» de la semana. El 1RM de referencia de cada sesión es la
        mejor estimación de las 8 semanas anteriores (Epley, ajustada por el RIR apuntado y fiable hasta unas 10 repeticiones), no el de hoy.
        {propias && ' En la primera sesión de un levantamiento no hay nada anterior y se compara con su mejor serie.'}
        {sinRef && ' Las series sin una estimación fiable cuentan en el total pero no pasan ningún umbral.'}
      </p>
    </div>
  )
}
