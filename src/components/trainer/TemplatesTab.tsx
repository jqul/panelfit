import { TrainerLabel, LabelPill, LabelSelector } from './labels'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientData, TrainingTemplate, TrainingPlan } from '../../types'
import { toast } from '../shared/Toast'
import { Plus, Trash2, Copy, ChevronDown, ChevronUp, ClipboardCheck, Edit2, ArrowLeft, Save, Tag, X } from 'lucide-react'
import { TrainingPlanEditor } from './TrainingPlanEditor'
import { useExerciseLibrary } from '../../hooks/useExerciseLibrary'

interface Props {
  trainerId: string
  clients: ClientData[]
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

function emptyTemplate(trainerId: string): TrainingTemplate {
  return {
    id: `tmpl_${Date.now()}`,
    trainerId,
    name: 'Nuevo workout',
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
  return { ...tmpl, name: name.trim() || tmpl.name, type: type || tmpl.type, weeks: plan.weeks || tmpl.weeks, updatedAt: Date.now() }
}

// ── Label pill ────────────────────────────────────────────

export function TemplatesTab({ trainerId }: Props) {
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
  const [filterLabel, setFilterLabel] = useState<string | null>(null)
  const library = useExerciseLibrary(trainerId)
  const [showLabels, setShowLabels] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelEmoji, setNewLabelEmoji] = useState('🏷️')
  const [newLabelColor, setNewLabelColor] = useState('#6e5438')
  const [savingLabel, setSavingLabel] = useState(false)


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
    const migrated = localStorage.getItem(LS_MIGRATED(trainerId))
    if (!migrated) {
      try {
        const local: TrainingTemplate[] = JSON.parse(localStorage.getItem(LS_KEY(trainerId)) || '[]')
        if (local.length > 0) {
          const rows = local.map(t => ({ id: t.id || `tmpl_${Date.now()}`, trainer_id: trainerId, name: t.name || 'Plantilla', description: t.description || '', plan: t, created_at: t.createdAt || Date.now(), updated_at: t.updatedAt || Date.now(), label_ids: [] }))
          const { error } = await supabase.from('plan_templates').upsert(rows, { onConflict: 'id' })
          if (!error) localStorage.setItem(LS_MIGRATED(trainerId), '1')
        } else localStorage.setItem(LS_MIGRATED(trainerId), '1')
      } catch {}
    }
    const [tmplRes, labelRes] = await Promise.all([
      supabase.from('plan_templates').select('*').eq('trainer_id', trainerId).order('created_at', { ascending: false }),
      supabase.from('labels').select('*').eq('trainer_id', trainerId).order('created_at'),
    ])
    if (tmplRes.data) {
      const parsed: TrainingTemplate[] = tmplRes.data.map((r: any) => ({ ...r.plan, id: r.id, name: r.name, description: r.description || '', label_ids: r.label_ids || [] }))
      setTemplates(parsed); localStorage.setItem(LS_KEY(trainerId), JSON.stringify(parsed))
    }
    if (labelRes.data) setLabels(labelRes.data)
    setLoading(false)
  }

  const persist = async (tmpl: TrainingTemplate) => {
    const row = { id: tmpl.id, trainer_id: trainerId, name: tmpl.name, description: tmpl.description || '', plan: tmpl, created_at: tmpl.createdAt || Date.now(), updated_at: Date.now(), label_ids: (tmpl as any).label_ids || [] }
    const { error } = await supabase.from('plan_templates').upsert(row, { onConflict: 'id' })
    if (error) throw error
    const updated = templates.find(t => t.id === tmpl.id) ? templates.map(t => t.id === tmpl.id ? tmpl : t) : [tmpl, ...templates]
    setTemplates(updated); localStorage.setItem(LS_KEY(trainerId), JSON.stringify(updated))
  }

  const handleSave = async () => {
    if (!editing || !editingPlan) return
    setSaving(true)
    try {
      const saved = { ...planToTmpl(editing, editingPlan, editName, editType), label_ids: editLabelIds } as any
      await persist(saved)
      toast('Workout guardado ✓', 'ok')
      setEditing(null); setEditingPlan(null); setAddingType(false)
    } catch { toast('Error al guardar', 'warn') }
    setSaving(false)
  }

  const deleteTemplate = async (id: string) => {
    await supabase.from('plan_templates').delete().eq('id', id)
    const updated = templates.filter(t => t.id !== id)
    setTemplates(updated); localStorage.setItem(LS_KEY(trainerId), JSON.stringify(updated))
    toast('Workout eliminado', 'ok')
  }

  const duplicate = async (tmpl: TrainingTemplate) => {
    const copy: TrainingTemplate = { ...tmpl, id: `tmpl_${Date.now()}`, name: `${tmpl.name} (copia)`, createdAt: Date.now(), updatedAt: Date.now() }
    await persist(copy); toast('Duplicado ✓', 'ok')
  }

  const startNew = () => {
    const tmpl = emptyTemplate(trainerId)
    setEditing(tmpl); setEditName(tmpl.name); setEditType(tmpl.type); setEditLabelIds([])
    setEditingPlan(tmplToPlan(tmpl))
  }

  const startEdit = (tmpl: TrainingTemplate) => {
    setEditing(tmpl); setEditName(tmpl.name); setEditType(tmpl.type)
    setEditLabelIds((tmpl as any).label_ids || [])
    setEditingPlan(tmplToPlan(tmpl))
  }

  const addCustomType = () => {
    const tipo = newTypeInput.trim(); if (!tipo) return
    const updated = [...customTypes, tipo]; setCustomTypes(updated)
    localStorage.setItem(LS_TYPES(trainerId), JSON.stringify(updated))
    setEditType(tipo); setNewTypeInput(''); setAddingType(false)
  }

  const allTypes = [...TIPOS_DEFAULT, ...customTypes]
  const filtered = filterLabel ? templates.filter(t => ((t as any).label_ids || []).includes(filterLabel)) : templates

  const createLabel = async () => {
    if (!newLabelName.trim()) return
    setSavingLabel(true)
    const label: TrainerLabel = {
      id: `lbl_${Date.now()}`,
      trainer_id: trainerId,
      name: newLabelName.trim(),
      color: newLabelColor,
      emoji: newLabelEmoji,
      survey_template_id: null,
      created_at: Date.now(),
    }
    const { error } = await supabase.from('labels').insert(label)
    if (error) { toast('Error al crear etiqueta', 'warn'); setSavingLabel(false); return }
    setLabels(ls => [...ls, label])
    setNewLabelName('')
    setNewLabelEmoji('🏷️')
    toast('Etiqueta creada ✓', 'ok')
    setSavingLabel(false)
  }

  const deleteLabel = async (id: string) => {
    await supabase.from('labels').delete().eq('id', id)
    setLabels(ls => ls.filter(l => l.id !== id))
    toast('Etiqueta eliminada', 'ok')
  }

  // ── Editor ──
  if (editing && editingPlan) return (
    <div className="animate-fade-in flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button onClick={() => { setEditing(null); setEditingPlan(null) }} className="p-2 rounded-lg hover:bg-bg-alt text-muted flex-shrink-0"><ArrowLeft className="w-4 h-4" /></button>
        <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nombre del workout"
          className="flex-1 px-3 py-2 bg-bg border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-accent/20" />
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40 flex-shrink-0">
          <Save className="w-3.5 h-3.5" />{saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
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
            className="px-3 py-1 rounded-lg text-xs font-semibold border border-dashed border-border text-muted hover:border-accent hover:text-accent">
            + Nuevo tipo
          </button>
        )}
      </div>
      {labels.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted font-semibold uppercase tracking-wider">Etiquetas:</span>
          <LabelSelector labels={labels} selected={editLabelIds} onChange={setEditLabelIds} />
        </div>
      )}
      <TrainingPlanEditor plan={editingPlan} onChange={setEditingPlan} library={library.exercises} trainerId={trainerId} />
    </div>
  )

  // ── Lista ──
  return (
    <div className="animate-fade-in space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold">Workouts</h2>
          <p className="text-muted text-sm mt-1">Rutinas reutilizables con ejercicios completos</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowLabels(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${showLabels ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent hover:text-accent'}`}>
            <Tag className="w-4 h-4" /> Etiquetas
          </button>
          <button onClick={startNew}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
            <Plus className="w-4 h-4" /> Nuevo workout
          </button>
        </div>
      </div>

      {/* Panel de gestión de etiquetas */}
      {showLabels && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <p className="text-sm font-bold">Gestionar etiquetas</p>
          {/* Etiquetas existentes */}
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {labels.map(label => (
                <div key={label.id} className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl border text-xs font-semibold"
                  style={{ backgroundColor: label.color + '18', borderColor: label.color + '40', color: label.color }}>
                  <span>{label.emoji}</span>
                  <span>{label.name}</span>
                  <button onClick={() => deleteLabel(label.id)} className="ml-1 hover:opacity-70 p-0.5 rounded">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Crear nueva */}
          <div className="flex items-center gap-2 flex-wrap">
            <input value={newLabelEmoji} onChange={e => setNewLabelEmoji(e.target.value)}
              placeholder="🏷️" maxLength={2}
              className="w-12 px-2 py-2 bg-bg border border-border rounded-lg text-center text-base outline-none" />
            <input value={newLabelName} onChange={e => setNewLabelName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createLabel()}
              placeholder="Nombre de etiqueta..."
              className="flex-1 min-w-32 px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20" />
            <div className="flex gap-1.5">
              {LABEL_COLORS.map(c => (
                <button key={c} onClick={() => setNewLabelColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${newLabelColor === c ? 'scale-110 border-ink' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <button onClick={createLabel} disabled={savingLabel || !newLabelName.trim()}
              className="px-3 py-2 bg-ink text-white rounded-lg text-sm font-semibold disabled:opacity-40 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Crear
            </button>
          </div>
        </div>
      )}

      {/* Filtro etiquetas */}
      {labels.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterLabel(null)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${!filterLabel ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
            Todos ({templates.length})
          </button>
          {labels.map(label => {
            const count = templates.filter(t => ((t as any).label_ids || []).includes(label.id)).length
            return (
              <button key={label.id} onClick={() => setFilterLabel(filterLabel === label.id ? null : label.id)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${filterLabel === label.id ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                style={{ backgroundColor: filterLabel === label.id ? label.color + '18' : 'transparent', borderColor: label.color + '60', color: label.color }}>
                {label.emoji} {label.name} ({count})
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-card border border-border rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        filterLabel ? (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl text-muted">
            <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-serif text-lg font-bold">Sin workouts con esta etiqueta</p>
            <p className="text-sm mt-1">Prueba otra etiqueta o crea un nuevo workout</p>
            <button onClick={() => setFilterLabel(null)} className="mt-3 text-accent text-sm hover:underline">Ver todos</button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-border rounded-2xl overflow-hidden">
            <div className="px-8 py-10 text-center">
              <div className="w-16 h-16 bg-ok/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ClipboardCheck className="w-8 h-8 text-ok opacity-60" />
              </div>
              <p className="font-serif text-xl font-bold text-ink">Crea tu primer workout</p>
              <p className="text-sm text-muted mt-2 max-w-xs mx-auto">Los workouts son rutinas con ejercicios completos que puedes reutilizar en múltiples clientes y programas.</p>
              <button onClick={startNew} className="mt-5 px-6 py-3 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
                Crear workout
              </button>
            </div>
            <div className="border-t border-border/50 px-8 py-5 bg-bg-alt/30">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Flujo recomendado</p>
              <div className="flex items-start gap-6 flex-wrap">
                {[
                  { step: '1', label: 'Añade ejercicios', desc: 'Ve a Ejercicios y crea tu librería', color: 'bg-accent/10 text-accent' },
                  { step: '2', label: 'Crea workouts', desc: 'Combina ejercicios en rutinas', color: 'bg-ok/10 text-ok' },
                  { step: '3', label: 'Arma programas', desc: 'Asigna workouts a días de la semana', color: 'bg-ink/10 text-ink' },
                ].map(({ step, label, desc, color }) => (
                  <div key={step} className="flex items-start gap-3 flex-1 min-w-36">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${color}`}>{step}</div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{label}</p>
                      <p className="text-xs text-muted">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {filtered.map(tmpl => {
            const tmplLabels = labels.filter(l => ((tmpl as any).label_ids || []).includes(l.id))
            return (
              <div key={tmpl.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:border-accent/30 transition-colors">
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{tmpl.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {tmpl.type && <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold">{tmpl.type}</span>}
                      <p className="text-xs text-muted">{tmpl.weeks?.length || 0} sem · {tmpl.weeks?.[0]?.days?.length || 0} días</p>
                      {tmplLabels.map(l => <LabelPill key={l.id} label={l} small />)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(tmpl)} className="p-1.5 text-muted hover:text-accent rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => duplicate(tmpl)} className="p-1.5 text-muted hover:text-accent rounded-lg"><Copy className="w-3.5 h-3.5" /></button>
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
