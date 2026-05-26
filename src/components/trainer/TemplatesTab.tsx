import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientData, TrainingTemplate, TrainingPlan, UserProfile } from '../../types'
import { toast } from '../shared/Toast'
import { Plus, Trash2, Copy, ChevronDown, ChevronUp, ClipboardCheck, Edit2, ArrowLeft, Save, Tag, X, Check } from 'lucide-react'
import { TrainingPlanEditor } from './TrainingPlanEditor'
import { useExerciseLibrary } from '../../hooks/useExerciseLibrary'

interface Props {
  trainerId: string
  clients: ClientData[]
  userProfile?: UserProfile
}

export interface TrainerLabel {
  id: string
  trainer_id: string
  name: string
  color: string
  emoji: string
  survey_template_id: string | null
  created_at: number
}

const LS_KEY      = (uid: string) => `pf_templates_${uid}`
const LS_MIGRATED = (uid: string) => `pf_tmpl_migrated_${uid}`
const LS_TYPES    = (uid: string) => `pf_custom_types_${uid}`

const TIPOS_DEFAULT = [
  'Hipertrofia','Fuerza','Pérdida de grasa','Resistencia',
  'Rehabilitación','Rendimiento','General','Test inicial',
  'Iniciación','Mantenimiento','Peaking','Volumen','Definición',
]

const LABEL_COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e','#06b6d4',
  '#3b82f6','#8b5cf6','#ec4899','#6e5438','#64748b',
]

const LABEL_EMOJIS = ['🏋️','💪','🔥','⚡','🎯','🏃','🧘','🥗','❤️','⭐','🏆','🔑','💡','🎪','🌟']

function emptyTemplate(trainerId: string): TrainingTemplate {
  return {
    id: `tmpl_${Date.now()}`,
    trainerId,
    name: 'Nueva plantilla',
    type: 'General',
    description: '',
    weeks: [{
      label: 'Semana 1', rpe: '', isCurrent: false,
      days: [
        { title: 'Día A', focus: '', exercises: [] },
        { title: 'Día B', focus: '', exercises: [] },
        { title: 'Día C', focus: '', exercises: [] },
      ]
    }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

function tmplToPlan(tmpl: TrainingTemplate): TrainingPlan {
  return {
    clientId: 'template',
    type: tmpl.type,
    weeks: tmpl.weeks,
    message: '',
    restMain: 180,
    restAcc: 90,
    restWarn: 30,
  } as TrainingPlan
}

function planToTmpl(tmpl: TrainingTemplate, plan: TrainingPlan, name: string, type: string): TrainingTemplate {
  return {
    ...tmpl,
    name: name.trim() || tmpl.name,
    type: type || tmpl.type,
    weeks: plan.weeks || tmpl.weeks,
    updatedAt: Date.now(),
  }
}

// ── Label pill ────────────────────────────────────────────
export function LabelPill({ label, onRemove, small }: { label: TrainerLabel; onRemove?: () => void; small?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold border ${small ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'}`}
      style={{ backgroundColor: label.color + '18', borderColor: label.color + '40', color: label.color }}>
      <span>{label.emoji}</span>
      <span>{label.name}</span>
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 hover:opacity-70">
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  )
}

// ── Label manager modal ───────────────────────────────────
function LabelManager({ trainerId, labels, onUpdate, onClose }: {
  trainerId: string
  labels: TrainerLabel[]
  onUpdate: (labels: TrainerLabel[]) => void
  onClose: () => void
}) {
  const [list, setList] = useState<TrainerLabel[]>(labels)
  const [editing, setEditing] = useState<TrainerLabel | null>(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(LABEL_COLORS[0])
  const [newEmoji, setNewEmoji] = useState('🏷️')
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)

  const addLabel = async () => {
    if (!newName.trim()) return
    setSaving(true)
    const label: TrainerLabel = {
      id: `lbl_${Date.now()}`,
      trainer_id: trainerId,
      name: newName.trim(),
      color: newColor,
      emoji: newEmoji,
      survey_template_id: null,
      created_at: Date.now(),
    }
    const { error } = await supabase.from('labels').insert(label)
    if (error) { toast('Error al crear etiqueta', 'warn'); setSaving(false); return }
    const updated = [...list, label]
    setList(updated)
    onUpdate(updated)
    setNewName(''); setShowNew(false)
    setSaving(false)
    toast('Etiqueta creada ✓', 'ok')
  }

  const deleteLabel = async (id: string) => {
    await supabase.from('labels').delete().eq('id', id)
    const updated = list.filter(l => l.id !== id)
    setList(updated)
    onUpdate(updated)
  }

  const saveEdit = async (label: TrainerLabel) => {
    await supabase.from('labels').update({ name: label.name, color: label.color, emoji: label.emoji }).eq('id', label.id)
    const updated = list.map(l => l.id === label.id ? label : l)
    setList(updated)
    onUpdate(updated)
    setEditing(null)
    toast('Etiqueta actualizada ✓', 'ok')
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Crea etiquetas para organizar clientes y plantillas.</p>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {list.map(label => (
          <div key={label.id} className="border border-border rounded-xl overflow-hidden">
            {editing?.id === label.id ? (
              <div className="p-3 space-y-2">
                <div className="flex gap-2">
                  <input value={editing.emoji} onChange={e => setEditing({ ...editing, emoji: e.target.value })}
                    className="w-12 text-center px-2 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none" />
                  <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
                    className="flex-1 px-3 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none" />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {LABEL_COLORS.map(c => (
                    <button key={c} onClick={() => setEditing({ ...editing, color: c })}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${editing.color === c ? 'border-ink scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(null)} className="flex-1 py-1.5 border border-border rounded-lg text-xs text-muted">Cancelar</button>
                  <button onClick={() => saveEdit(editing)} className="flex-1 py-1.5 bg-ink text-white rounded-lg text-xs font-semibold">Guardar</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-3 py-2.5">
                <LabelPill label={label} />
                <div className="flex-1" />
                <button onClick={() => setEditing(label)} className="p-1 text-muted hover:text-accent"><Edit2 className="w-3 h-3" /></button>
                <button onClick={() => deleteLabel(label.id)} className="p-1 text-muted hover:text-warn"><Trash2 className="w-3 h-3" /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showNew ? (
        <div className="border border-accent/30 rounded-xl p-3 space-y-2 bg-accent/3">
          <div className="flex gap-2">
            <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)}
              className="w-12 text-center px-2 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none"
              placeholder="🏷️" />
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Nombre de la etiqueta"
              className="flex-1 px-3 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none"
              onKeyDown={e => e.key === 'Enter' && addLabel()} autoFocus />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {LABEL_COLORS.map(c => (
              <button key={c} onClick={() => setNewColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${newColor === c ? 'border-ink scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          {newName && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Vista previa:</span>
              <LabelPill label={{ id: '', trainer_id: '', name: newName, color: newColor, emoji: newEmoji, survey_template_id: null, created_at: 0 }} />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => { setShowNew(false); setNewName('') }} className="flex-1 py-1.5 border border-border rounded-lg text-xs text-muted">Cancelar</button>
            <button onClick={addLabel} disabled={!newName.trim() || saving} className="flex-1 py-1.5 bg-ink text-white rounded-lg text-xs font-semibold disabled:opacity-40">
              {saving ? 'Creando...' : 'Crear etiqueta'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowNew(true)}
          className="w-full border-2 border-dashed border-border rounded-xl py-2.5 text-sm text-muted hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Nueva etiqueta
        </button>
      )}

      <button onClick={onClose} className="w-full py-2.5 bg-ink text-white rounded-xl text-sm font-bold">Cerrar</button>
    </div>
  )
}

// ── Label selector (multi) ────────────────────────────────
export function LabelSelector({ labels, selected, onChange }: {
  labels: TrainerLabel[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  if (!labels.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map(label => {
        const active = selected.includes(label.id)
        return (
          <button key={label.id}
            onClick={() => onChange(active ? selected.filter(id => id !== label.id) : [...selected, label.id])}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border transition-all ${active ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
            style={{
              backgroundColor: active ? label.color + '18' : 'transparent',
              borderColor: label.color + '60',
              color: label.color
            }}>
            <span>{label.emoji}</span>
            <span>{label.name}</span>
            {active && <Check className="w-2.5 h-2.5" />}
          </button>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────
export function TemplatesTab({ trainerId, clients }: Props) {
  const [templates, setTemplates]     = useState<TrainingTemplate[]>([])
  const [labels, setLabels]           = useState<TrainerLabel[]>([])
  const [loading, setLoading]         = useState(true)
  const [editing, setEditing]         = useState<TrainingTemplate | null>(null)
  const [editingPlan, setEditingPlan] = useState<TrainingPlan | null>(null)
  const [editName, setEditName]       = useState('')
  const [editType, setEditType]       = useState('')
  const [editLabelIds, setEditLabelIds] = useState<string[]>([])
  const [saving, setSaving]           = useState(false)
  const [expanded, setExpanded]       = useState<string | null>(null)
  const [addingType, setAddingType]   = useState(false)
  const [newTypeInput, setNewTypeInput] = useState('')
  const [customTypes, setCustomTypes] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_TYPES(trainerId)) || '[]') } catch { return [] }
  })
  const [filterLabelId, setFilterLabelId] = useState<string | null>(null)
  const [showLabelManager, setShowLabelManager] = useState(false)
  const library = useExerciseLibrary(trainerId)

  useEffect(() => {
    if (!trainerId) return
    try {
      const cached = localStorage.getItem(LS_KEY(trainerId))
      if (cached) setTemplates(JSON.parse(cached))
    } catch {}
    loadAll()
  }, [trainerId])

  const loadAll = async () => {
    setLoading(true)

    // Migración única de localStorage a Supabase
    const migrated = localStorage.getItem(LS_MIGRATED(trainerId))
    if (!migrated) {
      try {
        const local: TrainingTemplate[] = JSON.parse(localStorage.getItem(LS_KEY(trainerId)) || '[]')
        if (local.length > 0) {
          const rows = local.map(t => ({
            id: t.id || `tmpl_${Date.now()}`,
            trainer_id: trainerId,
            name: t.name || 'Plantilla',
            description: t.description || '',
            plan: t,
            created_at: t.createdAt || Date.now(),
            updated_at: t.updatedAt || Date.now(),
            label_ids: [],
          }))
          const { error } = await supabase.from('plan_templates').upsert(rows, { onConflict: 'id' })
          if (!error) localStorage.setItem(LS_MIGRATED(trainerId), '1')
        } else {
          localStorage.setItem(LS_MIGRATED(trainerId), '1')
        }
      } catch {}
    }

    const [tmplRes, labelRes] = await Promise.all([
      supabase.from('plan_templates').select('*').eq('trainer_id', trainerId).order('created_at', { ascending: false }),
      supabase.from('labels').select('*').eq('trainer_id', trainerId).order('created_at'),
    ])

    if (tmplRes.data) {
      const parsed: TrainingTemplate[] = tmplRes.data.map((r: any) => ({
        ...r.plan, id: r.id, name: r.name, description: r.description || '',
        label_ids: r.label_ids || [],
      }))
      setTemplates(parsed)
      localStorage.setItem(LS_KEY(trainerId), JSON.stringify(parsed))
    }
    if (labelRes.data) setLabels(labelRes.data)
    setLoading(false)
  }

  const persistTemplate = async (tmpl: TrainingTemplate) => {
    const row = {
      id: tmpl.id,
      trainer_id: trainerId,
      name: tmpl.name,
      description: tmpl.description || '',
      plan: tmpl,
      created_at: tmpl.createdAt || Date.now(),
      updated_at: Date.now(),
      label_ids: (tmpl as any).label_ids || [],
    }
    const { error } = await supabase.from('plan_templates').upsert(row, { onConflict: 'id' })
    if (error) throw error
    const updated = templates.find(t => t.id === tmpl.id)
      ? templates.map(t => t.id === tmpl.id ? tmpl : t)
      : [tmpl, ...templates]
    setTemplates(updated)
    localStorage.setItem(LS_KEY(trainerId), JSON.stringify(updated))
  }

  const handleSave = async () => {
    if (!editing || !editingPlan) return
    setSaving(true)
    try {
      const saved = { ...planToTmpl(editing, editingPlan, editName, editType), label_ids: editLabelIds } as any
      await persistTemplate(saved)
      toast('Plantilla guardada ✓', 'ok')
      setEditing(null); setEditingPlan(null); setAddingType(false)
    } catch {
      toast('Error al guardar', 'warn')
    }
    setSaving(false)
  }

  const deleteTemplate = async (id: string) => {
    await supabase.from('plan_templates').delete().eq('id', id)
    const updated = templates.filter(t => t.id !== id)
    setTemplates(updated)
    localStorage.setItem(LS_KEY(trainerId), JSON.stringify(updated))
    toast('Plantilla eliminada', 'ok')
  }

  const duplicateTemplate = async (tmpl: TrainingTemplate) => {
    const copy: TrainingTemplate = {
      ...tmpl, id: `tmpl_${Date.now()}`,
      name: `${tmpl.name} (copia)`,
      createdAt: Date.now(), updatedAt: Date.now(),
    }
    await persistTemplate(copy)
    toast('Plantilla duplicada ✓', 'ok')
  }

  const startNew = () => {
    const tmpl = emptyTemplate(trainerId)
    setEditing(tmpl); setEditName(tmpl.name); setEditType(tmpl.type)
    setEditLabelIds([])
    setEditingPlan(tmplToPlan(tmpl))
  }

  const startEdit = (tmpl: TrainingTemplate) => {
    setEditing(tmpl); setEditName(tmpl.name); setEditType(tmpl.type)
    setEditLabelIds((tmpl as any).label_ids || [])
    setEditingPlan(tmplToPlan(tmpl))
  }

  const addCustomType = () => {
    const tipo = newTypeInput.trim()
    if (!tipo) return
    const updated = [...customTypes, tipo]
    setCustomTypes(updated)
    localStorage.setItem(LS_TYPES(trainerId), JSON.stringify(updated))
    setEditType(tipo); setNewTypeInput(''); setAddingType(false)
  }

  const allTypes = [...TIPOS_DEFAULT, ...customTypes]

  // Filtrar por etiqueta
  const filteredTemplates = filterLabelId
    ? templates.filter(t => ((t as any).label_ids || []).includes(filterLabelId))
    : templates

  // ── VISTA EDITOR ──────────────────────────────────────
  if (editing && editingPlan) {
    return (
      <div className="animate-fade-in flex flex-col gap-3">
        {/* Fila 1: atrás + nombre + guardar */}
        <div className="flex items-center gap-3">
          <button onClick={() => { setEditing(null); setEditingPlan(null); setAddingType(false) }}
            className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <input value={editName} onChange={e => setEditName(e.target.value)}
            placeholder="Nombre de la plantilla"
            className="flex-1 px-3 py-2 bg-bg border border-border rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-accent/20" />
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 flex-shrink-0">
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>

        {/* Fila 2: tipo */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-muted font-semibold uppercase tracking-wider mr-1">Tipo:</span>
          {allTypes.map(tipo => (
            <button key={tipo} onClick={() => setEditType(tipo)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${editType === tipo ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent hover:text-accent'}`}>
              {tipo}
            </button>
          ))}
          {addingType ? (
            <div className="flex gap-1.5 items-center">
              <input autoFocus value={newTypeInput} onChange={e => setNewTypeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCustomType(); if (e.key === 'Escape') { setAddingType(false); setNewTypeInput('') } }}
                placeholder="Nuevo tipo..." className="px-3 py-1 bg-bg border border-accent/40 rounded-lg text-xs outline-none w-32" />
              <button onClick={addCustomType} className="px-2 py-1 bg-ink text-white rounded-lg text-xs font-semibold">Crear</button>
              <button onClick={() => { setAddingType(false); setNewTypeInput('') }} className="px-2 py-1 border border-border rounded-lg text-xs text-muted">✕</button>
            </div>
          ) : (
            <button onClick={() => setAddingType(true)}
              className="px-3 py-1 rounded-lg text-xs font-semibold border border-dashed border-border text-muted hover:border-accent hover:text-accent transition-all">
              + Nuevo tipo
            </button>
          )}
        </div>

        {/* Fila 3: etiquetas */}
        {labels.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted font-semibold uppercase tracking-wider">Etiquetas:</span>
            <LabelSelector labels={labels} selected={editLabelIds} onChange={setEditLabelIds} />
          </div>
        )}

        {/* Editor */}
        <TrainingPlanEditor plan={editingPlan} onChange={setEditingPlan} library={library.exercises} />
      </div>
    )
  }

  // ── VISTA LISTA ──────────────────────────────────────
  return (
    <div className="animate-fade-in space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold">Plantillas</h2>
          <p className="text-muted text-sm mt-1">Planes reutilizables para aplicar a cualquier cliente</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowLabelManager(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-sm font-semibold text-muted hover:border-accent hover:text-accent transition-colors">
            <Tag className="w-3.5 h-3.5" /> Etiquetas
          </button>
          <button onClick={startNew}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
            <Plus className="w-4 h-4" /> Nueva plantilla
          </button>
        </div>
      </div>

      {/* Modal gestor de etiquetas */}
      {showLabelManager && (
        <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-xl">Gestionar etiquetas</h3>
              <button onClick={() => setShowLabelManager(false)} className="p-2 rounded-xl hover:bg-bg-alt text-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <LabelManager
              trainerId={trainerId}
              labels={labels}
              onUpdate={setLabels}
              onClose={() => setShowLabelManager(false)}
            />
          </div>
        </div>
      )}

      {/* Filtro por etiquetas */}
      {labels.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={() => setFilterLabelId(null)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${!filterLabelId ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
            Todas ({templates.length})
          </button>
          {labels.map(label => {
            const count = templates.filter(t => ((t as any).label_ids || []).includes(label.id)).length
            return (
              <button key={label.id} onClick={() => setFilterLabelId(filterLabelId === label.id ? null : label.id)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${filterLabelId === label.id ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                style={{
                  backgroundColor: filterLabelId === label.id ? label.color + '18' : 'transparent',
                  borderColor: label.color + '60',
                  color: label.color
                }}>
                {label.emoji} {label.name} ({count})
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-card border border-border rounded-2xl animate-pulse" />)}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl text-muted">
          <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-serif text-lg font-bold">{filterLabelId ? 'Sin plantillas con esta etiqueta' : 'Sin plantillas'}</p>
          <p className="text-sm mt-1">{filterLabelId ? 'Asigna esta etiqueta a una plantilla para verla aquí' : 'Crea tu primera plantilla y aplícala a cualquier cliente'}</p>
          {!filterLabelId && (
            <button onClick={startNew} className="mt-4 px-5 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold">
              Crear plantilla
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTemplates.map(tmpl => {
            const tmplLabels = labels.filter(l => ((tmpl as any).label_ids || []).includes(l.id))
            return (
              <div key={tmpl.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:border-accent/30 transition-colors">
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{tmpl.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {tmpl.type && (
                        <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold">
                          {tmpl.type}
                        </span>
                      )}
                      <p className="text-xs text-muted">
                        {tmpl.weeks?.length || 0} sem · {tmpl.weeks?.[0]?.days?.length || 0} días
                      </p>
                      {tmplLabels.map(label => (
                        <LabelPill key={label.id} label={label} small />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(tmpl)} className="p-1.5 text-muted hover:text-accent rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => duplicateTemplate(tmpl)} className="p-1.5 text-muted hover:text-accent rounded-lg"><Copy className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteTemplate(tmpl.id)} className="p-1.5 text-muted hover:text-warn rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setExpanded(expanded === tmpl.id ? null : tmpl.id)} className="p-1.5 text-muted rounded-lg">
                      {expanded === tmpl.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expanded === tmpl.id && (
                  <div className="border-t border-border px-5 py-4 space-y-3">
                    {(tmpl.weeks || []).map((week, wi) => (
                      <div key={wi}>
                        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1.5">{week.label}</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(week.days || []).map((day, di) => (
                            <div key={di} className="bg-bg border border-border rounded-lg px-3 py-2">
                              <p className="text-xs font-semibold truncate">{day.title}</p>
                              <p className="text-[10px] text-muted">{day.exercises?.length || 0} ejercicios</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
