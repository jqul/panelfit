import { lazy, Suspense, useState } from 'react'
import { Inbox, Mail, MessageCircle, Gift, UserPlus, FileText, Trash2 } from 'lucide-react'
import { toast } from '../shared/Toast'
import { ESTADOS_LEAD, avisoPushPendiente, textoAvisoPush, contactoDe, esNuevo, esSolicitud, haceCuanto, saludoParaLead, textoEspera, whatsappDe, type EstadoLead, type Lead } from '../../lib/leads'
import { isDemoTrainerId } from '../../lib/demoIds'
import type { LeadsState } from '../../hooks/useLeads'
import { PaginaPublicaCard } from './PaginaPublicaCard'

const EnlacesProgramacion = lazy(() => import('./EnlacesProgramacion').then(m => ({ default: m.EnlacesProgramacion })))
const SolicitudDetalle = lazy(() => import('./SolicitudDetalle').then(m => ({ default: m.SolicitudDetalle })))

// Las personas que han escrito desde tu página pública: quién es, cómo contestarle y en qué punto está.
export function ContactosTab({ leadsState, trainerId, miNombre, onConvertir, onIrAAjustes, filtroInicial, abrirInicial }: {
  leadsState: LeadsState; trainerId: string; miNombre?: string; onConvertir?: (lead: Lead) => void; onIrAAjustes: () => void
  /** Desde «Decisión de hoy»: la pestaña en que está la solicitud y la solicitud que debe quedar desplegada. */
  filtroInicial?: EstadoLead; abrirInicial?: string
}) {
  const { leads, loading, cambiarEstado, borrar } = leadsState
  const [abierta, setAbierta] = useState<string | null>(abrirInicial ?? null) // solicitud cuyo detalle está desplegado
  const [borrando, setBorrando] = useState<string | null>(null) // solicitud pendiente de confirmar el borrado
  const [filtro, setFiltro] = useState<EstadoLead | 'todos'>(filtroInicial ?? 'nuevo')
  // «Nuevos» incluye los «a revisar»: son los que esperan al entrenador (y más urgentes)
  const coincide = (l: Lead, e: EstadoLead) => (e === 'nuevo' ? esNuevo(l) : l.status === e)
  const cuenta = (e: EstadoLead) => leads.filter(l => coincide(l, e)).length
  const visibles = filtro === 'todos' ? leads : leads.filter(l => coincide(l, filtro))

  const marcar = async (l: Lead, estado: EstadoLead) => {
    const ok = await cambiarEstado(l.id, estado)
    if (!ok) toast('No se pudo cambiar el estado. Inténtalo de nuevo', 'warn')
  }

  const eliminar = async (l: Lead) => {
    const ok = await borrar(l.id)
    setBorrando(null)
    if (!ok) toast('No se pudo eliminar. Inténtalo de nuevo', 'warn')
    else toast('Solicitud eliminada', 'ok')
  }

  return (
    <div className="animate-fade-in space-y-5 max-w-3xl">
      <div>
        <h2 className="text-3xl font-serif font-bold">Contactos</h2>
        <p className="text-muted text-sm mt-1">
          {loading ? 'Cargando…' : cuenta('nuevo') > 0 ? `${cuenta('nuevo')} por contestar` : 'Las personas que te escriben desde tu página pública'}
        </p>
      </div>

      <PaginaPublicaCard trainerId={trainerId} miNombre={miNombre} onIrAAjustes={onIrAAjustes} />

      {!isDemoTrainerId(trainerId) && <Suspense fallback={null}><EnlacesProgramacion trainerId={trainerId} /></Suspense>}

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Estado del contacto">
        {([...ESTADOS_LEAD, { id: 'todos' as const, label: 'Todos' }]).map(e => {
          const n = e.id === 'todos' ? leads.length : cuenta(e.id)
          return (
            <button key={e.id} role="tab" aria-selected={filtro === e.id} onClick={() => setFiltro(e.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border whitespace-nowrap transition-all ${filtro === e.id ? 'bg-ink text-white border-ink' : 'bg-card border-border/50 text-muted'}`}>
              {e.label}{n > 0 ? ` (${n})` : ''}
            </button>
          )
        })}
      </div>

      {!loading && visibles.length === 0 ? (
        <div className="text-center py-14 bg-card rounded-2xl shadow-sm">
          <Inbox className="w-10 h-10 text-muted/30 mx-auto mb-3" />
          <p className="font-serif font-bold text-lg">{filtro === 'nuevo' ? 'Nadie esperando' : 'Nada aquí'}</p>
          <p className="text-sm text-muted mt-1 max-w-xs mx-auto">
            {leads.length === 0
              ? 'Cuando alguien rellene el formulario de tu página pública, aparecerá aquí y recibirás un aviso. Tus clientes también te traen contactos con «Invita a un amigo» (en su pestaña Más).'
              : 'Cambia de pestaña para ver el resto.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visibles.map(l => {
            const wa = whatsappDe(l.phone, saludoParaLead(l.name, miNombre))
            return (
              <li key={l.id} className={`bg-card rounded-2xl p-4 space-y-3 ${textoEspera(l) ? 'border border-warn/50' : l.status === 'nuevo' ? 'border border-accent/40' : 'border border-border/50'}`} style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{l.name}</p>
                    <p className="text-xs text-muted">{contactoDe(l) || 'Sin teléfono ni correo: solo dejó el nombre'}</p>
                  </div>
                  <span className="text-[11px] text-muted flex-shrink-0">{haceCuanto(l.created_at)}</span>
                </div>
                {textoEspera(l) && <p className="text-xs font-semibold text-warn">{textoEspera(l)}</p>}
                {avisoPushPendiente(l) && <p className="text-[11px] font-semibold text-muted" title={textoAvisoPush(l.aviso_push) ?? undefined}>🔕 Aviso push pendiente · {textoAvisoPush(l.aviso_push)}</p>}
                {l.message && <p className="text-sm text-ink/80 italic leading-relaxed">"{l.message}"</p>}
                {esSolicitud(l) && (
                  <p className="text-xs font-semibold text-accent">{l.status === 'revisar' ? 'Solicitud de programación inicial · necesita tu revisión personal' : 'Solicitud de programación inicial'}</p>
                )}
                {l.referrerName && (
                  <p className="flex items-center gap-1.5 text-xs text-accent font-semibold"><Gift className="w-3.5 h-3.5" /> Referido por {l.referrerName}</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {wa && (
                    <a href={wa} target="_blank" rel="noreferrer" onClick={() => { if (l.status === 'nuevo') void marcar(l, 'contactado') }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366] text-white text-xs font-bold">
                      <MessageCircle className="w-3.5 h-3.5" /> Escribir por WhatsApp
                    </a>
                  )}
                  {l.email && (
                    <a href={`mailto:${l.email}`} onClick={() => { if (l.status === 'nuevo') void marcar(l, 'contactado') }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-bg-alt">
                      <Mail className="w-3.5 h-3.5" /> Escribir un correo
                    </a>
                  )}
                  {onConvertir && l.status !== 'convertido' && l.status !== 'descartado' && (
                    <button onClick={() => onConvertir(l)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ink text-white text-xs font-bold">
                      <UserPlus className="w-3.5 h-3.5" /> Convertir en cliente
                    </button>
                  )}
                  {esSolicitud(l) && (
                    <button onClick={() => setAbierta(abierta === l.id ? null : l.id)} aria-expanded={abierta === l.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-bg-alt">
                      <FileText className="w-3.5 h-3.5" /> {abierta === l.id ? 'Ocultar solicitud' : 'Ver solicitud'}
                    </button>
                  )}
                  {esSolicitud(l) && l.status !== 'convertido' && (borrando === l.id ? (
                    <span className="flex items-center gap-1.5">
                      <button onClick={() => void eliminar(l)} aria-label={`Confirmar eliminar solicitud de ${l.name}`} className="px-3 py-2 rounded-xl bg-warn text-white text-xs font-bold">Sí, eliminar con sus respuestas</button>
                      <button onClick={() => setBorrando(null)} className="px-2 py-2 text-xs text-muted font-semibold">No</button>
                    </span>
                  ) : (
                    <button onClick={() => setBorrando(l.id)} aria-label={`Eliminar solicitud de ${l.name}`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-warn hover:bg-bg-alt"><Trash2 className="w-3.5 h-3.5" /> Eliminar solicitud</button>
                  ))}
                  <select value={l.status} onChange={e => marcar(l, e.target.value as EstadoLead)} aria-label={`Estado de ${l.name}`}
                    className="ml-auto text-xs font-semibold bg-bg border border-border rounded-lg px-2 py-2 outline-none">
                    <option value="nuevo">Nuevo</option>
                    {esSolicitud(l) && <option value="revisar">A revisar</option>}
                    {esSolicitud(l) && <option value="borrador_listo">Borrador listo</option>}
                    <option value="contactado">Contactado</option>
                    <option value="convertido">Cliente</option>
                    <option value="descartado">Descartado</option>
                  </select>
                </div>
                {esSolicitud(l) && abierta === l.id && <Suspense fallback={null}><SolicitudDetalle leadId={l.id} /></Suspense>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
