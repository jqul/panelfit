import { useState, useEffect } from 'react'
import { Plus, X, Tag, Users, Dumbbell, Calendar as CalendarIcon, ClipboardList } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../shared/Toast'
import { TrainerLabel } from './labels'

interface Props { trainerId: string }

interface SurveyTemplateOption { id: string; name: string }

const LABEL_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6e5438', '#64748b']

function emptyLabel(trainerId: string): TrainerLabel {
  return { id: `lbl_${Date.now()}`, trainer_id: trainerId, name: '', color: LABEL_COLORS[0], emoji: '🏷️', survey_template_id: null, created_at: Date.now() }
}

export function EtiquetasTab({ trainerId }: Props) {
  const [labels, setLabels] = useState<TrainerLabel[]>([])
  const [surveyTemplates, setSurveyTemplates] = useState<SurveyTemplateOption[]>([])
  const [usage, setUsage] = useState<Record<string, { clients: number; templates: number; programs: number }>>({})
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newLabel, setNewLabel] = useState<TrainerLabel>(() => emptyLabel(trainerId))
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [trainerId])

  const loadAll = async () => {
    setLoading(true)
    const [labelsRes, surveysRes, clientesRes, templatesRes, programsRes] = await Promise.all([
      supabase.from('labels').select('*').eq('trainer_id', trainerId).order('created_at'),
      supabase.from('survey_templates').select('id, name').eq('trainer_id', trainerId),
      supabase.from('clientes').select('label_ids').eq('trainerId', trainerId),
      supabase.from('plan_templates').select('label_ids').eq('trainer_id', trainerId),
      supabase.from('programs').select('label_ids').eq('trainer_id', trainerId),
    ])
    const ls = labelsRes.data || []
    setLabels(ls)
    setSurveyTemplates(surveysRes.data || [])

    const countFor = (rows: { label_ids?: string[] | null }[] | null, labelId: string) =>
      (rows || []).filter(r => (r.label_ids || []).includes(labelId)).length

    const usageMap: Record<string, { clients: number; templates: number; programs: number }> = {}
    ls.forEach(l => {
      usageMap[l.id] = {
        clients: countFor(clientesRes.data, l.id),
        templates: countFor(templatesRes.data, l.id),
        programs: countFor(programsRes.data, l.id),
      }
    })
    setUsage(usageMap)
    setLoading(false)
  }

  const createLabel = async () => {
    if (!newLabel.name.trim()) return
    setSaving(true)
    const label = { ...newLabel, name: newLabel.name.trim() }
    const { error } = await supabase.from('labels').insert(label)
    if (error) { toast('Error al crear etiqueta', 'warn'); setSaving(false); return }
    setLabels(ls => [...ls, label])
    setUsage(u => ({ ...u, [label.id]: { clients: 0, templates: 0, programs: 0 } }))
    setNewLabel(emptyLabel(trainerId))
    setShowNew(false)
    toast('Etiqueta creada ✓', 'ok')
    setSaving(false)
  }

  const deleteLabel = async (id: string) => {
    const u = usage[id]
    const totalUses = (u?.clients || 0) + (u?.templates || 0) + (u?.programs || 0)
    if (totalUses > 0 && !confirm(`Esta etiqueta se usa en ${totalUses} sitio${totalUses > 1 ? 's' : ''}. ¿Eliminarla igualmente?`)) return
    await supabase.from('labels').delete().eq('id', id)
    setLabels(ls => ls.filter(l => l.id !== id))
    toast('Etiqueta eliminada', 'ok')
  }

  const linkSurvey = async (labelId: string, surveyTemplateId: string | null) => {
    await supabase.from('labels').update({ survey_template_id: surveyTemplateId }).eq('id', labelId)
    setLabels(ls => ls.map(l => l.id === labelId ? { ...l, survey_template_id: surveyTemplateId } : l))
    toast(surveyTemplateId ? 'Encuesta vinculada ✓' : 'Desvinculada', 'ok')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-muted">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="animate-fade-in space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold">Etiquetas</h2>
          <p className="text-muted text-sm mt-1">
            Clasifica clientes para sugerir programas automáticamente, vincular encuestas y filtrar workouts. Distinto de "Grupos": las etiquetas son rasgos (ej. "Lesión hombro"), los grupos son colectivos con seguimiento conjunto.
          </p>
        </div>
        <button onClick={() => setShowNew(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90 flex-shrink-0">
          <Plus className="w-4 h-4" /> Nueva
        </button>
      </div>

      {showNew && (
        <div className="bg-card border border-accent/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <input value={newLabel.emoji} onChange={e => setNewLabel(l => ({ ...l, emoji: e.target.value }))}
              maxLength={2} className="w-12 px-2 py-2 bg-bg border border-border rounded-lg text-center text-base outline-none" />
            <input value={newLabel.name} onChange={e => setNewLabel(l => ({ ...l, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && createLabel()}
              placeholder="Nombre de la etiqueta..." autoFocus
              className="flex-1 min-w-32 px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20" />
            <div className="flex gap-1.5">
              {LABEL_COLORS.map(c => (
                <button key={c} onClick={() => setNewLabel(l => ({ ...l, color: c }))}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${newLabel.color === c ? 'scale-110 border-ink' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNew(false)} className="px-3 py-2 text-sm text-muted hover:text-ink">Cancelar</button>
            <button onClick={createLabel} disabled={saving || !newLabel.name.trim()}
              className="px-4 py-2 bg-ink text-white rounded-lg text-sm font-semibold disabled:opacity-40">
              {saving ? 'Creando...' : 'Crear etiqueta'}
            </button>
          </div>
        </div>
      )}

      {labels.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl text-muted">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-serif text-lg font-bold">Sin etiquetas todavía</p>
          <p className="text-sm mt-1">Crea tu primera etiqueta para empezar a clasificar clientes</p>
          <button onClick={() => setShowNew(true)} className="mt-4 px-5 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold">Crear etiqueta</button>
        </div>
      ) : (
        <div className="space-y-2">
          {labels.map(label => {
            const u = usage[label.id] || { clients: 0, templates: 0, programs: 0 }
            return (
              <div key={label.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-sm border flex-shrink-0"
                    style={{ backgroundColor: label.color + '18', borderColor: label.color + '40', color: label.color }}>
                    <span>{label.emoji}</span><span>{label.name}</span>
                  </span>
                  <div className="flex-1 flex items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{u.clients}</span>
                    <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" />{u.templates}</span>
                    <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" />{u.programs}</span>
                  </div>
                  <button onClick={() => deleteLabel(label.id)} className="p-1.5 text-muted hover:text-warn flex-shrink-0"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                  <select value={label.survey_template_id || ''} onChange={e => linkSurvey(label.id, e.target.value || null)}
                    className="flex-1 px-3 py-1.5 bg-bg border border-border rounded-lg text-xs outline-none">
                    <option value="">Sin encuesta vinculada</option>
                    {surveyTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
            )
          })}
          <p className="text-[10px] text-muted text-center pt-1">
            <Users className="w-2.5 h-2.5 inline" /> clientes · <Dumbbell className="w-2.5 h-2.5 inline" /> workouts · <CalendarIcon className="w-2.5 h-2.5 inline" /> programas con esta etiqueta
          </p>
        </div>
      )}
    </div>
  )
}
