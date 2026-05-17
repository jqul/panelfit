import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ClientData } from '../../types'

interface ClientAlert {
  id: string
  type: 'llamar' | 'revision' | 'valoracion' | 'otro'
  note: string
  date: string
  done: boolean
  createdAt: number
}

const ALERT_EMOJIS: Record<string, string> = {
  llamar: '📞', revision: '📋', valoracion: '⭐', otro: '🔔'
}

interface Props {
  clients: ClientData[]
  onSelectClient: (client: ClientData) => void
}

export function AlertasWidget({ clients, onSelectClient }: Props) {
  const [alertsMap, setAlertsMap] = useState<Record<string, ClientAlert[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clients.length) { setLoading(false); return }
    const fetchAlerts = async () => {
      const ids = clients.map(c => c.id)
      const { data } = await supabase.from('clientes').select('id, alerts').in('id', ids)
      const map: Record<string, ClientAlert[]> = {}
      ;(data || []).forEach((row: any) => {
        if (row.alerts?.length) map[row.id] = row.alerts
      })
      setAlertsMap(map)
      setLoading(false)
    }
    fetchAlerts()
  }, [clients.map(c => c.id).join(',')])

  const today = new Date().toISOString().split('T')[0]

  const allPending: { alert: ClientAlert; client: ClientData }[] = []
  clients.forEach(c => {
    const alerts = alertsMap[c.id] || []
    alerts.filter(a => !a.done).forEach(a => allPending.push({ alert: a, client: c }))
  })

  allPending.sort((a, b) => {
    const aOver = a.alert.date < today
    const bOver = b.alert.date < today
    if (aOver && !bOver) return -1
    if (!aOver && bOver) return 1
    return a.alert.date.localeCompare(b.alert.date)
  })

  if (loading || allPending.length === 0) return null

  const overdue = allPending.filter(x => x.alert.date < today)

  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
        <Bell className="w-3.5 h-3.5 text-warn" />
        <h3 className="text-sm font-semibold">Recordatorios</h3>
        <span className="ml-auto text-[10px] font-bold bg-warn/10 text-warn px-1.5 py-0.5 rounded-full">
          {allPending.length}
        </span>
      </div>
      <div className="divide-y divide-border/50 max-h-64 overflow-y-auto">
        {overdue.length > 0 && (
          <div className="px-3 py-1.5 bg-warn/5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-warn">Vencidos</p>
          </div>
        )}
        {allPending.slice(0, 8).map(({ alert, client }, i) => {
          const isOverdue = alert.date < today
          const isToday = alert.date === today
          return (
            <button key={`${client.id}-${alert.id}`}
              onClick={() => onSelectClient(client)}
              className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-bg-alt/50 text-left transition-colors">
              <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0 mt-0.5">
                {client.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">{ALERT_EMOJIS[alert.type]}</span>
                  <p className="text-xs font-semibold truncate">{client.name} {client.surname}</p>
                </div>
                <p className="text-[10px] text-muted truncate mt-0.5">{alert.note}</p>
              </div>
              <span className={`text-[10px] font-bold flex-shrink-0 mt-0.5 ${isOverdue ? 'text-warn' : isToday ? 'text-ok' : 'text-muted'}`}>
                {isOverdue ? '⚠' : isToday ? 'Hoy' : new Date(alert.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </span>
            </button>
          )
        })}
        {allPending.length > 8 && (
          <div className="px-4 py-2 text-center">
            <p className="text-[10px] text-muted">+{allPending.length - 8} más</p>
          </div>
        )}
      </div>
    </div>
  )
}
