import { useState, useEffect, useMemo } from 'react'
import {
  LayoutDashboard, Users, Dumbbell, ClipboardList, Settings as SettingsIcon,
  LogOut, UserPlus, Search, Trash2, TrendingUp, Calendar, ChevronRight, Save, BarChart2,
  MessageCircle, Link, Copy, Menu, X
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { mapClientes } from '../../lib/mappers'
import { RegistroRow } from '../../lib/supabase-types'
import { logError } from '../../lib/errors'
import { ClientData, UserProfile } from '../../types'
import { Button } from '../shared/Button'
import { Modal } from '../shared/Modal'
import { toast } from '../shared/Toast'
import { ExercisesTab } from './ExercisesTab'
import { AdherenciaTab } from './AdherenciaTab'
import { OBJETIVOS, Objetivo, getNudge, getConsejo } from '../../lib/nudges'
import { ESPECIALIDADES, Especialidad, PLANTILLAS_SUGERIDAS } from '../../lib/especialidades'
import { InsightsTab } from './InsightsTab'
import { MensajesTab } from './MensajesTab'
import { TemplatesTab } from './TemplatesTab'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

type Tab = 'dashboard' | 'clients' | 'exercises' | 'templates' | 'adherencia' | 'insights' | 'mensajes' | 'settings'

interface Props {
  userProfile: UserProfile
  onLogout: () => void
  onSelectClient: (client: ClientData) => void
  demoClients?: ClientData[]
}

export function TrainerDashboard({ userProfile, onLogout, onSelectClient, demoClients }: Props) {
  const [clients, setClients] = useState<ClientData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', surname: '', objetivo: 'general' as Objetivo })
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [todayActive, setTodayActive] = useState<Record<string, boolean>>({})
  const [linkModal, setLinkModal] = useState<{ client: ClientData } | null>(null)
  const [logsMap, setLogsMap] = useState<Record<string, any>>({})


  // Semáforo de riesgo por cliente
  const getRiesgo = (clientId: string): 'verde' | 'amarillo' | 'rojo' | 'nuevo' => {
    const client = clients.find(c => c.id === clientId)
    if (client && Date.now() - client.createdAt < 3 * 86400000) return 'nuevo'
    const reg = (logsMap[clientId] || {}) as Record<string, { done?: boolean; dateDone?: string }>
    const dates = new Set(Object.values(reg).filter(l => l.done && l.dateDone).map(l => l.dateDone!))
    const hoy = new Date()
    const diasUltimos7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoy); d.setDate(d.getDate() - i)
      return d.toISOString().split('T')[0]
    }).filter(d => dates.has(d)).length
    if (diasUltimos7 >= 3) return 'verde'
    if (diasUltimos7 >= 1) return 'amarillo'
    return 'rojo'
  }

  const trainerProfile = (() => {
    try { return JSON.parse(localStorage.getItem(`pf_trainer_profile_${userProfile.uid}`) || '{}') } catch { return {} }
  })()
  const trainerEspecialidades: string[] = trainerProfile.especialidades || []
  const templates: any[] = (() => {
    try { return JSON.parse(localStorage.getItem(`pf_templates_${userProfile.uid}`) || '[]') } catch { return [] }
  })()

  const fetchClients = async () => {
    setLoading(true)
    if (demoClients) { setClients(demoClients); setLoading(false); return }
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .filter('trainerId', 'eq', userProfile.uid)

    if (error) { console.error('Error cargando clientes:', error); setLoading(false); return }

    const mapped = mapClientes(data || [])
    setClients(mapped)

    if (mapped.length) {
      const hoy = new Date().toISOString().split('T')[0]
      const ids = mapped.map(c => c.id)
      const { data: regs } = await supabase
        .from('registros').select('clientId,logs').in('clientId', ids)
      const active: Record<string, boolean> = {}
      ;(regs as RegistroRow[] || []).forEach((r) => {
        const logs = r.logs || {}
        const entrenóHoy = Object.values(logs).some(l => l.done && l.dateDone === hoy)
        if (entrenóHoy) active[r.clientId] = true
      })
      setTodayActive(active)
      const map: Record<string, any> = {}
      ;(regs as any[] || []).forEach((r: any) => { map[r.clientId] = r.logs || {} })
      setLogsMap(map)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()
    // Polling cada 30 segundos en vez de realtime (más fiable en móvil)
    const interval = setInterval(fetchClients, 30000)
    return () => clearInterval(interval)
  }, [userProfile.uid])

  const handleAdd = async () => {
    if (!newClient.name.trim()) return
    setAdding(true)
    const token = crypto.randomUUID().replace(/-/g, '')
    const { error } = await supabase.from('clientes').insert({
      trainerId: userProfile.uid,
      name: newClient.name.trim(),
      surname: newClient.surname.trim(),
      objetivo: newClient.objetivo,
      token,
      createdAt: Date.now(),
    })
    if (error) toast('Error al crear cliente: ' + error.message, 'warn')
    else {
      toast('Cliente creado ✓', 'ok')
      setShowAdd(false)
      setNewClient({ name: '', surname: '', objetivo: 'general' })
      // Refrescar lista inmediatamente sin esperar realtime
      await fetchClients()
    }
    setAdding(false)
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) { logError('handleDelete', error); toast('Error al eliminar', 'warn'); return }
    setDeletingId(null)
    toast('Cliente eliminado', 'ok')
    await fetchClients()
  }

  const getClientUrl = (client: ClientData) => `${window.location.origin}?c=${client.token}`

  const copyLink = (client: ClientData) => {
    navigator.clipboard.writeText(getClientUrl(client))
    toast('Enlace copiado ✓', 'ok')
  }

  const sendWhatsApp = (client: ClientData) => {
    const url = getClientUrl(client)
    const msg = encodeURIComponent(
      `Hola ${client.name} 👋\n\nTe comparto el enlace a tu panel de entrenamiento personalizado:\n\n${url}\n\n¡Ahí tienes tu rutina, progreso y todo lo que necesitas! 💪`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  const filteredClients = clients.filter(c =>
    `${c.name} ${c.surname}`.toLowerCase().includes(search.toLowerCase())
  )

  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i))
      return { month: d.toLocaleString('es-ES', { month: 'short' }), count: 0 }
    })
    clients.forEach(c => {
      const m = new Date(c.createdAt).toLocaleString('es-ES', { month: 'short' })
      const found = months.find(x => x.month === m)
      if (found) found.count++
    })
    let total = 0
    return months.map(m => { total += m.count; return { ...m, total } })
  }, [clients])

  const hoyCount = Object.values(todayActive).filter(Boolean).length

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = [
    { id: 'dashboard' as Tab, icon: LayoutDashboard, label: 'Resumen' },
    { id: 'clients'   as Tab, icon: Users,           label: 'Clientes', badge: clients.length },
    { id: 'exercises' as Tab, icon: Dumbbell,        label: 'Ejercicios' },
    { id: 'templates' as Tab, icon: ClipboardList,   label: 'Plantillas' },
    { id: 'adherencia' as Tab, icon: TrendingUp,     label: 'Adherencia' },
    { id: 'insights'  as Tab, icon: BarChart2,       label: 'Insights' },
    { id: 'mensajes'  as Tab, icon: MessageCircle,    label: 'Mensajes' },
    { id: 'settings'  as Tab, icon: SettingsIcon,    label: 'Configuración' },
  ]

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">

      {/* Overlay móvil */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-ink/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — fijo en PC, drawer en móvil */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-40
        w-64 flex-shrink-0 bg-card border-r border-border flex flex-col
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <h1 className="text-2xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-muted hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-bg-alt border border-border flex items-center justify-center font-serif text-accent text-sm font-bold">
              {userProfile.displayName?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{userProfile.displayName}</p>
              <p className="text-[11px] text-muted truncate">{userProfile.email}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ id, icon: Icon, label, badge }) => (
            <button key={id} onClick={() => handleTabChange(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === id ? 'bg-ink text-white' : 'text-muted hover:bg-bg-alt hover:text-ink'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {badge !== undefined && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === id ? 'bg-white/20 text-white' : 'bg-bg-alt text-muted'
                }`}>{badge}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          <Button variant="outline" className="w-full justify-start gap-2 text-sm" onClick={onLogout}>
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </Button>
          <Button className="w-full gap-2 text-sm" onClick={() => { setShowAdd(true); setSidebarOpen(false) }}>
            <UserPlus className="w-4 h-4" /> Nuevo cliente
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Header móvil */}
        <div className="lg:hidden sticky top-0 z-20 bg-card border-b border-border flex items-center justify-between px-4 h-14">
          <button onClick={() => setSidebarOpen(true)} aria-label="Abrir menú"
            className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-serif font-bold">Panel<span className="text-accent italic">Fit</span></h1>
          <button onClick={() => setShowAdd(true)}
            className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors">
            <UserPlus className="w-5 h-5" />
          </button>
        </div>

        <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 lg:py-8">

          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              {/* Saludo + fecha */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-serif font-bold">
                    {new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 20 ? 'Buenas tardes' : 'Buenas noches'}, {userProfile.displayName.split(' ')[0]}
                  </h2>
                  <p className="text-muted text-sm mt-1 capitalize">
                    {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-serif font-bold text-ok">{hoyCount}</p>
                  <p className="text-[10px] text-muted uppercase tracking-widest">entrenaron hoy</p>
                </div>
              </div>

              {/* Acciones prioritarias del día */}
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted">Acciones de hoy</p>

                {/* Clientes que entrenaron hoy — celebrar */}
                {hoyCount > 0 && (
                  <div className="bg-ok/5 border border-ok/20 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-ok/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">🎉</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{hoyCount} cliente{hoyCount > 1 ? 's' : ''} {hoyCount > 1 ? 'han' : 'ha'} entrenado hoy</p>
                      <p className="text-xs text-muted">{clients.length ? `${Math.round(hoyCount/clients.length*100)}% adherencia diaria` : ''}</p>
                    </div>
                    <button onClick={() => setActiveTab('clients')}
                      className="text-xs text-ok font-semibold hover:underline flex-shrink-0">
                      Ver →
                    </button>
                  </div>
                )}

                {/* Clientes inactivos — actuar */}
                {clients.filter(c => !todayActive[c.id]).length > 0 && (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-warn text-sm">⚠️</span>
                        <p className="text-sm font-semibold">{clients.filter(c => !todayActive[c.id]).length} sin entrenar hoy — contactar</p>
                      </div>
                    </div>
                    <div className="divide-y divide-border">
                      {clients.filter(c => !todayActive[c.id]).slice(0, 3).map(c => {
                        const riesgo = getRiesgo(c.id)
                        return (
                          <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="relative flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-bg-alt border border-border flex items-center justify-center text-xs font-bold text-muted">
                                {(c.name?.[0] || '?').toUpperCase()}
                              </div>
                              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                                riesgo === 'rojo' ? 'bg-warn' : riesgo === 'amarillo' ? 'bg-accent' : 'bg-ok'
                              }`} />
                            </div>
                            <p className="text-sm flex-1 truncate font-medium">{c.name} {c.surname}</p>
                            <div className="flex gap-2 flex-shrink-0">
                              <button onClick={() => onSelectClient(c)}
                                className="text-xs text-muted border border-border px-2 py-1 rounded-lg hover:border-accent hover:text-accent transition-all">
                                Plan
                              </button>
                              <button onClick={() => {
                                const url = `${window.location.origin}?c=${c.token}`
                                const msg = encodeURIComponent(`Hola ${c.name} 👋 ¿Todo bien? ¡Te echamos de menos! Tu plan sigue aquí:\n\n${url}`)
                                window.open(`https://wa.me/?text=${msg}`, '_blank')
                              }} className="text-xs text-[#25D366] border border-[#25D366]/30 px-2 py-1 rounded-lg hover:bg-[#25D366]/10 transition-all">
                                WA
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {clients.filter(c => !todayActive[c.id]).length > 3 && (
                      <div className="px-4 py-2.5 border-t border-border">
                        <button onClick={() => setActiveTab('adherencia')} className="text-xs text-accent font-semibold hover:underline">
                          Ver todos en Adherencia →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Sin clientes */}
                {!clients.length && (
                  <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center">
                    <Users className="w-10 h-10 text-muted/30 mx-auto mb-3" />
                    <p className="font-serif font-bold">Empieza añadiendo tu primer cliente</p>
                    <p className="text-xs text-muted mt-1 mb-4">Crea su perfil y comparte el enlace de acceso</p>
                    <Button className="gap-2 mx-auto" onClick={() => setShowAdd(true)}>
                      <UserPlus className="w-4 h-4" /> Añadir primer cliente
                    </Button>
                  </div>
                )}
              </div>

              {/* Stats rápidos */}
              {clients.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Clientes', value: clients.length, color: 'text-ink', action: () => setActiveTab('clients') },
                    { label: 'Adherencia', value: clients.length ? `${Math.round(hoyCount/clients.length*100)}%` : '—', color: 'text-ok', action: () => setActiveTab('adherencia') },
                    { label: 'Nuevos mes', value: chartData[chartData.length - 1]?.count || 0, color: 'text-accent', action: () => setActiveTab('clients') },
                  ].map(s => (
                    <button key={s.label} onClick={s.action}
                      className="bg-card border border-border rounded-2xl p-4 text-center hover:border-accent transition-colors">
                      <p className={`text-2xl font-serif font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-muted uppercase tracking-wider mt-1">{s.label}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Próximas acciones automáticas */}
              {clients.length > 0 && (() => {
                const acciones: { cliente: string; accion: string; dias: number; tipo: string }[] = []
                clients.forEach(c => {
                  // Ignorar clientes creados hace menos de 3 días
                  if (Date.now() - c.createdAt < 3 * 86400000) return
                  const logs = logsMap[c.id] || {}
                  const fechas = Object.values(logs as Record<string, any>)
                    .filter(l => l.done && l.dateDone).map(l => l.dateDone as string)
                    .filter((v, i, a) => a.indexOf(v) === i).sort()
                  const ultimoEntreno = fechas[fechas.length - 1]
                  const diasSin = ultimoEntreno
                    ? Math.floor((new Date().getTime() - new Date(ultimoEntreno + 'T00:00:00').getTime()) / 86400000)
                    : Math.floor((new Date().getTime() - c.createdAt) / 86400000)
                  if (diasSin >= 3) {
                    acciones.push({ cliente: `${c.name} ${c.surname}`, accion: `${diasSin} día${diasSin !== 1 ? 's' : ''} sin entrenar`, dias: diasSin, tipo: 'inactividad' })
                  }
                })
                if (!acciones.length) return null
                return (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                      <h3 className="font-semibold text-sm">⚡ Acciones pendientes</h3>
                      <span className="text-xs bg-warn/10 text-warn font-bold px-2 py-0.5 rounded-full">{acciones.length}</span>
                    </div>
                    <div className="divide-y divide-border">
                      {acciones.slice(0, 3).map((a, i) => (
                        <div key={i} className="flex items-center gap-3 px-5 py-3">
                          <span className="text-base flex-shrink-0">{a.tipo === 'inactividad' ? '⚠️' : '📋'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{a.cliente}</p>
                            <p className="text-xs text-muted">{a.accion}</p>
                          </div>
                          <button onClick={() => {
                            const c = clients.find(cl => `${cl.name} ${cl.surname}` === a.cliente)
                            if (!c) return
                            const url = `${window.location.origin}?c=${c.token}`
                            const msg = encodeURIComponent(`Hola ${c.name} 👋 Te echamos de menos. ¡Tu plan sigue aquí!

${url}`)
                            window.open(`https://wa.me/?text=${msg}`, '_blank')
                          }} className="text-xs text-[#25D366] font-semibold hover:underline flex-shrink-0">
                            WA
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Sugerencias por especialidad */}
              {trainerEspecialidades.length > 0 && templates.length === 0 && (
                <div className="bg-accent/5 border border-accent/20 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">{ESPECIALIDADES.find(e => e.value === trainerEspecialidades[0])?.emoji}</span>
                    <p className="text-sm font-semibold">Plantillas sugeridas para {ESPECIALIDADES.find(e => e.value === trainerEspecialidades[0])?.label}</p>
                  </div>
                  <div className="space-y-2">
                    {PLANTILLAS_SUGERIDAS[trainerEspecialidades[0] as Especialidad]?.slice(0, 2).map((p, i) => (
                      <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{p.nombre}</p>
                          <p className="text-xs text-muted">{p.desc} · {p.semanas} semanas</p>
                        </div>
                        <button onClick={() => setActiveTab('templates')}
                          className="text-xs text-accent font-semibold hover:underline flex-shrink-0">
                          Crear →
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setActiveTab('templates')}
                    className="mt-3 text-xs text-accent font-semibold hover:underline">
                    Ver todas las sugerencias →
                  </button>
                </div>
              )}

              {/* Últimas altas */}
              {clients.length > 0 && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Últimas altas</h3>
                    <button onClick={() => setActiveTab('clients')} className="text-xs text-accent font-semibold hover:underline">
                      Ver todos →
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                    {clients.slice(0, 4).map(c => (
                      <button key={c.id} onClick={() => onSelectClient(c)}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-bg-alt transition-colors text-left group">
                        <div className="relative w-8 h-8 rounded-full bg-bg-alt border border-border flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                          {(c.name?.[0] || '?').toUpperCase()}
                          {todayActive[c.id] && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-ok rounded-full border-2 border-card" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{c.name} {c.surname}</p>
                          <p className="text-[10px] text-muted">{new Date(c.createdAt).toLocaleDateString('es-ES')}</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-serif font-bold">Clientes</h2>
                  <p className="text-muted text-sm mt-1">{clients.length} alumnos registrados</p>
                </div>
                <Button className="gap-2" onClick={() => setShowAdd(true)}>
                  <UserPlus className="w-4 h-4" /> Nuevo cliente
                </Button>
              </div>
              <div className="relative mb-5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input type="text" placeholder="Buscar cliente..." value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full max-w-sm pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                />
              </div>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1,2,3].map(i => <div key={i} className="h-36 bg-card border border-border rounded-xl animate-pulse" />)}
                </div>
              ) : filteredClients.length === 0 && !search ? (
                <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl">
                  <Users className="w-12 h-12 text-muted/30 mx-auto mb-4" />
                  <h3 className="font-serif font-bold text-lg">Sin clientes aún</h3>
                  <p className="text-muted text-sm mt-1">Añade tu primer alumno para empezar</p>
                  <Button className="mt-6 gap-2" onClick={() => setShowAdd(true)}>
                    <UserPlus className="w-4 h-4" /> Añadir primer cliente
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredClients.map(client => (
                    <div key={client.id}
                      className="bg-card border border-border rounded-xl p-5 hover:border-accent hover:shadow-sm transition-all cursor-pointer group"
                      onClick={() => onSelectClient(client)}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="relative w-11 h-11 rounded-full bg-bg-alt border border-border flex items-center justify-center font-serif text-lg text-accent group-hover:bg-accent group-hover:text-white transition-colors flex-shrink-0">
                          {(client.name?.[0] || '?').toUpperCase()}
                          {(() => {
                            const r = getRiesgo(client.id)
                            return <span className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${
                              todayActive[client.id] ? 'bg-ok' : r === 'rojo' ? 'bg-warn' : r === 'amarillo' ? 'bg-accent' : 'bg-bg-alt'
                            }`} title={todayActive[client.id] ? 'Entrenó hoy' : r === 'rojo' ? 'Riesgo de abandono' : r === 'amarillo' ? 'Actividad baja' : 'Sin datos'} />
                          })()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-serif font-bold text-base leading-tight truncate">{client.name} {client.surname}</h3>
                          <p className="text-[11px] mt-0.5">
                            {(() => {
                                const r = getRiesgo(client.id)
                                return todayActive[client.id]
                                  ? <span className="text-ok font-semibold">✓ Entrenó hoy</span>
                                  : <span className={r === 'rojo' ? 'text-warn font-semibold' : r === 'amarillo' ? 'text-accent' : 'text-muted'}>
                                      {r === 'rojo' ? '⚠ Riesgo de abandono' : r === 'amarillo' ? '~ Actividad baja' : new Date(client.createdAt).toLocaleDateString('es-ES')}
                                    </span>
                              })()}
                          </p>
                        </div>
                      </div>
                      {deletingId === client.id ? (
                        <div className="flex gap-2">
                          <Button variant="danger" size="sm" className="flex-1" onClick={e => { e.stopPropagation(); handleDelete(client.id) }}>Eliminar</Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={e => { e.stopPropagation(); setDeletingId(null) }}>Cancelar</Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={e => { e.stopPropagation(); onSelectClient(client) }}>✏️ Plan</Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={e => { e.stopPropagation(); setLinkModal({ client }) }}>
                            <Link className="w-3.5 h-3.5 mr-1" /> Enlace
                          </Button>
                          <Button variant="outline" size="sm" className="px-2" onClick={e => { e.stopPropagation(); setDeletingId(client.id) }}>
                            <Trash2 className="w-3.5 h-3.5 text-warn" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setShowAdd(true)}
                    className="border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-muted hover:border-accent hover:text-accent transition-all min-h-[140px]"
                  >
                    <UserPlus className="w-6 h-6" />
                    <span className="text-sm font-medium">Añadir cliente</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'exercises' && <ExercisesTab trainerId={userProfile.uid} />}
          {activeTab === 'adherencia' && <AdherenciaTab clients={clients} logsMap={logsMap} />}
          {activeTab === 'insights' && <InsightsTab clients={clients} logsMap={logsMap} especialidades={trainerEspecialidades as Especialidad[]} />}
          {activeTab === 'mensajes' && <MensajesTab userProfile={userProfile} clients={clients} />}
          {activeTab === 'templates' && <TemplatesTab trainerId={userProfile.uid} clients={clients} />}

          {activeTab === 'settings' && (
            <SettingsTab userProfile={userProfile} onLogout={onLogout} />
          )}
        </div>
      </main>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nuevo cliente">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Nombre *</label>
            <input type="text" autoFocus value={newClient.name}
              onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Nombre"
              className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Apellido</label>
            <input type="text" value={newClient.surname}
              onChange={e => setNewClient(p => ({ ...p, surname: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Apellido"
              className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Objetivo</label>
            <div className="flex flex-wrap gap-2">
              {OBJETIVOS.map(o => (
                <button key={o.value} onClick={() => setNewClient(p => ({ ...p, objetivo: o.value }))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all ${
                    newClient.objetivo === o.value ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'
                  }`}>
                  {o.emoji} {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleAdd} disabled={adding}>
              {adding ? 'Creando...' : 'Crear cliente'}
            </Button>
          </div>
        </div>
      </Modal>

      {linkModal && (
        <Modal open={!!linkModal} onClose={() => setLinkModal(null)} title={`Acceso de ${linkModal.client.name}`}>
          <div className="space-y-4">
            <p className="text-sm text-muted">Comparte este enlace con tu cliente. No necesita contraseña ni registrarse.</p>
            <div className="flex gap-2">
              <input readOnly value={getClientUrl(linkModal.client)}
                className="flex-1 px-3 py-2.5 bg-bg border border-border rounded-xl text-xs text-muted outline-none font-mono"
              />
              <button onClick={() => copyLink(linkModal.client)}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-ink text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity flex-shrink-0"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar
              </button>
            </div>
            <button
              onClick={() => { sendWhatsApp(linkModal.client); setLinkModal(null) }}
              className="w-full flex items-center justify-center gap-3 py-4 bg-[#25D366] text-white rounded-2xl text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <MessageCircle className="w-5 h-5" /> Enviar por WhatsApp
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Configuración del entrenador ──────────────────────────
function SettingsTab({ userProfile, onLogout }: { userProfile: UserProfile; onLogout: () => void }) {
  const LS_KEY = `pf_trainer_profile_${userProfile.uid}`
  const saved = (() => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} } })()

  const [displayName, setDisplayName] = useState(saved.displayName || userProfile.displayName)
  const [brandName, setBrandName] = useState(saved.brandName || '')
  const [brandLogo, setBrandLogo] = useState(saved.brandLogo || '')
  const [brandColor, setBrandColor] = useState(saved.brandColor || '#6e5438')
  const [phone, setPhone] = useState(saved.phone || '')
  const [bio, setBio] = useState(saved.bio || '')
  const [welcomeMsg, setWelcomeMsg] = useState(saved.welcomeMsg || '')
  const [motivMsg, setMotivMsg] = useState(saved.motivMsg || '')
  const [especialidades, setEspecialidades] = useState<Especialidad[]>(saved.especialidades || [])
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const profile = { displayName, brandName, brandLogo, brandColor, phone, bio, welcomeMsg, motivMsg, especialidades }
    localStorage.setItem(LS_KEY, JSON.stringify(profile))
    if (phone) localStorage.setItem(`pf_trainer_phone_${userProfile.uid}`, phone)
    await supabase.from('entrenadores').update({ displayName, especialidades }).eq('uid', userProfile.uid)
    toast('Perfil guardado ✓', 'ok')
    setSaving(false)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast('Máximo 2MB', 'warn'); return }
    const reader = new FileReader()
    reader.onload = () => setBrandLogo(reader.result as string)
    reader.readAsDataURL(file)
  }

  const nombre = brandName || displayName || 'Tu marca'

  return (
    <div className="animate-fade-in space-y-6 max-w-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-serif font-bold">Configuración</h2>
        <button onClick={() => setPreview(v => !v)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${preview ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent hover:text-accent'}`}>
          {preview ? '← Editar' : '👁 Preview cliente'}
        </button>
      </div>

      {/* Preview del panel del cliente */}
      {preview && (
        <div className="bg-bg border-2 border-dashed border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-border" style={{ backgroundColor: 'var(--color-card)' }}>
            <div className="flex items-center gap-2.5">
              {brandLogo
                ? <img src={brandLogo} className="w-8 h-8 rounded-full object-cover border border-border" alt="Logo" />
                : <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: brandColor }}>{nombre[0]}</div>
              }
              <span className="font-serif font-bold text-base">{nombre}</span>
            </div>
            <p className="text-xs text-muted">Tu cliente</p>
          </div>
          {welcomeMsg && (
            <div className="mx-4 my-3 flex gap-2 rounded-xl p-3" style={{ backgroundColor: `${brandColor}15`, border: `1px solid ${brandColor}30` }}>
              <span className="text-base flex-shrink-0">💬</span>
              <p className="text-sm italic" style={{ color: brandColor }}>"{welcomeMsg}"</p>
            </div>
          )}
          <div className="px-4 pb-3 text-xs text-muted text-center">Así verá tu cliente el panel</div>
        </div>
      )}

      {/* Perfil personal */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Perfil personal</h3>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Tu nombre</label>
          <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Teléfono / WhatsApp</label>
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="+34 600 000 000"
            className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Bio / Especialidad</label>
          <textarea rows={2} value={bio} onChange={e => setBio(e.target.value)}
            placeholder="Entrenador personal especializado en fuerza e hipertrofia..."
            className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Email</label>
          <p className="text-sm text-muted px-1">{userProfile.email}</p>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">Especialidades</label>
          <div className="flex flex-wrap gap-2">
            {ESPECIALIDADES.map(e => {
              const active = especialidades.includes(e.value)
              return (
                <button key={e.value} type="button"
                  onClick={() => setEspecialidades(prev =>
                    active ? prev.filter(x => x !== e.value) : [...prev, e.value]
                  )}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all ${
                    active ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'
                  }`}>
                  {e.emoji} {e.label}
                </button>
              )
            })}
          </div>
          {especialidades.length > 0 && (
            <p className="text-xs text-muted mt-2">
              {especialidades.map(e => ESPECIALIDADES.find(x => x.value === e)?.desc).join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* Marca / White-label */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Tu marca</h3>
          <p className="text-xs text-muted mt-1">El cliente verá tu marca en vez de "PanelFit".</p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Nombre de marca</label>
          <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)}
            placeholder="Ej: Carlos Training · FitPro · Tu nombre"
            className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">Logo</label>
          <div className="flex items-center gap-4">
            {brandLogo ? (
              <div className="relative">
                <img src={brandLogo} className="w-16 h-16 rounded-full object-cover border-2 border-border" alt="Logo" />
                <button onClick={() => setBrandLogo('')}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-warn text-white rounded-full flex items-center justify-center text-xs font-bold">×</button>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-bg-alt border-2 border-dashed border-border flex items-center justify-center text-muted text-xs text-center leading-tight p-1">
                Tu logo
              </div>
            )}
            <label className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm text-muted hover:border-accent hover:text-accent transition-all cursor-pointer">
              Subir imagen
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
          </div>
          <p className="text-[10px] text-muted mt-1">PNG, JPG · Máx 2MB · Cuadrado recomendado</p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">Color de marca</label>
          <div className="flex items-center gap-3">
            <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)}
              className="w-10 h-10 rounded-xl border border-border cursor-pointer bg-bg"
            />
            <span className="text-sm text-muted font-mono">{brandColor}</span>
            <div className="flex gap-2 ml-2">
              {['#6e5438', '#1a1a2e', '#0f4c75', '#1b4332', '#7b2d8b', '#c0392b'].map(c => (
                <button key={c} onClick={() => setBrandColor(c)}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{ backgroundColor: c, borderColor: brandColor === c ? 'var(--color-ink)' : 'transparent' }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mensajes personalizados */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Mensajes y tono</h3>
          <p className="text-xs text-muted mt-1">Personaliza lo que ven tus clientes.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
            Mensaje de bienvenida / motivación
          </label>
          <textarea rows={2} value={welcomeMsg} onChange={e => setWelcomeMsg(e.target.value)}
            placeholder="Ej: Cada entreno te acerca a tu mejor versión. ¡Vamos! 💪"
            className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none"
          />
          <p className="text-[10px] text-muted mt-1">Se muestra en la pantalla principal del cliente.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
            Mensaje de descanso (días sin plan)
          </label>
          <textarea rows={2} value={motivMsg} onChange={e => setMotivMsg(e.target.value)}
            placeholder="Ej: Hoy es día de descanso. Recupera bien para rendir al máximo. 🧘"
            className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none"
          />
          <p className="text-[10px] text-muted mt-1">Se muestra cuando no hay sesión programada.</p>
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-3">
        <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
        <Button variant="outline" className="gap-2" onClick={onLogout}>
          <LogOut className="w-4 h-4" /> Salir
        </Button>
      </div>
    </div>
  )
}
