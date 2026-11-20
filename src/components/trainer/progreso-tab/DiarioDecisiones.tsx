import { useState, lazy, Suspense } from 'react'
import { NotebookPen } from 'lucide-react'
import { useDecisiones } from '../../../hooks/useDecisiones'
import { toast } from '../../shared/Toast'
import { localDateKey } from '../../../lib/dates'
import type { TrainingLogs, TrainingPlan } from '../../../types'
import {
  TIPOS_DECISION, SEMANAS_REVISION, MAX_TEXTO, ordenarDecisiones, estaPorRevisar, validarBorrador, etiquetaTipo, esDecisionDeCarga,
  type BorradorDecision, type TipoDecision,
} from '../../../lib/diarioDecisiones'

// La tarjeta «¿Qué pasó desde esta decisión?» junta mucha lógica y solo se usa al revisar: se carga al abrirla
const RevisionDecision = lazy(() => import('./RevisionDecision').then(m => ({ default: m.RevisionDecision })))
const CIERRES = ['Mantener', 'Revertir', 'Ajustar'] as const
const RE_CIERRE = /^(Mantener|Revertir|Ajustar): ?/

const VACIO = (ejercicio?: string): BorradorDecision => ({ ejercicio, hipotesis: '', tipo: '', intervencion: '', semanasRevision: 4 })
const fecha = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

// Diario de decisiones: tras mirar la lista de comprobación, se anota qué se cree que pasa (hipótesis), qué se decide y cuándo se
// vuelve a mirar; al revisarla, qué ocurrió. «No intervenir todavía» es una decisión más. Solo lo ve el entrenador.
export function DiarioDecisiones({ clientId, trainerId, ejercicio, logs, plan }: { clientId: string; trainerId?: string; ejercicio?: string; logs?: TrainingLogs; plan?: TrainingPlan | null }) {
  const { decisiones, cargando, anadir, revisar } = useDecisiones(clientId, trainerId)
  const [borrador, setBorrador] = useState<BorradorDecision>(VACIO(ejercicio))
  const [abierto, setAbierto] = useState(false)
  const [revisando, setRevisando] = useState<string | null>(null)
  const [resultado, setResultado] = useState('')
  const [vistas, setVistas] = useState<string[]>([]) // revisadas cuya tarjeta se ha abierto
  const hoy = localDateKey()
  const ordenadas = ordenarDecisiones(decisiones, hoy)
  const porRevisar = decisiones.filter(d => estaPorRevisar(d, hoy)).length

  const guardar = async () => {
    const error = validarBorrador({ ...borrador, ejercicio })
    if (error) { toast(error, 'warn'); return }
    if (await anadir({ ...borrador, ejercicio })) { toast('Decisión anotada ✓', 'ok'); setBorrador(VACIO(ejercicio)); setAbierto(false) }
    else toast('No se pudo guardar', 'warn')
  }
  const cerrar = async (id: string) => {
    if (await revisar(id, resultado)) { toast('Revisión guardada ✓', 'ok'); setRevisando(null); setResultado('') }
    else toast('No se pudo guardar', 'warn')
  }

  return (
    <section aria-label="Diario de decisiones" className="border-t border-border pt-4 space-y-3">
      <div className="flex items-center gap-2">
        <NotebookPen className="w-4 h-4 text-accent" aria-hidden />
        <h4 className="text-sm font-bold flex-1">Diario de decisiones</h4>
        {porRevisar > 0 && <span className="text-[11px] font-bold bg-warn/10 text-warn px-2 py-0.5 rounded-full">{porRevisar} por revisar</span>}
        {!abierto && <button type="button" onClick={() => setAbierto(true)} className="px-3 py-1.5 border border-border rounded-xl text-xs font-semibold hover:border-accent hover:text-accent transition-colors">Anotar decisión</button>}
      </div>

      {abierto && (
        <div className="space-y-3 bg-bg-alt/40 rounded-xl p-4">
          {ejercicio && <p className="text-xs text-muted">Sobre: <strong className="text-ink">{ejercicio}</strong></p>}
          <div>
            <label htmlFor="decision-hipotesis" className="block text-xs font-bold text-muted mb-1">¿Qué crees que pasa? (hipótesis)</label>
            <textarea id="decision-hipotesis" rows={2} maxLength={MAX_TEXTO} value={borrador.hipotesis} onChange={e => setBorrador(b => ({ ...b, hipotesis: e.target.value }))}
              placeholder="Ej.: duerme 5-6 h y llega con el RIR más lejos de lo previsto"
              className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none resize-none" />
          </div>
          <div>
            <label htmlFor="decision-tipo" className="block text-xs font-bold text-muted mb-1">¿Qué decides?</label>
            <select id="decision-tipo" value={borrador.tipo} onChange={e => setBorrador(b => ({ ...b, tipo: e.target.value as TipoDecision | '' }))}
              className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none">
              <option value="">Elige…</option>
              {TIPOS_DECISION.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="decision-intervencion" className="block text-xs font-bold text-muted mb-1">Qué cambias (una sola cosa pequeña)</label>
            <input id="decision-intervencion" maxLength={MAX_TEXTO} value={borrador.intervencion} onChange={e => setBorrador(b => ({ ...b, intervencion: e.target.value }))}
              placeholder="Ej.: +1 serie en la sentadilla, nada más"
              className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none" />
          </div>
          <div>
            <label htmlFor="decision-revision" className="block text-xs font-bold text-muted mb-1">Cuándo lo vuelves a mirar</label>
            <select id="decision-revision" value={borrador.semanasRevision ?? ''} onChange={e => setBorrador(b => ({ ...b, semanasRevision: e.target.value ? Number(e.target.value) : null }))}
              className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none">
              {SEMANAS_REVISION.map(n => <option key={n} value={n}>Dentro de {n} semanas</option>)}
              <option value="">Sin fecha</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setAbierto(false); setBorrador(VACIO(ejercicio)) }} className="px-3 py-1.5 border border-border rounded-xl text-xs font-semibold text-muted">Cancelar</button>
            <button type="button" onClick={guardar} className="px-3 py-1.5 bg-ink text-white rounded-xl text-xs font-semibold">Guardar decisión</button>
          </div>
        </div>
      )}

      {cargando ? null : ordenadas.length === 0 ? (
        <p className="text-xs text-muted">Aún no has anotado ninguna decisión sobre este cliente.</p>
      ) : (
        <ul className="divide-y divide-border/50">
          {ordenadas.map(d => {
            const toca = estaPorRevisar(d, hoy)
            const aplicable = !!logs && esDecisionDeCarga(d) // volumen, intensidad o descarga: se les mira qué pasó después
            const conTarjeta = aplicable && (toca || vistas.includes(d.id))
            return (
              <li key={d.id} className="py-3 space-y-1">
                <p className="text-sm font-semibold">
                  {etiquetaTipo(d.tipo)}{d.ejercicio ? ` · ${d.ejercicio}` : ''}
                  <span className="ml-2 text-[11px] font-normal text-muted">{fecha(d.fecha)}</span>
                  {toca && <span className="ml-2 text-[11px] font-bold text-warn">Toca revisar</span>}
                  {d.revisada_el && <span className="ml-2 text-[11px] font-bold text-ok">Revisada</span>}
                </p>
                {d.hipotesis && <p className="text-xs text-muted">Hipótesis: {d.hipotesis}</p>}
                {d.intervencion && <p className="text-sm">{d.intervencion}</p>}
                {d.revisar_el && !d.revisada_el && !toca && <p className="text-[11px] text-muted">Revisar el {fecha(d.revisar_el)}</p>}
                {conTarjeta && logs && (
                  <Suspense fallback={<p className="text-xs text-muted" role="status">Cargando lo ocurrido…</p>}>
                    <RevisionDecision decision={d} logs={logs} plan={plan} clientId={clientId} />
                  </Suspense>
                )}
                {aplicable && d.revisada_el && !conTarjeta && (
                  <button type="button" onClick={() => setVistas(v => [...v, d.id])} aria-label={`Ver qué pasó desde la decisión: ${etiquetaTipo(d.tipo)}`}
                    className="text-xs font-semibold text-accent hover:underline">Ver qué pasó desde esta decisión</button>
                )}
                {d.resultado && !conTarjeta && <p className="text-sm bg-ok/10 rounded-lg px-3 py-2">Resultado: {d.resultado}</p>}
                {!d.revisada_el && (revisando === d.id ? (
                  <div className="space-y-2 pt-1">
                    <label htmlFor={`resultado-${d.id}`} className="block text-xs font-bold text-muted">Tu conclusión: ¿qué pasó y qué haces con esto?</label>
                    <div className="flex gap-1.5" role="group" aria-label="Cierre rápido">
                      {CIERRES.map(c => (
                        <button key={c} type="button" aria-pressed={resultado.startsWith(c + ':')} onClick={() => setResultado(r => c + ': ' + r.replace(RE_CIERRE, ''))}
                          className={`px-3 py-1 rounded-full border text-xs font-semibold ${resultado.startsWith(c + ':') ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>{c}</button>
                      ))}
                    </div>
                    <textarea id={`resultado-${d.id}`} rows={2} maxLength={MAX_TEXTO} value={resultado} onChange={e => setResultado(e.target.value)}
                      className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none resize-none" />
                    <p className="text-[11px] text-muted">Queda como memoria de coaching de este cliente. No cambia ningún plan.</p>
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={() => { setRevisando(null); setResultado('') }} className="px-3 py-1.5 border border-border rounded-xl text-xs font-semibold text-muted">Cancelar</button>
                      <button type="button" onClick={() => cerrar(d.id)} className="px-3 py-1.5 bg-ink text-white rounded-xl text-xs font-semibold">Guardar revisión</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => { setRevisando(d.id); setResultado('') }} aria-label={`Revisar la decisión: ${etiquetaTipo(d.tipo)}`}
                    className="text-xs font-semibold text-accent hover:underline">Marcar como revisada</button>
                ))}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
