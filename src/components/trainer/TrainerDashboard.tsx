import { AlertasWidget } from './AlertasWidget'
import { useTrainerClients } from '../../hooks/useTrainerClients'
import { useClientStats } from '../../hooks/useClientStats'
import { useLabels } from '../../hooks/useLabels'
import { useState } from 'react'
import {
  LayoutDashboard, Users, Dumbbell, ClipboardList, FileText, Settings as SettingsIcon,
  LogOut, UserPlus, Search, Trash2, ChevronRight,
  MessageCircle, Copy, Bell, CheckCircle2, AlertCircle,
  Clock, X, BarChart2, Menu, Save, TrendingUp, Calendar, ChevronDown,
  StickyNote, Activity, Zap, ArrowRight, Send, Users2
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { NotificacionesBell } from './NotificacionesBell'
import { useExerciseLibrary } from '../../hooks/useExerciseLibrary'
import { ClientData, UserProfile } from '../../types'
import { Button } from '../shared/Button'
import { Modal } from '../shared/Modal'
import { toast } from '../shared/Toast'
import { ExercisesTab } from './ExercisesTab'
import { TemplatesTab } from './TemplatesTab'
import { ProgramasTab } from './ProgramasTab'
import { NutricionLibreria } from './NutricionLibreria'
import { MensajesTab } from './MensajesTab'
import { InsightsTab } from './InsightsTab'
import { AdherenciaTab } from './AdherenciaTab'
import { EncuestasTab } from './EncuestasTab'
import { BusinessDashboard } from './BusinessDashboard'
import { CohortesTab } from './CohortesTab'
import { PlanGate } from '../shared/PlanGate'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

type Tab = 'dashboard' | 'clients' | 'cohortes' | 'exercises' | 'templates' | 'programas' | 'nutricion' | 'settings' | 'mensajes' | 'insights' | 'adherencia' | 'encuestas' | 'negocio'
type ClientFilter = 'all' | 'active' | 'no-plan' | 'no-activity'

interface Props {
  userProfile: UserProfile
  onLogout: () => void
  onSelectClient: (client: ClientData) => void
  demoClients?: ClientData[]
}

export function TrainerDashboard({ userProfile, onLogout, onSelectClient, demoClients }: Props) {
  const clientLimit = userProfile.clientLimit ?? 999
  const { clients, logsMap, loading, addClient, deleteClient, limitReached } =
    useTrainerClients({ trainerId: userProfile.uid, demoClients, clientLimit })
  const { labels } = useLabels(userProfile.uid)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState<ClientFilter>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', surname: '', phone: '', objetivo: 'general', altura: '', peso: '', genero: '', fechanacimiento: '' })
  const [newClientLabelIds, setNewClientLabelIds] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [linkModal, setLinkModal] = useState<ClientData | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [quickNote, setQuickNote] = useState(() => localStorage.getItem('pf_quick_note') || '')
  const library = useExerciseLibrary(userProfile.uid)

  const { activeToday, noPlan, noActivity7d, activePrevWeek, adherenciaMap,
    filteredClients, chartData, activityFeed, alerts, formatLastActive } =
    useClientStats({ clients, logsMap, search, clientFilter })

  const handleAdd = async () => {
    if (!newClient.name.trim()) return
    setAdding(true)
    const ok = await addClient(newClient, newClientLabelIds)
    if (ok) {
      setShowAdd(false)
      setNewClientLabelIds([])
      setNewClient({ name: '', surname: '', phone: '', objetivo: 'general', altura: '', peso: '', genero: '', fechanacimiento: '' })
    }
    setAdding(false)
  }

  const handleDelete = async (id: string) => { await deleteClient(id); setDeletingId(null) }
  const getClientUrl = (c: ClientData) => `${window.location.origin}?c=${c.token}`
  const sendWhatsApp = (c: ClientData) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Hola ${c.name}\n\nTe comparto el enlace a tu panel:\n\n${getClientUrl(c)}\n\n`)}`, '_blank')
  }
  const handleTabChange = (tab: Tab) => { setActiveTab(tab); setSidebarOpen(false) }

  const QUICK_ACTIONS = [
    { icon: UserPlus,      label: 'Nuevo cliente', color: 'text-accent', bg: 'bg-accent/8',  action: () => { setShowAdd(true); setSidebarOpen(false) }, disabled: limitReached },
    { icon: Dumbbell,      label: 'Workouts',      color: 'text-ink',   bg: 'bg-ink/5',     action: () => handleTabChange('templates') },
    { icon: Send,          label: 'Encuesta',      color: 'text-accent', bg: 'bg-accent/8',  action: () => handleTabChange('encuestas') },
    { icon: BarChart2,     label: 'Adherencia',    color: 'text-ink',   bg: 'bg-ink/5',     action: () => handleTabChange('adherencia') },
    { icon: MessageCircle, label: 'Mensajes',      color: 'text-accent', bg: 'bg-accent/8',  action: () => handleTabChange('mensajes') },
    { icon: TrendingUp,    label: 'Insights',      color: 'text-ink',   bg: 'bg-ink/5',     action: () => handleTabChange('insights') },
  ]

  const NAV_GROUPS = [
    { label: 'Gestión', items: [
      { id: 'dashboard' as Tab, icon: LayoutDashboard, label: 'Resumen' },
      { id: 'clients'   as Tab, icon: Users,           label: 'Clientes', badge: clients.length },
      { id: 'cohortes' as Tab, icon: Users2,          label: 'Grupos' },
      { id: 'mensajes'  as Tab, icon: MessageCircle,   label: 'Mensajes' },
      { id: 'encuestas' as Tab, icon: ClipboardList,   label: 'Encuestas' },
      { id: 'negocio'   as Tab, icon: TrendingUp,      label: 'Mi negocio' },
    ]},
    { label: 'Contenido', items: [
      { id: 'exercises' as Tab, icon: Dumbbell,   label: 'Ejercicios' },
      { id: 'templates' as Tab, icon: Dumbbell,   label: 'Workouts' },
      { id: 'programas' as Tab, icon: Calendar,   label: 'Programas' },
      { id: 'nutricion' as Tab, icon: FileText,  label: 'Nutrición' },
    ]},
    { label: 'Análisis', items: [
      { id: 'insights'   as Tab, icon: BarChart2,  label: 'Insights' },
      { id: 'adherencia' as Tab, icon: TrendingUp, label: 'Adherencia' },
    ]},
    { label: 'Configuración', items: [
      { id: 'settings' as Tab, icon: SettingsIcon, label: 'Ajustes' },
    ]},
  ]

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-border flex items-center justify-between">
        <h1 className="text-lg font-serif font-bold tracking-tight">Panel<span className="text-accent italic">Fit</span></h1>
        <div className="flex items-center gap-1">
          <NotificacionesBell trainerId={userProfile.uid} onSelectClient={(clientId) => {
            const client = clients.find(c => c.id === clientId)
            if (client) onSelectClient(client)
          }} />
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-muted"><X className="w-4 h-4" /></button>
        </div>
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
      <div className="px-3 py-3 border-b border-border">
        <p className="text-[10px] font-semibold text-muted/50 px-2 mb-2 tracking-wider">Accesos rápidos</p>
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_ACTIONS.map(({ icon: Icon, label, color, bg, action, disabled }) => (
            <button key={label} onClick={action} disabled={disabled}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all hover:opacity-80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${bg}`}>
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${color}`} />
              <span className={`text-[10px] font-semibold leading-tight ${color}`}>{label}</span>
            </button>
          ))}
        </div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-muted/50 px-3 mb-1 tracking-wider">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(({ id, icon: Icon, label, badge }: any) => (
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
        <button onClick={() => { if (!limitReached) { setShowAdd(true); setSidebarOpen(false) } }} disabled={limitReached}
          className="w-full flex items-center gap-2 px-3 py-2 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
          <UserPlus className="w-3.5 h-3.5" /> Nuevo cliente
        </button>
        <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-muted hover:bg-bg-alt transition-colors">
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

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 animate-fade-in">

              {/* Columna izquierda */}
              <div className="flex-1 min-w-0 space-y-5">

                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="text-4xl font-serif font-bold">Resumen</h2>
                    <p className="text-muted text-sm mt-1">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  </div>
                  {clients.length > 0 && (
                    <div className="hidden sm:flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border border-border/50 text-xs text-muted">
                      <Activity className="w-3.5 h-3.5 text-ok" />
                      <span><strong className="text-ink">{Math.round((activeToday / Math.max(clients.length, 1)) * 100)}%</strong> entrenaron hoy</span>
                    </div>
                  )}
                </div>

                {/* Stat cards — borde de color + número prominente */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Clientes',       value: clients.length, prev: undefined,     icon: Users,        color: 'text-ink',  accent: '#6e5438', border: '#6e5438', onClick: () => handleTabChange('clients') },
                    { label: 'Entrenaron hoy', value: activeToday,    prev: activePrevWeek, icon: CheckCircle2, color: 'text-ok',   accent: '#4caf7d', border: '#4caf7d', onClick: () => { setClientFilter('active'); handleTabChange('clients') } },
                    { label: 'Sin plan',       value: noPlan,         prev: undefined,     icon: AlertCircle,  color: noPlan > 0 ? 'text-warn' : 'text-muted',      accent: noPlan > 0 ? '#e07b54' : '#9ca3af',      border: noPlan > 0 ? '#e07b54' : '#e5e7eb',      onClick: () => { setClientFilter('no-plan'); handleTabChange('clients') } },
                    { label: 'Sin actividad',  value: noActivity7d,  prev: undefined,     icon: Clock,        color: noActivity7d > 0 ? 'text-warn' : 'text-muted', accent: noActivity7d > 0 ? '#e07b54' : '#9ca3af', border: noActivity7d > 0 ? '#e07b54' : '#e5e7eb', onClick: () => { setClientFilter('no-activity'); handleTabChange('clients') } },
                  ].map(({ label, value, prev, icon: Icon, color, accent, border, onClick }) => (
                    <button key={label} onClick={onClick}
                      className="bg-white rounded-2xl p-5 text-left hover:shadow-md transition-all shadow-sm overflow-hidden relative"
                      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: border }} />
                      <div className="flex items-center justify-between mb-4 mt-1">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: accent + '15' }}>
                          <Icon className={`w-4 h-4 ${color}`} />
                        </div>
                        {prev !== undefined && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${value >= prev ? 'bg-ok/10 text-ok' : 'bg-warn/10 text-warn'}`}>
                            {value >= prev ? '↑' : '↓'} {Math.abs(value - prev)}
                          </span>
                        )}
                      </div>
                      <p className={`text-4xl font-serif font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-muted font-medium mt-1">{label}</p>
                    </button>
                  ))}
                </div>


                {/* Onboarding — solo cuando no hay clientes */}
                {clients.length === 0 && !loading && (
                  <div className="border-2 border-dashed border-border rounded-2xl overflow-hidden">
                    <div className="px-8 py-10 text-center">
                      <div className="text-5xl mb-4">👋</div>
                      <p className="font-serif text-2xl font-bold text-ink">Bienvenido a PanelFit</p>
                      <p className="text-sm text-muted mt-2 max-w-sm mx-auto">Empieza añadiendo tu primer cliente. En menos de 2 minutos puedes tenerle con un plan asignado.</p>
                      <button onClick={() => setShowAdd(true)} className="mt-5 px-6 py-3 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
                        Añadir primer cliente
                      </button>
                    </div>
                    <div className="border-t border-border/50 px-8 py-5 bg-bg-alt/30">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Primeros pasos</p>
                      <div className="space-y-2.5">
                        {[
                          { label: "Añade tu primer cliente", action: "Nuevo cliente", onClick: () => setShowAdd(true) },
                          { label: "Crea un workout en la librería", action: "Ir a Workouts", onClick: () => handleTabChange("templates") },
                          { label: "Asigna un plan a tu cliente", action: "Ver clientes", onClick: () => handleTabChange("clients") },
                        ].map(({ label, action, onClick }) => (
                          <div key={label} className="flex items-center justify-between py-2 px-3 bg-white rounded-xl border border-border/50">
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 rounded-full border-2 border-border flex-shrink-0" />
                              <p className="text-sm text-ink">{label}</p>
                            </div>
                            <button onClick={onClick} className="text-xs font-semibold text-accent hover:underline flex-shrink-0">{action} →</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Gráfica actividad */}
                <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="font-serif font-bold text-lg">Actividad semanal</h3>
                      <p className="text-xs text-muted mt-0.5">Sesiones completadas por día</p>
                    </div>
                    <button onClick={() => handleTabChange('insights')} className="text-xs text-accent hover:underline font-semibold flex items-center gap-1">
                      Ver insights <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="h-40 lg:h-48">
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

                {/* Cumplimiento semanal */}
                {clients.length > 0 && (
                  <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                      <div>
                        <h3 className="font-serif font-bold">Cumplimiento semanal</h3>
                        <p className="text-xs text-muted mt-0.5">Adherencia de cada cliente esta semana</p>
                      </div>
                      <button onClick={() => handleTabChange('adherencia')} className="text-xs text-accent hover:underline font-semibold flex items-center gap-1">
                        Ver adherencia <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="divide-y divide-border/40">
                      {clients.every(c => (adherenciaMap[c.id] ?? 0) === 0) && (
                        <div className="px-5 py-8 text-center">
                          <div className="text-3xl mb-2">💪</div>
                          <p className="text-sm font-semibold text-ink">La semana acaba de empezar</p>
                          <p className="text-xs text-muted mt-1">El cumplimiento se actualizará cuando tus clientes entrenen</p>
                        </div>
                      )}
                      {clients.some(c => (adherenciaMap[c.id] ?? 0) > 0) && clients.slice(0, 6).map(c => {
                        const pct = adherenciaMap[c.id] ?? 0
                        const barColor = pct >= 75 ? '#4caf7d' : pct >= 40 ? '#e0a854' : '#e07b54'
                        return (
                          <button key={c.id} onClick={() => onSelectClient(c)} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-bg-alt/50 transition-colors text-left">
                            <div className="relative w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                              {c.name[0]?.toUpperCase()}
                              {c.doneToday && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-ok rounded-full border-2 border-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{c.name} {c.surname}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1.5 bg-bg-alt rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                                </div>
                                <span className="text-[10px] font-bold w-8 text-right flex-shrink-0" style={{ color: barColor }}>{pct}%</span>
                              </div>
                            </div>
                            <span className="text-[10px] text-muted flex-shrink-0 hidden sm:block">{formatLastActive(c.lastActive)}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Clientes recientes */}
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
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {!c.hasPlan && <span className="text-[10px] text-warn font-semibold bg-warn/10 px-1.5 py-0.5 rounded-full">Sin plan</span>}
                            {c.hasPlan && <span className="text-[10px] text-muted">{formatLastActive(c.lastActive)}</span>}
                            {!!c.weeklyDays && <span className="text-[10px] text-ok font-semibold">{c.weeklyDays}d esta semana</span>}
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                    {!clients.length && (
                      <div className="px-5 py-10 text-center text-muted">
                        <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">Sin clientes aún.</p>
                        <button onClick={() => setShowAdd(true)} className="mt-2 text-accent text-sm hover:underline">Añadir el primero →</button>
                      </div>
                    )}
                  </div>
                </div>

              </div>{/* fin columna izquierda */}

              {/* Columna derecha */}
              <div className="w-full lg:w-72 lg:flex-shrink-0 space-y-4">

                {alerts.length > 0 && (
                  <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5 text-warn" />
                      <h3 className="text-sm font-semibold">Requieren atención</h3>
                      <span className="ml-auto text-[10px] font-bold bg-warn/10 text-warn px-1.5 py-0.5 rounded-full">{alerts.length}</span>
                    </div>
                    <div className="divide-y divide-border/50 max-h-48 overflow-y-auto">
                      {alerts.slice(0, 5).map(c => (
                        <button key={c.id} onClick={() => onSelectClient(c)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-alt/50 text-left">
                          <div className="w-7 h-7 rounded-full bg-warn/10 flex items-center justify-center text-xs font-bold text-warn flex-shrink-0">{c.name[0]?.toUpperCase()}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{c.name} {c.surname}</p>
                            <p className="text-[10px] text-warn">{!c.hasPlan ? 'Sin plan' : 'Sin actividad reciente'}</p>
                          </div>
                          <ChevronRight className="w-3 h-3 text-muted" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <AlertasWidget clients={clients} onSelectClient={onSelectClient} />

                <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-accent" />
                    <h3 className="text-sm font-semibold">Actividad reciente</h3>
                  </div>
                  <div className="divide-y divide-border/50">
                    {activityFeed.length === 0
                      ? <div className="px-4 py-8 text-center"><Activity className="w-8 h-8 text-muted/20 mx-auto mb-2" /><p className="text-xs text-muted">Sin actividad reciente</p></div>
                      : activityFeed.map((ev, i) => (
                        <div key={i} className="flex items-start gap-3 px-4 py-3">
                          <div className="w-7 h-7 rounded-full bg-ok/10 flex items-center justify-center text-xs font-bold text-ok flex-shrink-0 mt-0.5">{ev.clientName[0]}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs leading-tight"><span className="font-semibold">{ev.clientName}</span><span className="text-muted"> {ev.text}</span></p>
                            <p className="text-[10px] text-muted mt-0.5">{formatLastActive(ev.date)}</p>
                          </div>
                          <CheckCircle2 className="w-3.5 h-3.5 text-ok flex-shrink-0 mt-0.5" />
                        </div>
                      ))
                    }
                  </div>
                </div>

                <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-accent" />
                    <h3 className="text-sm font-semibold">Acciones rápidas</h3>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-2">
                    {QUICK_ACTIONS.map(({ icon: Icon, label, color, bg, action, disabled }) => (
                      <button key={label} onClick={action} disabled={disabled}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-all hover:opacity-80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${bg}`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                        <span className={`text-[10px] font-semibold leading-tight ${color}`}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                    <h3 className="text-sm font-semibold">Tareas de hoy</h3>
                  </div>
                  <div className="p-3 space-y-1.5">
                    {alerts.slice(0, 3).map(c => (
                      <button key={c.id} onClick={() => onSelectClient(c)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-bg-alt/50 text-left transition-colors">
                        <div className="w-4 h-4 rounded border-2 border-border flex-shrink-0" />
                        <p className="text-xs text-muted">{!c.hasPlan ? `Crear plan para ${c.name}` : `Revisar progreso de ${c.name}`}</p>
                      </button>
                    ))}
                    {alerts.length === 0 && (
                      <div className="px-3 py-4 text-center">
                        <CheckCircle2 className="w-6 h-6 text-ok mx-auto mb-1 opacity-60" />
                        <p className="text-xs text-muted">Todo al día ✓</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
                    <StickyNote className="w-3.5 h-3.5 text-accent" />
                    <h3 className="text-sm font-semibold">Notas rápidas</h3>
                  </div>
                  <div className="p-3">
                    <textarea value={quickNote} onChange={e => { setQuickNote(e.target.value); localStorage.setItem('pf_quick_note', e.target.value) }}
                      placeholder="Anota algo al vuelo..." rows={4}
                      className="w-full text-xs text-muted bg-bg-alt/50 border border-border/50 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent/20 resize-none leading-relaxed" />
                  </div>
                </div>

              </div>{/* fin columna derecha */}

            </div>
          )}

          {/* ── CLIENTES ── */}
          {activeTab === 'clients' && (
            <div className="animate-fade-in space-y-5 max-w-5xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-serif font-bold">Clientes</h2>
                  <p className="text-muted text-sm mt-1">{clients.length}{clientLimit < 999 ? `/${clientLimit}` : ''} alumnos{limitReached && <span className="ml-2 text-warn font-semibold">· límite alcanzado</span>}</p>
                </div>
                <Button className="gap-2" onClick={() => setShowAdd(true)} disabled={limitReached}><UserPlus className="w-4 h-4" /> Nuevo</Button>
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
                  {filteredClients.map(client => {
                    const adherencia = adherenciaMap[client.id] ?? 0
                    const barColor = adherencia >= 75 ? '#4caf7d' : adherencia >= 40 ? '#e0a854' : '#e07b54'
                    return (
                      <div key={client.id} className="bg-white rounded-2xl p-5 hover:shadow-md transition-all shadow-sm" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                        <div className="flex items-center gap-3 mb-3 cursor-pointer" onClick={() => onSelectClient(client)}>
                          <div className="relative w-11 h-11 rounded-full bg-accent/10 flex items-center justify-center font-serif text-lg text-accent flex-shrink-0">
                            {client.name[0]?.toUpperCase()}
                            {client.doneToday && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-ok rounded-full border-2 border-white" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-serif font-bold text-base truncate">{client.name} {client.surname}</p>
                            <p className="text-[10px] text-muted mt-0.5">
                              {client.doneToday ? <span className="text-ok font-bold">Entrenó hoy</span> : formatLastActive(client.lastActive)}
                            </p>
                          </div>
                        </div>
                        {client.hasPlan && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-muted">Cumplimiento semanal</span>
                              <span className="text-[10px] font-bold" style={{ color: barColor }}>{adherencia}%</span>
                            </div>
                            <div className="h-1.5 bg-bg-alt rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${adherencia}%`, backgroundColor: barColor }} />
                            </div>
                            {!!client.weeklyDays && <p className="text-[10px] text-muted mt-1">{client.weeklyDays} sesion{client.weeklyDays !== 1 ? 'es' : ''} esta semana</p>}
                          </div>
                        )}
                        {!client.hasPlan && (
                          <div className="mb-3 px-3 py-2.5 bg-warn/5 border border-warn/20 rounded-xl flex items-center justify-between">
                            <p className="text-xs text-warn font-semibold">Sin plan asignado</p>
                            <button onClick={() => onSelectClient(client)} className="text-[11px] font-bold text-white bg-warn px-2.5 py-1 rounded-lg hover:opacity-90">Asignar</button>
                          </div>
                        )}
                        {deletingId === client.id ? (
                          <div className="flex gap-2">
                            <Button variant="danger" size="sm" className="flex-1" onClick={e => { e.stopPropagation(); handleDelete(client.id) }}>Eliminar</Button>
                            <Button variant="outline" size="sm" className="flex-1" onClick={e => { e.stopPropagation(); setDeletingId(null) }}>Cancelar</Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => onSelectClient(client)}>Abrir</Button>
                            <Button variant="outline" size="sm" className="flex-1" onClick={e => { e.stopPropagation(); setLinkModal(client) }}>
                              <MessageCircle className="w-3.5 h-3.5 mr-1" /> Enviar
                            </Button>
                            <Button variant="outline" size="sm" className="px-2" onClick={e => { e.stopPropagation(); setDeletingId(client.id) }}>
                              <Trash2 className="w-3.5 h-3.5 text-warn" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <button onClick={() => !limitReached && setShowAdd(true)} disabled={limitReached}
                    className="border-2 border-dashed border-border rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-muted hover:border-accent hover:text-accent transition-all min-h-[180px] disabled:opacity-50 disabled:cursor-not-allowed">
                    <UserPlus className="w-6 h-6" />
                    <span className="text-sm font-medium">{limitReached ? `Limite de ${clientLimit} clientes` : 'Añadir cliente'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'exercises'  && <ExercisesTab exercises={library.exercises} trainerId={userProfile.uid} onAdd={(n,d,c,v,e,t) => library.addExercise(n,d,c,v,e as any,t)} onUpdate={library.updateExercise} onDelete={library.deleteExercise} />}
          {activeTab === 'templates'  && <TemplatesTab trainerId={userProfile.uid} clients={clients} />}
          {activeTab === 'cohortes'   && <CohortesTab trainerId={userProfile.uid} clients={clients} logsMap={logsMap} onSelectClient={onSelectClient} />}
          {activeTab === 'programas'  && <ProgramasTab trainerId={userProfile.uid} />}
          {activeTab === 'nutricion'  && <NutricionLibreria trainerId={userProfile.uid} />}
          {activeTab === 'settings'   && <SettingsTab userProfile={userProfile} onLogout={onLogout} />}
          {activeTab === 'mensajes'   && <MensajesTab userProfile={userProfile} clients={clients} />}
          {activeTab === 'insights'   && <InsightsTab clients={clients} logsMap={logsMap} />}
          {activeTab === 'adherencia' && <AdherenciaTab clients={clients} logsMap={logsMap} />}
          {activeTab === 'encuestas'  && (
            <PlanGate feature="surveys" planName={userProfile.planName}>
              <EncuestasTab trainerId={userProfile.uid} clients={clients} />
            </PlanGate>
          )}
          {activeTab === 'negocio' && (
            <PlanGate feature="business_dashboard" planName={userProfile.planName}>
              <BusinessDashboard trainerId={userProfile.uid} clients={clients} logsMap={logsMap} planName={userProfile.planName} />
            </PlanGate>
          )}

        </div>
      </main>

      {/* Modal nuevo cliente */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setNewClientLabelIds([]) }} title="Nuevo cliente">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Nombre *</label>
              <input autoFocus type="text" value={newClient.name} onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="Nombre" className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Apellido</label>
              <input type="text" value={newClient.surname} onChange={e => setNewClient(p => ({ ...p, surname: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="Apellido" className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">WhatsApp</label>
            <input type="tel" value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))} placeholder="+34 600 000 000" className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
          </div>
          {labels.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">Etiquetas</label>
              <div className="flex flex-wrap gap-1.5">
                {labels.map(label => {
                  const active = newClientLabelIds.includes(label.id)
                  return (
                    <button key={label.id} type="button"
                      onClick={() => setNewClientLabelIds(active ? newClientLabelIds.filter(id => id !== label.id) : [...newClientLabelIds, label.id])}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                      style={{ backgroundColor: active ? label.color + '18' : 'transparent', borderColor: label.color + '40', color: label.color, opacity: active ? 1 : 0.5 }}>
                      <span>{label.emoji}</span><span>{label.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <details className="group">
            <summary className="flex items-center gap-2 text-xs text-muted cursor-pointer hover:text-ink select-none py-1 transition-colors">
              <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
              Más datos (objetivo, medidas, género...)
            </summary>
            <div className="mt-3 space-y-3 border-t border-border pt-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Objetivo</label>
                <div className="flex flex-wrap gap-1.5">
                  {[{ v: 'hipertrofia', label: 'Hipertrofia' },{ v: 'fuerza', label: 'Fuerza' },{ v: 'perdida_grasa', label: 'Pérdida de grasa' },{ v: 'resistencia', label: 'Resistencia' },{ v: 'rehabilitacion', label: 'Rehabilitación' },{ v: 'rendimiento', label: 'Rendimiento' },{ v: 'general', label: 'General' }].map(opt => (
                    <button key={opt.v} type="button" onClick={() => setNewClient(p => ({ ...p, objetivo: opt.v }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${newClient.objetivo === opt.v ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Altura (cm)</label><input type="number" value={newClient.altura} onChange={e => setNewClient(p => ({ ...p, altura: e.target.value }))} placeholder="175" className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" /></div>
                <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Peso (kg)</label><input type="number" value={newClient.peso} onChange={e => setNewClient(p => ({ ...p, peso: e.target.value }))} placeholder="70" className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Género</label>
                  <select value={newClient.genero} onChange={e => setNewClient(p => ({ ...p, genero: e.target.value }))} className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none">
                    <option value="">Sin especificar</option><option value="h">Masculino</option><option value="m">Femenino</option>
                  </select>
                </div>
                <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Nacimiento</label><input type="date" value={newClient.fechanacimiento} onChange={e => setNewClient(p => ({ ...p, fechanacimiento: e.target.value }))} className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" /></div>
              </div>
            </div>
          </details>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleAdd} disabled={adding || !newClient.name.trim()}>{adding ? 'Creando...' : 'Crear cliente'}</Button>
          </div>
        </div>
      </Modal>

      {linkModal && (
        <Modal open={!!linkModal} onClose={() => setLinkModal(null)} title={`Acceso de ${linkModal.name}`}>
          <div className="space-y-4">
            <p className="text-sm text-muted">Comparte este enlace con tu cliente.</p>
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
const TEMAS = [
  { id: 'bosque',  nombre: 'Bosque',  color: '#1a6038', bg: '#f0f7f4' },
  { id: 'marino',  nombre: 'Marino',  color: '#1e3a5f', bg: '#f0f4f9' },
  { id: 'energia', nombre: 'Energía', color: '#c0392b', bg: '#fdf5f5' },
  { id: 'naranja', nombre: 'Naranja', color: '#e67e22', bg: '#fdf7f0' },
  { id: 'morado',  nombre: 'Púrpura', color: '#6c3483', bg: '#f7f0fd' },
  { id: 'elite',   nombre: 'Élite',   color: '#1a1a1a', bg: '#f5f5f5' },
  { id: 'cielo',   nombre: 'Cielo',   color: '#2980b9', bg: '#f0f6fd' },
  { id: 'rosa',    nombre: 'Rosa',    color: '#c0516a', bg: '#fdf0f3' },
  { id: 'tierra',  nombre: 'Tierra',  color: '#8b5e3c', bg: '#fdf8f4' },
  { id: 'menta',   nombre: 'Menta',   color: '#2e7d6b', bg: '#f0faf7' },
  { id: 'grafito', nombre: 'Grafito', color: '#455a64', bg: '#f4f6f7' },
  { id: 'dorado',  nombre: 'Dorado',  color: '#b8860b', bg: '#fdfaf0' },
]
const EMOJIS = ['💪','🔥','⚡','🏋️','🎯','✅','🚀','❤️','🧘','🏆','💯','👊','😤','🌟','🙌','💥','🔑','⭐','🎉','💫','😊','🤩','🥇','🏅','🥊','🎽','🤸','🏃','🧗','🌈']

function EmojiBar({ onPick }: { onPick: (e: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 mb-2 p-2 bg-bg-alt rounded-xl border border-border/50">
      {EMOJIS.map(em => (
        <button key={em} type="button" onClick={() => onPick(em)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white text-base transition-colors">{em}</button>
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
  const [brandColor, setBrandColor] = useState(saved.brandColor || '#1a6038')
  const [brandBgColor, setBrandBgColor] = useState(saved.brandBgColor || '#f0f7f4')
  const [phone, setPhone] = useState(saved.phone || '')
  const [bio, setBio] = useState(saved.bio || '')
  const [welcomeMsg, setWelcomeMsg] = useState(saved.welcomeMsg || '')
  const [motivMsg, setMotivMsg] = useState(saved.motivMsg || '')
  const [restDayMsg, setRestDayMsg] = useState(saved.restDayMsg || '')
  const [temaId, setTemaId] = useState(saved.temaId || 'bosque')
  const [saving, setSaving] = useState(false)

  const applyTema = (tema: typeof TEMAS[0]) => { setTemaId(tema.id); setBrandColor(tema.color); setBrandBgColor(tema.bg) }

  const handleSave = async () => {
    setSaving(true)
    const profile = { displayName, brandName, brandLogo, brandBg, brandColor, brandBgColor, temaId, phone, bio, welcomeMsg, motivMsg, restDayMsg, updatedAt: Date.now() }
    localStorage.setItem(LS_KEY, JSON.stringify(profile))
    if (phone) localStorage.setItem(`pf_trainer_phone_${userProfile.uid}`, phone)
    const { error } = await supabase.from('entrenadores').update({ displayName, profile }).eq('uid', userProfile.uid)
    if (error) { toast('Error al guardar: ' + error.message, 'warn'); setSaving(false); return }
    toast('Perfil guardado ✓', 'ok')
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
      <div><h2 className="text-3xl font-serif font-bold">Personalización</h2><p className="text-muted text-sm mt-1">Todo lo que configures aparecerá en el panel de tus clientes.</p></div>
      <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: brandColor }}>
          {brandLogo ? <img src={brandLogo} className="w-9 h-9 rounded-full object-cover border-2 border-white/40 flex-shrink-0" alt="" />
            : <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{(brandName || displayName || 'T')[0]?.toUpperCase()}</div>}
          <div><p className="font-bold text-white text-sm">{brandName || displayName || 'Tu marca'}</p>{bio && <p className="text-white/60 text-[10px] truncate max-w-xs">{bio}</p>}</div>
          <span className="ml-auto text-white/40 text-[10px]">Preview</span>
        </div>
        <div className="px-4 py-4 text-sm" style={{ backgroundColor: brandBgColor }}>
          {welcomeMsg ? <p className="font-medium" style={{ color: brandColor }}>{welcomeMsg}</p> : <p className="text-muted/60 italic text-xs">Tu mensaje de bienvenida aquí</p>}
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Identidad</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Tu nombre</label><input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" /></div>
          <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Nombre de marca</label><input type="text" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Ej: AlexFit Training" className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" /></div>
        </div>
        <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">WhatsApp</label><input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+34 600 000 000" className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" /></div>
        <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Bio corta</label><textarea rows={2} value={bio} onChange={e => setBio(e.target.value)} placeholder="Entrenador personal especializado en..." className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none resize-none" /></div>
      </div>
      <div className="bg-white rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Foto de perfil</h3>
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            {brandLogo ? <><img src={brandLogo} className="w-20 h-20 rounded-full object-cover border-4 border-border shadow" alt="" /><button onClick={() => setBrandLogo('')} className="absolute -top-1 -right-1 w-6 h-6 bg-warn text-white rounded-full text-xs font-bold flex items-center justify-center shadow">×</button></>
              : <div className="w-20 h-20 rounded-full border-4 border-dashed border-border flex items-center justify-center text-3xl font-bold shadow-inner" style={{ backgroundColor: brandColor + '20', color: brandColor }}>{(brandName || displayName || 'T')[0]?.toUpperCase()}</div>}
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm text-muted hover:border-accent hover:text-accent cursor-pointer transition-colors w-fit">
              {brandLogo ? 'Cambiar foto' : 'Subir foto'}<input type="file" accept="image/*" className="hidden" onChange={uploadImage('logo', 2, setBrandLogo)} />
            </label>
            <p className="text-[10px] text-muted">JPG, PNG · Máx 2MB</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 space-y-5 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Tema de colores</h3>
        <div className="grid grid-cols-4 gap-2">
          {TEMAS.map(tema => (
            <button key={tema.id} onClick={() => applyTema(tema)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all ${temaId === tema.id ? 'border-ink shadow-md scale-95' : 'border-transparent hover:border-border'}`}
              style={{ backgroundColor: tema.bg }}>
              <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: tema.color }} />
              <span className="text-[10px] font-semibold" style={{ color: tema.color }}>{tema.nombre}</span>
              {temaId === tema.id && <span className="text-[9px] font-bold text-ink">✓</span>}
            </button>
          ))}
        </div>
        <div className="border-t border-border pt-4 grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-semibold text-muted mb-2">Color principal</label>
            <div className="flex items-center gap-3"><input type="color" value={brandColor} onChange={e => { setBrandColor(e.target.value); setTemaId('custom') }} className="w-12 h-12 rounded-xl border border-border cursor-pointer" /><div><p className="text-sm font-mono font-bold">{brandColor}</p><p className="text-[10px] text-muted">Header y botones</p></div></div></div>
          <div><label className="block text-xs font-semibold text-muted mb-2">Color de fondo</label>
            <div className="flex items-center gap-3"><input type="color" value={brandBgColor} onChange={e => { setBrandBgColor(e.target.value); setTemaId('custom') }} className="w-12 h-12 rounded-xl border border-border cursor-pointer" /><div><p className="text-sm font-mono font-bold">{brandBgColor}</p><p className="text-[10px] text-muted">Fondo del panel</p></div></div></div>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Imagen de fondo</h3>
        <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-border" style={{ height: 140 }}>
          {brandBg ? <><img src={brandBg} className="w-full h-full object-cover" alt="" /><div className="absolute inset-0 bg-ink/40 flex items-center justify-center gap-3"><label className="px-3 py-2 bg-white/95 rounded-lg text-xs font-semibold cursor-pointer hover:bg-white">Cambiar<input type="file" accept="image/*" className="hidden" onChange={uploadImage('bg', 3, setBrandBg)} /></label><button onClick={() => setBrandBg('')} className="px-3 py-2 bg-warn text-white rounded-lg text-xs font-semibold">Quitar</button></div></>
            : <label className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted cursor-pointer hover:bg-bg-alt/50 transition-colors bg-bg"><span className="text-3xl">🖼️</span><span className="text-sm font-medium">Subir imagen de fondo</span><span className="text-[10px]">Máx 3MB · JPG o PNG</span><input type="file" accept="image/*" className="hidden" onChange={uploadImage('bg', 3, setBrandBg)} /></label>}
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 space-y-5 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Mensajes al cliente</h3>
        <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Mensaje de bienvenida</label><EmojiBar onPick={e => setWelcomeMsg((m: string) => m + e)} /><textarea rows={2} value={welcomeMsg} onChange={e => setWelcomeMsg(e.target.value)} placeholder="¡Bienvenido! Aquí tienes todo para alcanzar tus objetivos 💪" className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none resize-none" /></div>
        <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Día de descanso</label><EmojiBar onPick={e => setMotivMsg((m: string) => m + e)} /><textarea rows={2} value={motivMsg} onChange={e => setMotivMsg(e.target.value)} placeholder="Hoy toca descansar. El músculo crece en la recuperación 🧘" className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none resize-none" /></div>
        <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Mensaje de racha (3+ días)</label><EmojiBar onPick={e => setRestDayMsg((m: string) => m + e)} /><input type="text" value={restDayMsg} onChange={e => setRestDayMsg(e.target.value)} placeholder="¡Increíble constancia! 🔥" className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" /></div>
      </div>
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Cuenta</h3>
        <p className="text-sm text-muted">Email: <span className="font-semibold text-ink">{userProfile.email}</span></p>
        <p className="text-sm text-muted mt-1">Plan: <span className="font-semibold text-ink capitalize">{userProfile.planName || 'Free'}</span></p>
      </div>
      <div className="flex gap-3 pb-8">
        <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}><Save className="w-4 h-4" />{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
        <Button variant="outline" className="gap-2" onClick={onLogout}><LogOut className="w-4 h-4" />Salir</Button>
      </div>
    </div>
  )
}
