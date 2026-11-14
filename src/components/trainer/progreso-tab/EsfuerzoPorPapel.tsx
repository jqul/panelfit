import { useMemo } from 'react'
import { Activity } from 'lucide-react'
import { TrainingPlan, TrainingLogs } from '../../../types'
import { getExName, EmptyState } from './helpers'
import { PAPELES, papelDe, type PapelEjercicio } from '../../../lib/papelEjercicio'
import { hecha } from '../../../lib/seriesEfectivas'
import { parseRirTarget } from '../../../lib/rirTarget'
import { lunesDeISO, sumarDiasISO } from '../../../lib/exposicionCargas'
import {
  CUBOS_RPE, ETIQUETA_CUBO, resumirEsfuerzo, juntarResumenes, cambioRpe, resumenVacio,
  type ResumenEsfuerzo, type SerieEsfuerzo,
} from '../../../lib/esfuerzoPorTipo'

// ── Esfuerzo (RPE) por tipo de serie ──────────────────────────
// El RPE medio de toda la semana mezcla un single pesado con series de hipertrofia, así que se separa por papel del
// ejercicio (competición, variante, accesorio) y se enseña la distribución además de la media (lib/esfuerzoPorTipo).
// Se guarda como RIR: RPE = 10 − RIR. Las series sin RIR apuntado no cuentan (salvo las marcadas «al fallo»).

const SEMANAS_VISIBLES = 6
const BLOQUE = 4 // semanas de cada bloque para comparar «ahora» con «antes»
const COLORES: Record<string, string> = { hasta6: '#cfe8da', '7': '#a8d5ba', '8': '#e0c27a', '9': '#e0a854', '10': '#dc2626' }

const n1 = (x: number) => (Math.round(x * 10) / 10).toLocaleString('es-ES')
const con = (x: number) => (x > 0 ? '+' : '') + n1(x)

export function EsfuerzoPorPapel({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const porSemana = useMemo(() => {
    const acum: Record<string, Record<PapelEjercicio, SerieEsfuerzo[]>> = {}
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.done || !log.dateDone) return
      const name = getExName(key, plan, log)
      if (!name) return
      const m = key.match(/ex_w(\d+)_d(\d+)_r(\d+)/)
      const fila = m ? plan?.weeks?.[+m[1]]?.days?.[+m[2]]?.exercises?.[+m[3]] : undefined
      const cambiado = !!log.substituteName?.trim() // si lo cambió por otro, ni el papel ni el RIR objetivo del plan valen
      const papel = papelDe({ name, papel: cambiado ? undefined : fila?.papel })
      const objetivo = cambiado ? null : parseRirTarget(fila?.rir)
      const semana = (acum[lunesDeISO(log.dateDone)] ??= { competicion: [], variante: [], accesorio: [] })
      for (const s of Object.values(log.sets || {})) {
        if (s && hecha(s)) semana[papel].push({ rir: s.rir, tipo: s.tipo, objetivo })
      }
    })
    const resumen: Record<string, Record<PapelEjercicio, ResumenEsfuerzo>> = {}
    for (const [sem, p] of Object.entries(acum)) {
      resumen[sem] = { competicion: resumirEsfuerzo(p.competicion), variante: resumirEsfuerzo(p.variante), accesorio: resumirEsfuerzo(p.accesorio) }
    }
    return resumen
  }, [logs, plan])

  const semanas = Object.keys(porSemana).filter(s => PAPELES.some(p => porSemana[s][p.id].conEsfuerzo > 0)).sort().slice(-SEMANAS_VISIBLES)
  if (!semanas.length) return <EmptyState icon={<Activity className="w-8 h-8 opacity-30" />} text="Sin datos de esfuerzo" sub="Aparece cuando el cliente apunta el RIR o el RPE de sus series" />

  // Bloque actual = las 4 últimas semanas naturales hasta la última con datos; el anterior, las 4 de antes
  const ultima = semanas[semanas.length - 1]
  const bloque = (desde: number): Record<PapelEjercicio, ResumenEsfuerzo> => {
    const lunes = Array.from({ length: BLOQUE }, (_, i) => sumarDiasISO(ultima, -7 * (desde + i)))
    const de = (p: PapelEjercicio) => juntarResumenes(lunes.map(l => porSemana[l]?.[p] ?? resumenVacio()))
    return { competicion: de('competicion'), variante: de('variante'), accesorio: de('accesorio') }
  }
  const ahora = bloque(0), antes = bloque(BLOQUE)
  const filas = PAPELES.filter(p => semanas.some(s => porSemana[s][p.id].conEsfuerzo > 0) || ahora[p.id].conEsfuerzo > 0)

  return (
    <div className="space-y-4">
      <section aria-label="RPE medio por semana" className="space-y-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">RPE medio por semana</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">RPE medio y número de series con dato, por semana y papel del ejercicio</caption>
            <thead>
              <tr className="text-left text-[11px] text-muted uppercase tracking-wider">
                <th scope="col" className="py-1.5 pr-3 font-semibold">Tipo</th>
                {semanas.map(s => <th key={s} scope="col" className="py-1.5 px-2 text-right font-semibold whitespace-nowrap">{new Date(s + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</th>)}
              </tr>
            </thead>
            <tbody>
              {filas.map(p => (
                <tr key={p.id} className="border-t border-border/50">
                  <th scope="row" className="py-2 pr-3 text-left font-semibold">{p.label}</th>
                  {semanas.map(s => {
                    const r = porSemana[s][p.id]
                    return <td key={s} className="py-2 px-2 text-right tabular-nums whitespace-nowrap">{r.rpeMedio === null ? '—' : `${n1(r.rpeMedio)} · ${r.conEsfuerzo}`}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted">Cada celda es «RPE medio · series con esfuerzo apuntado». RPE = 10 − RIR.</p>
      </section>

      <section aria-label="Distribución del esfuerzo" className="space-y-2" data-testid="distribucion-rpe">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Distribución (últimas {BLOQUE} semanas)</p>
        {filas.map(p => {
          const r = ahora[p.id]
          const texto = CUBOS_RPE.map(c => `RPE ${ETIQUETA_CUBO[c]}: ${r.distribucion[c]}`).join(', ')
          return (
            <div key={p.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">{p.label}</span>
                <span className="text-muted">{r.conEsfuerzo ? `${r.conEsfuerzo} series${r.rpeMax !== null ? ` · máx. RPE ${n1(r.rpeMax)}` : ''}` : 'sin datos'}</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-bg-alt" role="img" aria-label={`${p.label}: ${texto}`}>
                {r.conEsfuerzo > 0 && CUBOS_RPE.map(c => r.distribucion[c] > 0 && (
                  <div key={c} style={{ width: `${(r.distribucion[c] / r.conEsfuerzo) * 100}%`, backgroundColor: COLORES[c] }} />
                ))}
              </div>
              {r.conEsfuerzo > 0 && <p className="text-[11px] text-muted">{texto}</p>}
            </div>
          )
        })}
      </section>

      <section aria-label="Últimas semanas frente a las anteriores" className="space-y-1.5" data-testid="comparacion-bloques">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Últimas {BLOQUE} semanas frente a las {BLOQUE} anteriores</p>
        <ul className="space-y-1 text-sm">
          {filas.map(p => {
            const a = ahora[p.id], b = antes[p.id], c = cambioRpe(a, b)
            return (
              <li key={p.id} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold">{p.label}:</span>
                <span>{a.rpeMedio === null ? 'sin datos ahora' : `RPE ${n1(a.rpeMedio)}`}</span>
                {c !== null && <span className="text-muted">({con(c)} respecto a las {BLOQUE} semanas anteriores)</span>}
                {c === null && a.rpeMedio !== null && <span className="text-muted">(sin datos antes para comparar)</span>}
                {a.desvioMedio !== null && (
                  <span className="text-muted">· {con(a.desvioMedio)} sobre el RPE previsto en {a.conObjetivo} {a.conObjetivo === 1 ? 'serie' : 'series'} con objetivo</span>
                )}
              </li>
            )
          })}
        </ul>
        <p className="text-[11px] text-muted leading-snug">
          El RPE previsto sale del RIR objetivo que puso el entrenador en cada ejercicio (el centro de su rango). Un RPE alto no es un problema por
          sí solo: importa si era el previsto. Una sola semana o un único dato no marca una tendencia.
        </p>
      </section>
    </div>
  )
}
