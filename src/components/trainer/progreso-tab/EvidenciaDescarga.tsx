import { useMemo } from 'react'
import { HelpCircle, Eye, ListChecks, Info } from 'lucide-react'
import type { TrainingLogs, TrainingPlan } from '../../../types'
import { evidenciaDescarga, type Confianza } from '../../../lib/evidenciaDescarga'
import { useContextoDescarga } from '../../../hooks/useContextoDescarga'
import { useDecisiones } from '../../../hooks/useDecisiones'
import { localDateKey } from '../../../lib/dates'

const CONFIANZA: Record<Confianza, string> = { baja: 'Confianza baja', media: 'Confianza media', alta: 'Confianza alta' }

// «¿Puede tocar descarga?»: lo que dicen los datos, en tres cajas. Es una lectura de evidencia, no una recomendación: no hay botón de
// «aplicar», no toca el plan y no decide por el entrenador. Los umbrales están en lib/evidenciaDescarga (política con versión, provisional).
export function EvidenciaDescarga({ clientId, logs, plan }: { clientId: string; logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const { contexto, cargando } = useContextoDescarga(clientId)
  const { decisiones, cargando: cargandoDecisiones } = useDecisiones(clientId)
  const r = useMemo(() => evidenciaDescarga({ hoy: localDateKey(), plan, logs, ...contexto, decisiones }), [plan, logs, contexto, decisiones])

  if (cargando || cargandoDecisiones) return <p className="text-sm text-muted" role="status">Cargando…</p>

  return (
    <div className="space-y-4">
      <div className="bg-bg-alt/60 rounded-xl px-4 py-3" role="note">
        <p className="text-sm font-semibold">{r.resumen}</p>
        <p className="text-xs text-muted mt-0.5">{CONFIANZA[r.confianza]} · {r.semanas.length - 1} semanas completas miradas</p>
      </div>

      <section aria-label="Semanas recientes">
        <p className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Semanas recientes</p>
        <ol className="flex gap-1.5">
          {r.semanas.map(s => (
            <li key={s.lunes} className="flex-1 min-w-0 text-center" title={`Semana del ${s.lunes}${s.descarga ? ' · descarga en el plan' : ''}${s.diasAusencia ? ` · ${s.diasAusencia} días de ausencia` : ''}`}>
              <div className={`rounded-lg py-1.5 text-sm font-bold border ${s.enCurso ? 'border-dashed border-border text-muted' : s.sesiones > 0 ? 'border-border bg-card' : 'border-border bg-bg-alt text-muted'}`}>
                {s.sesiones}<span className="text-xs font-normal text-muted">/{s.previstas || '–'}</span>
              </div>
              <p className="text-[11px] text-muted mt-0.5 truncate">{s.enCurso ? 'esta' : s.lunes.slice(5).split('-').reverse().join('/')}{s.descarga ? ' · desc.' : ''}{s.diasAusencia ? ' · aus.' : ''}</p>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted mt-1">Sesiones hechas sobre las previstas. La semana en curso no cuenta.</p>
      </section>

      <Caja icono={<HelpCircle className="w-4 h-4 text-muted" aria-hidden />} titulo="Datos insuficientes" vacio="Nada que falte para valorar lo que se mira aquí." items={r.datosInsuficientes.map(x => x.texto)} />
      <Caja icono={<Eye className="w-4 h-4 text-warn" aria-hidden />} titulo="Señales a observar" vacio="Ninguna señal con los datos disponibles." items={r.senales.map(x => x.texto)} aviso={r.contextoAtipico.length ? r.contextoAtipico : undefined} />
      <Caja icono={<ListChecks className="w-4 h-4 text-ok" aria-hidden />} titulo="Evidencia disponible" vacio="Todavía no hay evidencia que enseñar." items={r.evidencia.filter(x => x.id !== 'atipico').map(x => x.texto)} />

      {r.falta.length > 0 && (
        <section aria-label="Qué falta para más confianza" className="rounded-xl border border-border px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted mb-1">Qué falta para más confianza</p>
          <ul className="text-sm space-y-0.5 list-disc pl-5">{r.falta.map(f => <li key={f}>{f}</li>)}</ul>
        </section>
      )}

      {r.decisionesPrevias.length > 0 && (
        <section aria-label="Decisiones previas relacionadas">
          <p className="text-xs font-bold uppercase tracking-wider text-muted mb-1">Decisiones previas sobre volumen, intensidad o descarga</p>
          <ul className="text-sm space-y-0.5">
            {r.decisionesPrevias.map(d => <li key={d.id}><span className="text-muted">{d.fecha} · {d.tipo}:</span> {d.texto} <span className="text-xs text-muted">({d.revisada ? 'revisada' : 'sin revisar'})</span></li>)}
          </ul>
        </section>
      )}

      <p className="text-xs text-muted flex gap-1.5"><Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden />
        <span>Es una lectura de evidencia, no un veredicto: no decide si toca descarga ni cambia el plan. Una señal aislada no demuestra fatiga, y menos sesiones o una ausencia no son lo mismo que cansancio. Criterios provisionales ({r.politicaVersion}).</span></p>
    </div>
  )
}

function Caja({ icono, titulo, items, vacio, aviso }: { icono: React.ReactNode; titulo: string; items: string[]; vacio: string; aviso?: string[] }) {
  return (
    <section aria-label={titulo} className="rounded-xl border border-border px-4 py-3">
      <p className="text-sm font-bold flex items-center gap-1.5">{icono}{titulo}</p>
      {items.length ? <ul className="text-sm mt-1.5 space-y-1 list-disc pl-5">{items.map(t => <li key={t}>{t}</li>)}</ul> : <p className="text-sm text-muted mt-1">{vacio}</p>}
      {aviso && aviso.map(a => <p key={a} className="text-xs text-muted mt-2 bg-bg-alt/60 rounded-lg px-3 py-2">Contexto atípico — {a} Por eso la carga, el rendimiento y el RIR no se interpretan.</p>)}
    </section>
  )
}
