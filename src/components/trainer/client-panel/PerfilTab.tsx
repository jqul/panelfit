import { useState } from 'react'
import { Bell, Plus, Trash2, Calendar, CheckCircle2 } from 'lucide-react'
import { ClientData, TrainingLogs, TrainingPlan } from '../../../types'
import { TrainerLabel } from '../labels'
import { toast } from '../../shared/Toast'
import { HabitosSection } from './HabitosSection'
import { IntakeSummary } from './IntakeSummary'
import { ReadinessSummary } from './ReadinessSummary'
import { MessageTemplatesSection } from './MessageTemplatesSection'

export interface ClientAlert {
  id: string
  type: 'llamar' | 'revision' | 'valoracion' | 'otro'
  note: string
  date: string
  done: boolean
  createdAt: number
}

export const ALERT_TYPES = [
  { id: 'llamar',    label: 'Llamar',     emoji: '📞', color: 'text-blue-500',  bg: 'bg-blue-50',   border: 'border-blue-200' },
  { id: 'revision',  label: 'Revisión',   emoji: '📋', color: 'text-ok',        bg: 'bg-ok/10',     border: 'border-ok/30' },
  { id: 'valoracion',label: 'Valoración', emoji: '⭐', color: 'text-warn',      bg: 'bg-warn/10',   border: 'border-warn/30' },
  { id: 'otro',      label: 'Otro',       emoji: '🔔', color: 'text-muted',     bg: 'bg-bg-alt',    border: 'border-border' },
] as const

export function PerfilTab({ client, logs, alerts, labels, onUpdate, onSaveAlerts, plan, onPlanChange, trainerId }: {
  client: ClientData; logs: TrainingLogs; alerts: ClientAlert[]
  onUpdate: (updates: Record<string, any>) => Promise<void>
  labels?: TrainerLabel[]
  onSaveAlerts: (alerts: ClientAlert[]) => Promise<void>
  plan?: TrainingPlan | null
  onPlanChange?: (p: TrainingPlan) => void
  trainerId?: string
}) {
  const c = client
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: c.name || '', surname: c.surname || '', phone: c.phone || '', objetivo: c.objetivo || '', altura: c.altura || '', weight: c.weight || '', genero: c.genero || '', fechanacimiento: c.fechanacimiento || '' })
  const [saving, setSaving] = useState(false)
  const [showNewAlert, setShowNewAlert] = useState(false)
  const [newAlert, setNewAlert] = useState<{ type: ClientAlert['type']; note: string; date: string }>({
    type: 'llamar', note: '', date: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  })

  const edad = (() => {
    if (!c.fechanacimiento) return null
    const birth = new Date(c.fechanacimiento)
    const today = new Date()
    return today.getFullYear() - birth.getFullYear() - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0)
  })()

  const totalSessions = new Set(Object.values(logs).filter(l => l.done && l.dateDone).map(l => l.dateDone)).size
  const lastSession = Object.values(logs).filter(l => l.done && l.dateDone).map(l => l.dateDone as string).sort().reverse()[0]

  const handleSave = async () => {
    setSaving(true)
    await onUpdate({ name: form.name, surname: form.surname, phone: form.phone, objetivo: form.objetivo, altura: form.altura ? parseFloat(String(form.altura)) : null, weight: form.weight ? parseFloat(String(form.weight)) : 0, genero: form.genero || null, fechanacimiento: form.fechanacimiento || null })
    setEditing(false); setSaving(false)
  }

  const addAlert = async () => {
    if (!newAlert.note.trim()) return
    const alert: ClientAlert = {
      id: crypto.randomUUID().replace(/-/g, ''),
      type: newAlert.type, note: newAlert.note.trim(),
      date: newAlert.date, done: false, createdAt: Date.now()
    }
    await onSaveAlerts([...alerts, alert])
    setNewAlert({ type: 'llamar', note: '', date: new Date(Date.now() + 86400000).toISOString().split('T')[0] })
    setShowNewAlert(false)
    toast('Recordatorio añadido ✓', 'ok')
  }

  const toggleAlert = async (id: string) => {
    await onSaveAlerts(alerts.map(a => a.id === id ? { ...a, done: !a.done } : a))
  }

  const deleteAlert = async (id: string) => {
    await onSaveAlerts(alerts.filter(a => a.id !== id))
  }

  const pendingAlerts = alerts.filter(a => !a.done).sort((a, b) => a.date.localeCompare(b.date))
  const doneAlerts = alerts.filter(a => a.done)

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="animate-fade-in space-y-5 max-w-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-2xl font-serif font-bold text-accent flex-shrink-0">
            {c.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold">{c.name} {c.surname}</h2>
            <p className="text-sm text-muted capitalize">{c.objetivo || 'Sin objetivo'}{edad ? ` · ${edad} años` : ''}</p>
            {c.phone && <p className="text-xs text-[#25D366] mt-0.5">📱 {c.phone}</p>}
          </div>
        </div>
        <button onClick={() => setEditing(!editing)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${editing ? 'border-accent text-accent bg-accent/5' : 'border-border text-muted hover:border-accent hover:text-accent'}`}>
          {editing ? 'Cancelar' : '✏️ Editar'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Sesiones totales', value: totalSessions, icon: '🏋️', color: 'text-accent' },
          { label: 'Última sesión', value: lastSession ? new Date(lastSession + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '—', icon: '📅', color: 'text-ok' },
          { label: 'Peso actual', value: c.weight ? `${c.weight} kg` : '—', icon: '⚖️', color: 'text-ink' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-border rounded-2xl p-4 text-center" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <p className="text-xl mb-1">{s.icon}</p>
            <p className={`text-xl font-serif font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Etiquetas */}
      {labels && labels.length > 0 && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div className="px-5 py-3 border-b border-border/50 bg-bg-alt/30">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Etiquetas</p>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {labels.map(label => {
                const clientLabelIds: string[] = c.label_ids || []
                const active = clientLabelIds.includes(label.id)
                return (
                  <button key={label.id}
                    onClick={async () => {
                      const current: string[] = c.label_ids || []
                      const updated = active ? current.filter(id => id !== label.id) : [...current, label.id]
                      await onUpdate({ label_ids: updated })
                      client.label_ids = updated
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                    style={{ backgroundColor: active ? label.color + '18' : 'transparent', borderColor: label.color + '40', color: label.color, opacity: active ? 1 : 0.5 }}>
                    <span>{label.emoji}</span>
                    <span>{label.name}</span>
                    {active && <span className="ml-0.5 text-xs">ok</span>}
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-muted mt-2">Las etiquetas sugieren programas al asignar un plan</p>
          </div>
        </div>
      )}
      {/* ── RECORDATORIOS / ALERTAS ── */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div className="px-5 py-3 border-b border-border/50 bg-bg-alt/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-warn" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Recordatorios</p>
            {pendingAlerts.length > 0 && (
              <span className="text-[9px] font-bold bg-warn text-white px-1.5 py-0.5 rounded-full">{pendingAlerts.length}</span>
            )}
          </div>
          <button onClick={() => setShowNewAlert(!showNewAlert)}
            className="flex items-center gap-1 px-3 py-1.5 bg-ink text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">
            <Plus className="w-3 h-3" /> Añadir
          </button>
        </div>

        {/* Form nuevo recordatorio */}
        {showNewAlert && (
          <div className="px-5 py-4 border-b border-border/50 bg-warn/5 space-y-3">
            {/* Tipo */}
            <div className="flex gap-2 flex-wrap">
              {ALERT_TYPES.map(t => (
                <button key={t.id} onClick={() => setNewAlert(a => ({ ...a, type: t.id }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${newAlert.type === t.id ? `${t.bg} ${t.border} ${t.color}` : 'border-border text-muted hover:border-accent'}`}>
                  <span>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
            {/* Nota */}
            <input value={newAlert.note} onChange={e => setNewAlert(a => ({ ...a, note: e.target.value }))}
              placeholder="Descripción del recordatorio..."
              className="w-full px-3 py-2.5 bg-white border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20"
              onKeyDown={e => e.key === 'Enter' && addAlert()}
            />
            {/* Fecha */}
            <div className="flex gap-2 items-center">
              <Calendar className="w-3.5 h-3.5 text-muted flex-shrink-0" />
              <input type="date" value={newAlert.date} onChange={e => setNewAlert(a => ({ ...a, date: e.target.value }))}
                className="flex-1 px-3 py-2 bg-white border border-border rounded-xl text-sm outline-none" />
              <button onClick={addAlert}
                className="px-4 py-2 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
                Guardar
              </button>
            </div>
          </div>
        )}

        {/* Lista alertas pendientes */}
        <div className="divide-y divide-border/40">
          {pendingAlerts.length === 0 && !showNewAlert && (
            <div className="px-5 py-6 text-center">
              <p className="text-xs text-muted">Sin recordatorios pendientes</p>
              <button onClick={() => setShowNewAlert(true)} className="mt-2 text-accent text-xs hover:underline">+ Añadir recordatorio</button>
            </div>
          )}
          {pendingAlerts.map(alert => {
            const meta = ALERT_TYPES.find(t => t.id === alert.type)!
            const isOverdue = alert.date < today
            const isToday = alert.date === today
            return (
              <div key={alert.id} className={`flex items-start gap-3 px-5 py-3.5 ${isOverdue ? 'bg-warn/5' : ''}`}>
                <button onClick={() => toggleAlert(alert.id)}
                  className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${meta.border} hover:bg-ok hover:border-ok`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color} ${meta.border} border`}>
                      {meta.emoji} {meta.label}
                    </span>
                    <span className={`text-[10px] font-semibold ${isOverdue ? 'text-warn' : isToday ? 'text-ok' : 'text-muted'}`}>
                      {isOverdue ? '⚠ ' : isToday ? '📅 Hoy · ' : ''}{new Date(alert.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-sm mt-0.5">{alert.note}</p>
                </div>
                <button onClick={() => deleteAlert(alert.id)} className="p-1 text-muted hover:text-warn transition-colors flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}

          {/* Completados colapsados */}
          {doneAlerts.length > 0 && (
            <details className="group">
              <summary className="px-5 py-2.5 text-[10px] text-muted uppercase tracking-wider font-semibold cursor-pointer hover:bg-bg-alt/30 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-ok" />
                {doneAlerts.length} completado{doneAlerts.length > 1 ? 's' : ''}
              </summary>
              {doneAlerts.map(alert => {
                const meta = ALERT_TYPES.find(t => t.id === alert.type)!
                return (
                  <div key={alert.id} className="flex items-center gap-3 px-5 py-2.5 opacity-50">
                    <button onClick={() => toggleAlert(alert.id)}
                      className="w-5 h-5 rounded border-2 border-ok bg-ok flex-shrink-0 flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs line-through text-muted">{meta.emoji} {alert.note}</p>
                    </div>
                    <button onClick={() => deleteAlert(alert.id)} className="p-1 text-muted hover:text-warn flex-shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
            </details>
          )}
        </div>
      </div>

      {/* Datos personales */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div className="px-5 py-3 border-b border-border/50 bg-bg-alt/30">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Datos personales</p>
        </div>
        {!editing ? (
          <div className="divide-y divide-border/50">
            {[
              { label: 'Nombre completo', value: `${c.name || '—'} ${c.surname || ''}`.trim() },
              { label: 'WhatsApp', value: c.phone || '—' },
              { label: 'Objetivo', value: c.objetivo || '—' },
              { label: 'Altura', value: c.altura ? `${c.altura} cm` : '—' },
              { label: 'Peso', value: c.weight ? `${c.weight} kg` : '—' },
              { label: 'Género', value: c.genero === 'h' ? 'Masculino' : c.genero === 'm' ? 'Femenino' : '—' },
              { label: 'Fecha de nacimiento', value: c.fechanacimiento ? new Date(c.fechanacimiento + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
              { label: 'Edad', value: edad ? `${edad} años` : '—' },
            ].map(row => (
              <div key={row.label} className="flex items-center px-5 py-3 hover:bg-bg-alt/30 transition-colors">
                <p className="text-xs font-semibold text-muted w-36 flex-shrink-0">{row.label}</p>
                <p className="text-sm text-ink">{row.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-muted mb-1.5">Nombre</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" /></div>
              <div><label className="block text-xs font-bold text-muted mb-1.5">Apellido</label><input value={form.surname} onChange={e => setForm(f => ({ ...f, surname: e.target.value }))} className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" /></div>
            </div>
            <div><label className="block text-xs font-bold text-muted mb-1.5">📱 WhatsApp</label><input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+34 600 000 000" className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" /></div>
            <div><label className="block text-xs font-bold text-muted mb-1.5">Objetivo</label><input value={form.objetivo} onChange={e => setForm(f => ({ ...f, objetivo: e.target.value }))} placeholder="Hipertrofia, fuerza..." className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-muted mb-1.5">Altura (cm)</label><input type="number" value={form.altura} onChange={e => setForm(f => ({ ...f, altura: e.target.value }))} className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" /></div>
              <div><label className="block text-xs font-bold text-muted mb-1.5">Peso (kg)</label><input type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-muted mb-1.5">Género</label>
                <select value={form.genero} onChange={e => setForm(f => ({ ...f, genero: e.target.value }))} className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none">
                  <option value="">Sin especificar</option><option value="h">Masculino</option><option value="m">Femenino</option>
                </select></div>
              <div><label className="block text-xs font-bold text-muted mb-1.5">Fecha nacimiento</label><input type="date" value={form.fechanacimiento} onChange={e => setForm(f => ({ ...f, fechanacimiento: e.target.value }))} className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" /></div>
            </div>
            <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity">
              {saving ? 'Guardando...' : '✓ Guardar cambios'}
            </button>
          </div>
        )}
      </div>

      <ReadinessSummary clientId={client.id} />

      <IntakeSummary clientId={client.id} />

      <HabitosSection clientId={client.id} />

      {/* Notas privadas */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div className="px-5 py-3 border-b border-border/50 bg-bg-alt/30">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">🔒 Notas privadas</p>
        </div>
        <div className="p-4">
          <textarea defaultValue={c.notas_privadas || ''}
            onBlur={async e => { await onUpdate({ notas_privadas: e.target.value }) }}
            placeholder="Observaciones, lesiones, preferencias, historial médico..."
            rows={4}
            className="w-full text-sm bg-bg border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent/20 resize-none leading-relaxed" />
          <p className="text-[10px] text-muted mt-1">Se guarda automáticamente al perder el foco</p>
        </div>
      </div>

      {/* WhatsApp directo */}
      {c.phone && (
        <button onClick={() => {
            const url = `${window.location.origin}?c=${client.token}`
            const phone = c.phone!.replace(/\s+/g, '').replace(/^\+/, '')
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Hola ${c.name} 👋\n\nTe comparto tu panel:\n\n${url}\n\n💪`)}`, '_blank')
          }}
          className="w-full flex items-center justify-center gap-3 py-3.5 bg-[#25D366] text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-opacity">
          📱 Abrir WhatsApp con {c.name}
        </button>
      )}

      {plan && onPlanChange && trainerId && (
        <MessageTemplatesSection client={client} plan={plan} onChange={onPlanChange} trainerId={trainerId} />
      )}
    </div>
  )
}
