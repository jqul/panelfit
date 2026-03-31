import { useState } from 'react'
import {
  Plus, Trash2, Edit2, X, ClipboardList, ChevronRight, Save, ArrowLeft
} from 'lucide-react'
import { TrainingTemplate, WeekPlan } from '../../types'
import { TRAINING_TYPES } from '../../lib/constants'
import { TrainingPlanEditor } from './TrainingPlanEditor'
import { useExerciseLibrary } from '../../hooks/useExerciseLibrary'
import { toast } from '../shared/Toast'

const LS_KEY = (uid: string) => `pf_templates_${uid}`

function loadTemplates(trainerId: string): TrainingTemplate[] {
  try {
    const raw = localStorage.getItem(LS_KEY(trainerId))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveTemplates(trainerId: string, templates: TrainingTemplate[]) {
  localStorage.setItem(LS_KEY(trainerId), JSON.stringify(templates))
}

interface Props { trainerId: string }

type View = 'list' | 'new' | 'edit'

export function TemplatesTab({ trainerId }: Props) {
  const [templates, setTemplates] = useState<TrainingTemplate[]>(() => loadTemplates(trainerId))
  const [view, setView] = useState<View>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form para nueva plantilla / edición
  const [form, setForm] = useState({
    name: '', type: 'hipertrofia', description: '', weeks: [] as WeekPlan[]
  })

  const library = useExerciseLibrary(trainerId)

  const persist = (updated: TrainingTemplate[]) => {
    setTemplates(updated)
    saveTemplates(trainerId, updated)
  }

  const openNew = () => {
    setForm({ name: '', type: 'hipertrofia', description: '', weeks: [] })
    setEditingId(null)
    setView('new')
  }

  const openEdit = (t: TrainingTemplate) => {
    setForm({ name: t.name, type: t.type, description: t.description, weeks: t.weeks })
    setEditingId(t.id)
    setView('edit')
  }

  const handleSave = () => {
    if (!form.name.trim()) { toast('El nombre es obligatorio', 'warn'); return }
    const now = Date.now()
    if (view === 'new') {
      const tpl: TrainingTemplate = {
        id: `tpl_${now}`, trainerId,
        name: form.name, type: form.type,
        description: form.description, weeks: form.weeks,
        createdAt: now, updatedAt: now,
      }
      persist([...templates, tpl])
      toast('Plantilla creada ✓', 'ok')
    } else if (editingId) {
      persist(templates.map(t => t.id === editingId
        ? { ...t, name: form.name, type: form.type, description: form.description, weeks: form.weeks, updatedAt: now }
        : t
      ))
      toast('Plantilla guardada ✓', 'ok')
    }
    setView('list')
  }

  const handleDelete = (id: string) => {
    persist(templates.filter(t => t.id !== id))
    setDeletingId(null)
    toast('Eliminada', 'ok')
  }

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  // ── Vista lista ───────────────────────────────────────
  if (view === 'list') return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-3xl font-serif font-bold">Plantillas</h2>
          <p className="text-muted text-sm mt-1">
            {templates.length} plantilla{templates.length !== 1 ? 's' : ''} · reutiliza tus programas
          </p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> Nueva plantilla
        </button>
      </div>

      {templates.length > 0 && (
        <div className="relative">
          <input type="text" placeholder="Buscar plantilla..."
            className="w-full pl-4 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {templates.length === 0 ? (
        <div className="bg-card border-2 border-dashed border-border rounded-2xl p-16 text-center">
          <ClipboardList className="w-12 h-12 text-muted/30 mx-auto mb-4" />
          <h3 className="font-serif font-bold text-lg">Sin plantillas aún</h3>
          <p className="text-muted text-sm mt-1 max-w-xs mx-auto">
            Crea programas completos con semanas, días y ejercicios que puedas copiar a cualquier cliente.
          </p>
          <button onClick={openNew}
            className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity mx-auto"
          >
            <Plus className="w-4 h-4" /> Crear primera plantilla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="bg-card border border-border rounded-2xl p-5 hover:border-accent/40 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-bg flex items-center justify-center text-muted flex-shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(t)}
                    className="p-2 rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                  ><Edit2 className="w-4 h-4" /></button>
                  {deletingId === t.id ? (
                    <>
                      <button onClick={() => handleDelete(t.id)} className="px-2 py-1 bg-warn/10 text-warn border border-warn/30 rounded text-[10px] font-bold uppercase">Borrar</button>
                      <button onClick={() => setDeletingId(null)} className="px-2 py-1 bg-bg border border-border rounded text-[10px] font-bold uppercase text-muted ml-1">No</button>
                    </>
                  ) : (
                    <button onClick={() => setDeletingId(t.id)}
                      className="p-2 rounded-lg text-muted hover:text-warn hover:bg-warn/10 transition-colors"
                    ><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </div>

              <h3 className="font-serif font-bold text-base leading-tight">{t.name}</h3>
              {t.description && <p className="text-xs text-muted mt-1 leading-relaxed line-clamp-2">{t.description}</p>}

              <div className="flex gap-2 mt-3 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted bg-bg px-2 py-1 rounded border border-border">
                  {TRAINING_TYPES.find(x => x.value === t.type)?.label || t.type}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted bg-bg px-2 py-1 rounded border border-border">
                  {t.weeks.length} semana{t.weeks.length !== 1 ? 's' : ''}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted bg-bg px-2 py-1 rounded border border-border">
                  {t.weeks.reduce((acc, w) => acc + w.days.length, 0)} días
                </span>
              </div>

              <button
                onClick={() => openEdit(t)}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2 border border-border rounded-xl text-sm text-muted hover:border-accent hover:text-accent transition-all"
              >
                Editar rutina <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <button onClick={openNew}
            className="p-5 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2 text-muted hover:border-accent hover:text-accent transition-all min-h-[180px]"
          >
            <Plus className="w-6 h-6" />
            <span className="text-sm font-medium">Nueva plantilla</span>
          </button>
        </div>
      )}
    </div>
  )

  // ── Vista editor ──────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header editor */}
      <div className="flex items-center gap-3">
        <button onClick={() => setView('list')}
          className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors"
        ><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1">
          <h2 className="text-2xl font-serif font-bold">
            {view === 'new' ? 'Nueva plantilla' : 'Editar plantilla'}
          </h2>
        </div>
        <button onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Save className="w-4 h-4" /> Guardar plantilla
        </button>
      </div>

      {/* Meta info */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Nombre *</label>
          <input type="text" placeholder="Ej: Fuerza Intermedio — 8 semanas"
            className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Tipo de entrenamiento</label>
          <div className="flex flex-wrap gap-2">
            {TRAINING_TYPES.map(tt => (
              <button key={tt.value} type="button"
                onClick={() => setForm(f => ({ ...f, type: tt.value }))}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                  form.type === tt.value ? 'border-ink bg-ink text-white' : 'border-border bg-bg text-muted hover:border-muted'
                }`}
              >{tt.label}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Descripción</label>
          <textarea rows={2} placeholder="Breve descripción del programa..."
            className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none"
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>
      </div>

      {/* Editor de rutina completo — mismo que en ClientPanel */}
      <TrainingPlanEditor
        plan={{
          clientId: 'template',
          type: form.type,
          restMain: 180, restAcc: 90, restWarn: 30,
          weeks: form.weeks,
        }}
        onChange={p => setForm(f => ({ ...f, weeks: p.weeks }))}
        library={library.exercises}
      />
    </div>
  )
}
