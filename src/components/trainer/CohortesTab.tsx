import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from '../shared/Toast'
import { ClientData } from '../../types'
import {
  Plus, Users, X, Check, ChevronRight, Edit2, Trash2,
  UserPlus, UserMinus
} from 'lucide-react'

interface Props {
  trainerId: string
  clients: ClientData[]
  logsMap?: Record<string, any>
  onSelectClient?: (client: ClientData) => void
}

interface Cohorte {
  id: string
  trainer_id: string
  nombre: string
  descripcion?: string
  color: string
  fecha_inicio?: string
  fecha_fin?: string
  activa: boolean
  created_at: number
}

interface CohorteCliente {
  id: string
  cohorte_id: string
  client_id: string
  joined_at: number
}

const COLORS = ['#6e5438', '#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899']

function emptyCohorte(trainerId: string): Omit<Cohorte, 'id' | 'created_at'> {
  return { trainer_id: trainerId, nombre: '', descripcion: '', color: COLORS[0], activa: true }
}

export function CohortesTab({ trainerId, clients, logsMap = {}, onSelectClient }: Props) {
  const [cohortes, setCohortes] = useState<Cohorte[]>([])
  const [memberships, setMemberships] = useState<CohorteCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<Cohorte | null>(null)
  const [selectedCohorte, setSelectedCohorte] = useState<Cohorte | null>(null)
  const [showAddClients, setShowAddClients] = useState(false)
  const [form, setForm] = useState(emptyCohorte(trainerId))

  useEffect(() => { loadAll() }, [trainerId])

  const loadAll = async () => {
    setLoading(true)
    const [cohRes, memRes] = await Promise.all([
      supabase.from('cohortes').select('*').eq('trainer_id', trainerId).order('created_at', { ascending: false }),
      supabase.from('cohorte_clientes').select('*'),
    ])
    if (cohRes.data) setCohortes(cohRes.data as Cohorte[])
    if (memRes.data) setMemberships(memRes.data as CohorteCliente[])
    setLoading(false)
  }

  const getMembersOf = (cohorteId: string): ClientData[] => {
    const clientIds = memberships.filter(m => m.cohorte_id === cohorteId).map(m => m.client_id)
    return clients.filter(c => clientIds.includes(c.id))
  }

  const createCohorte = async () => {
    if (!form.nombre.trim()) return
    const row: Cohorte = { ...form, id: `coh_${Date.now()}`, created_at: Date.now(), nombre: form.nombre.trim() }
    const { error } = await supabase.from('cohortes').insert(row)
    if (error) { toast('Error al crear grupo', 'warn'); return }
    setCohortes(c => [row, ...c])
    setForm(emptyCohorte(trainerId))
    setShowNew(false)
    toast('Grupo creado ✓', 'ok')
  }

  const updateCohorte = async () => {
    if (!editing) return
    const { error } = await supabase.from('cohortes')
      .update({ nombre: editing.nombre, descripcion: editing.descripcion, color: editing.color, fecha_inicio: editing.fecha_inicio, fecha_fin: editing.fecha_fin })
      .eq('id', editing.id)
    if (error) { toast('Error al guardar', 'warn'); return }
    setCohortes(c => c.map(x => x.id === editing.id ? editing : x))
    setEditing(null)
    toast('Guardado ✓', 'ok')
  }

  const deleteCohorte = async (id: string) => {
    await supabase.from('cohortes').delete().eq('id', id)
    setCohortes(c => c.filter(x => x.id !== id))
    setMemberships(m => m.filter(x => x.cohorte_id !== id))
    if (selectedCohorte?.id === id) setSelectedCohorte(null)
    toast('Grupo eliminado', 'ok')
  }

  const toggleActiva = async (cohorte: Cohorte) => {
    const updated = { ...cohorte, activa: !cohorte.activa }
    await supabase.from('cohortes').update({ activa: updated.activa }).eq('id', cohorte.id)
    setCohortes(c => c.map(x => x.id === cohorte.id ? updated : x))
  }

  const addClientToCohorte = async (cohorteId: string, clientId: string) => {
    const row: CohorteCliente = { id: `cc_${Date.now()}_${clientId.slice(0, 6)}`, cohorte_id: cohorteId, client_id: clientId, joined_at: Date.now() }
    const { error } = await supabase.from('cohorte_clientes').insert(row)
    if (error) { toast('Ya está en este grupo o hubo un error', 'warn'); return }
    setMemberships(m => [...m, row])
  }

  const removeClientFromCohorte = async (cohorteId: string, clientId: string) => {
    await supabase.from('cohorte_clientes').delete().eq('cohorte_id', cohorteId).eq('client_id', clientId)
    setMemberships(m => m.filter(x => !(x.cohorte_id === cohorteId && x.client_id === clientId)))
  }

  // Stats agregadas del grupo: adherencia media basada en sesiones completadas últimos 7 días
  const getCohorteStats = (cohorteId: string) => {
    const members = getMembersOf(cohorteId)
    if (!members.length) return { totalClientes: 0, sesionesUltimaSemana: 0, promedioSesiones: 0 }
    const hace7 = Date.now() - 7 * 86400000
    let totalSesiones = 0
    members.forEach(c => {
      const logs = logsMap[c.id] || {}
      const sesiones = new Set(
        Object.values(logs).filter((l: any) => l.done && l.dateDone && new Date(l.dateDone + 'T00:00:00').getTime() >= hace7).map((l: any) => l.dateDone)
      )
      totalSesiones += sesiones.size
    })
    return {
      totalClientes: members.length,
      sesionesUltimaSemana: totalSesiones,
      promedioSesiones: Math.round((totalSesiones / members.length) * 10) / 10,
    }
  }

  if (loading) return (
    <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-card border border-border rounded-2xl animate-pulse" />)}</div>
  )

  // ── Vista detalle de un grupo ──
  if (selectedCohorte) {
    const members = getMembersOf(selectedCohorte.id)
    const stats = getCohorteStats(selectedCohorte.id)
    const nonMembers = clients.filter(c => !members.some(m => m.id === c.id))

    return (
      <div className="max-w-2xl space-y-5 animate-fade-in">
        <button onClick={() => setSelectedCohorte(null)} className="flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ChevronRight className="w-4 h-4 rotate-180" /> Volver a grupos
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: selectedCohorte.color + '20' }}>
            <Users className="w-6 h-6" style={{ color: selectedCohorte.color }} />
          </div>
          <div className="flex-1">
            <h3 className="font-serif font-bold text-xl">{selectedCohorte.nombre}</h3>
            {selectedCohorte.descripcion && <p className="text-sm text-muted">{selectedCohorte.descripcion}</p>}
          </div>
          <button onClick={() => toggleActiva(selectedCohorte)}
            title={selectedCohorte.activa ? 'Desactivar grupo' : 'Activar grupo'}
            className={`p-2 rounded-xl hover:bg-bg-alt ${selectedCohorte.activa ? 'text-ok' : 'text-muted'}`}>
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => setEditing(selectedCohorte)} className="p-2 rounded-xl hover:bg-bg-alt text-muted"><Edit2 className="w-4 h-4" /></button>
          <button onClick={() => { if (confirm(`¿Eliminar el grupo "${selectedCohorte.nombre}"?`)) deleteCohorte(selectedCohorte.id) }}
            className="p-2 rounded-xl hover:bg-bg-alt text-muted hover:text-warn">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Stats agregadas */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <p className="text-xl font-bold">{stats.totalClientes}</p>
            <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">Clientes</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <p className="text-xl font-bold">{stats.sesionesUltimaSemana}</p>
            <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">Sesiones · 7d</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <p className="text-xl font-bold">{stats.promedioSesiones}</p>
            <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">Media/cliente</p>
          </div>
        </div>

        {/* Lista de miembros */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Miembros</p>
            <button onClick={() => setShowAddClients(true)}
              className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
              <UserPlus className="w-3.5 h-3.5" /> Añadir clientes
            </button>
          </div>
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted bg-card border border-dashed border-border rounded-2xl">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Sin clientes en este grupo</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
              {members.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-sm font-bold text-accent flex-shrink-0">
                    {c.name[0]}
                  </div>
                  <button onClick={() => onSelectClient?.(c)} className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold truncate">{c.name} {c.surname}</p>
                  </button>
                  <button onClick={() => removeClientFromCohorte(selectedCohorte.id, c.id)}
                    className="p-1.5 text-muted hover:text-warn rounded-lg flex-shrink-0">
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal añadir clientes */}
        {showAddClients && (
          <div className="fixed inset-0 z-50 bg-ink/60 flex items-end justify-center" onClick={() => setShowAddClients(false)}>
            <div className="bg-card rounded-t-3xl w-full max-w-md max-h-[70vh] overflow-y-auto p-5 space-y-3" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm">Añadir clientes al grupo</p>
                <button onClick={() => setShowAddClients(false)} className="p-1 text-muted"><X className="w-4 h-4" /></button>
              </div>
              {nonMembers.length === 0 ? (
                <p className="text-sm text-muted text-center py-6">Todos tus clientes ya están en este grupo</p>
              ) : (
                <div className="space-y-1.5">
                  {nonMembers.map(c => (
                    <button key={c.id} onClick={() => addClientToCohorte(selectedCohorte.id, c.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border hover:border-accent transition-all text-left">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">{c.name[0]}</div>
                      <p className="text-sm font-medium flex-1">{c.name} {c.surname}</p>
                      <Plus className="w-4 h-4 text-accent" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal editar grupo */}
        {editing && (
          <CohorteEditModal cohorte={editing} onChange={setEditing} onSave={updateCohorte} onClose={() => setEditing(null)} />
        )}
      </div>
    )
  }

  // ── Vista lista de grupos ──
  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif font-bold text-lg">Grupos de clientes</h3>
          <p className="text-xs text-muted mt-0.5">Colectivos con seguimiento conjunto (ej. "Reto enero"). Para rasgos individuales (ej. "Lesión hombro") usa Etiquetas.</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-ink text-white rounded-xl text-xs font-semibold hover:opacity-90">
          <Plus className="w-3.5 h-3.5" /> Nuevo grupo
        </button>
      </div>

      {showNew && (
        <CohorteCreateForm form={form} onChange={setForm} onSave={createCohorte} onClose={() => { setShowNew(false); setForm(emptyCohorte(trainerId)) }} />
      )}

      {cohortes.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Sin grupos creados</p>
          <p className="text-xs mt-1">Crea grupos para retos, clases o programas compartidos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cohortes.map(coh => {
            const stats = getCohorteStats(coh.id)
            return (
              <div key={coh.id}
                className={`bg-card border rounded-2xl overflow-hidden transition-all ${coh.activa ? 'border-border' : 'border-border opacity-60'}`}>
                <button onClick={() => setSelectedCohorte(coh)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: coh.color + '20' }}>
                    <Users className="w-5 h-5" style={{ color: coh.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{coh.nombre}</p>
                      {!coh.activa && <span className="text-[9px] font-bold text-muted bg-bg-alt px-1.5 py-0.5 rounded-full">Inactivo</span>}
                    </div>
                    <p className="text-[10px] text-muted mt-0.5">{stats.totalClientes} cliente{stats.totalClientes !== 1 ? 's' : ''} · {stats.sesionesUltimaSemana} sesiones esta semana</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted flex-shrink-0" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CohorteCreateForm({ form, onChange, onSave, onClose }: {
  form: ReturnType<typeof emptyCohorte>
  onChange: (f: ReturnType<typeof emptyCohorte>) => void
  onSave: () => void
  onClose: () => void
}) {
  return (
    <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">Crear grupo</p>
        <button onClick={onClose} className="p-1 text-muted hover:text-warn"><X className="w-4 h-4" /></button>
      </div>
      <input value={form.nombre} onChange={e => onChange({ ...form, nombre: e.target.value })}
        placeholder="Nombre del grupo (ej: Reto verano 2026)"
        className="w-full px-3 py-2.5 bg-white border border-border rounded-xl text-sm outline-none" />
      <input value={form.descripcion || ''} onChange={e => onChange({ ...form, descripcion: e.target.value })}
        placeholder="Descripción breve (opcional)"
        className="w-full px-3 py-2.5 bg-white border border-border rounded-xl text-sm outline-none" />
      <div className="flex gap-1.5">
        {COLORS.map(c => (
          <button key={c} onClick={() => onChange({ ...form, color: c })}
            className="w-7 h-7 rounded-full border-2 transition-all"
            style={{ backgroundColor: c, borderColor: form.color === c ? '#1a1612' : 'transparent' }} />
        ))}
      </div>
      <button onClick={onSave} disabled={!form.nombre.trim()}
        className="w-full py-2.5 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40">
        Crear grupo
      </button>
    </div>
  )
}

function CohorteEditModal({ cohorte, onChange, onSave, onClose }: {
  cohorte: Cohorte
  onChange: (c: Cohorte) => void
  onSave: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-end justify-center" onClick={onClose}>
      <div className="bg-card rounded-t-3xl w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-bold text-sm">Editar grupo</p>
          <button onClick={onClose} className="p-1 text-muted"><X className="w-4 h-4" /></button>
        </div>
        <input value={cohorte.nombre} onChange={e => onChange({ ...cohorte, nombre: e.target.value })}
          className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" />
        <input value={cohorte.descripcion || ''} onChange={e => onChange({ ...cohorte, descripcion: e.target.value })}
          placeholder="Descripción"
          className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold uppercase text-muted">Inicio</label>
            <input type="date" value={cohorte.fecha_inicio || ''} onChange={e => onChange({ ...cohorte, fecha_inicio: e.target.value })}
              className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none mt-1" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-muted">Fin</label>
            <input type="date" value={cohorte.fecha_fin || ''} onChange={e => onChange({ ...cohorte, fecha_fin: e.target.value })}
              className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none mt-1" />
          </div>
        </div>
        <div className="flex gap-1.5">
          {COLORS.map(c => (
            <button key={c} onClick={() => onChange({ ...cohorte, color: c })}
              className="w-7 h-7 rounded-full border-2 transition-all"
              style={{ backgroundColor: c, borderColor: cohorte.color === c ? '#1a1612' : 'transparent' }} />
          ))}
        </div>
        <button onClick={onSave} className="w-full py-2.5 bg-ink text-white rounded-xl text-sm font-semibold">Guardar cambios</button>
      </div>
    </div>
  )
}
