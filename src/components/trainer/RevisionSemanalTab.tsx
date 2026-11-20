import { useState } from 'react'
import { Check, MessageCircle, ChevronRight, ClipboardCheck } from 'lucide-react'
import type { TrainingLogs } from '../../types'
import type { ClientWithStats } from '../../hooks/useTrainerClients'
import { useRevisionSemanal } from '../../hooks/useRevisionSemanal'
import { resumenRevision, claveSemana, type FilaRevision, type NivelRevision } from '../../lib/revisionSemanal'
import { whatsappDe } from '../../lib/leads'
import { localDateKey } from '../../lib/dates'
import { toast } from '../shared/Toast'

const ESTILO: Record<NivelRevision, { punto: string; pill: string; titulo: string }> = {
  atender: { punto: 'bg-warn', pill: 'bg-warn/10 text-warn', titulo: 'Atender' },
  revisar: { punto: 'bg-amber-400', pill: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300', titulo: 'Revisar' },
  bien: { punto: 'bg-ok', pill: 'bg-ok/10 text-ok', titulo: 'Bien' },
}

// Lo marcado como revisado esta semana, por entrenador: al cambiar la semana vuelve a salir todo.
const claveAlmacen = (trainerId: string) => `pf_revision_semanal_${trainerId}`
function leerRevisados(trainerId: string, semana: string): Set<string> {
  try {
    const v = JSON.parse(localStorage.getItem(claveAlmacen(trainerId)) || 'null')
    return v?.semana === semana && Array.isArray(v.ids) ? new Set<string>(v.ids) : new Set()
  } catch { return new Set() }
}

// Revisión semanal de todos los clientes (lib/revisionSemanal): una pasada, una fila por cliente, con lo que hay que mirar y una acción rápida.
export function RevisionSemanalTab({ trainerId, clients, logsMap, onAbrir }: {
  trainerId: string; clients: ClientWithStats[]; logsMap: Record<string, TrainingLogs | undefined>; onAbrir: (c: ClientWithStats) => void
}) {
  const hoy = localDateKey()
  const semana = claveSemana(hoy)
  const { filas, cargando } = useRevisionSemanal(trainerId, clients, logsMap)
  const [revisados, setRevisados] = useState(() => leerRevisados(trainerId, semana))
  const [verRevisados, setVerRevisados] = useState(false)

  const marcar = (id: string, hecho: boolean) => {
    const next = new Set(revisados); if (hecho) next.add(id); else next.delete(id)
    setRevisados(next)
    try { localStorage.setItem(claveAlmacen(trainerId), JSON.stringify({ semana, ids: [...next] })) } catch { /* sin almacenamiento: no se recuerda */ }
  }
  const pendientes = filas.filter(f => !revisados.has(f.id))
  const hechas = filas.filter(f => revisados.has(f.id))
  const resumen = resumenRevision(pendientes)

  const enviar = async (f: FilaRevision) => {
    if (!f.mensaje) return
    const c = clients.find(x => x.id === f.id)
    const url = whatsappDe(c?.phone, f.mensaje.texto)
    if (url) { window.open(url, '_blank', 'noopener'); return }
    try { await navigator.clipboard.writeText(f.mensaje.texto); toast('Sin teléfono: mensaje copiado ✓', 'ok') } catch { toast('Sin teléfono y no se pudo copiar el mensaje', 'warn') }
  }

  const fila = (f: FilaRevision) => {
    const c = clients.find(x => x.id === f.id)
    const hecha = revisados.has(f.id)
    return (
      <li key={f.id} className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ESTILO[f.nivel].punto}`} aria-hidden />
          <button type="button" onClick={() => c && onAbrir(c)} aria-label={`Abrir la ficha de ${f.nombre}`} className="flex-1 min-w-0 flex items-center gap-3 text-left">
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold truncate">{f.nombre}</span>
              <span className="block text-xs text-muted">{f.sesiones}</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-muted flex-shrink-0" aria-hidden />
          </button>
          <button type="button" onClick={() => marcar(f.id, !hecha)} aria-label={hecha ? `Volver a revisar a ${f.nombre}` : `Revisado: ${f.nombre}`}
            className={`p-2 rounded-lg ${hecha ? 'text-ok bg-ok/10' : 'text-muted hover:text-ok hover:bg-ok/10'}`} title={hecha ? 'Revisado esta semana' : 'Marcar como revisado'}><Check className="w-4 h-4" /></button>
        </div>
        <div className="ml-5 flex flex-wrap items-center gap-1.5">
          {f.senales.length === 0 && <span className="text-xs text-muted">Todo correcto</span>}
          {f.senales.map(s => <span key={s.id} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ESTILO[s.nivel].pill}`}>{s.texto}</span>)}
        </div>
        {f.mensaje && !hecha && (
          <div className="ml-5">
            <button type="button" onClick={() => void enviar(f)} aria-label={`Mensaje a ${f.nombre}: ${f.mensaje.motivo}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-semibold hover:border-accent hover:text-accent transition-colors">
              <MessageCircle className="w-3.5 h-3.5" aria-hidden /> Mensaje · {f.mensaje.motivo}
            </button>
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="animate-fade-in max-w-3xl space-y-5">
      <div>
        <h2 className="text-3xl font-serif font-bold flex items-center gap-2"><ClipboardCheck className="w-6 h-6 text-accent" aria-hidden /> Revisión semanal</h2>
        <p className="text-muted text-sm mt-1" role="status">
          {cargando ? 'Cargando…' : !filas.length ? 'Aún no tienes clientes' : pendientes.length === 0 ? 'Semana revisada ✓ Todos tus clientes están marcados como revisados.'
            : `${pendientes.length} ${pendientes.length === 1 ? 'cliente' : 'clientes'} por revisar${resumen.atender ? ` · ${resumen.atender} para atender` : ''}${resumen.revisar ? ` · ${resumen.revisar} para revisar` : ''}`}
        </p>
      </div>

      {pendientes.length > 0 && (
        <section aria-label="Por revisar" className="bg-card rounded-2xl overflow-hidden border border-border">
          <ul className="divide-y divide-border/50">{pendientes.map(fila)}</ul>
        </section>
      )}

      {hechas.length > 0 && (
        <section aria-label="Revisados esta semana" className="space-y-2">
          <button type="button" onClick={() => setVerRevisados(v => !v)} aria-expanded={verRevisados} className="text-xs font-semibold text-muted hover:text-ink">
            {verRevisados ? 'Ocultar' : 'Ver'} los {hechas.length} revisados esta semana
          </button>
          {verRevisados && <div className="bg-card rounded-2xl overflow-hidden border border-border"><ul className="divide-y divide-border/50 opacity-70">{hechas.map(fila)}</ul></div>}
        </section>
      )}

      <p className="text-[11px] text-muted">Semana del {new Date(semana + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}. Es una lista derivada de lo que ya hay: no cambia nada por sí sola. «Revisado» se recuerda hasta el lunes.</p>
    </div>
  )
}
