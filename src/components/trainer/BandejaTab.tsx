import { useState, useEffect, useMemo } from 'react'
import { Inbox, CheckCircle2, Moon, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ClientData } from '../../types'

interface ReadinessRow { clientId: string; date: string; sleep: number; soreness: number; stress: number; motivation: number }

interface InboxItem {
  key: string
  clientId: string
  clientName: string
  date: string
  kind: 'sesion' | 'readiness'
  detail: string
  warn?: boolean
}

const REVIEWED_KEY = (trainerId: string) => `pf_bandeja_revisados_${trainerId}`
const DAYS_BACK = 14

export function BandejaTab({ trainerId, clients, logsMap, onSelectClient }: {
  trainerId: string
  clients: ClientData[]
  logsMap: Record<string, any>
  onSelectClient: (c: ClientData) => void
}) {
  const [readiness, setReadiness] = useState<ReadinessRow[]>([])
  const [loading, setLoading] = useState(true)
  const [onlyPending, setOnlyPending] = useState(true)
  const [reviewed, setReviewed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(REVIEWED_KEY(trainerId)) || '[]')) } catch { return new Set() }
  })

  useEffect(() => {
    const clientIds = clients.map(c => c.id)
    if (clientIds.length === 0) { setLoading(false); return }
    const since = new Date(); since.setDate(since.getDate() - DAYS_BACK)
    supabase.from('readiness_checkins').select('clientId, date, sleep, soreness, stress, motivation')
      .in('clientId', clientIds).gte('date', since.toISOString().split('T')[0]).order('date', { ascending: false })
      .then(({ data }) => { setReadiness((data || []) as ReadinessRow[]); setLoading(false) })
  }, [clients])

  const items = useMemo(() => {
    const since = new Date(); since.setDate(since.getDate() - DAYS_BACK)
    const sinceKey = since.toISOString().split('T')[0]
    const list: InboxItem[] = []

    clients.forEach(c => {
      const logs = logsMap[c.id] || {}
      const dateCounts: Record<string, number> = {}
      Object.values(logs).forEach((l: any) => {
        if (l.dateDone && l.dateDone >= sinceKey) dateCounts[l.dateDone] = (dateCounts[l.dateDone] || 0) + 1
      })
      Object.entries(dateCounts).forEach(([date, count]) => {
        list.push({
          key: `sesion:${c.id}:${date}`, clientId: c.id, clientName: `${c.name} ${c.surname}`, date, kind: 'sesion',
          detail: `Completó una sesión (${count} ejercicio${count !== 1 ? 's' : ''})`,
        })
      })
    })

    readiness.forEach(r => {
      const c = clients.find(cl => cl.id === r.clientId)
      if (!c) return
      const warn = r.sleep <= 2 || r.soreness <= 2 || r.motivation <= 2
      list.push({
        key: `readiness:${c.id}:${r.date}`, clientId: c.id, clientName: `${c.name} ${c.surname}`, date: r.date, kind: 'readiness',
        detail: `Check-in de forma — sueño ${r.sleep}/5, dolor ${r.soreness}/5, motivación ${r.motivation}/5`,
        warn,
      })
    })

    return list.sort((a, b) => b.date.localeCompare(a.date))
  }, [clients, logsMap, readiness])

  const visibleItems = onlyPending ? items.filter(i => !reviewed.has(i.key)) : items
  const pendingCount = items.filter(i => !reviewed.has(i.key)).length

  const toggleReviewed = (key: string) => {
    setReviewed(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      try { localStorage.setItem(REVIEWED_KEY(trainerId), JSON.stringify([...next])) } catch {}
      return next
    })
  }

  return (
    <div className="animate-fade-in space-y-5 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-serif font-bold">Bandeja</h2>
          <p className="text-muted text-sm mt-1">Sesiones y check-ins de todos tus clientes, en un solo sitio</p>
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
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse shadow-sm" />)}</div>
      ) : visibleItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <Inbox className="w-10 h-10 text-muted/30 mx-auto mb-3" />
          <p className="font-serif font-bold text-lg">{onlyPending ? 'Todo revisado ✓' : 'Sin actividad reciente'}</p>
          <p className="text-sm text-muted mt-1">{onlyPending ? 'No hay nada pendiente de revisar.' : `Nada en los últimos ${DAYS_BACK} días.`}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden divide-y divide-border/50" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          {visibleItems.map(item => {
            const client = clients.find(c => c.id === item.clientId)
            const isReviewed = reviewed.has(item.key)
            return (
              <div key={item.key} className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => toggleReviewed(item.key)} title={isReviewed ? 'Marcar como pendiente' : 'Marcar como revisado'}
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${isReviewed ? 'bg-ok border-ok' : 'border-border'}`}>
                  {isReviewed && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>
                <button onClick={() => client && onSelectClient(client)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${item.kind === 'readiness' ? 'bg-accent/10 text-accent' : 'bg-ok/10 text-ok'}`}>
                    {item.kind === 'readiness' ? <Moon className="w-3.5 h-3.5" /> : item.clientName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.clientName}</p>
                    <p className={`text-xs truncate ${item.warn ? 'text-warn font-medium' : 'text-muted'}`}>{item.warn && '⚠️ '}{item.detail}</p>
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
