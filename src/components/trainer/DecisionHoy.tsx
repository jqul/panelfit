import { useState } from 'react'
import { ArrowRight, Compass } from 'lucide-react'
import type { TrainingLogs } from '../../types'
import type { ClientWithStats } from '../../hooks/useTrainerClients'
import type { Lead } from '../../lib/leads'
import type { Destino } from '../../lib/atencionCliente'
import { useDecisionHoy } from '../../hooks/useDecisionHoy'
import type { NivelDecision, Tarea } from '../../lib/decisionHoy'

const PUNTO: Record<NivelDecision, string> = { atender: 'bg-warn', revisar: 'bg-amber-400', bien: 'bg-ok' }
const ETIQUETA: Record<NivelDecision, string> = { atender: 'Atender', revisar: 'Revisar', bien: 'Bien' }

// «Decisión de hoy» (lib/decisionHoy): lo que conviene mirar hoy de todos los clientes, en filas que dicen quién, qué necesita, por qué ahora
// y llevan a la pantalla donde decide el entrenador. Es una lista derivada de lo que ya hay: no cambia ningún plan ni dice qué hacer con él.
export function DecisionHoy({ trainerId, clients, logsMap, leadsNuevos, onAbrirFicha, onVerContactos }: {
  trainerId: string
  clients: ClientWithStats[]
  logsMap: Record<string, TrainingLogs | undefined>
  leadsNuevos: Lead[]
  onAbrirFicha: (c: ClientWithStats, destino: Destino) => void
  onVerContactos: () => void
}) {
  const { decision, cargando } = useDecisionHoy(trainerId, clients, logsMap, leadsNuevos)
  const [todas, setTodas] = useState(false)
  const { tareas, visibles, restantes, resumen } = decision
  const filas = todas ? tareas : visibles

  const abrir = (t: Tarea) => {
    if (t.destino.tipo === 'contactos') { onVerContactos(); return }
    const id = t.destino.clienteId
    const c = clients.find(x => x.id === id)
    if (c) onAbrirFicha(c, t.destino.destino)
  }

  const cuantas = [resumen.atender && `${resumen.atender} para atender`, resumen.revisar && `${resumen.revisar} para revisar`, resumen.bien && `${resumen.bien} ${resumen.bien === 1 ? 'que va bien' : 'que van bien'}`].filter(Boolean).join(' · ')

  return (
    <section aria-label="Decisión de hoy" className="bg-card rounded-2xl overflow-hidden border border-border" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      <div className="px-5 py-4 border-b border-border/50">
        <h3 className="font-serif font-bold text-lg flex items-center gap-2"><Compass className="w-4 h-4 text-accent" aria-hidden /> Decisión de hoy</h3>
        <p className="text-xs text-muted mt-0.5" role="status">
          {cargando ? 'Cargando…' : !tareas.length ? (clients.length ? 'Nada pide tu atención hoy ✓' : 'Aún no tienes clientes') : cuantas}
        </p>
      </div>

      {filas.length > 0 && (
        <ul className="divide-y divide-border/50">
          {filas.map(t => (
            <li key={t.id} className="px-5 py-3 flex items-start gap-3">
              <span className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${PUNTO[t.nivel]}`} role="img" aria-label={ETIQUETA[t.nivel]} />
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-semibold">{t.quien}<span className="font-normal text-muted"> · {t.necesita}</span></p>
                <p className="text-xs text-muted"><span className="font-semibold">Por qué ahora:</span> {t.porque}</p>
              </div>
              <button type="button" onClick={() => abrir(t)} aria-label={`${t.accion}: ${t.quien}`}
                className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-xs font-semibold hover:border-accent hover:text-accent transition-colors">
                {t.accion} <ArrowRight className="w-3 h-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {restantes > 0 && (
        <button type="button" onClick={() => setTodas(v => !v)} aria-expanded={todas} className="w-full px-5 py-2.5 border-t border-border/50 text-xs font-semibold text-accent hover:bg-bg-alt/40 text-left">
          {todas ? 'Ver solo las primeras' : `Ver las ${restantes} restantes`}
        </button>
      )}

      <p className="px-5 py-3 border-t border-border/50 text-[11px] text-muted">
        Sale de lo que ya registran tus clientes y de tus propios avisos. No cambia ningún plan ni dice qué hacer: abre la pantalla donde decides tú. Criterios provisionales ({decision.politicaVersion}).
      </p>
    </section>
  )
}
