import { useState, useEffect } from 'react'
import { Target, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { ClientData } from '../../../types'

interface WeeklyReview {
  id: string
  week_start: string
  objetivo_semanal: string | null
  estado: 'en_curso' | 'riesgo' | 'conseguido'
  nota: string | null
  created_by: string | null
  created_at: string
}

const ESTADO_META: Record<WeeklyReview['estado'], { label: string; color: string; bg: string }> = {
  en_curso:   { label: 'En curso',   color: 'text-accent', bg: 'bg-accent/10' },
  riesgo:     { label: 'En riesgo',  color: 'text-warn',   bg: 'bg-warn/10' },
  conseguido: { label: 'Conseguido', color: 'text-ok',     bg: 'bg-ok/10' },
}

function mondayOf(d: Date): string {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  m.setDate(m.getDate() - (m.getDay() === 0 ? 6 : m.getDay() - 1))
  return m.toISOString().split('T')[0]
}

// Objetivo principal del cliente (distinto de client.objetivo, que es la
// especialidad/categoría de entrenamiento) + un registro de revisiones
// semanales: qué tocaba esta semana, cómo fue, en qué estado queda. Da
// contexto al resto de gráficas — "¿progresa hacia algo concreto, o solo
// entrena?"
export function GoalsSection({ client, trainerId, onUpdate }: {
  client: ClientData
  trainerId?: string
  onUpdate: (updates: Record<string, any>) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [goalDraft, setGoalDraft] = useState(client.main_goal || '')
  const [savingGoal, setSavingGoal] = useState(false)
  const [reviews, setReviews] = useState<WeeklyReview[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<{ objetivo_semanal: string; estado: WeeklyReview['estado']; nota: string }>({ objetivo_semanal: '', estado: 'en_curso', nota: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { setGoalDraft(client.main_goal || '') }, [client.id])

  useEffect(() => {
    if (client.id.startsWith('demo-client-')) { setReviews([]); setLoading(false); return }
    supabase.from('weekly_reviews').select('*').eq('clientId', client.id).order('week_start', { ascending: false }).limit(12)
      .then(({ data }) => { setReviews((data as WeeklyReview[]) || []); setLoading(false) })
  }, [client.id])

  const saveGoal = async () => {
    setSavingGoal(true)
    await onUpdate({ main_goal: goalDraft.trim() || null })
    setSavingGoal(false)
  }

  const addReview = async () => {
    if (!form.objetivo_semanal.trim() && !form.nota.trim()) return
    setSaving(true)
    const row = {
      clientId: client.id, week_start: mondayOf(new Date()),
      objetivo_semanal: form.objetivo_semanal.trim() || null, estado: form.estado, nota: form.nota.trim() || null,
      created_by: trainerId || null,
    }
    // En demo no hay fila real de weekly_reviews para el cliente — se añade
    // solo en local, mismo patrón que el borrador/historial de plan.
    let saved: WeeklyReview
    if (client.id.startsWith('demo-client-')) {
      saved = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...row }
    } else {
      const { data, error } = await supabase.from('weekly_reviews').insert(row).select().single()
      if (error || !data) { setSaving(false); return }
      saved = data as WeeklyReview
    }
    setSaving(false)
    setReviews(r => [saved, ...r])
    setForm({ objetivo_semanal: '', estado: 'en_curso', nota: '' })
    setShowForm(false)
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center gap-2.5 px-4 py-3.5 text-left hover:bg-bg-alt/30 transition-colors">
        <Target className="w-4 h-4 text-accent flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Objetivo y revisión semanal</p>
          {client.main_goal && <p className="text-xs text-muted truncate mt-0.5">{client.main_goal}</p>}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4">
          <div>
            <label className="block text-xs font-bold text-muted mb-1.5">Objetivo principal</label>
            <div className="flex gap-2">
              <input value={goalDraft} onChange={e => setGoalDraft(e.target.value)}
                placeholder="Ej. Bajar a 70kg en 8 semanas manteniendo fuerza"
                className="flex-1 px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
              <button onClick={saveGoal} disabled={savingGoal || goalDraft === (client.main_goal || '')}
                className="px-3 py-2 bg-ink text-white rounded-xl text-xs font-bold disabled:opacity-40 flex-shrink-0">
                {savingGoal ? '...' : 'Guardar'}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-muted">Revisiones semanales</p>
              <button onClick={() => setShowForm(s => !s)} className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                <Plus className="w-3.5 h-3.5" /> Nueva revisión
              </button>
            </div>

            {showForm && (
              <div className="bg-bg-alt/50 border border-border rounded-xl p-3 space-y-2 mb-3">
                <input value={form.objetivo_semanal} onChange={e => setForm(f => ({ ...f, objetivo_semanal: e.target.value }))}
                  placeholder="Objetivo de esta semana (ej. 3 sesiones, subir 2,5kg en sentadilla)" aria-label="Objetivo de esta semana"
                  className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm outline-none" />
                <div className="flex gap-1.5">
                  {(Object.keys(ESTADO_META) as WeeklyReview['estado'][]).map(k => (
                    <button key={k} onClick={() => setForm(f => ({ ...f, estado: k }))}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${form.estado === k ? `${ESTADO_META[k].bg} ${ESTADO_META[k].color} border-current` : 'border-border text-muted'}`}>
                      {ESTADO_META[k].label}
                    </button>
                  ))}
                </div>
                <textarea value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))}
                  placeholder="Cómo fue, qué ajustar..." rows={2}
                  className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm outline-none resize-none" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs font-semibold text-muted">Cancelar</button>
                  <button onClick={addReview} disabled={saving} className="px-3 py-1.5 bg-ink text-white rounded-lg text-xs font-bold disabled:opacity-40">
                    {saving ? 'Guardando...' : 'Guardar revisión'}
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-1.5">{[1, 2].map(i => <div key={i} className="h-12 bg-bg-alt rounded-xl animate-pulse" />)}</div>
            ) : reviews.length === 0 ? (
              <p className="text-xs text-muted text-center py-4">Sin revisiones todavía</p>
            ) : (
              <div className="space-y-1.5">
                {reviews.map(r => (
                  <div key={r.id} className="border border-border rounded-xl p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold text-muted">
                        Semana del {new Date(r.week_start + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ESTADO_META[r.estado].bg} ${ESTADO_META[r.estado].color}`}>
                        {ESTADO_META[r.estado].label}
                      </span>
                    </div>
                    {r.objetivo_semanal && <p className="text-xs font-medium mt-1">{r.objetivo_semanal}</p>}
                    {r.nota && <p className="text-xs text-muted mt-0.5">{r.nota}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
