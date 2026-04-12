import { useState, useEffect, useMemo } from 'react'
import {
  LayoutDashboard, Users, Dumbbell, ClipboardList, Settings as SettingsIcon,
  LogOut, UserPlus, Search, Trash2, TrendingUp, ChevronRight,
  MessageCircle, Link, Copy, Bell, CheckCircle2, AlertCircle,
  Clock, Filter, X, Calendar, BarChart2
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { mapClientes } from '../../lib/mappers'
import { ClientData, UserProfile } from '../../types'
import { Button } from '../shared/Button'
import { Modal } from '../shared/Modal'
import { toast } from '../shared/Toast'
import { ExercisesTab } from './ExercisesTab'
import { TemplatesTab } from './TemplatesTab'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

type Tab = 'dashboard' | 'clients' | 'exercises' | 'templates' | 'settings'
type ClientFilter = 'all' | 'active' | 'no-plan' | 'no-activity'

interface ClientWithStats extends ClientData {
  lastActive?: string
  doneToday?: boolean
  hasPlan?: boolean
  weeklyDays?: number
}

interface Props {
  userProfile: UserProfile
  onLogout: () => void
  onSelectClient: (client: ClientData) => void
}

export function TrainerDashboard({ userProfile, onLogout, onSelectClient }: Props) {
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

  const fetchClients = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('trainerId', userProfile.uid)

    if (error) { console.error('Error:', error); setLoading(false); return }

    const mapped = mapClientes(data || [])
    const hoy = new Date().toISOString().split('T')[0]
    const haceUnaS = new Date(); haceUnaS.setDate(haceUnaS.getDate() - 7)

    if (mapped.length) {
      const ids = mapped.map(c => c.id)

      // Cargar registros
      const { data: regs } = await supabase
        .from('registros').select('clientId,logs').in('clientId', ids)

      // Cargar planes
      const { data: planes } = await supabase
        .from('planes').select('clientId,plan').in('clientId', ids)

      const planMap: Record<string, boolean> = {}
      ;(planes || []).forEach((p: any) => {
        planMap[p.clientId] = !!(p.plan?.P?.weeks?.length)
      })

      const withStats: ClientWithStats[] = mapped.map(c => {
        const reg = (regs || []).find((r: any) => r.clientId === c.id)
        const logs = reg?.logs || {}
        const dates = Object.values(logs)
          .filter((l: any) => l.dateDone)
          .map((l: any) => l.dateDone as string)
        const uniqueDates = [...new Set(dates)].sort().reverse()
        const lastActive = uniqueDates[0]
        const doneToday = uniqueDates[0] === hoy

        // Días activos esta semana
        const weeklyDays = uniqueDates.filter(d => new Date(d) >= haceUnaS).length

        return {
          ...c,
          lastActive,
          doneToday,
          hasPlan: planMap[c.id] || false,
          weeklyDays,
        }
      })

      setClients(withStats)
    } else {
      setClients([])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()
    const channel = supabase.channel('clientes-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes',
        filter: `trainerId=eq.${userProfile.uid}` }, fetchClients)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userProfile.uid])

  const handleAdd = async () => {
    if (!newClient.name.trim()) return
    setAdding(true)
    const token = Math.random().toString(36).slice(2, 14)
    const { error } = await supabase.from('clientes').insert({
      trainerId: userProfile.uid,
      name: newClient.name.trim(),
      surname: newClient.surname.trim(),
      token,
      createdAt: Date.now(),
    })
    if (error) toast('Error: ' + error.message, 'warn')
    else { toast('Cliente creado ✓', 'ok'); setShowAdd(false); setNewClient({ name: '', surname: '' }); fetchClients() }
    setAdding(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('clientes').delete().eq('id', id)
    setDeletingId(null)
    fetchClients()
    toast('Cliente eliminado', 'ok')
  }

  const getClientUrl = (client: ClientData) => `${window.location.origin}?c=${client.token}`

  const sendWhatsApp = (client: ClientData) => {
    const url = getClientUrl(client)
    const msg = encodeURIComponent(`Hola ${client.name} 👋\n\nTe comparto el enlace a tu panel de entrenamiento:\n\n${url}\n\n¡Ahí tienes tu rutina, progreso y todo lo que necesitas! 💪`)
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  // Stats
  const hoy = new Date().toISOString().split('T')[0]
  const haceUnaS = new Date(); haceUnaS.setDate(haceUnaS.getDate() - 7)
  const activeToday = clients.filter(c => c.doneToday).length
  const noPlan = clients.filter(c => !c.hasPlan).length
  const noActivity7d = clients.filter(c => {
    if (!c.lastActive) return true
    return new Date(c.lastActive) < haceUnaS
  }).length

  // Alertas
  const alerts = clients.filter(c => !c.hasPlan || (c.lastActive && new Date(c.lastActive) < haceUnaS))

  // Filtrado
  const filteredClients = useMemo(() => {
    let list = [...clients]
    if (clientFilter === 'active') list = list.filter(c => c.doneToday)
    else if (clientFilter === 'no-plan') list = list.filter(c => !c.hasPlan)
    else if (clientFilter === 'no-activity') list = list.filter(c => !c.lastActive || new Date(c.lastActive) < haceUnaS)
    if (search) list = list.filter(c => `${c.name} ${c.surname}`.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [clients, clientFilter, search])

  // Gráfica
  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      const key = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString('es-ES', { weekday: 'short' })
      const count = clients.filter(c => c.lastActive === key).length
      return { label, count, key }
    })
    return days
  }, [clients])

  const navItems: { id: Tab; icon: React.ElementType; label: string; badge?: number }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Resumen' },
    { id: 'clients',   icon: Users,           label: 'Clientes', badge: clients.length },
    { id: 'exercises', icon: Dumbbell,        label: 'Ejercicios' },
    { id: 'templates', icon: ClipboardList,   label: 'Plantillas' },
    { id: 'settings',  icon: SettingsIcon,    label: 'Ajustes' },
  ]

  const formatLastActive = (date?: string) => {
    if (!date) return 'Nunca'
    const d = new Date(date + 'T00:00:00')
    const today = new Date(); today.setHours(0,0,0,0)
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
    if (diff === 0) return 'Hoy'
    if (diff === 1) return 'Ayer'
    if (diff < 7) return `Hace ${diff} días`
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-card border-r border-border flex flex-col">
        <div className="px-5 py-4 border-b border-border">
          <h1 className="text-xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></h1>
        </div>

        {/* Perfil */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center font-serif text-accent text-sm font-bold flex-shrink-0">
              {userProfile.displayName?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{userProfile.displayName}</p>
              <p className="text-[10px] text-muted truncate">{userProfile.email}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ id, icon: Icon, label, badge }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === id ? 'bg-ink text-white' : 'text-muted hover:bg-bg-alt hover:text-ink'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === id ? 'bg-white/20 text-white' : 'bg-bg-alt text-muted'
                }`}>{badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer sidebar */}
        <div className="p-3 border-t border-border space-y-2">
          {alerts.length > 0 && (
            <button onClick={() => { setActiveTab('clients'); setClientFilter('no-activity') }}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-warn/5 border border-warn/20 rounded-xl text-xs font-semibold text-warn hover:bg-warn/10 transition-colors">
              <Bell className="w-3.5 h-3.5" />
              {alerts.length} alerta{alerts.length > 1 ? 's' : ''}
            </button>
          )}
          <Button className="w-full gap-2 text-sm" onClick={() => setShowAdd(true)}>
            <UserPlus className="w-4 h-4" /> Nuevo cliente
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2 text-sm" onClick={onLogout}>
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-3xl font-serif font-bold">Resumen</h2>
                <p className="text-muted text-sm mt-1">
                  {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Clientes totales', value: clients.length, icon: Users, color: 'text-ink', bg: 'bg-bg-alt', onClick: () => { setActiveTab('clients'); setClientFilter('all') } },
                  { label: 'Entrenaron hoy', value: activeToday, icon: CheckCircle2, color: 'text-ok', bg: 'bg-ok/10', onClick: () => { setActiveTab('clients'); setClientFilter('active') } },
                  { label: 'Sin plan', value: noPlan, icon: AlertCircle, color: 'text-warn', bg: 'bg-warn/10', onClick: () => { setActiveTab('clients'); setClientFilter('no-plan') } },
                  { label: 'Sin actividad 7d', value: noActivity7d, icon: Clock, color: 'text-warn', bg: 'bg-warn/10', onClick: () => { setActiveTab('clients'); setClientFilter('no-activity') } },
                ].map(({ label, value, icon: Icon, color, bg, onClick }) => (
                  <button key={label} onClick={onClick}
                    className="bg-card border border-border rounded-2xl p-5 text-left hover:border-accent hover:shadow-sm transition-all">
                    <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <p className={`text-3xl font-serif font-bold ${color}`}>{value}</p>
                    <p className="text-[10px] text-muted uppercase tracking-wider font-semibold mt-1">{label}</p>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Gráfica actividad */}
                <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="font-serif font-bold">Actividad esta semana</h3>
                      <p className="text-xs text-muted mt-0.5">Clientes que entrenaron cada día</p>
                    </div>
                    <BarChart2 className="w-4 h-4 text-muted" />
                  </div>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6e5438" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6e5438" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d8d4ca" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: '#faf8f5', border: '1px solid #d8d4ca', borderRadius: 8, fontSize: 12 }} />
                        <Area type="monotone" dataKey="count" name="Clientes" stroke="#6e5438" strokeWidth={2} fill="url(#grad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Alertas */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-serif font-bold text-sm">Requieren atención</h3>
                    <Bell className="w-4 h-4 text-muted" />
                  </div>
                  <div className="divide-y divide-border max-h-56 overflow-y-auto">
                    {alerts.length === 0 && (
                      <div className="px-5 py-8 text-center">
                        <CheckCircle2 className="w-8 h-8 text-ok mx-auto mb-2 opacity-60" />
                        <p className="text-sm text-muted">Todo en orden</p>
                      </div>
                    )}
                    {alerts.slice(0, 8).map(c => (
                      <button key={c.id} onClick={() => onSelectClient(c)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-alt transition-colors text-left">
                        <div className="w-8 h-8 rounded-full bg-bg-alt flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                          {c.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.name} {c.surname}</p>
                          <p className="text-[10px] text-warn">
                            {!c.hasPlan ? 'Sin plan asignado' : `Sin entrenar: ${formatLastActive(c.lastActive)}`}
                          </p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lista rápida clientes recientes */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-serif font-bold">Clientes recientes</h3>
                  <button onClick={() => setActiveTab('clients')} className="text-xs text-accent hover:underline font-semibold">Ver todos →</button>
                </div>
                <div className="divide-y divide-border">
                  {clients.slice(0, 6).map(c => (
                    <button key={c.id} onClick={() => onSelectClient(c)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-bg-alt transition-colors text-left group">
                      <div className="relative w-9 h-9 rounded-full bg-bg-alt border border-border flex items-center justify-center text-sm font-bold text-accent flex-shrink-0">
                        {c.name[0]?.toUpperCase()}
                        {c.doneToday && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-ok rounded-full border-2 border-card" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{c.name} {c.surname}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {!c.hasPlan && <span className="text-[10px] text-warn font-semibold">Sin plan</span>}
                          {c.hasPlan && <span className="text-[10px] text-muted">{formatLastActive(c.lastActive)}</span>}
                          {c.weeklyDays ? (
                            <span className="text-[10px] text-ok font-semibold">{c.weeklyDays}d esta semana</span>
                          ) : null}
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
          )}

          {/* ── CLIENTES ── */}
          {activeTab === 'clients' && (
            <div className="animate-fade-in space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-serif font-bold">Clientes</h2>
                  <p className="text-muted text-sm mt-1">{clients.length} alumnos registrados</p>
                </div>
                <Button className="gap-2" onClick={() => setShowAdd(true)}>
                  <UserPlus className="w-4 h-4" /> Nuevo cliente
                </Button>
              </div>

              {/* Búsqueda + filtros */}
              <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input type="text" placeholder="Buscar cliente..." value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {([
                    { id: 'all', label: 'Todos' },
                    { id: 'active', label: '✓ Hoy' },
                    { id: 'no-plan', label: '⚠ Sin plan' },
                    { id: 'no-activity', label: '💤 Sin actividad' },
                  ] as const).map(f => (
                    <button key={f.id} onClick={() => setClientFilter(f.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        clientFilter === f.id ? 'bg-ink text-white border-ink' : 'bg-card border-border text-muted hover:border-accent'
                      }`}
                    >{f.label}</button>
                  ))}
                </div>
              </div>

              {/* Grid clientes */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-card border border-border rounded-2xl animate-pulse" />)}
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl">
                  <Users className="w-12 h-12 text-muted/30 mx-auto mb-4" />
                  <p className="font-serif font-bold text-lg">Sin resultados</p>
                  <p className="text-muted text-sm mt-1">Prueba con otro filtro o añade un cliente</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredClients.map(client => (
                    <div key={client.id}
                      className="bg-card border border-border rounded-2xl p-5 hover:border-accent hover:shadow-sm transition-all cursor-pointer group"
                      onClick={() => onSelectClient(client)}
                    >
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="relative w-11 h-11 rounded-full bg-accent/10 flex items-center justify-center font-serif text-lg text-accent flex-shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                          {client.name[0]?.toUpperCase()}
                          {client.doneToday && (
                            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-ok rounded-full border-2 border-card" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-serif font-bold text-base truncate">{client.name} {client.surname}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {client.doneToday && <span className="text-[10px] text-ok font-bold">✓ Entrenó hoy</span>}
                            {!client.doneToday && client.lastActive && <span className="text-[10px] text-muted">{formatLastActive(client.lastActive)}</span>}
                            {!client.doneToday && !client.lastActive && <span className="text-[10px] text-muted">Sin actividad</span>}
                          </div>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex gap-2 mb-4 flex-wrap">
                        {!client.hasPlan && (
                          <span className="text-[10px] font-bold bg-warn/10 text-warn px-2 py-0.5 rounded-full border border-warn/20">Sin plan</span>
                        )}
                        {client.hasPlan && (
                          <span className="text-[10px] font-bold bg-ok/10 text-ok px-2 py-0.5 rounded-full border border-ok/20">Plan ✓</span>
                        )}
                        {client.weeklyDays ? (
                          <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full border border-accent/20">
                            {client.weeklyDays}d esta semana
                          </span>
                        ) : null}
                      </div>

                      {/* Acciones */}
                      {deletingId === client.id ? (
                        <div className="flex gap-2">
                          <Button variant="danger" size="sm" className="flex-1"
                            onClick={e => { e.stopPropagation(); handleDelete(client.id) }}>Eliminar</Button>
                          <Button variant="outline" size="sm" className="flex-1"
                            onClick={e => { e.stopPropagation(); setDeletingId(null) }}>Cancelar</Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1"
                            onClick={e => { e.stopPropagation(); onSelectClient(client) }}>
                            ✏️ Plan
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1"
                            onClick={e => { e.stopPropagation(); setLinkModal(client) }}>
                            <MessageCircle className="w-3.5 h-3.5 mr-1" /> Enviar
                          </Button>
                          <Button variant="outline" size="sm" className="px-2"
                            onClick={e => { e.stopPropagation(); setDeletingId(client.id) }}>
                            <Trash2 className="w-3.5 h-3.5 text-warn" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Card añadir */}
                  <button onClick={() => setShowAdd(true)}
                    className="border-2 border-dashed border-border rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-muted hover:border-accent hover:text-accent transition-all min-h-[180px]">
                    <UserPlus className="w-6 h-6" />
                    <span className="text-sm font-medium">Añadir cliente</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'exercises' && <ExercisesTab trainerId={userProfile.uid} />}
          {activeTab === 'templates' && <TemplatesTab trainerId={userProfile.uid} />}

          {activeTab === 'settings' && (
            <div className="animate-fade-in max-w-lg space-y-5">
              <h2 className="text-3xl font-serif font-bold">Ajustes</h2>
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <div><p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Email</p><p className="text-sm">{userProfile.email}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Nombre</p><p className="text-sm">{userProfile.displayName}</p></div>
                <hr className="border-border" />
                <Button variant="outline" className="gap-2 w-full justify-start" onClick={onLogout}>
                  <LogOut className="w-4 h-4" /> Cerrar sesión
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal nuevo cliente */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nuevo cliente">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Nombre *</label>
            <input autoFocus type="text" value={newClient.name}
              onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Nombre"
              className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Apellido</label>
            <input type="text" value={newClient.surname}
              onChange={e => setNewClient(p => ({ ...p, surname: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Apellido"
              className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleAdd} disabled={adding}>
              {adding ? 'Creando...' : 'Crear cliente'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal enlace / WhatsApp */}
      {linkModal && (
        <Modal open={!!linkModal} onClose={() => setLinkModal(null)} title={`Acceso de ${linkModal.name}`}>
          <div className="space-y-4">
            <p className="text-sm text-muted">Comparte este enlace. El cliente no necesita contraseña.</p>
            <div className="flex gap-2">
              <input readOnly value={getClientUrl(linkModal)}
                className="flex-1 px-3 py-2.5 bg-bg border border-border rounded-xl text-xs text-muted font-mono outline-none"
              />
              <button onClick={() => { navigator.clipboard.writeText(getClientUrl(linkModal)); toast('Copiado ✓', 'ok') }}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-ink text-white rounded-xl text-sm font-medium hover:opacity-90 flex-shrink-0">
                <Copy className="w-3.5 h-3.5" /> Copiar
              </button>
            </div>
            <button onClick={() => { sendWhatsApp(linkModal); setLinkModal(null) }}
              className="w-full flex items-center justify-center gap-3 py-4 bg-[#25D366] text-white rounded-2xl text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all">
              <MessageCircle className="w-5 h-5" /> Enviar por WhatsApp
            </button>
            <p className="text-[10px] text-muted text-center">Se abrirá WhatsApp con el mensaje ya preparado</p>
          </div>
        </Modal>
      )}
    </div>
  )
}
