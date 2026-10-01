import { Inbox, CheckCircle2, Moon, HeartPulse, Video, FileEdit, AlertTriangle, ChevronRight } from 'lucide-react'
import { ClientData } from '../../types'
import { useInboxItems, InboxKind } from '../../hooks/useInboxItems'
import { ClientWithStats } from '../../hooks/useTrainerClients'
import { useState } from 'react'

const DAYS_BACK = 14

const KIND_STYLE: Record<InboxKind, { bg: string; fg: string; icon: (props: { className?: string }) => JSX.Element }> = {
  readiness: { bg: 'bg-accent/10', fg: 'text-accent', icon: p => <Moon {...p} /> },
  dolor:     { bg: 'bg-warn/10',   fg: 'text-warn',   icon: p => <HeartPulse {...p} /> },
  video:     { bg: 'bg-accent/10', fg: 'text-accent', icon: p => <Video {...p} /> },
  borrador:  { bg: 'bg-warn/10',   fg: 'text-warn',   icon: p => <FileEdit {...p} /> },
  riesgo:    { bg: 'bg-warn/10',   fg: 'text-warn',   icon: p => <AlertTriangle {...p} /> },
  sesion:    { bg: 'bg-ok/10',     fg: 'text-ok',     icon: () => <></> }, // usa la inicial del cliente, ver abajo
}

export function BandejaTab({ trainerId, clients, logsMap, onSelectClient }: {
  trainerId: string
  clients: ClientWithStats[]
  logsMap: Record<string, any>
  onSelectClient: (c: ClientData) => void
}) {
  const [onlyPending, setOnlyPending] = useState(true)
  const { visibleItems, pendingCount, reviewed, toggleReviewed, loading } = useInboxItems(trainerId, clients, logsMap)
  const items = visibleItems(onlyPending)

  return (
    <div className="animate-fade-in space-y-5 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-serif font-bold">Bandeja</h2>
          <p className="text-muted text-sm mt-1">Todo lo que puede necesitar tu atención, en un solo sitio</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setOnlyPending(true)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${onlyPending ? 'bg-ink text-white border-ink' : 'bg-white border-border/50 text-muted'}`}>
            Pendientes {pendingCount > 0 && `(${pendingCount})`}
          </button>
          <button onClick={() => setOnlyPending(false)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${!onlyPending ? 'bg-ink text-white border-ink' : 'bg-white border-border/50 text-muted'}`}>
            Todos
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse shadow-sm" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <Inbox className="w-10 h-10 text-muted/30 mx-auto mb-3" />
          <p className="font-serif font-bold text-lg">{onlyPending ? 'Todo revisado ✓' : 'Sin actividad reciente'}</p>
          <p className="text-sm text-muted mt-1">{onlyPending ? 'No hay nada pendiente de revisar.' : `Nada en los últimos ${DAYS_BACK} días.`}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden divide-y divide-border/50" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          {items.map(item => {
            const client = clients.find(c => c.id === item.clientId)
            const isReviewed = reviewed.has(item.key)
            const style = KIND_STYLE[item.kind]
            return (
              <div key={item.key} className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => toggleReviewed(item.key)} title={isReviewed ? 'Marcar como pendiente' : 'Marcar como revisado'}
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${isReviewed ? 'bg-ok border-ok' : 'border-border'}`}>
                  {isReviewed && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>
                <button onClick={() => client && onSelectClient(client)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${style.bg} ${style.fg}`}>
                    {item.kind === 'sesion' ? item.clientName[0]?.toUpperCase() : style.icon({ className: 'w-3.5 h-3.5' })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.clientName}</p>
                    <p className={`text-xs truncate ${item.warn ? 'text-warn font-medium' : 'text-muted'}`}>{item.warn && !/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(item.detail) && '⚠️ '}{item.detail}</p>
                  </div>
                  <span className="text-[10px] text-muted flex-shrink-0 hidden sm:block">{new Date(item.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
