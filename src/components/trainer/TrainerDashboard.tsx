import { useState, useEffect, useMemo } from 'react'
import {
  LayoutDashboard, Users, Dumbbell, ClipboardList, Settings as SettingsIcon,
  LogOut, UserPlus, Search, Trash2, ChevronRight,
  MessageCircle, Copy, Bell, CheckCircle2, AlertCircle,
  Clock, X, BarChart2, Menu, Save, TrendingUp,
  StickyNote, Activity
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useExerciseLibrary } from '../../hooks/useExerciseLibrary'
import { mapClientes } from '../../lib/mappers'
import { ClientData, UserProfile } from '../../types'
import { Button } from '../shared/Button'
import { Modal } from '../shared/Modal'
import { toast } from '../shared/Toast'
import { ExercisesTab } from './ExercisesTab'
import { TemplatesTab } from './TemplatesTab'
import { MensajesTab } from './MensajesTab'
import { InsightsTab } from './InsightsTab'
import { AdherenciaTab } from './AdherenciaTab'
import { EncuestasTab } from './EncuestasTab'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

type Tab = 'dashboard' | 'clients' | 'exercises' | 'templates' | 'settings' | 'mensajes' | 'insights' | 'adherencia' | 'encuestas'
type ClientFilter = 'all' | 'active' | 'no-plan' | 'no-activity'

interface ClientWithStats extends ClientData {
  lastActive?: string; doneToday?: boolean; hasPlan?: boolean; weeklyDays?: number
}

interface Props {
  userProfile: UserProfile
  onLogout: () => void
  onSelectClient: (client: ClientData) => void
  demoClients?: ClientData[]
}

export function TrainerDashboard({ userProfile, onLogout, onSelectClient, demoClients }: Props) {
  const [clients, setClients] = useState<ClientWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState<ClientFilter>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', surname: '' })
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [linkModal, setLinkModal] = useState<ClientData | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [quickNote, setQuickNote] = useState(() => localStorage.getItem('pf_quick_note') || '')
  const [logsMap, setLogsMap] = useState<Record<string, any>>({})
  const library = useExerciseLibrary(userProfile.uid)
  const clientLimit = (userProfile as any).clientLimit ?? 999
  const limitReached = !demoClients && clients.length >= clientLimit
  const clientLimit = (userProfile as any).clientLimit ?? 999
  const limitReached = !demoClients && clients.length >= clientLimit

  const fetchClients = async () => {
    setLoading(true)
    if (demoClients) { setClients(demoClients as ClientWithStats[]); setLoading(false); return }
    const { data, error } = await supabase.from('clientes').select('*').eq('trainerId', userProfile.uid)
    if (error) { console.error('Error:', error); setLoading(false); return }
    const mapped = mapClientes(data || [])
    const hoy = new Date().toISOString().split('T')[0]
    const haceUnaS = new Date(); haceUnaS.setDate(haceUnaS.getDate() - 7)
    if (mapped.length) {
      const ids = mapped.map(c => c.id)
      const { data: regs } = await supabase.from('registros').select('clientId,logs').in('clientId', ids)
      const { data: planes } = await supabase.from('planes').select('clientId,plan').in('clientId', ids)
      const planMap: Record<string, boolean> = {}
      ;(planes || []).forEach((p: any) => { planMap[p.clientId] = !!(p.plan?.P?.weeks?.length) })
      const lm: Record<string, any> = {}
      ;(regs || []).forEach((r: any) => { lm[r.clientId] = r.logs || {} })
      setLogsMap(lm)
      setClients(mapped.map(c => {
        const reg = (regs || []).find((r: any) => r.clientId === c.id)
        const logs = reg?.logs || {}
        const dates = [...new Set(Object.values(logs).filter((l: any) => l.dateDone).map((l: any) => l.dateDone as string))].sort().reverse()
        return { ...c, lastActive: dates[0], doneToday: dates[0] === hoy, hasPlan: planMap[c.id] || false, weeklyDays: dates.filter(d => new Date(d) >= haceUnaS).length }
      }))
    } else setClients([])
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()
    const channel = supabase.channel('clientes-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes', filter: `trainerId=eq.${userProfile.uid}` }, fetchClients)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userProfile.uid])

  const handleAdd = async () => {
    if (!newClient.name.trim()) return
    if (limitReached) { toast(`Límite alcanzado: tu plan permite ${clientLimit} clientes.`, 'warn'); return }
    setAdding(true)
    const token = Math.random().toString(36).slice(2, 14)
    const { error } = await supabase.from('clientes').insert({ trainerId: userProfile.uid, name: newClient.name.trim(), surname: newClient.surname.trim(), token, createdAt: Date.now() })
    if (error) toast('Error: ' + error.message, 'warn')
    else { toast('Cliente creado ✓', 'ok'); setShowAdd(false); setNewClient({ name: '', surname: '' }); fetchClients() }
    setAdding(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('clientes').delete().eq('id', id)
    setDeletingId(null); fetchClients(); toast('Cliente eliminado', 'ok')
  }

  const getClientUrl = (c: ClientData) => `${window.location.origin}?c=${c.token}`
  const sendWhatsApp = (c: ClientData) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Hola ${c.name} 👋\n\nTe comparto el enlace a tu panel:\n\n${getClientUrl(c)}\n\n💪`)}`, '_blank')
  }

  const hoy = new Date().toISOString().split('T')[0]
  const haceUnaS = new Date(); haceUnaS.setDate(haceUnaS.getDate() - 7)
  const activeToday = clients.filter(c => c.doneToday).length
  const noPlan = clients.filter(c => !c.hasPlan).length
  const noActivity7d = clients.filter(c => !c.lastActive || new Date(c.lastActive) < haceUnaS).length
  const alerts = clients.filter(c => !c.hasPlan || (c.lastActive && new Date(c.lastActive) < haceUnaS))

  const filteredClients = useMemo(() => {
    let list = [...clients]
    if (clientFilter === 'active') list = list.filter(c => c.doneToday)
    else if (clientFilter === 'no-plan') list = list.filter(c => !c.hasPlan)
    else if (clientFilter === 'no-activity') list = list.filter(c => !c.lastActive || new Date(c.lastActive) < haceUnaS)
    if (search) list = list.filter(c => `${c.name} ${c.surname}`.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [clients, clientFilter, search])

  const chartData = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().split('T')[0]
    return { label: d.toLocaleDateString('es-ES', { weekday: 'short' }), count: clients.filter(c => c.lastActive === key).length, key }
  }), [clients])

  const formatLastActive = (date?: string) => {
    if (!date) return 'Nunca'
    const diff = Math.round((new Date().setHours(0,0,0,0) - new Date(date + 'T00:00:00').getTime()) / 86400000)
    if (diff === 0) return 'Hoy'; if (diff === 1) return 'Ayer'; if (diff < 7) return `Hace ${diff} días`
    return new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  const activityFeed = useMemo(() => {
    const events: { clientName: string; text: string; date: string; type: 'workout' | 'weight' }[] = []
    clients.forEach(c => {
      const logs = logsMap[c.id] || {}
      const dates = [...new Set(Object.values(logs).filter((l: any) => l.dateDone).map((l: any) => l.dateDone as string))].sort().reverse()
      if (dates[0]) events.push({ clientName: `${c.name} ${c.surname}`, text: 'completó una sesión', date: dates[0], type: 'workout' })
    })
    return events.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6)
  }, [clients, logsMap])

  const NAV_GROUPS = [
    { label: 'Gestión', items: [
      { id: 'dashboard' as Tab, icon: LayoutDashboard, label: 'Resumen' },
      { id: 'clients' as Tab, icon: Users, label: 'Clientes', badge: clients.length },
      { id: 'mensajes' as Tab, icon: MessageCircle, label: 'Mensajes' },
      { id: 'encuestas' as Tab, icon: ClipboardList, label: 'Encuestas' },
    ]},
    { label: 'Contenido', items: [
      { id: 'exercises' as Tab, icon: Dumbbell, label: 'Ejercicios' },
      { id: 'templates' as Tab, icon: ClipboardList, label: 'Plantillas' },
    ]},
    { label: 'Análisis', items: [
      { id: 'insights' as Tab, icon: BarChart2, label: 'Insights' },
      { id: 'adherencia' as Tab, icon: TrendingUp, label: 'Adherencia' },
    ]},
    { label: 'Configuración', items: [
      { id: 'settings' as Tab, icon: SettingsIcon, label: 'Ajustes' },
    ]},
  ]

  const handleTabChange = (tab: Tab) => { setActiveTab(tab); setSidebarOpen(false) }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-border flex items-center justify-between">
        <h1 className="text-lg font-serif font-bold tracking-tight">Panel<span className="text-accent italic">Fit</span></h1>
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-muted"><X className="w-4 h-4" /></button>
      </div>
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center font-bold text-accent text-sm flex-shrink-0">
            {userProfile.displayName?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{userProfile.displayName}</p>
            <p className="text-[10px] text-muted truncate">{userProfile.email}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted/60 px-3 mb-1">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(({ id, icon: Icon, label, badge }) => (
                <button key={id} onClick={() => handleTabChange(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === id ? 'bg-ink text-white' : 'text-muted hover:bg-bg-alt hover:text-ink'}`}>
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1 text-left">{label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === id ? 'bg-white/20' : 'bg-bg-alt text-muted'}`}>{badge}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-border space-y-1.5">
        {alerts.length > 0 && (
          <button onClick={() => { setActiveTab('clients'); setClientFilter('no-activity'); setSidebarOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 bg-warn/5 border border-warn/20 rounded-lg text-xs font-semibold text-warn hover:bg-warn/10">
            <Bell className="w-3.5 h-3.5" /> {alerts.length} alerta{alerts.length > 1 ? 's' : ''}
          </button>
        )}
        <button
          onClick={() => { if (!limitReached) { setShowAdd(true); setSidebarOpen(false) } }}
          disabled={limitReached}
          className="w-full flex items-center gap-2 px-3 py-2 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
          <UserPlus className="w-3.5 h-3.5" /> Nuevo cliente
        </button>
        <button onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-muted hover:bg-bg-alt transition-colors">
          <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-[100dvh] overflow-hidden bg-bg">
      <div className="hidden lg:block w-52 flex-shrink-0 bg-card border-r border-border"><SidebarContent /></div>
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-ink/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-40 w-52 bg-card border-r border-border lg:hidden"><SidebarContent /></div>
        </>
      )}
      <main className="flex-1 overflow-y-auto min-w-0 min-h-0">
        <div className="lg:hidden sticky top-0 z-20 bg-card border-b border-border flex items-center justify-between px-4 h-14">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-bg-alt text-muted"><Menu className="w-5 h-5" /></button>
          <h1 className="text-lg font-serif font-bold">Panel<span className="text-accent italic">Fit</span></h1>
          <button onClick={() => !limitReached && setShowAdd(true)} className="p-2 rounded-lg hover:bg-bg-alt text-muted"><UserPlus className="w-5 h-5" /></button>
        </div>
        <div className="p-4 lg:p-6">

          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 animate-fade-in">
              <div className="flex-1 min-w-0 space-y-6">
                <div>
                  <h2 className="text-4xl font-serif font-bold">Resumen</h2>
                  <p className="text-muted text-sm mt-1">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Clientes', value: clients.length, icon: Users, color: 'text-ink', accent: '#6e5438', onClick: () => handleTabChange('clients') },
                    { label: 'Entrenaron hoy', value: activeToday, icon: CheckCircle2, color: 'text-ok', accent: '#4caf7d', onClick: () => { setClientFilter('active'); handleTabChange('clients') } },
                    { label: 'Sin plan', value: noPlan, icon: AlertCircle, color: 'text-warn', accent: '#e07b54', onClick: () => { setClientFilter('no-plan'); handleTabChange('clients') } },
                    { label: 'Sin actividad', value: noActivity7d, icon: Clock, color: 'text-warn', accent: '#e07b54', onClick: () => { setClientFilter('no-activity'); handleTabChange('clients') } },
                  ].map(({ label, value, icon: Icon, color, accent, onClick }) => (
                    <button key={label} onClick={onClick} className="bg-white border-0 rounded-2xl p-5 text-left hover:shadow-md transition-all shadow-sm" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: accent + '18' }}><Icon className={`w-4 h-4 ${color}`} /></div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted/40" />
                      </div>
                      <p className={`text-3xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-muted font-medium mt-0.5">{label}</p>
                    </button>
                  ))}
                </div>
                <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  <div className="flex items-center justify-between mb-6">
                    <div><h3 className="font-serif font-bold text-lg">Actividad semanal</h3><p className="text-xs text-muted mt-0.5">Clientes que completaron sesiones cada día</p></div>
                  </div>
                  <div className="h-40 lg:h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                        <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6e5438" stopOpacity={0.2} /><stop offset="95%" stopColor="#6e5438" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8a8278' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8a8278' }} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: 'white', border: 'none', borderRadius: 12, fontSize: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }} />
                        <Area type="monotone" dataKey="count" name="Clientes" stroke="#6e5438" strokeWidth={2.5} fill="url(#grad)" dot={{ fill: '#6e5438', r: 3 }} activeDot={{ r: 5 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                    <h3 className="font-serif font-bold">Clientes recientes</h3>
                    <button onClick={() => handleTabChange('clients')} className="text-xs text-accent hover:underline font-semibold">Ver todos →</button>
                  </div>
                  <div className="divide-y divide-border/50">
                    {clients.slice(0, 5).map(c => (
                      <button key={c.id} onClick={() => onSelectClient(c)} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-bg-alt/50 text-left group transition-colors">
                        <div className="relative w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-sm font-bold text-accent flex-shrink-0">
                          {c.name[0]?.toUpperCase()}
                          {c.doneToday && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-ok rounded-full border-2 border-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{c.name} {c.surname}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {!c.hasPlan && <span className="text-[10px] text-warn font-semibold">Sin plan</span>}
                            {c.hasPlan && <span className="text-[10px] text-muted">{formatLastActive(c.lastActive)}</span>}
                            {!!c.weeklyDays && <span className="text-[10px] text-ok font-semibold">{c.weeklyDays}d esta semana</span>}
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                    {!clients.length && (
                      <div className="px-5 py-10 text-center text-muted">
                        <p className="text-sm">Sin clientes aún.</p>
                        <button onClick={() => setShowAdd(true)} className="mt-2 text-accent text-sm hover:underline">Añadir el primero →</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="w-full lg:w-72 lg:flex-shrink-0 space-y-4">
                {alerts.length > 0 && (
                  <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2"><Bell className="w-3.5 h-3.5 text-warn" /><h3 className="text-sm font-semibold">Requieren atención</h3></div>
                    <div className="divide-y divide-border/50 max-h-48 overflow-y-auto">
                      {alerts.slice(0, 5).map(c => (
                        <button key={c.id} onClick={() => onSelectClient(c)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-alt/50 text-left">
                          <div className="w-7 h-7 rounded-full bg-warn/10 flex items-center justify-center text-xs font-bold text-warn flex-shrink-0">{c.name[0]?.toUpperCase()}</div>
                          <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate">{c.name} {c.surname}</p><p className="text-[10px] text-warn">{!c.hasPlan ? 'Sin plan' : 'Sin actividad reciente'}</p></div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2"><Activity className="w-3.5 h-3.5 text-accent" /><h3 className="text-sm font-semibold">Actividad reciente</h3></div>
                  <div className="divide-y divide-border/50">
                    {activityFeed.length === 0 ? <div className="px-4 py-6 text-center"><p className="text-xs text-muted">Sin actividad reciente</p></div>
                    : activityFeed.map((ev, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-3">
                        <div className="w-7 h-7 rounded-full bg-ok/10 flex items-center justify-center text-xs font-bold text-ok flex-shrink-0 mt-0.5">{ev.clientName[0]}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-tight"><span className="font-semibold">{ev.clientName}</span><span className="text-muted"> {ev.text}</span></p>
                          <p className="text-[10px] text-muted mt-0.5">{formatLastActive(ev.date)}</p>
                        </div>
                        {ev.type === 'workout' && <CheckCircle2 className="w-3.5 h-3.5 text-ok flex-shrink-0 mt-0.5" />}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /><h3 className="text-sm font-semibold">Tareas de hoy</h3></div>
                  <div className="p-3 space-y-1.5">
                    {alerts.slice(0, 3).map(c => (
                      <button key={c.id} onClick={() => onSelectClient(c)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-bg-alt/50 text-left transition-colors">
                        <div className="w-4 h-4 rounded border-2 border-border flex-shrink-0" />
                        <p className="text-xs text-muted">{!c.hasPlan ? `Crear plan para ${c.name}` : `Revisar progreso de ${c.name}`}</p>
                      </button>
                    ))}
                    {alerts.length === 0 && <div className="px-3 py-4 text-center"><CheckCircle2 className="w-6 h-6 text-ok mx-auto mb-1 opacity-60" /><p className="text-xs text-muted">Todo al día ✓</p></div>}
                  </div>
                </div>
                <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2"><StickyNote className="w-3.5 h-3.5 text-accent" /><h3 className="text-sm font-semibold">Notas rápidas</h3></div>
                  <div className="p-3">
                    <textarea value={quickNote} onChange={e => { setQuickNote(e.target.value); localStorage.setItem('pf_quick_note', e.target.value) }}
                      placeholder="Anota algo al vuelo..." rows={4}
                      className="w-full text-xs text-muted bg-bg-alt/50 border border-border/50 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent/20 resize-none leading-relaxed" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CLIENTES */}
          {activeTab === 'clients' && (
            <div className="animate-fade-in space-y-5 max-w-5xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-serif font-bold">Clientes</h2>
                  <p className="text-muted text-sm mt-1">
                    {clients.length}{clientLimit < 999 ? `/${clientLimit}` : ''} alumnos
                    {limitReached && <span className="ml-2 text-warn font-semibold">· límite alcanzado</span>}
                  </p>
                </div>
                <Button className="gap-2" onClick={() => setShowAdd(true)} disabled={limitReached}>
                  <UserPlus className="w-4 h-4" /> Nuevo
                </Button>
              </div>
              <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-40">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-border/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 shadow-sm" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {([{ id: 'all', label: 'Todos' }, { id: 'active', label: '✓ Hoy' }, { id: 'no-plan', label: '⚠ Sin plan' }, { id: 'no-activity', label: '💤 Inactivos' }] as const).map(f => (
                    <button key={f.id} onClick={() => setClientFilter(f.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${clientFilter === f.id ? 'bg-ink text-white border-ink' : 'bg-white border-border/50 text-muted hover:border-accent shadow-sm'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-40 bg-white rounded-2xl animate-pulse shadow-sm" />)}</div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl shadow-sm"><Users className="w-12 h-12 text-muted/30 mx-auto mb-4" /><p className="font-serif font-bold text-lg">Sin resultados</p></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredClients.map(client => (
                    <div key={client.id} className="bg-white rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer group shadow-sm" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }} onClick={() => onSelectClient(client)}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="relative w-11 h-11 rounded-full bg-accent/10 flex items-center justify-center font-serif text-lg text-accent flex-shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                          {client.name[0]?.toUpperCase()}
                          {client.doneToday && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-ok rounded-full border-2 border-white" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-serif font-bold text-base truncate">{client.name} {client.surname}</p>
                          <p className="text-[10px] text-muted mt-0.5">{client.doneToday ? <span className="text-ok font-bold">✓ Entrenó hoy</span> : formatLastActive(client.lastActive)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mb-4 flex-wrap">
                        {!client.hasPlan && <span className="text-[10px] font-bold bg-warn/10 text-warn px-2 py-0.5 rounded-full">Sin plan</span>}
                        {client.hasPlan && <span className="text-[10px] font-bold bg-ok/10 text-ok px-2 py-0.5 rounded-full">Plan ✓</span>}
                        {!!client.weeklyDays && <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full">{client.weeklyDays}d semana</span>}
                      </div>
                      {deletingId === client.id ? (
                        <div className="flex gap-2">
                          <Button variant="danger" size="sm" className="flex-1" onClick={e => { e.stopPropagation(); handleDelete(client.id) }}>Eliminar</Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={e => { e.stopPropagation(); setDeletingId(null) }}>Cancelar</Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={e => { e.stopPropagation(); onSelectClient(client) }}>✏️ Plan</Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={e => { e.stopPropagation(); setLinkModal(client) }}><MessageCircle className="w-3.5 h-3.5 mr-1" /> Enviar</Button>
                          <Button variant="outline" size="sm" className="px-2" onClick={e => { e.stopPropagation(); setDeletingId(client.id) }}><Trash2 className="w-3.5 h-3.5 text-warn" /></Button>
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => !limitReached && setShowAdd(true)}
                    disabled={limitReached}
                    className="border-2 border-dashed border-border rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-muted hover:border-accent hover:text-accent transition-all min-h-[180px] disabled:opacity-50 disabled:cursor-not-allowed">
                    <UserPlus className="w-6 h-6" />
                    <span className="text-sm font-medium">{limitReached ? `Límite de ${clientLimit} clientes` : 'Añadir cliente'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'exercises' && <ExercisesTab exercises={library.exercises} trainerId={userProfile.uid} onAdd={(n,d,c,v,e,t) => library.addExercise(n,d,c,v,e as any,t)} onUpdate={library.updateExercise} onDelete={library.deleteExercise} />}
          {activeTab === 'templates' && <TemplatesTab trainerId={userProfile.uid} clients={clients} />}
          {activeTab === 'settings' && <SettingsTab userProfile={userProfile} onLogout={onLogout} />}
          {activeTab === 'mensajes' && <MensajesTab userProfile={userProfile} clients={clients} />}
          {activeTab === 'insights' && <InsightsTab clients={clients} logsMap={logsMap} />}
          {activeTab === 'adherencia' && <AdherenciaTab clients={clients} logsMap={logsMap} />}
          {activeTab === 'encuestas' && <EncuestasTab trainerId={userProfile.uid} clients={clients} />}
        </div>
      </main>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nuevo cliente">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Nombre *</label>
            <input autoFocus type="text" value={newClient.name} onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="Nombre" className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" /></div>
          <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Apellido</label>
            <input type="text" value={newClient.surname} onChange={e => setNewClient(p => ({ ...p, surname: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="Apellido" className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" /></div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleAdd} disabled={adding}>{adding ? 'Creando...' : 'Crear cliente'}</Button>
          </div>
        </div>
      </Modal>

      {linkModal && (
        <Modal open={!!linkModal} onClose={() => setLinkModal(null)} title={`Acceso de ${linkModal.name}`}>
          <div className="space-y-4">
            <p className="text-sm text-muted">Comparte este enlace. El cliente no necesita contraseña.</p>
            <div className="flex gap-2">
              <input readOnly value={getClientUrl(linkModal)} className="flex-1 px-3 py-2.5 bg-bg border border-border rounded-xl text-xs text-muted font-mono outline-none" />
              <button onClick={() => { navigator.clipboard.writeText(getClientUrl(linkModal)); toast('Copiado ✓', 'ok') }} className="flex items-center gap-1.5 px-3 py-2.5 bg-ink text-white rounded-xl text-sm font-medium hover:opacity-90 flex-shrink-0"><Copy className="w-3.5 h-3.5" /> Copiar</button>
            </div>
            <button onClick={() => { sendWhatsApp(linkModal); setLinkModal(null) }} className="w-full flex items-center justify-center gap-3 py-4 bg-[#25D366] text-white rounded-2xl text-sm font-bold hover:opacity-90"><MessageCircle className="w-5 h-5" /> Enviar por WhatsApp</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Settings ──────────────────────────────────────────────
const EMOJIS = ['💪','🔥','⚡','🏋️','🎯','✅','🚀','❤️','🧘','🏆','💯','👊','😤','🌟','🙌','💥','🔑','⭐','🎉','💫','😊','🤩','🥇','🏅','🥊','🎽','🤸','🏃','🧗','🌈']

function EmojiBar({ onPick }: { onPick: (e: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 mb-2 p-2 bg-bg-alt rounded-xl border border-border/50">
      {EMOJIS.map(em => (
        <button key={em} type="button" onClick={() => onPick(em)}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white text-base transition-colors">{em}</button>
      ))}
    </div>
  )
}

function SettingsTab({ userProfile, onLogout }: { userProfile: UserProfile; onLogout: () => void }) {
  const LS_KEY = `pf_trainer_profile_${userProfile.uid}`
  const saved = (() => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} } })()

  const [displayName, setDisplayName] = useState(saved.displayName || userProfile.displayName)
  const [brandName, setBrandName] = useState(saved.brandName || '')
  const [brandLogo, setBrandLogo] = useState(saved.brandLogo || '')
  const [brandBg, setBrandBg] = useState(saved.brandBg || '')
  const [brandColor, setBrandColor] = useState(saved.brandColor || '#6e5438')
  const [phone, setPhone] = useState(saved.phone || '')
  const [bio, setBio] = useState(saved.bio || '')
  const [welcomeMsg, setWelcomeMsg] = useState(saved.welcomeMsg || '')
  const [motivMsg, setMotivMsg] = useState(saved.motivMsg || '')
  const [restDayMsg, setRestDayMsg] = useState(saved.restDayMsg || '')
  const [saving, setSaving] = useState(false)

  const PRESET_COLORS = ['#6e5438','#1a1a2e','#0f4c75','#1b4332','#7b2d8b','#c0392b','#e67e22','#2c3e50']

  const handleSave = async () => {
    setSaving(true)
    const profile = { displayName, brandName, brandLogo, brandBg, brandColor, phone, bio, welcomeMsg, motivMsg, restDayMsg, updatedAt: Date.now() }
    localStorage.setItem(LS_KEY, JSON.stringify(profile))
    if (phone) localStorage.setItem(`pf_trainer_phone_${userProfile.uid}`, phone)
    const { error } = await supabase.from('entrenadores').update({ displayName, profile }).eq('uid', userProfile.uid)
    if (error) { toast('Error al guardar: ' + error.message, 'warn'); setSaving(false); return }
    toast('Perfil guardado ✓ Los clientes verán los cambios al recargar.', 'ok')
    setSaving(false)
  }

  const uploadImage = (field: string, maxMB: number, onDone: (url: string) => void) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > maxMB * 1024 * 1024) { toast(`Máximo ${maxMB}MB`, 'warn'); return }
    toast('Subiendo imagen...', 'info')
    const ext = file.name.split('.').pop()
    const path = `${userProfile.uid}/${field}_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('trainer-assets').upload(path, file, { upsert: true })
    if (error) { toast('Error al subir imagen', 'warn'); return }
    const { data } = supabase.storage.from('trainer-assets').getPublicUrl(path)
    onDone(data.publicUrl)
    toast('Imagen subida ✓', 'ok')
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <div>
        <h2 className="text-3xl font-serif font-bold">Personalización</h2>
        <p className="text-muted text-sm mt-1">Todo lo que configures aquí aparecerá en el panel de tus clientes.</p>
      </div>

      {/* Preview */}
      <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: brandColor }}>
          {brandLogo
            ? <img src={brandLogo} className="w-8 h-8 rounded-full object-cover border-2 border-white/30 flex-shrink-0" alt="" />
            : <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{(brandName || displayName || 'T')[0]?.toUpperCase()}</div>
          }
          <span className="font-bold text-white text-base">{brandName || displayName || 'Tu marca'}</span>
          <span className="ml-auto text-white/60 text-xs">Preview cliente</span>
        </div>
        {brandBg
          ? <div className="relative h-20 overflow-hidden"><img src={brandBg} className="w-full h-full object-cover" alt="" /><div className="absolute inset-0 flex items-center px-4"><p className="text-white font-semibold text-sm drop-shadow">{welcomeMsg || 'Tu mensaje aquí'}</p></div></div>
          : <div className="px-4 py-3 bg-[#f5f0ea] text-sm text-muted">{welcomeMsg ? <p className="italic">"{welcomeMsg}"</p> : <p className="opacity-40">Tu mensaje de bienvenida aquí</p>}</div>
        }
      </div>

      {/* Identidad */}
      <div className="bg-white rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted">🏷️ Identidad de marca</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Tu nombre</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" /></div>
          <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Nombre de marca</label>
            <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Ej: Carlos Training" className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" /></div>
        </div>
        <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Teléfono / WhatsApp</label>
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+34 600 000 000" className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" /></div>
        <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Bio</label>
          <textarea rows={2} value={bio} onChange={e => setBio(e.target.value)} placeholder="Entrenador personal especializado en..." className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none resize-none" /></div>
      </div>

      {/* Aspecto visual */}
      <div className="bg-white rounded-2xl p-6 space-y-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted">🎨 Aspecto visual</h3>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">Logo / foto de perfil</label>
          <div className="flex items-center gap-4">
            {brandLogo
              ? <div className="relative flex-shrink-0"><img src={brandLogo} className="w-16 h-16 rounded-full object-cover border-2 border-border" alt="" /><button onClick={() => setBrandLogo('')} className="absolute -top-1 -right-1 w-5 h-5 bg-warn text-white rounded-full text-xs font-bold flex items-center justify-center">×</button></div>
              : <div className="w-16 h-16 rounded-full border-2 border-dashed border-border flex items-center justify-center text-2xl font-bold flex-shrink-0" style={{ backgroundColor: brandColor + '20', color: brandColor }}>{(brandName || displayName || 'T')[0]?.toUpperCase()}</div>
            }
            <div className="space-y-1">
              <label className="block px-4 py-2.5 border border-border rounded-xl text-sm text-muted hover:border-accent cursor-pointer transition-colors w-fit">
                {brandLogo ? 'Cambiar logo' : 'Subir logo'}
                <input type="file" accept="image/*" className="hidden" onChange={uploadImage('logo', 2, setBrandLogo)} />
              </label>
              <p className="text-[10px] text-muted">Aparece en el header del cliente. Máx 2MB.</p>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">Imagen de fondo del panel</label>
          <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-border" style={{ height: 140 }}>
            {brandBg
              ? <><img src={brandBg} className="w-full h-full object-cover" alt="" /><div className="absolute inset-0 bg-ink/40 flex items-center justify-center gap-3"><label className="px-3 py-2 bg-white/95 rounded-lg text-xs font-semibold cursor-pointer hover:bg-white transition-colors">Cambiar fondo<input type="file" accept="image/*" className="hidden" onChange={uploadImage('bg', 3, setBrandBg)} /></label><button onClick={() => setBrandBg('')} className="px-3 py-2 bg-warn text-white rounded-lg text-xs font-semibold">Quitar</button></div></>
              : <label className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted cursor-pointer hover:bg-bg-alt/50 transition-colors bg-bg"><span className="text-3xl">🖼️</span><span className="text-sm font-medium">Subir imagen de fondo</span><span className="text-[10px]">Se muestra detrás del contenido del cliente · Máx 3MB</span><input type="file" accept="image/*" className="hidden" onChange={uploadImage('bg', 3, setBrandBg)} /></label>
            }
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">Color principal</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={() => setBrandColor(c)} className="w-8 h-8 rounded-full border-4 transition-all" style={{ backgroundColor: c, borderColor: brandColor === c ? '#1a1a1a' : 'transparent' }} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="w-10 h-10 rounded-xl border border-border cursor-pointer" />
            <span className="text-sm text-muted font-mono">{brandColor}</span>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      <div className="bg-white rounded-2xl p-6 space-y-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted">💬 Mensajes al cliente</h3>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Mensaje de bienvenida</label>
          <EmojiBar onPick={e => setWelcomeMsg((m: string) => m + e)} />
          <textarea rows={2} value={welcomeMsg} onChange={e => setWelcomeMsg(e.target.value)} placeholder="¡Bienvenido! Aquí tienes todo para alcanzar tus objetivos 💪" className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none resize-none" />
          <p className="text-[10px] text-muted mt-1">Se muestra en la pantalla de inicio cada día.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Día de descanso</label>
          <EmojiBar onPick={e => setMotivMsg((m: string) => m + e)} />
          <textarea rows={2} value={motivMsg} onChange={e => setMotivMsg(e.target.value)} placeholder="Hoy toca descansar. El músculo crece en la recuperación 🧘" className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none resize-none" />
          <p className="text-[10px] text-muted mt-1">Se muestra cuando no hay sesión programada.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Mensaje de racha (3+ días)</label>
          <EmojiBar onPick={e => setRestDayMsg((m: string) => m + e)} />
          <input type="text" value={restDayMsg} onChange={e => setRestDayMsg(e.target.value)} placeholder="¡Increíble constancia! Esto es lo que marca la diferencia 🔥" className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
          <p className="text-[10px] text-muted mt-1">Se muestra con 3+ días seguidos entrenando.</p>
        </div>
      </div>

      {/* Cuenta */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-2">👤 Cuenta</h3>
        <p className="text-sm text-muted">Email: <span className="font-semibold text-ink">{userProfile.email}</span></p>
      </div>

      <div className="flex gap-3">
        <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4" />{saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
        <Button variant="outline" className="gap-2" onClick={onLogout}>
          <LogOut className="w-4 h-4" />Salir
        </Button>
      </div>
    </div>
  )
}
