import { useMemo } from 'react'
import type { TrainingLogs, TrainingPlan } from '../../../types'
import { revisionDecision, ETIQUETA_VEREDICTO, AVISO_REVISION, type Veredicto, type PeriodoRevision } from '../../../lib/revisionDecision'
import { useContextoDescarga } from '../../../hooks/useContextoDescarga'
import { etiquetaTipo, type Decision } from '../../../lib/diarioDecisiones'
import { localDateKey } from '../../../lib/dates'

const fecha = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
const num = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 })
const diasAtras = (iso: string, hoy: string) => Math.max(0, Math.round((Date.parse(hoy + 'T00:00:00Z') - Date.parse(iso + 'T00:00:00Z')) / 86_400_000))
const ESTILO: Record<Veredicto, string> = { mejoro: 'bg-ok/10 text-ok', 'se-mantuvo': 'bg-bg-alt text-ink', empeoro: 'bg-warn/10 text-warn', 'datos-insuficientes': 'bg-bg-alt text-muted' }

function Etiqueta({ v }: { v: Veredicto }) {
  return <span className={`ml-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${ESTILO[v]}`}>{ETIQUETA_VEREDICTO[v]}</span>
}

function Paso({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <li className="relative pl-8 pb-4 last:pb-0">
      <span className="absolute left-0 top-0 w-5 h-5 rounded-full bg-ink text-white text-[11px] font-bold flex items-center justify-center" aria-hidden>{n}</span>
      <span className="absolute left-[9px] top-5 bottom-0 w-px bg-border last:hidden" aria-hidden />
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{titulo}</p>
      <div className="mt-0.5 text-sm space-y-1">{children}</div>
    </li>
  )
}

const periodoTexto = (p: PeriodoRevision) => `${fecha(p.desde)} – ${fecha(p.hasta)} (${p.dias} días)`

// «¿Qué pasó desde esta decisión?»: línea de tiempo decisión → periodo observado → evidencia → conclusión del entrenador. Describe, no atribuye
// causa ni recomienda; el cierre (mantener, revertir, ajustar o texto libre) lo escribe el entrenador y no cambia ningún plan.
// Los criterios están en lib/revisionDecision (política con versión, que reutiliza los de la progresión y la descarga).
export function RevisionDecision({ decision, logs, plan, clientId }: { decision: Decision; logs: TrainingLogs; plan?: TrainingPlan | null; clientId: string }) {
  const hoy = localDateKey()
  const { contexto, cargando } = useContextoDescarga(clientId, diasAtras(decision.fecha, hoy) + 62)
  const r = useMemo(() => revisionDecision({ hoy, decision, plan, logs, ...contexto }), [hoy, decision, plan, logs, contexto])

  if (cargando) return <p className="text-xs text-muted" role="status">Cargando lo ocurrido…</p>
  const { antes, despues } = r

  return (
    <section aria-label="¿Qué pasó desde esta decisión?" className="rounded-xl border border-border px-4 py-3 bg-card">
      <h5 className="text-sm font-bold mb-3">¿Qué pasó desde esta decisión?</h5>
      <ol>
        <Paso n={1} titulo="Decisión">
          <p><strong>{etiquetaTipo(decision.tipo)}</strong>{decision.ejercicio ? ` · ${decision.ejercicio}` : ' · sin ejercicio concreto (todo el plan)'} <span className="text-xs text-muted">({fecha(decision.fecha)})</span></p>
          {decision.hipotesis && <p className="text-xs text-muted">Motivo: {decision.hipotesis}</p>}
          {decision.intervencion && <p>{decision.intervencion}</p>}
        </Paso>

        <Paso n={2} titulo="Periodo observado">
          {r.periodoCorto && despues.dias === 0
            ? <p>Todavía no ha pasado ningún día desde la decisión.</p>
            : <>
              <p>Después: {periodoTexto(despues)}</p>
              <p className="text-muted">Antes (igual de largo): {periodoTexto(antes)}</p>
            </>}
        </Paso>

        <Paso n={3} titulo="Evidencia">
          <p>Conclusión descriptiva:<Etiqueta v={r.conclusion} /></p>
          {r.rendimiento.ejercicios.length > 0 && (
            <ul className="list-disc pl-5" aria-label="Rendimiento por ejercicio">
              {r.rendimiento.ejercicios.map(x => (
                <li key={x.nombre}>{x.nombre}: 1RM estimado {num(x.e1rmAntes)} → {num(x.e1rmDespues)} kg ({x.cambioPct > 0 ? '+' : ''}{num(x.cambioPct)} %, {ETIQUETA_VEREDICTO[x.veredicto].toLowerCase()})
                  {x.rirAntes !== null && x.rirDespues !== null ? `; RIR medio ${num(x.rirAntes)} → ${num(x.rirDespues)}` : ''}</li>
              ))}
            </ul>
          )}
          {r.resumen.filter(x => !x.startsWith('Rendimiento')).map(x => <p key={x}>{x}</p>)}
          {!r.periodoCorto && despues.diasAusencia + antes.diasAusencia > 0 && <p>Ausencias: {antes.diasAusencia} {antes.diasAusencia === 1 ? 'día' : 'días'} antes y {despues.diasAusencia} después.</p>}
          {r.records.length > 0 && (
            <ul className="list-disc pl-5" aria-label="Récords">
              {r.records.map(x => <li key={x.ejercicio}>Récord en {x.ejercicio}: 1RM estimado {num(x.antes)} → {num(x.ahora)} kg ({fecha(x.fecha)})</li>)}
            </ul>
          )}
          {r.excluido.length > 0 && (
            <p className="text-xs bg-bg-alt/60 rounded-lg px-3 py-2">
              {r.rendimiento.interpretado ? 'Fuera del cálculo: ' : 'El rendimiento y el RIR no se interpretan: '}{r.excluido.join('; ')}.{!r.rendimiento.interpretado && ' Menos sesiones o una ausencia no es lo mismo que más cansancio.'}
            </p>
          )}
          {r.falta.length > 0 && (
            <div className="text-xs text-muted">
              <p className="font-semibold">Qué falta para decir más:</p>
              <ul className="list-disc pl-5">{r.falta.map(f => <li key={f}>{f}</li>)}</ul>
            </div>
          )}
        </Paso>

        <Paso n={4} titulo="Conclusión del entrenador">
          {decision.resultado ? <p className="bg-ok/10 rounded-lg px-3 py-2">{decision.resultado}</p> : <p className="text-muted">Pendiente: la escribes tú al cerrar la revisión. No cambia ningún plan.</p>}
        </Paso>
      </ol>
      <p className="text-[11px] text-muted mt-3">{AVISO_REVISION} Criterios provisionales ({r.politicaVersion}).</p>
    </section>
  )
}
