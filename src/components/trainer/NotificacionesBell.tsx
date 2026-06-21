import { useState, useEffect, useRef } from 'react'
import { Bell, Check, CheckCheck, X, Dumbbell, AlertTriangle, Calendar, MessageCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Notificacion {
  id: string
  trainer_id: string
  client_id?: string
  tipo: 'sesion_completada' | 'inactividad' | 'alerta_vencida' | 'mensaje' | 'nueva_rutina'
  titulo: string
  mensaje?: string
  leida: boolean
  created_at: number
}

const TIPO_META: Record<string, { icon: any; color: string; bg: string }> = {
  sesion_completada: { icon: Dumbbell,       color: '#22c55e', bg: '#f0fdf4' },
  inactividad:       { icon: AlertTriangle,  color: '#f59e0b', bg: '#fffbeb' },
  alerta_vencida:    { icon: Calendar,       color: '#ef4444', bg: '#fef2f2' },
  mensaje:           { icon: MessageCircle,  color: '#3b82f6', bg: '#eff6ff' },
  nueva_rutina:      { icon: Dumbbell,       color: '#8b5cf6', bg: '#f5f3ff' },
}

interface Props {
  trainerId: string
  onSelectClient?: (clientId: string) => void
}

export function NotificacionesBell({ trainerId, onSelectClient }: Props) {
  const [notifs, setNotifs] = useState<Notificacion[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  // Nombre de canal único por instancia: el sidebar de escritorio sigue montado
  // en el DOM (solo oculto con CSS) cuando se abre el menú móvil, así que dos
  // instancias de este componente pueden coexistir y no pueden compartir canal.
  const channelName = useRef(`notificaciones_${Math.random().toString(36).slice(2)}`).current

  useEffect(() => {
    loadNotifs()
    // Realtime subscription
    const channel = supabase.channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notificaciones',
        filter: `trainer_id=eq.${trainerId}`
      }, (payload) => {
        setNotifs(prev => [payload.new as Notificacion, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [trainerId])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const loadNotifs = async () => {
    const { data } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setNotifs(data as Notificacion[])
  }

  const markRead = async (id: string) => {
    await supabase.from('notificaciones').update({ leida: true }).eq('id', id)
    setNotifs(n => n.map(x => x.id === id ? { ...x, leida: true } : x))
  }

  const markAllRead = async () => {
    await supabase.from('notificaciones').update({ leida: true }).eq('trainer_id', trainerId).eq('leida', false)
    setNotifs(n => n.map(x => ({ ...x, leida: true })))
  }

  const deleteNotif = async (id: string) => {
    await supabase.from('notificaciones').delete().eq('id', id)
    setNotifs(n => n.filter(x => x.id !== id))
  }

  const unread = notifs.filter(n => !n.leida).length

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'ahora'
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h`
    return `${Math.floor(h / 24)}d`
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl hover:bg-bg-alt text-muted hover:text-ink transition-colors">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-warn text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden" style={{ maxHeight: '70vh' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <p className="text-sm font-bold">Notificaciones {unread > 0 && <span className="text-warn">({unread})</span>}</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-[10px] text-accent hover:underline font-semibold">
                <CheckCheck className="w-3 h-3" /> Marcar todas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="overflow-y-auto flex-1 min-h-0">
            {notifs.length === 0 ? (
              <div className="text-center py-10 text-muted">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs">Sin notificaciones</p>
              </div>
            ) : notifs.map(n => {
              const meta = TIPO_META[n.tipo] || TIPO_META.mensaje
              const Icon = meta.icon
              return (
                <div key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 transition-colors ${n.leida ? 'opacity-60' : 'bg-accent/3'}`}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: meta.bg }}>
                    <Icon className="w-4 h-4" style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0"
                    onClick={() => {
                      markRead(n.id)
                      if (n.client_id && onSelectClient) { onSelectClient(n.client_id); setOpen(false) }
                    }}
                    style={{ cursor: n.client_id ? 'pointer' : 'default' }}>
                    <p className="text-xs font-semibold leading-snug">{n.titulo}</p>
                    {n.mensaje && <p className="text-[10px] text-muted mt-0.5 leading-snug">{n.mensaje}</p>}
                    <p className="text-[9px] text-muted/60 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!n.leida && (
                      <button onClick={() => markRead(n.id)} className="p-1 text-muted hover:text-ok"><Check className="w-3 h-3" /></button>
                    )}
                    <button onClick={() => deleteNotif(n.id)} className="p-1 text-muted hover:text-warn"><X className="w-3 h-3" /></button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
