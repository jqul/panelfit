import { useState } from 'react'
import { MessageCircle, Trash2, ChevronRight } from 'lucide-react'
import { ClientWithStats } from '../../hooks/useTrainerClients'
import { clientStatus, StatusLevel } from '../../lib/clientStatus'

interface Props {
  clients: ClientWithStats[]
  adherenciaMap: Record<string, number>
  formatLastActive: (date?: string) => string
  onOpen: (client: ClientWithStats) => void
  onSend: (client: ClientWithStats) => void
  onDelete: (id: string) => void
}

const DOT: Record<StatusLevel, string> = {
  risk: 'bg-warn',
  review: 'bg-[#e0a854]',
  'no-plan': 'bg-muted/50',
  ok: 'bg-ok',
}

// Lista de clientes pensada como centro de control: cada fila dice cómo está
// ese cliente (estado, último entreno, adherencia y qué alertas tiene) para no
// tener que abrir cada ficha. En móvil cada fila pasa a ser una tarjeta.
export function ClientList({ clients, adherenciaMap, formatLastActive, onOpen, onSend, onDelete }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const now = new Date()

  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      <div className="hidden md:grid grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,2fr)_auto] gap-4 px-5 py-2.5 border-b border-border/60 text-[11px] font-bold uppercase tracking-wider text-muted">
        <span>Cliente</span><span>Estado</span><span>Último entreno</span><span>Esta semana</span><span>Alertas</span><span className="w-[88px]" />
      </div>
      <ul className="divide-y divide-border/50">
        {clients.map(client => {
          const status = clientStatus(client, now)
          const adherencia = adherenciaMap[client.id] ?? 0
          const barColor = adherencia >= 75 ? '#4caf7d' : adherencia >= 40 ? '#e0a854' : '#e07b54'
          const confirming = confirmId === client.id
          return (
            <li key={client.id} className="group flex flex-wrap items-center gap-x-3 gap-y-2 md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,2fr)_auto] md:items-center md:gap-4 px-4 md:px-5 py-3.5 hover:bg-bg-alt/40 transition-colors">
              <button type="button" onClick={() => onOpen(client)} className="flex items-center gap-3 min-w-0 text-left w-full md:w-auto" aria-label={`Abrir a ${client.name} ${client.surname || ''}`}>
                <span className="relative w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center font-serif text-base text-accent flex-shrink-0">
                  {client.name[0]?.toUpperCase()}
                  {client.doneToday && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-ok rounded-full border-2 border-white" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-serif font-bold text-base truncate">{client.name} {client.surname}</span>
                  <span className="block md:hidden text-xs text-muted mt-0.5">{status.label} · {client.doneToday ? 'entrenó hoy' : formatLastActive(client.lastActive)}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-muted/40 md:hidden flex-shrink-0" />
              </button>

              <span className="hidden md:flex items-center gap-2 text-sm font-medium">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT[status.level]}`} aria-hidden />
                {status.label}
              </span>

              <span className="hidden md:block text-sm text-muted">{client.doneToday ? <span className="text-ok font-semibold">Hoy</span> : formatLastActive(client.lastActive)}</span>

              <div className="flex-1 min-w-0 md:flex-none">
                {client.hasPlan ? (
                  <div className="flex items-center gap-2.5">
                    <div className="h-1.5 flex-1 max-w-[120px] bg-bg-alt rounded-full overflow-hidden" role="progressbar" aria-valuenow={adherencia} aria-valuemin={0} aria-valuemax={100} aria-label="Cumplimiento semanal">
                      <div className="h-full rounded-full" style={{ width: `${adherencia}%`, backgroundColor: barColor }} />
                    </div>
                    <span className="text-xs font-bold tabular-nums w-9" style={{ color: barColor }}>{adherencia}%</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted">—</span>
                )}
              </div>

              <div className="order-last w-full md:order-none md:w-auto min-w-0">
                {status.reasons.length === 0 ? (
                  <span className="hidden md:inline text-sm text-muted/60">Sin alertas</span>
                ) : (
                  <ul className="space-y-0.5">
                    {status.reasons.map(r => <li key={r} className="text-xs text-warn font-medium truncate">{r}</li>)}
                  </ul>
                )}
              </div>

              <div className="flex items-center justify-end gap-1.5 md:w-[88px]">
                {confirming ? (
                  <>
                    <button onClick={() => { onDelete(client.id); setConfirmId(null) }} className="px-2.5 py-1.5 rounded-lg bg-warn text-white text-xs font-bold">Eliminar</button>
                    <button onClick={() => setConfirmId(null)} className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted">No</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => onSend(client)} aria-label={`Enviar enlace a ${client.name}`} title="Enviar enlace"
                      className="p-2 rounded-lg border border-border text-muted hover:text-ink hover:border-ink transition-colors"><MessageCircle className="w-4 h-4" /></button>
                    <button onClick={() => setConfirmId(client.id)} aria-label={`Eliminar a ${client.name}`} title="Eliminar"
                      className="p-2 rounded-lg border border-border text-muted hover:text-warn hover:border-warn transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
