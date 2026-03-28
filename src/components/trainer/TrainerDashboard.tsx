import { useState, useEffect, useMemo } from 'react'
import {
  LayoutDashboard, Users, Dumbbell, ClipboardList, Settings as SettingsIcon,
  LogOut, UserPlus, Search, Trash2, ArrowRight, TrendingUp, Calendar, ChevronRight,
  Plus, Edit2, Check, X, Save
} from 'lucide-react'
import { DEFAULT_EXERCISES, TRAINING_TYPES } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import { ClientData, UserProfile } from '../../types'
import { Button } from '../shared/Button'
import { Modal } from '../shared/Modal'
import { toast } from '../shared/Toast'
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

  const fetchClients = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('entrenador_id', userProfile.uid)
      .order('created_at', { ascending: false })
    setClients((data as ClientData[]) || [])

    if (data && data.length) {
      const hoy = new Date().toISOString().split('T')[0]
      const ids = data.map((c: ClientData) => c.id)
      const { data: regs } = await supabase
        .from('registros').select('cliente_id,datos').in('cliente_id', ids)
      const active: Record<string, boolean> = {}
      ;(regs || []).forEach((r: any) => {
        const logs = r.datos?.logs || {}
        const entrenóHoy = Object.values(logs).some((l: any) => l.done && l.fechaDone === hoy)
        if (entrenóHoy) active[r.cliente_id] = true
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
        filter: `entrenador_id=eq.${userProfile.uid}` }, fetchClients)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userProfile.uid])

  const handleAdd = async () => {
    if (!newClient.name.trim()) return
    setAdding(true)
    const token = Math.random().toString(36).slice(2, 14)
    const { error } = await supabase.from('clientes').insert({
      entrenador_id: userProfile.uid,
      nombre: newClient.name.trim(),
      apellido: newClient.surname.trim(),
      token, activo: true,
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
      <aside className="w-64 flex-shrink-0 bg-card border-r border-border flex flex-col">
        <div className="px-6 py-5 border-b border-border">
          <h1 className="text-2xl font-serif font-bold">
            Panel<span className="text-accent italic">Fit</span>
          </h1>
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

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">

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
                  { label: 'Sin entrenar +7d', value: clients.length - hoyCount, color: 'text-warn' },
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
                          {c.name?.[0]?.toUpperCase()}
                          {todayActive[c.id] && (
                            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-ok rounded-full border-2 border-card pulse-dot" />
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

          {activeTab === 'clients' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-serif font-bold">Clientes</h2>
                  <p className="text-muted text-sm mt-1">Gestiona los planes de tus alumnos</p>
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
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredClients.map(client => (
                    <div key={client.id}
                      className="bg-card border border-border rounded-xl p-5 hover:border-accent hover:shadow-sm transition-all cursor-pointer group"
                      onClick={() => onSelectClient(client)}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="relative w-11 h-11 rounded-full bg-bg-alt border border-border flex items-center justify-center font-serif text-lg text-accent group-hover:bg-accent group-hover:text-white transition-colors flex-shrink-0">
                          {client.name?.[0]?.toUpperCase()}
                          {todayActive[client.id] && (
                            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-ok rounded-full border-2 border-card" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-serif font-bold text-base leading-tight truncate">{client.name} {client.surname}</h3>
                          <p className="text-[11px] text-muted mt-0.5">
                            {todayActive[client.id]
                              ? <span className="text-ok font-semibold">✓ Entrenó hoy</span>
                              : new Date(client.createdAt).toLocaleDateString('es-ES')}
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
                          <Button variant="outline" size="sm" className="flex-1" onClick={e => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(`${window.location.origin}?c=${client.token}`)
                            toast('Enlace copiado ✓', 'ok')
                          }}>🔗 Enlace</Button>
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

          {activeTab === 'exercises' && <ExercisesTab />}
          {activeTab === 'templates' && <TemplatesTab />}

          {activeTab === 'settings' && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-serif font-bold mb-6">Configuración</h2>
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4 max-w-lg">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Email</p>
                  <p className="text-sm">{userProfile.email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Nombre</p>
                  <p className="text-sm">{userProfile.displayName}</p>
                </div>
                <hr className="border-border" />
                <Button variant="outline" className="gap-2" onClick={onLogout}>
                  <LogOut className="w-4 h-4" /> Cerrar sesión
                </Button>
              </div>
            </div>
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
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleAdd} disabled={adding}>
              {adding ? 'Creando...' : 'Crear cliente'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── EJERCICIOS ────────────────────────────────────────────
function ExercisesTab() {
  const [exercises, setExercises] = useState<string[]>(DEFAULT_EXERCISES)
  const [search, setSearch] = useState('')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editVal, setEditVal] = useState('')
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')

  const filtered = exercises.map((name, idx) => ({ name, idx }))
    .filter(({ name }) => name.toLowerCase().includes(search.toLowerCase()))

  const handleAdd = () => {
    const t = newName.trim()
    if (!t) return
    if (exercises.some(e => e.toLowerCase() === t.toLowerCase())) { toast('Ese ejercicio ya existe', 'warn'); return }
    setExercises(prev => [...prev, t].sort())
    setNewName(''); setShowAdd(false)
    toast('Ejercicio añadido ✓', 'ok')
  }

  const confirmEdit = () => {
    if (editingIdx === null) return
    const t = editVal.trim(); if (!t) return
    setExercises(prev => { const u = [...prev]; u[editingIdx] = t; return u.sort() })
    setEditingIdx(null); toast('Guardado ✓', 'ok')
  }

  const handleDelete = (idx: number) => {
    setExercises(prev => prev.filter((_, i) => i !== idx))
    setDeletingIdx(null); toast('Eliminado', 'ok')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-3xl font-serif font-bold">Biblioteca de ejercicios</h2>
          <p className="text-muted text-sm mt-1">{exercises.length} ejercicios disponibles</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-ink text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Nuevo ejercicio
        </button>
      </div>
      {showAdd && (
        <div className="bg-card border-2 border-accent/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold">Nuevo ejercicio</h3>
            <button onClick={() => { setShowAdd(false); setNewName('') }} className="p-1.5 rounded-lg hover:bg-bg-alt text-muted transition-colors"><X className="w-4 h-4" /></button>
          </div>
          <input autoFocus type="text" placeholder="Ej: Press inclinado con mancuernas"
            className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setShowAdd(false); setNewName('') } }}
          />
          <div className="flex gap-3">
            <button onClick={() => { setShowAdd(false); setNewName('') }} className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-bg-alt transition-colors">Cancelar</button>
            <button onClick={handleAdd} disabled={!newName.trim()} className="flex-1 px-4 py-2.5 bg-ink text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">Añadir</button>
          </div>
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input type="text" placeholder="Buscar ejercicio..."
          className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {filtered.length === 0 && <p className="p-8 text-center text-muted text-sm">Sin resultados para "{search}"</p>}
        {filtered.map(({ name, idx }) => (
          <div key={idx} className="flex items-center gap-3 px-4 py-3 hover:bg-bg-alt/40 transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-bg flex items-center justify-center text-muted flex-shrink-0">
              <Dumbbell className="w-4 h-4" />
            </div>
            {editingIdx === idx ? (
              <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditingIdx(null) }}
                className="flex-1 bg-bg border border-accent/50 rounded-lg px-3 py-1.5 text-sm font-medium outline-none"
              />
            ) : (
              <span className="flex-1 text-sm font-medium">{name}</span>
            )}
            <div className="flex items-center gap-1 flex-shrink-0">
              {editingIdx === idx ? (
                <>
                  <button onClick={confirmEdit} className="p-1.5 rounded-lg bg-ok/10 text-ok hover:bg-ok/20 transition-colors"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setEditingIdx(null)} className="p-1.5 rounded-lg text-muted hover:bg-bg transition-colors"><X className="w-4 h-4" /></button>
                </>
              ) : deletingIdx === idx ? (
                <>
                  <button onClick={() => handleDelete(idx)} className="px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded text-[10px] font-bold uppercase">Borrar</button>
                  <button onClick={() => setDeletingIdx(null)} className="px-2 py-1 bg-bg border border-border rounded text-[10px] font-bold uppercase text-muted ml-1">No</button>
                </>
              ) : (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingIdx(idx); setEditVal(exercises[idx]) }} className="p-1.5 rounded-lg text-muted hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeletingIdx(idx)} className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── PLANTILLAS ────────────────────────────────────────────
interface Template { id: string; name: string; type: string; weeks: number; description: string }
const INITIAL_TEMPLATES: Template[] = [
  { id: '1', name: 'Hipertrofia — Principiante', type: 'hipertrofia', weeks: 4, description: 'Programa base de 4 días para alumnos con menos de 1 año de experiencia.' },
  { id: '2', name: 'Fuerza — Intermedio', type: 'fuerza', weeks: 8, description: 'Bloques de fuerza con progresión lineal. Sentadilla, banca y peso muerto.' },
  { id: '3', name: 'Pérdida de grasa — Avanzado', type: 'perdida_grasa', weeks: 12, description: 'Alta frecuencia con déficit calórico. Fuerza y metabólico.' },
]

function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>(INITIAL_TEMPLATES)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Template | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))

  const openNew = () => { setEditing({ id: '', name: '', type: 'hipertrofia', weeks: 4, description: '' }); setIsNew(true) }

  const handleSave = () => {
    if (!editing?.name.trim()) return
    if (isNew) { setTemplates(prev => [...prev, { ...editing, id: Date.now().toString() }]); toast('Plantilla creada ✓', 'ok') }
    else { setTemplates(prev => prev.map(t => t.id === editing!.id ? editing! : t)); toast('Guardado ✓', 'ok') }
    setEditing(null); setIsNew(false)
  }

  const handleDelete = (id: string) => { setTemplates(prev => prev.filter(t => t.id !== id)); setDeletingId(null); toast('Eliminada', 'ok') }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-3xl font-serif font-bold">Plantillas</h2>
          <p className="text-muted text-sm mt-1">Crea y reutiliza tus programas estándar</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-ink text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Nueva plantilla
        </button>
      </div>
      {editing && (
        <div className="bg-card border-2 border-accent/30 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-lg">{isNew ? 'Nueva plantilla' : 'Editar plantilla'}</h3>
            <button onClick={() => { setEditing(null); setIsNew(false) }} className="p-1.5 rounded-lg hover:bg-bg-alt text-muted transition-colors"><X className="w-4 h-4" /></button>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Nombre *</label>
            <input autoFocus type="text" placeholder="Ej: Fuerza Intermedio 8 semanas"
              className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : p)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Tipo</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TRAINING_TYPES.map(tt => (
                <button key={tt.value} type="button" onClick={() => setEditing(p => p ? { ...p, type: tt.value } : p)}
                  className={`px-3 py-2 rounded-lg border text-sm transition-all ${editing.type === tt.value ? 'border-ink bg-ink text-white' : 'border-border bg-bg text-muted hover:border-muted'}`}
                >{tt.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Semanas</label>
            <input type="number" min={1} max={52}
              className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20"
              value={editing.weeks} onChange={e => setEditing(p => p ? { ...p, weeks: parseInt(e.target.value) || 1 } : p)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Descripción</label>
            <textarea rows={3} placeholder="Breve descripción..."
              className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none"
              value={editing.description} onChange={e => setEditing(p => p ? { ...p, description: e.target.value } : p)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setEditing(null); setIsNew(false) }} className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-bg-alt transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={!editing.name.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-ink text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            ><Save className="w-4 h-4" />{isNew ? 'Crear' : 'Guardar'}</button>
          </div>
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input type="text" placeholder="Buscar plantilla..."
          className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(t => (
          <div key={t.id} className="p-5 bg-card border border-border rounded-2xl hover:border-accent/40 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-bg flex items-center justify-center text-muted flex-shrink-0"><ClipboardList className="w-5 h-5" /></div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing({ ...t }); setIsNew(false) }} className="p-2 rounded-lg text-muted hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                {deletingId === t.id ? (
                  <>
                    <button onClick={() => handleDelete(t.id)} className="px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded text-[10px] font-bold uppercase">Borrar</button>
                    <button onClick={() => setDeletingId(null)} className="px-2 py-1 bg-bg border border-border rounded text-[10px] font-bold uppercase text-muted ml-1">No</button>
                  </>
                ) : (
                  <button onClick={() => setDeletingId(t.id)} className="p-2 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            </div>
            <h3 className="font-serif font-bold text-base leading-tight">{t.name}</h3>
            {t.description && <p className="text-xs text-muted mt-1 leading-relaxed">{t.description}</p>}
            <div className="flex gap-2 mt-3 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted bg-bg px-2 py-1 rounded border border-border">
                {TRAINING_TYPES.find(x => x.value === t.type)?.label || t.type}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted bg-bg px-2 py-1 rounded border border-border">{t.weeks} semanas</span>
            </div>
          </div>
        ))}
        {!editing && (
          <button onClick={openNew} className="p-5 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2 text-muted hover:border-accent hover:text-accent transition-all min-h-[140px]">
            <Plus className="w-6 h-6" />
            <span className="text-sm font-medium">Nueva plantilla</span>
          </button>
        )}
      </div>
    </div>
  )
}
