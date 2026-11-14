import { useMemo } from 'react'
import { ClipboardCheck, TrendingUp, TrendingDown, Copy } from 'lucide-react'
import type { TrainingLogs, TrainingPlan } from '../../../types'
import { localDateKey } from '../../../lib/dates'
import { finDelPlan } from '../../../lib/finPlan'
import { revisionBloque, tocaRevisar, type RevisionBloque as Revision } from '../../../lib/revisionBloque'
import { toast } from '../../shared/Toast'

const kg = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 })
const fecha = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })

/** Texto para mandarle al cliente (WhatsApp, mensaje...). */
export function textoRevision(r: Revision, nombre: string): string {
  return [
    `${nombre}, así ha ido este bloque 💪`,
    r.cumplimientoPct !== null ? `✅ ${r.sesionesHechas} de ${r.sesionesPrevistas} sesiones (${r.cumplimientoPct} %)` : null,
    ...r.suben.slice(0, 4).map(e => `📈 ${e.name}: +${e.cambioPct} % (${kg(e.inicio)} → ${kg(e.fin)} kg de 1RM estimado)`),
    r.estancados.length ? `🔧 A trabajar: ${r.estancados.map(e => e.name).join(', ')}` : null,
    'En el siguiente bloque seguimos ajustando. ¡A por ello!',
  ].filter(Boolean).join('\n')
}

// Pestaña Plan → «Revisión del bloque» (lib/revisionBloque): en la última semana del plan y al terminar, qué subió, qué
// se estancó y cuánto se cumplió, con un texto para mandárselo al cliente y el paso al siguiente bloque.
export function RevisionBloque({ plan, logs, nombre }: { plan: TrainingPlan; logs: TrainingLogs; nombre: string }) {
  const r = useMemo(() => revisionBloque(plan, logs, localDateKey()), [plan, logs])
  if (!r || !tocaRevisar(r)) return null
  const fin = finDelPlan(plan)!

  const copiar = async () => {
    try { await navigator.clipboard.writeText(textoRevision(r, nombre)); toast('Resumen copiado: pégalo en WhatsApp o en un mensaje', 'ok') }
    catch { toast('No se pudo copiar', 'warn') }
  }
  const irASiguiente = () => document.getElementById('siguiente-plan')?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  return (
    <section aria-label="Revisión del bloque" className="flex-shrink-0 mb-3 px-4 py-3 bg-card border border-accent/30 rounded-2xl space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <ClipboardCheck className="w-4 h-4 text-accent flex-shrink-0" aria-hidden />
        <p className="text-xs font-bold text-muted uppercase tracking-wider flex-1">Revisión del bloque</p>
        <span className="text-xs text-muted">{r.terminado ? `Terminó el ${fecha(fin)}` : `Termina en ${r.diasRestantes} día${r.diasRestantes === 1 ? '' : 's'}`}</span>
      </div>
      {r.cumplimientoPct !== null && (
        <p className="text-sm"><strong>{r.sesionesHechas} de {r.sesionesPrevistas}</strong> sesiones hechas <span className="text-muted">({r.cumplimientoPct} %)</span></p>
      )}
      {r.ejercicios.length === 0 ? (
        <p className="text-xs text-muted">Aún no hay ejercicios con peso repetidos en este bloque para comparar.</p>
      ) : (
        <ul className="space-y-1" aria-label="Ejercicios del bloque">
          {r.ejercicios.slice(0, 8).map(e => (
            <li key={e.name} className="flex items-center gap-2 text-xs">
              {e.cambioPct >= 2 ? <TrendingUp className="w-3.5 h-3.5 text-ok flex-shrink-0" /> : e.estancado || e.cambioPct < 0 ? <TrendingDown className="w-3.5 h-3.5 text-warn flex-shrink-0" /> : <span className="w-3.5 flex-shrink-0" />}
              <span className="flex-1 min-w-0 truncate">{e.name}</span>
              <span className="tabular-nums text-muted">{kg(e.inicio)} → {kg(e.fin)} kg</span>
              <span className={`tabular-nums font-bold w-14 text-right ${e.cambioPct >= 2 ? 'text-ok' : e.cambioPct < 0 || e.estancado ? 'text-warn' : 'text-muted'}`}>{e.cambioPct > 0 ? '+' : ''}{e.cambioPct} %</span>
            </li>
          ))}
        </ul>
      )}
      {r.estancados.length > 0 && (
        <p className="text-xs text-warn">🔧 Estancados: {r.estancados.map(e => e.name).join(', ')}. Para el siguiente bloque: cambia la variante, el rango de repeticiones o mete una descarga.</p>
      )}
      <div className="flex gap-2 flex-wrap pt-1">
        <button type="button" onClick={copiar} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-xl text-xs font-semibold text-muted hover:border-accent hover:text-accent">
          <Copy className="w-3.5 h-3.5" /> Copiar resumen para {nombre}
        </button>
        <button type="button" onClick={irASiguiente} className="px-3 py-1.5 bg-ink text-white rounded-xl text-xs font-bold hover:opacity-90">Preparar el siguiente bloque ↓</button>
      </div>
    </section>
  )
}
