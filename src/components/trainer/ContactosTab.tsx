import { useState } from 'react'
import { Inbox, Mail, MessageCircle, Gift, UserPlus } from 'lucide-react'
import { toast } from '../shared/Toast'
import { ESTADOS_LEAD, contactoDe, haceCuanto, saludoParaLead, whatsappDe, type EstadoLead, type Lead } from '../../lib/leads'
import type { LeadsState } from '../../hooks/useLeads'
import { PaginaPublicaCard } from './PaginaPublicaCard'

// Las personas que han escrito desde tu página pública: quién es, cómo contestarle y en qué punto está.
export function ContactosTab({ leadsState, trainerId, miNombre, onConvertir, onIrAAjustes }: {
  leadsState: LeadsState; trainerId: string; miNombre?: string; onConvertir?: (lead: Lead) => void; onIrAAjustes: () => void
}) {
  const { leads, loading, cambiarEstado } = leadsState
  const [filtro, setFiltro] = useState<EstadoLead | 'todos'>('nuevo')
  const cuenta = (e: EstadoLead) => leads.filter(l => l.status === e).length
  const visibles = filtro === 'todos' ? leads : leads.filter(l => l.status === filtro)

  const marcar = async (l: Lead, estado: EstadoLead) => {
    const ok = await cambiarEstado(l.id, estado)
    if (!ok) toast('No se pudo cambiar el estado. Inténtalo de nuevo', 'warn')
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
              <li key={l.id} className={`bg-card rounded-2xl p-4 space-y-3 ${l.status === 'nuevo' ? 'border border-accent/40' : 'border border-border/50'}`} style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{l.name}</p>
                    <p className="text-xs text-muted">{contactoDe(l) || 'Sin teléfono ni correo: solo dejó el nombre'}</p>
                  </div>
                  <span className="text-[11px] text-muted flex-shrink-0">{haceCuanto(l.created_at)}</span>
                </div>
                {l.message && <p className="text-sm text-ink/80 italic leading-relaxed">"{l.message}"</p>}
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
                  <select value={l.status} onChange={e => marcar(l, e.target.value as EstadoLead)} aria-label={`Estado de ${l.name}`}
                    className="ml-auto text-xs font-semibold bg-bg border border-border rounded-lg px-2 py-2 outline-none">
                    <option value="nuevo">Nuevo</option>
                    <option value="contactado">Contactado</option>
                    <option value="convertido">Cliente</option>
                    <option value="descartado">Descartado</option>
                  </select>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
