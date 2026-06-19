import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from '../shared/Toast'
import { logError } from '../../lib/errors'
import { ClientData } from '../../types'
import {
  Plus, X, Trash2, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Users, Repeat, Ban
} from 'lucide-react'

interface Props {
  trainerId: string
  clients: ClientData[]
}

interface Cita {
  id: string
  trainer_id: string
  client_id: string | null
  title: string
  start_at: string
  end_at: string
  status: 'confirmada' | 'cancelada' | 'completada'
  notes: string
  recurring: 'weekly' | null
  recurring_until: string | null
}

function emptyForm(dateISO: string) {
  return {
    title: 'Sesión', clientId: '', date: dateISO, time: '09:00', durationMin: 60,
    recurring: false, recurringUntil: '',
  }
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function toISODate(d: Date) { return d.toISOString().split('T')[0] }
function weekDays(anchor: Date) {
  const monday = addDays(anchor, -((anchor.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

const STATUS_META = {
  confirmada: { label: 'Confirmada', color: '#22c55e', bg: '#f0fdf4' },
  completada: { label: 'Completada', color: '#3b82f6', bg: '#eff6ff' },
  cancelada: { label: 'Cancelada', color: '#ef4444', bg: '#fef2f2' },
}

export function CalendarTab({ trainerId, clients }: Props) {
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()))
  const [showForm, setShowForm] = useState<{ dateISO: string } | null>(null)
  const [form, setForm] = useState(emptyForm(toISODate(new Date())))
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadCitas() }, [trainerId])

  const loadCitas = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('citas').select('*').eq('trainer_id', trainerId).order('start_at')
    if (error) { logError('CalendarTab:load', error); toast('Error al cargar el calendario', 'warn') }
    else setCitas((data || []) as Cita[])
    setLoading(false)
  }

  const days = useMemo(() => weekDays(anchor), [anchor])
  const citasByDay = useMemo(() => {
    const map: Record<string, Cita[]> = {}
    citas.forEach(c => {
      const key = c.start_at.split('T')[0]
      if (!map[key]) map[key] = []
      map[key].push(c)
    })
    Object.values(map).forEach(list => list.sort((a, b) => a.start_at.localeCompare(b.start_at)))
    return map
  }, [citas])

  const openNew = (dateISO: string) => { setForm(emptyForm(dateISO)); setShowForm({ dateISO }) }

  const saveCita = async () => {
    if (!form.clientId && form.title === 'Sesión') {
      // permitir bloqueos sin cliente (ej. "Reservado") igualmente
    }
    setSaving(true)
    const start = new Date(`${form.date}T${form.time}:00`)
    const end = new Date(start.getTime() + form.durationMin * 60000)
    const base = {
      trainer_id: trainerId,
      client_id: form.clientId || null,
      title: form.title.trim() || 'Sesión',
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: 'confirmada' as const,
      notes: '',
    }

    if (form.recurring && form.recurringUntil) {
      const until = new Date(form.recurringUntil + 'T23:59:59')
      const rows = []
      let cursor = start
      while (cursor <= until) {
        const cEnd = new Date(cursor.getTime() + form.durationMin * 60000)
        rows.push({ ...base, start_at: cursor.toISOString(), end_at: cEnd.toISOString(), recurring: 'weekly' as const, recurring_until: form.recurringUntil })
        cursor = addDays(cursor, 7)
      }
      const { error } = await supabase.from('citas').insert(rows)
      if (error) { logError('CalendarTab:saveRecurring', error); toast('Error al crear las sesiones', 'warn'); setSaving(false); return }
      toast(`${rows.length} sesiones creadas ✓`, 'ok')
    } else {
      const { error } = await supabase.from('citas').insert(base)
      if (error) { logError('CalendarTab:save', error); toast('Error al crear la sesión', 'warn'); setSaving(false); return }
      toast('Sesión creada ✓', 'ok')
    }

    setSaving(false)
    setShowForm(null)
    loadCitas()
  }

  const updateStatus = async (cita: Cita, status: Cita['status']) => {
    const { error } = await supabase.from('citas').update({ status }).eq('id', cita.id)
    if (error) { logError('CalendarTab:status', error); toast('Error al actualizar', 'warn'); return }
    setCitas(prev => prev.map(c => c.id === cita.id ? { ...c, status } : c))
  }

  const deleteCita = async (cita: Cita) => {
    const { error } = await supabase.from('citas').delete().eq('id', cita.id)
    if (error) { logError('CalendarTab:delete', error); toast('Error al borrar', 'warn'); return }
    setCitas(prev => prev.filter(c => c.id !== cita.id))
    toast('Sesión eliminada', 'ok')
  }

  const clientName = (id: string | null) => clients.find(c => c.id === id)?.name || null

  if (loading) return (
    <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-card border border-border rounded-2xl animate-pulse" />)}</div>
  )

  return (
    <div className="max-w-3xl space-y-4 animate-fade-in">
      {/* Navegación semanal */}
      <div className="flex items-center justify-between">
        <button onClick={() => setAnchor(addDays(anchor, -7))} className="p-2 rounded-xl hover:bg-bg-alt text-muted"><ChevronLeft className="w-4 h-4" /></button>
        <p className="text-sm font-semibold">
          {days[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – {days[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
        </p>
        <button onClick={() => setAnchor(addDays(anchor, 7))} className="p-2 rounded-xl hover:bg-bg-alt text-muted"><ChevronRight className="w-4 h-4" /></button>
      </div>

      {/* Días de la semana */}
      <div className="space-y-3">
        {days.map(day => {
          const key = toISODate(day)
          const dayCitas = citasByDay[key] || []
          const isToday = key === toISODate(new Date())
          return (
            <div key={key} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className={`px-4 py-2.5 flex items-center justify-between ${isToday ? 'bg-accent/8' : 'bg-bg-alt/40'}`}>
                <p className="text-sm font-bold capitalize">
                  {day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                  {isToday && <span className="ml-2 text-[10px] font-bold text-accent uppercase">Hoy</span>}
                </p>
                <button onClick={() => openNew(key)} className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-accent/10">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {dayCitas.length === 0 ? (
                <p className="px-4 py-3 text-xs text-muted">Sin sesiones</p>
              ) : (
                <div className="divide-y divide-border">
                  {dayCitas.map(cita => {
                    const meta = STATUS_META[cita.status]
                    const time = new Date(cita.start_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                    const name = clientName(cita.client_id)
                    return (
                      <div key={cita.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted w-14 flex-shrink-0">
                          <Clock className="w-3 h-3" />{time}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                            {cita.title}
                            {cita.recurring && <Repeat className="w-3 h-3 text-muted" />}
                          </p>
                          {name && <p className="text-xs text-muted flex items-center gap-1"><Users className="w-3 h-3" />{name}</p>}
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ color: meta.color, backgroundColor: meta.bg }}>
                          {meta.label}
                        </span>
                        {cita.status === 'confirmada' && (
                          <>
                            <button onClick={() => updateStatus(cita, 'completada')} title="Marcar como completada"
                              className="p-1.5 text-muted hover:text-ok rounded-lg flex-shrink-0"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => updateStatus(cita, 'cancelada')} title="Cancelar"
                              className="p-1.5 text-muted hover:text-warn rounded-lg flex-shrink-0"><Ban className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                        <button onClick={() => deleteCita(cita)} title="Eliminar"
                          className="p-1.5 text-muted hover:text-warn rounded-lg flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal nueva sesión */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-ink/60 flex items-end justify-center" onClick={() => setShowForm(null)}>
          <div className="bg-card rounded-t-3xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg">Nueva sesión</h3>
              <button onClick={() => setShowForm(null)} className="p-1.5 text-muted hover:text-ink"><X className="w-4 h-4" /></button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Título</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Cliente (opcional)</label>
              <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none">
                <option value="">Sin asignar (bloqueo de agenda)</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.surname}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Fecha</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Hora</label>
                <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Duración (min)</label>
              <input type="number" min={15} step={15} value={form.durationMin}
                onChange={e => setForm(f => ({ ...f, durationMin: parseInt(e.target.value) || 60 }))}
                className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" />
            </div>

            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={form.recurring} onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))} />
              Repetir cada semana
            </label>
            {form.recurring && (
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Repetir hasta</label>
                <input type="date" value={form.recurringUntil} onChange={e => setForm(f => ({ ...f, recurringUntil: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" />
              </div>
            )}

            <button onClick={saveCita} disabled={saving || (form.recurring && !form.recurringUntil)}
              className="w-full py-3.5 bg-ink text-white rounded-2xl font-bold text-sm disabled:opacity-50">
              {saving ? 'Guardando...' : 'Crear sesión'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
