import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientData, TrainingTemplate, TrainingPlan, UserProfile } from '../../types'
import { toast } from '../shared/Toast'
import { Plus, Trash2, Copy, ChevronDown, ChevronUp, ClipboardCheck, Edit2, ArrowLeft, Save } from 'lucide-react'
import { TrainingPlanEditor } from './TrainingPlanEditor'
import { useExerciseLibrary } from '../../hooks/useExerciseLibrary'

interface Props {
  trainerId: string
  clients: ClientData[]
  userProfile?: UserProfile
}

const LS_KEY      = (uid: string) => `pf_templates_${uid}`
const LS_MIGRATED = (uid: string) => `pf_tmpl_migrated_${uid}`
const LS_TYPES    = (uid: string) => `pf_custom_types_${uid}`

const TIPOS_DEFAULT = [
  'Hipertrofia','Fuerza','Pérdida de grasa','Resistencia',
  'Rehabilitación','Rendimiento','General','Test inicial',
  'Iniciación','Mantenimiento','Peaking','Volumen','Definición',
]

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

export function TemplatesTab({ trainerId, clients }: Props) {
  const [templates, setTemplates]   = useState<TrainingTemplate[]>([])
  const [loading, setLoading]       = useState(true)
  const [editing, setEditing]       = useState<TrainingTemplate | null>(null)
  const [editingPlan, setEditingPlan] = useState<TrainingPlan | null>(null)
  const [editName, setEditName]     = useState('')
  const [editType, setEditType]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [addingType, setAddingType] = useState(false)
  const [newTypeInput, setNewTypeInput] = useState('')
  const [customTypes, setCustomTypes] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_TYPES(trainerId)) || '[]') } catch { return [] }
  })
  const library = useExerciseLibrary(trainerId)

  useEffect(() => {
    if (!trainerId) return
    try {
      const cached = localStorage.getItem(LS_KEY(trainerId))
      if (cached) setTemplates(JSON.parse(cached))
    } catch {}
    loadFromSupabase()
  }, [trainerId])

  const loadFromSupabase = async () => {
    setLoading(true)
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
          }))
          const { error } = await supabase.from('plan_templates').upsert(rows, { onConflict: 'id' })
          if (!error) localStorage.setItem(LS_MIGRATED(trainerId), '1')
        } else {
          localStorage.setItem(LS_MIGRATED(trainerId), '1')
        }
      } catch {}
    }

    const { data, error } = await supabase
      .from('plan_templates')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const parsed: TrainingTemplate[] = data.map((r: any) => ({
        ...r.plan, id: r.id, name: r.name, description: r.description || '',
      }))
      setTemplates(parsed)
      localStorage.setItem(LS_KEY(trainerId), JSON.stringify(parsed))
    }
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
      const saved = planToTmpl(editing, editingPlan, editName, editType)
      await persistTemplate(saved)
      toast('Plantilla guardada ✓', 'ok')
      setEditing(null)
      setEditingPlan(null)
      setAddingType(false)
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
    setEditingPlan(tmplToPlan(tmpl))
  }

  const startEdit = (tmpl: TrainingTemplate) => {
    setEditing(tmpl); setEditName(tmpl.name); setEditType(tmpl.type)
    setEditingPlan(tmplToPlan(tmpl))
  }

  const addCustomType = () => {
    const tipo = newTypeInput.trim()
    if (!tipo) return
    const updated = [...customTypes, tipo]
    setCustomTypes(updated)
    localStorage.setItem(LS_TYPES(trainerId), JSON.stringify(updated))
    setEditType(tipo)
    setNewTypeInput('')
    setAddingType(false)
  }

  const allTypes = [...TIPOS_DEFAULT, ...customTypes]

  // ── VISTA EDITOR ──────────────────────────────────────
  if (editing && editingPlan) {
    return (
      <div className="animate-fade-in flex flex-col gap-3">

        {/* Fila 1: atrás + nombre + guardar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setEditing(null); setEditingPlan(null); setAddingType(false) }}
            className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <input
            value={editName}
            onChange={e => setEditName(e.target.value)}
            placeholder="Nombre de la plantilla"
            className="flex-1 px-3 py-2 bg-bg border border-border rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-accent/20"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 flex-shrink-0">
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>

        {/* Fila 2: selector de tipo */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-muted font-semibold uppercase tracking-wider mr-1">Tipo:</span>
          {allTypes.map(tipo => (
            <button key={tipo} type="button" onClick={() => setEditType(tipo)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                editType === tipo
                  ? 'bg-ink text-white border-ink'
                  : 'border-border text-muted hover:border-accent hover:text-accent'
              }`}>
              {tipo}
            </button>
          ))}
          {addingType ? (
            <div className="flex gap-1.5 items-center">
              <input
                autoFocus
                value={newTypeInput}
                onChange={e => setNewTypeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCustomType(); if (e.key === 'Escape') { setAddingType(false); setNewTypeInput('') } }}
                placeholder="Nuevo tipo..."
                className="px-3 py-1 bg-bg border border-accent/40 rounded-lg text-xs outline-none w-32"
              />
              <button onClick={addCustomType} className="px-2 py-1 bg-ink text-white rounded-lg text-xs font-semibold">Crear</button>
              <button onClick={() => { setAddingType(false); setNewTypeInput('') }} className="px-2 py-1 border border-border rounded-lg text-xs text-muted">✕</button>
            </div>
          ) : (
            <button type="button" onClick={() => setAddingType(true)}
              className="px-3 py-1 rounded-lg text-xs font-semibold border border-dashed border-border text-muted hover:border-accent hover:text-accent transition-all">
              + Nuevo tipo
            </button>
          )}
        </div>

        {/* Editor de plan */}
        <TrainingPlanEditor
          plan={editingPlan}
          onChange={setEditingPlan}
          library={library.exercises}
        />
      </div>
    )
  }

  // ── VISTA LISTA ──────────────────────────────────────
  return (
    <div className="animate-fade-in space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold">Plantillas</h2>
          <p className="text-muted text-sm mt-1">Planes reutilizables para aplicar a cualquier cliente</p>
        </div>
        <button onClick={startNew}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
          <Plus className="w-4 h-4" /> Nueva plantilla
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-card border border-border rounded-2xl animate-pulse" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl text-muted">
          <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-serif text-lg font-bold">Sin plantillas</p>
          <p className="text-sm mt-1">Crea tu primera plantilla y aplícala a cualquier cliente</p>
          <button onClick={startNew}
            className="mt-4 px-5 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold">
            Crear plantilla
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(tmpl => (
            <div key={tmpl.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{tmpl.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {tmpl.type && (
                      <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold">
                        {tmpl.type}
                      </span>
                    )}
                    <p className="text-xs text-muted">
                      {tmpl.weeks?.length || 0} semana{(tmpl.weeks?.length || 0) !== 1 ? 's' : ''}
                      {' · '}
                      {tmpl.weeks?.[0]?.days?.length || 0} días/semana
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(tmpl)} title="Editar"
                    className="p-1.5 text-muted hover:text-accent rounded-lg transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => duplicateTemplate(tmpl)} title="Duplicar"
                    className="p-1.5 text-muted hover:text-accent rounded-lg transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteTemplate(tmpl.id)} title="Eliminar"
                    className="p-1.5 text-muted hover:text-warn rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setExpanded(expanded === tmpl.id ? null : tmpl.id)}
                    className="p-1.5 text-muted rounded-lg">
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
                            <p className="text-[10px] text-muted">
                              {day.exercises?.length || 0} ejercicio{(day.exercises?.length || 0) !== 1 ? 's' : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
