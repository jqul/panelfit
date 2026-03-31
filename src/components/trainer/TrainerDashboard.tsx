import { useState, useEffect, useMemo } from 'react'
import {
  LayoutDashboard, Users, Dumbbell, ClipboardList, Settings as SettingsIcon,
  LogOut, UserPlus, Search, Trash2, TrendingUp, Calendar, ChevronRight,
  Plus, Edit2, Check, X, Save, MessageCircle, Link, Copy
} from 'lucide-react'
import { TRAINING_TYPES } from '../../lib/constants'
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

interface Props {
  userProfile: UserProfile
  onLogout: () => void
  onSelectClient: (client: ClientData) => void
}

export function TrainerDashboard({ userProfile, onLogout, onSelectClient }: Props) {
  const [clients, setClients] = useState<ClientData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', surname: '' })
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [todayActive, setTodayActive] = useState<Record<string, boolean>>({})
  const [linkModal, setLinkModal] = useState<{ client: ClientData } | null>(null)

  const fetchClients = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('trainerId', userProfile.uid)
      filter: `trainerId=eq.${userProfile.uid}`

    if (error) { console.error('Error cargando clientes:', error); setLoading(false); return }

    const mapped = mapClientes(data || [])
    setClients(mapped)

    // Ver quién entrenó hoy
    if (mapped.length) {
      const hoy = new Date().toISOString().split('T')[0]
      const ids = mapped.map(c => c.id)
      const { data: regs } = await supabase
  .from('registros').select('clientId,logs').in('clientId', ids)
const active: Record<string, boolean> = {}
;(regs || []).forEach((r: any) => {
  const logs = r.logs || {}
  const entrenóHoy = Object.values(logs).some((l: any) => l.done && l.dateDone === hoy)
  if (entrenóHoy) active[r.clientId] = true
})
      setTodayActive(active)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()
    const channel = supabase
      .channel('clientes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes',
        .filter('trainerId', 'eq', userProfile.uid)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userProfile.uid])

  const handleAdd = async () => {
    if (!newClient.name.trim()) return
    setAdding(true)
    const token = Math.random().toString(36).slice(2, 14)
    const { error } = await supabase.from('clientes').insert({
      trainerId: userProfile.uid,
      nombre: newClient.name.trim(),
      apellido: newClient.surname.trim(),
      token,
      activo: true,
    })
    if (error) toast('Error al crear cliente: ' + error.message, 'warn')
    else { toast('Cliente creado ✓', 'ok'); setShowAdd(false); setNewClient({ name: '', surname: '' }) }
    setAdding(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('clientes').delete().eq('id', id)
    setDeletingId(null)
    toast('Cliente eliminado', 'ok')
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

  const navItems = [
    { id: 'dashboard' as Tab, icon: LayoutDashboard, label: 'Resumen' },
    { id: 'clients'   as Tab, icon: Users,           label: 'Clientes', badge: clients.length },
    { id: 'exercises' as Tab, icon: Dumbbell,        label: 'Ejercicios' },
    { id: 'templates' as Tab, icon: ClipboardList,   label: 'Plantillas' },
    { id: 'settings'  as Tab, icon: SettingsIcon,    label: 'Configuración' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-card border-r border-border flex flex-col">
        <div className="px-6 py-5 border-b border-border">
          <h1 className="text-2xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></h1>
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
            <button key={id} onClick={() => setActiveTab(id)}
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
          <Button className="w-full gap-2 text-sm" onClick={() => setShowAdd(true)}>
            <UserPlus className="w-4 h-4" /> Nuevo cliente
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">

          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-3xl font-serif font-bold">Resumen</h2>
                <p className="text-muted text-sm mt-1">Bienvenido, {userProfile.displayName.split(' ')[0]}</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Clientes', value: clients.length, color: 'text-ink' },
                  { label: 'Entrenaron hoy', value: hoyCount, color: 'text-ok' },
                  { label: 'Este mes', value: chartData[chartData.length - 1]?.count || 0, color: 'text-accent' },
                  { label: 'Sin entrenar +7d', value: Math.max(0, clients.length - hoyCount), color: 'text-warn' },
                ].map(s => (
                  <div key={s.label} className="bg-card border border-border rounded-2xl p-5">
                    <p className={`text-3xl font-serif font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-serif font-bold text-lg">Crecimiento de alumnos</h3>
                    <TrendingUp className="w-4 h-4 text-muted" />
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6e5438" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6e5438" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d8d4ca" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
                        <Tooltip contentStyle={{ background: '#faf8f5', border: '1px solid #d8d4ca', borderRadius: 8, fontSize: 12 }} />
                        <Area type="monotone" dataKey="total" stroke="#6e5438" strokeWidth={2} fill="url(#grad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-serif font-bold">Altas recientes</h3>
                    <Calendar className="w-4 h-4 text-muted" />
                  </div>
                  <div className="divide-y divide-border">
                    {clients.slice(0, 5).map(c => (
                      <button key={c.id} onClick={() => onSelectClient(c)}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-bg-alt transition-colors text-left group"
                      >
                        <div className="relative w-8 h-8 rounded-full bg-bg-alt border border-border flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                          {(c.name?.[0] || '?').toUpperCase()}
                          {todayActive[c.id] && (
                            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-ok rounded-full border-2 border-card" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{c.name} {c.surname}</p>
                          <p className="text-[10px] text-muted">{new Date(c.createdAt).toLocaleDateString('es-ES')}</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                    {!clients.length && <p className="px-5 py-8 text-sm text-muted text-center">Sin clientes aún</p>}
                  </div>
                  {clients.length > 0 && (
                    <div className="px-5 py-3 bg-bg-alt/50 border-t border-border">
                      <button onClick={() => setActiveTab('clients')} className="text-[10px] uppercase tracking-widest font-bold text-accent hover:underline w-full text-center">
                        Ver todos →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CLIENTES */}
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
                          {todayActive[client.id] && (
                            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-ok rounded-full border-2 border-card" title="Entrenó hoy" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-serif font-bold text-base leading-tight truncate">{client.name} {client.surname}</h3>
                          <p className="text-[11px] mt-0.5">
                            {todayActive[client.id]
                              ? <span className="text-ok font-semibold">✓ Entrenó hoy</span>
                              : <span className="text-muted">{new Date(client.createdAt).toLocaleDateString('es-ES')}</span>}
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
          {activeTab === 'templates' && <TemplatesTab trainerId={userProfile.uid} />}

          {activeTab === 'settings' && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-serif font-bold mb-6">Configuración</h2>
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4 max-w-lg">
                <div><p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Email</p><p className="text-sm">{userProfile.email}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Nombre</p><p className="text-sm">{userProfile.displayName}</p></div>
                <hr className="border-border" />
                <Button variant="outline" className="gap-2" onClick={onLogout}><LogOut className="w-4 h-4" /> Cerrar sesión</Button>
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
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleAdd} disabled={adding}>
              {adding ? 'Creando...' : 'Crear cliente'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal enlace cliente */}
      {linkModal && (
        <Modal open={!!linkModal} onClose={() => setLinkModal(null)} title={`Acceso de ${linkModal.client.name}`}>
          <div className="space-y-4">
            <p className="text-sm text-muted">Comparte este enlace con tu cliente. No necesita contraseña ni registrarse.</p>

            {/* URL */}
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

            {/* WhatsApp */}
            <button
              onClick={() => { sendWhatsApp(linkModal.client); setLinkModal(null) }}
              className="w-full flex items-center justify-center gap-3 py-4 bg-[#25D366] text-white rounded-2xl text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <MessageCircle className="w-5 h-5" />
              Enviar por WhatsApp
            </button>

            <p className="text-[10px] text-muted text-center">
              Se abrirá WhatsApp con el mensaje y el enlace ya preparados
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}
