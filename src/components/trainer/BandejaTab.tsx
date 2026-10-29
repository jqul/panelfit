import { useState } from 'react'
import { Inbox, UserPlus, CheckCircle2, Moon, HeartPulse, Video, FileEdit, AlertTriangle, ChevronRight, Target, Check, Clock, Undo2, Repeat, HelpCircle } from 'lucide-react'
import { ClientData } from '../../types'
import { useInboxItems, InboxKind } from '../../hooks/useInboxItems'
import { ClientWithStats } from '../../hooks/useTrainerClients'
import { localDateKey } from '../../lib/dates'
import { nextMonday, tomorrow, type QueueRow, type QueueTier } from '../../lib/dailyQueue'
import { DEMO_TRAINER_ID } from '../../lib/demoIds'
import { toast } from '../shared/Toast'
import { contactoDe, haceCuanto, llevaEsperando, textoEspera } from '../../lib/leads'
import type { LeadsState } from '../../hooks/useLeads'

const DAYS_BACK = 14
const PRIMERAS = 5 // filas que se enseñan por nivel antes de "Ver N más" (lo urgente se enseña entero)

const KIND_STYLE: Record<InboxKind, { bg: string; fg: string; icon: (props: { className?: string }) => JSX.Element }> = {
  readiness: { bg: 'bg-accent/10', fg: 'text-accent', icon: p => <Moon {...p} /> },
  dolor:     { bg: 'bg-warn/10',   fg: 'text-warn',   icon: p => <HeartPulse {...p} /> },
  video:     { bg: 'bg-accent/10', fg: 'text-accent', icon: p => <Video {...p} /> },
  borrador:  { bg: 'bg-warn/10',   fg: 'text-warn',   icon: p => <FileEdit {...p} /> },
  riesgo:    { bg: 'bg-warn/10',   fg: 'text-warn',   icon: p => <AlertTriangle {...p} /> },
  revision:  { bg: 'bg-accent/10', fg: 'text-accent', icon: p => <Target {...p} /> },
  sustitucion: { bg: 'bg-accent/10', fg: 'text-accent', icon: p => <Repeat {...p} /> },
  duda:      { bg: 'bg-accent/10', fg: 'text-accent', icon: p => <HelpCircle {...p} /> },
  sesion:    { bg: 'bg-ok/10',     fg: 'text-ok',     icon: () => <></> },
}

const TIER_TITLE: Record<QueueTier, { titulo: string; ayuda: string }> = {
  urgente: { titulo: 'Urgente', ayuda: 'No debería esperar' },
  hoy: { titulo: 'Para hoy', ayuda: 'Lo normal del día' },
  luego: { titulo: 'Cuando puedas', ayuda: 'Informativo' },
}

const fechaCorta = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

type Vista = 'cola' | 'aparte' | 'actividad'

export function BandejaTab({ trainerId, clients, logsMap, onSelectClient, leadsState, onVerContactos }: {
  trainerId: string
  clients: ClientWithStats[]
  logsMap: Record<string, any>
  onSelectClient: (c: ClientData) => void
  /** Contactos de la página pública: los nuevos van arriba de la cola, porque son clientes por ganar. */
  leadsState?: LeadsState
  onVerContactos?: () => void
}) {
  const [vista, setVista] = useState<Vista>('cola')
  const [verTodas, setVerTodas] = useState<Record<QueueTier, boolean>>({ urgente: true, hoy: false, luego: false })
  const [pospongo, setPospongo] = useState<string | null>(null) // fila con el menú de posponer abierto
  const [aceptando, setAceptando] = useState<string | null>(null) // aviso de sustitución que se está guardando
  const { queue, setDone, snooze, unsnooze, loading } = useInboxItems(trainerId, clients, logsMap)
  const abrir = (clientId: string) => { const c = clients.find(cl => cl.id === clientId); if (c) onSelectClient(c) }
  const hoy = localDateKey()

  // Aceptar la sustitución de un cliente como alternativa habitual: pasa al plan B de ese ejercicio (en todas sus
  // semanas) y el aviso se da por revisado.
  const aceptar = async ({ key, accion }: { key: string; accion: { clientId: string; ejercicio: string; alternativa: string; exerciseId?: string } }) => {
    setAceptando(key)
    const res = trainerId === DEMO_TRAINER_ID ? { ok: true as const } : await import('../../lib/serverSync').then(m => m.addPlanAlternative(accion.clientId, accion.ejercicio, { name: accion.alternativa, ...(accion.exerciseId ? { exerciseId: accion.exerciseId } : {}) }))
    setAceptando(null)
    if (!res.ok) { toast('No se pudo añadir al plan. Inténtalo de nuevo', 'warn'); return }
    setDone([key], true)
    toast(`«${accion.alternativa}» ya es una alternativa habitual de «${accion.ejercicio}» ✓`, 'ok')
  }

  const leadsNuevos = leadsState?.nuevos ?? []
  const resumen = [
    leadsNuevos.length > 0 && `${leadsNuevos.length} contacto${leadsNuevos.length !== 1 ? 's' : ''} nuevo${leadsNuevos.length !== 1 ? 's' : ''}`,
    queue.counts.urgente > 0 && `${queue.counts.urgente} urgente${queue.counts.urgente !== 1 ? 's' : ''}`,
    queue.counts.hoy > 0 && `${queue.counts.hoy} para hoy`,
    queue.counts.luego > 0 && `${queue.counts.luego} cuando puedas`,
  ].filter(Boolean).join(' · ')

  const renderFila = (row: QueueRow) => {
    const top = row.reasons[0]
    const style = KIND_STYLE[top.kind]
    // Lo que ya sale en su propia tarjeta (con su botón) no se repite en la línea de "también"
    const otras = row.reasons.slice(1).filter(r => !r.acciones?.length)
    const acciones = row.reasons.flatMap(r => r.acciones ?? [])
    return (
      <div key={row.clientId} className="px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => abrir(row.clientId)} className="flex-1 min-w-0 flex items-center gap-3 text-left" aria-label={`Abrir la ficha de ${row.clientName}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${style.bg} ${style.fg}`}>{style.icon({ className: 'w-3.5 h-3.5' })}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{row.clientName}</p>
              <p className={`text-xs truncate ${row.tier === 'luego' ? 'text-muted' : 'text-warn font-medium'}`}>{top.detail}</p>
              {otras.length > 0 && <p className="text-[11px] text-muted truncate">+ {otras.map(r => r.detail.replace(/ \(\+\d+ más\)$/, '')).join(' · ')}</p>}
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted flex-shrink-0" />
          </button>
          <div className="flex items-center gap-1 flex-shrink-0">
            {row.snoozable && (
              <button onClick={() => setPospongo(p => p === row.clientId ? null : row.clientId)} aria-label={`Posponer ${row.clientName}`} aria-expanded={pospongo === row.clientId}
                className="p-2 rounded-lg text-muted hover:bg-bg-alt" title="Posponer"><Clock className="w-4 h-4" /></button>
            )}
            <button onClick={() => setDone(row.keys, true)} aria-label={`Hecho: ${row.clientName}`}
              className="p-2 rounded-lg text-muted hover:text-ok hover:bg-ok/10" title="Hecho"><Check className="w-4 h-4" /></button>
          </div>
        </div>
        {acciones.length > 0 && (
          <div className="mt-2 ml-11 space-y-2">
            {acciones.map(a => (
              <div key={a.key} className="bg-bg-alt/60 rounded-xl p-3 space-y-2">
                <p className="text-xs leading-snug">{a.detail}</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => aceptar(a)} disabled={aceptando === a.key}
                    aria-label={`Aceptar ${a.accion.alternativa} como alternativa habitual de ${a.accion.ejercicio}`}
                    className="px-3 py-1.5 rounded-lg bg-ink text-white text-xs font-semibold disabled:opacity-50">
                    {aceptando === a.key ? 'Guardando…' : 'Aceptar como alternativa habitual'}
                  </button>
                  <button onClick={() => abrir(row.clientId)} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-bg-alt">Revisar</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {pospongo === row.clientId && (
          <div className="flex gap-2 mt-2 ml-11" role="group" aria-label="Posponer hasta">
            <button onClick={() => { snooze(row.clientId, tomorrow(hoy)); setPospongo(null) }} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-bg-alt">Hasta mañana</button>
            <button onClick={() => { snooze(row.clientId, nextMonday(hoy)); setPospongo(null) }} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-bg-alt">Hasta el lunes</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-serif font-bold">Bandeja</h2>
          <p className="text-muted text-sm mt-1">{loading ? 'Cargando…' : resumen || 'Nada que atender ahora mismo'}</p>
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Vista de la bandeja">
          {([
            ['cola', `Cola${queue.pending.length ? ` (${queue.pending.length})` : ''}`],
            ['aparte', `Hecho y pospuesto${queue.parked.length ? ` (${queue.parked.length})` : ''}`],
            ['actividad', 'Actividad'],
          ] as [Vista, string][]).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={vista === id} onClick={() => setVista(id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${vista === id ? 'bg-ink text-white border-ink' : 'bg-card border-border/50 text-muted'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-card rounded-2xl animate-pulse shadow-sm" />)}</div>
      ) : vista === 'cola' ? (
        <>
        {leadsNuevos.length > 0 && (
          <section aria-label="Contactos nuevos">
            <div className="flex items-baseline gap-2 mb-2 px-1">
              <h3 className={`text-sm font-bold uppercase tracking-wider ${leadsNuevos.some(l => llevaEsperando(l)) ? 'text-warn' : 'text-accent'}`}>Contactos nuevos</h3>
              <span className="text-xs text-muted">{leadsNuevos.length} · {leadsNuevos.some(l => llevaEsperando(l)) ? `${leadsNuevos.filter(l => llevaEsperando(l)).length} sin contestar desde hace más de un día` : 'Gente que te ha escrito desde tu página'}</span>
            </div>
            <div className="bg-card rounded-2xl overflow-hidden divide-y divide-border/50 border border-accent/40" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              {leadsNuevos.slice(0, PRIMERAS).map(l => (
                <button key={l.id} onClick={onVerContactos} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-alt/40" aria-label={`Contacto nuevo: ${l.name}`}>
                  <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center flex-shrink-0"><UserPlus className="w-3.5 h-3.5" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{l.name}</p>
                    <p className={`text-xs truncate ${textoEspera(l) ? 'text-warn font-medium' : 'text-muted'}`}>{[contactoDe(l) || 'Sin datos de contacto', textoEspera(l) || haceCuanto(l.created_at)].join(' · ')}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                </button>
              ))}
              {leadsNuevos.length > PRIMERAS && (
                <button onClick={onVerContactos} className="w-full py-2.5 text-xs font-semibold text-accent hover:bg-bg-alt/50">Ver {leadsNuevos.length - PRIMERAS} más</button>
              )}
            </div>
          </section>
        )}
        {queue.pending.length === 0 && leadsNuevos.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl shadow-sm">
            <Inbox className="w-10 h-10 text-muted/30 mx-auto mb-3" />
            <p className="font-serif font-bold text-lg">Todo al día ✓</p>
            <p className="text-sm text-muted mt-1">No hay nada pendiente de atender.</p>
          </div>
        ) : (
          (['urgente', 'hoy', 'luego'] as QueueTier[]).map(tier => {
            const filas = queue.pending.filter(r => r.tier === tier)
            if (filas.length === 0) return null
            const visibles = verTodas[tier] ? filas : filas.slice(0, PRIMERAS)
            return (
              <section key={tier} aria-label={TIER_TITLE[tier].titulo}>
                <div className="flex items-baseline gap-2 mb-2 px-1">
                  <h3 className={`text-sm font-bold uppercase tracking-wider ${tier === 'urgente' ? 'text-warn' : 'text-muted'}`}>{TIER_TITLE[tier].titulo}</h3>
                  <span className="text-xs text-muted">{filas.length} · {TIER_TITLE[tier].ayuda}</span>
                </div>
                <div className="bg-card rounded-2xl overflow-hidden divide-y divide-border/50" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  {visibles.map(renderFila)}
                  {filas.length > visibles.length && (
                    <button onClick={() => setVerTodas(v => ({ ...v, [tier]: true }))} className="w-full py-2.5 text-xs font-semibold text-accent hover:bg-bg-alt/50">
                      Ver {filas.length - visibles.length} más
                    </button>
                  )}
                </div>
              </section>
            )
          })
        )}
        </>
      ) : vista === 'aparte' ? (
        queue.parked.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl shadow-sm">
            <CheckCircle2 className="w-10 h-10 text-muted/30 mx-auto mb-3" />
            <p className="font-serif font-bold text-lg">Nada aparte</p>
            <p className="text-sm text-muted mt-1">Lo que marques como hecho o pospongas aparece aquí, por si quieres recuperarlo.</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl overflow-hidden divide-y divide-border/50" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            {queue.parked.map(({ row, why, until }) => (
              <div key={row.clientId} className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => abrir(row.clientId)} className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold truncate">{row.clientName}</p>
                  <p className="text-xs text-muted truncate">{why === 'pospuesto' && until ? `Pospuesto hasta el ${fechaCorta(until)}` : 'Hecho'} · {row.reasons[0].detail}</p>
                </button>
                <button onClick={() => { if (why === 'pospuesto') unsnooze(row.clientId); else setDone(row.keys, false) }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted hover:bg-bg-alt">
                  <Undo2 className="w-3.5 h-3.5" /> Recuperar
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        queue.activity.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl shadow-sm">
            <Inbox className="w-10 h-10 text-muted/30 mx-auto mb-3" />
            <p className="font-serif font-bold text-lg">Sin actividad reciente</p>
            <p className="text-sm text-muted mt-1">Nada en los últimos {DAYS_BACK} días.</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl overflow-hidden divide-y divide-border/50" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            {queue.activity.map(a => (
              <button key={`${a.clientId}:${a.date}`} onClick={() => abrir(a.clientId)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-alt/40">
                <div className="w-8 h-8 rounded-full bg-ok/10 text-ok flex items-center justify-center text-xs font-bold flex-shrink-0">{a.clientName[0]?.toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{a.clientName}</p>
                  <p className="text-xs text-muted truncate">{a.detail}</p>
                </div>
                <span className="text-[11px] text-muted flex-shrink-0">{fechaCorta(a.date)}</span>
              </button>
            ))}
          </div>
        )
      )}
    </div>
  )
}
