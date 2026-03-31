import { useState } from 'react'
import {
  Plus, Trash2, Edit2, X, ClipboardList, Save, ArrowLeft,
  Users, Utensils
} from 'lucide-react'
import { TrainingTemplate, WeekPlan, ClientData } from '../../types'
import { TRAINING_TYPES } from '../../lib/constants'
import { TrainingPlanEditor } from './TrainingPlanEditor'
import { useExerciseLibrary } from '../../hooks/useExerciseLibrary'
import { toast } from '../shared/Toast'
import { Modal } from '../shared/Modal'
import { supabase } from '../../lib/supabase'

const LS_KEY = (uid: string) => `pf_templates_${uid}`
const LS_DIET_KEY = (uid: string) => `pf_diet_templates_${uid}`

function loadTemplates(trainerId: string): TrainingTemplate[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY(trainerId)) || '[]') } catch { return [] }
}
function saveTemplates(trainerId: string, t: TrainingTemplate[]) {
  localStorage.setItem(LS_KEY(trainerId), JSON.stringify(t))
}

interface DietTemplate {
  id: string; name: string; description: string
  kcal: number; protein: number; carbs: number; fats: number
  advice: string; meals: any[]
  createdAt: number
}
function loadDietTemplates(uid: string): DietTemplate[] {
  try { return JSON.parse(localStorage.getItem(LS_DIET_KEY(uid)) || '[]') } catch { return [] }
}
function saveDietTemplates(uid: string, t: DietTemplate[]) {
  localStorage.setItem(LS_DIET_KEY(uid), JSON.stringify(t))
}

interface Props {
  trainerId: string
  clients: ClientData[]
}

type View = 'list' | 'new' | 'edit' | 'diet-new' | 'diet-edit'
type TabType = 'training' | 'diet'

export function TemplatesTab({ trainerId, clients }: Props) {
  const [tab, setTab] = useState<TabType>('training')
  const [templates, setTemplates] = useState<TrainingTemplate[]>(() => loadTemplates(trainerId))
  const [dietTemplates, setDietTemplates] = useState<DietTemplate[]>(() => loadDietTemplates(trainerId))
  const [view, setView] = useState<View>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [applyModal, setApplyModal] = useState<{ template: TrainingTemplate } | null>(null)
  const [applyDietModal, setApplyDietModal] = useState<{ template: DietTemplate } | null>(null)
  const [applying, setApplying] = useState(false)
  const library = useExerciseLibrary(trainerId)

  const [form, setForm] = useState({ name: '', type: 'hipertrofia', description: '', weeks: [] as WeekPlan[] })
  const [dietForm, setDietForm] = useState<Omit<DietTemplate, 'id' | 'createdAt'>>({
    name: '', description: '', kcal: 2000, protein: 150, carbs: 200, fats: 60, advice: '', meals: []
  })

  const persistTemplates = (updated: TrainingTemplate[]) => {
    setTemplates(updated); saveTemplates(trainerId, updated)
  }

  const handleSaveTemplate = () => {
    if (!form.name.trim()) { toast('El nombre es obligatorio', 'warn'); return }
    const now = Date.now()
    if (view === 'new') {
      persistTemplates([...templates, { id: `tpl_${now}`, trainerId, name: form.name, type: form.type, description: form.description, weeks: form.weeks, createdAt: now, updatedAt: now }])
      toast('Plantilla creada ✓', 'ok')
    } else if (editingId) {
      persistTemplates(templates.map(t => t.id === editingId ? { ...t, ...form, updatedAt: now } : t))
      toast('Guardada ✓', 'ok')
    }
    setView('list')
  }

  const applyTemplateToClient = async (clientId: string) => {
    if (!applyModal) return
    setApplying(true)
    const plan = { clientId, type: applyModal.template.type, restMain: 180, restAcc: 90, restWarn: 30, weeks: applyModal.template.weeks }
    const { error } = await supabase.from('planes')
      .upsert({ clientId, plan: { P: plan }, updatedAt: new Date().toISOString() }, { onConflict: 'clientId' })
    if (error) toast('Error: ' + error.message, 'warn')
    else toast(`Plantilla aplicada a ${clients.find(c => c.id === clientId)?.name} ✓`, 'ok')
    setApplying(false)
    setApplyModal(null)
  }

  const persistDietTemplates = (updated: DietTemplate[]) => {
    setDietTemplates(updated); saveDietTemplates(trainerId, updated)
  }

  const handleSaveDietTemplate = () => {
    if (!dietForm.name.trim()) { toast('El nombre es obligatorio', 'warn'); return }
    const now = Date.now()
    if (view === 'diet-new') {
      persistDietTemplates([...dietTemplates, { id: `dtpl_${now}`, ...dietForm, createdAt: now }])
      toast('Plantilla de dieta creada ✓', 'ok')
    } else if (editingId) {
      persistDietTemplates(dietTemplates.map(t => t.id === editingId ? { ...t, ...dietForm } : t))
      toast('Guardada ✓', 'ok')
    }
    setView('list')
  }

  const applyDietToClient = async (clientId: string) => {
    if (!applyDietModal) return
    setApplying(true)
    const { template } = applyDietModal
    const diet = { clientId, kcal: template.kcal, protein: template.protein, carbs: template.carbs, fats: template.fats, meals: template.meals, advice: template.advice, updatedAt: new Date().toISOString() }
    const { error } = await supabase.from('dietas')
      .upsert({ cliente_id: clientId, datos: diet }, { onConflict: 'cliente_id' })
    if (error) toast('Error: ' + error.message, 'warn')
    else toast(`Dieta aplicada a ${clients.find(c => c.id === clientId)?.name} ✓`, 'ok')
    setApplying(false)
    setApplyDietModal(null)
  }

  if (view === 'list') return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-3xl font-serif font-bold">Plantillas</h2>
          <p className="text-muted text-sm mt-1">Crea y aplica rutinas y dietas a tus clientes</p>
        </div>
        <button onClick={() => {
          if (tab === 'training') { setForm({ name: '', type: 'hipertrofia', description: '', weeks: [] }); setEditingId(null); setView('new') }
          else { setDietForm({ name: '', description: '', kcal: 2000, protein: 150, carbs: 200, fats: 60, advice: '', meals: [] }); setEditingId(null); setView('diet-new') }
        }}
          className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90 flex-shrink-0">
          <Plus className="w-4 h-4" /> Nueva plantilla
        </button>
      </div>

      <div className="flex gap-1 bg-bg p-1 rounded-xl border border-border w-fit">
        <button onClick={() => setTab('training')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'training' ? 'bg-card shadow-sm text-ink' : 'text-muted'}`}>
          <ClipboardList className="w-4 h-4" /> Rutinas
        </button>
        <button onClick={() => setTab('diet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'diet' ? 'bg-card shadow-sm text-ink' : 'text-muted'}`}>
          <Utensils className="w-4 h-4" /> Dietas
        </button>
      </div>

      {tab === 'training' && (
        templates.length === 0 ? (
          <div className="bg-card border-2 border-dashed border-border rounded-2xl p-16 text-center">
            <ClipboardList className="w-10 h-10 text-muted/30 mx-auto mb-3" />
            <h3 className="font-serif font-bold text-lg mb-1">Sin plantillas de rutina</h3>
            <p className="text-muted text-sm mb-6">Crea una rutina y aplícala a cualquier cliente con un clic.</p>
            <button onClick={() => { setForm({ name: '', type: 'hipertrofia', description: '', weeks: [] }); setView('new') }}
              className="px-5 py-2.5 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90">
              Crear primera plantilla
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(t => (
              <div key={t.id} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-bg flex items-center justify-center text-muted flex-shrink-0">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setForm({ name: t.name, type: t.type, description: t.description, weeks: t.weeks }); setEditingId(t.id); setView('edit') }}
                      className="p-2 rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {deletingId === t.id ? (
                      <>
                        <button onClick={() => { persistTemplates(templates.filter(x => x.id !== t.id)); setDeletingId(null); toast('Eliminada', 'ok') }}
                          className="px-2 py-1 bg-warn/10 text-warn border border-warn/30 rounded text-[10px] font-bold">Borrar</button>
                        <button onClick={() => setDeletingId(null)} className="px-2 py-1 bg-bg border border-border rounded text-[10px] text-muted ml-1">No</button>
                      </>
                    ) : (
                      <button onClick={() => setDeletingId(t.id)} className="p-2 rounded-lg text-muted hover:text-warn hover:bg-warn/10 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="font-serif font-bold text-base mb-1">{t.name}</h3>
                {t.description && <p className="text-xs text-muted mb-3 line-clamp-2">{t.description}</p>}
                <div className="flex gap-2 mb-4 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted bg-bg px-2 py-1 rounded border border-border">
                    {TRAINING_TYPES.find(x => x.value === t.type)?.label || t.type}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted bg-bg px-2 py-1 rounded border border-border">
                    {t.weeks.length} sem · {t.weeks.reduce((a, w) => a + w.days.length, 0)} días
                  </span>
                </div>
                <button onClick={() => setApplyModal({ template: t })}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                  <Users className="w-4 h-4" /> Aplicar a un cliente
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'diet' && (
        dietTemplates.length === 0 ? (
          <div className="bg-card border-2 border-dashed border-border rounded-2xl p-16 text-center">
            <Utensils className="w-10 h-10 text-muted/30 mx-auto mb-3" />
            <h3 className="font-serif font-bold text-lg mb-1">Sin plantillas de dieta</h3>
            <p className="text-muted text-sm mb-6">Crea una dieta tipo y aplícala a cualquier cliente.</p>
            <button onClick={() => { setDietForm({ name: '', description: '', kcal: 2000, protein: 150, carbs: 200, fats: 60, advice: '', meals: [] }); setView('diet-new') }}
              className="px-5 py-2.5 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90">
              Crear primera dieta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dietTemplates.map(t => (
              <div key={t.id} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-bg flex items-center justify-center text-muted flex-shrink-0">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setDietForm({ name: t.name, description: t.description, kcal: t.kcal, protein: t.protein, carbs: t.carbs, fats: t.fats, advice: t.advice, meals: t.meals }); setEditingId(t.id); setView('diet-edit') }}
                      className="p-2 rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {deletingId === t.id ? (
                      <>
                        <button onClick={() => { persistDietTemplates(dietTemplates.filter(x => x.id !== t.id)); setDeletingId(null); toast('Eliminada', 'ok') }}
                          className="px-2 py-1 bg-warn/10 text-warn border border-warn/30 rounded text-[10px] font-bold">Borrar</button>
                        <button onClick={() => setDeletingId(null)} className="px-2 py-1 bg-bg border border-border rounded text-[10px] text-muted ml-1">No</button>
                      </>
                    ) : (
                      <button onClick={() => setDeletingId(t.id)} className="p-2 rounded-lg text-muted hover:text-warn hover:bg-warn/10 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="font-serif font-bold text-base mb-1">{t.name}</h3>
                {t.description && <p className="text-xs text-muted mb-3 line-clamp-2">{t.description}</p>}
                <div className="flex gap-2 mb-4 flex-wrap">
                  {[['Kcal', t.kcal], ['P', t.protein + 'g'], ['C', t.carbs + 'g'], ['G', t.fats + 'g']].map(([l, v]) => (
                    <span key={l} className="text-[10px] font-bold uppercase tracking-wider text-muted bg-bg px-2 py-1 rounded border border-border">{l}: {v}</span>
                  ))}
                </div>
                <button onClick={() => setApplyDietModal({ template: t })}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                  <Users className="w-4 h-4" /> Aplicar a un cliente
                </button>
              </div>
            ))}
          </div>
        )
      )}

      <Modal open={!!applyModal} onClose={() => setApplyModal(null)} title="Aplicar plantilla a cliente">
        {applyModal && (
          <div className="space-y-3">
            <p className="text-sm text-muted mb-4">Selecciona el cliente. <span className="text-warn font-medium">Esto reemplazará su plan actual.</span></p>
            {clients.length === 0 && <p className="text-sm text-muted text-center py-4">No tienes clientes aún.</p>}
            {clients.map(c => (
              <button key={c.id} onClick={() => applyTemplateToClient(c.id)} disabled={applying}
                className="w-full flex items-center gap-3 px-4 py-3 bg-bg border border-border rounded-xl hover:border-accent transition-all text-left disabled:opacity-50">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">{c.name[0]}</div>
                <p className="text-sm font-semibold">{c.name} {c.surname}</p>
              </button>
            ))}
          </div>
        )}
      </Modal>

      <Modal open={!!applyDietModal} onClose={() => setApplyDietModal(null)} title="Aplicar dieta a cliente">
        {applyDietModal && (
          <div className="space-y-3">
            <p className="text-sm text-muted mb-4">Selecciona el cliente. <span className="text-warn font-medium">Esto reemplazará su dieta actual.</span></p>
            {clients.length === 0 && <p className="text-sm text-muted text-center py-4">No tienes clientes aún.</p>}
            {clients.map(c => (
              <button key={c.id} onClick={() => applyDietToClient(c.id)} disabled={applying}
                className="w-full flex items-center gap-3 px-4 py-3 bg-bg border border-border rounded-xl hover:border-accent transition-all text-left disabled:opacity-50">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">{c.name[0]}</div>
                <p className="text-sm font-semibold">{c.name} {c.surname}</p>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )

  if (view === 'new' || view === 'edit') return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('list')} className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-serif font-bold flex-1">{view === 'new' ? 'Nueva plantilla' : 'Editar plantilla'}</h2>
        <button onClick={handleSaveTemplate}
          className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90">
          <Save className="w-4 h-4" /> Guardar
        </button>
      </div>
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Nombre *</label>
          <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Fuerza Intermedio 8 semanas"
            className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Tipo</label>
          <div className="flex flex-wrap gap-2">
            {TRAINING_TYPES.map(tt => (
              <button key={tt.value} onClick={() => setForm(f => ({ ...f, type: tt.value }))}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${form.type === tt.value ? 'border-ink bg-ink text-white' : 'border-border bg-bg text-muted hover:border-muted'}`}>
                {tt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Descripción</label>
          <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Breve descripción del programa..."
            className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none"
          />
        </div>
      </div>
      <TrainingPlanEditor
        plan={{ clientId: 'template', type: form.type, restMain: 180, restAcc: 90, restWarn: 30, weeks: form.weeks }}
        onChange={p => setForm(f => ({ ...f, weeks: p.weeks }))}
        library={library.exercises}
      />
    </div>
  )

  if (view === 'diet-new' || view === 'diet-edit') return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('list')} className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-serif font-bold flex-1">{view === 'diet-new' ? 'Nueva dieta tipo' : 'Editar dieta'}</h2>
        <button onClick={handleSaveDietTemplate}
          className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90">
          <Save className="w-4 h-4" /> Guardar
        </button>
      </div>
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Nombre *</label>
          <input type="text" value={dietForm.name} onChange={e => setDietForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Déficit calórico moderado · 2000 kcal"
            className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Descripción</label>
          <textarea rows={2} value={dietForm.description} onChange={e => setDietForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Para quién es esta dieta, objetivo..."
            className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none resize-none"
          />
        </div>
      </div>
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-semibold">Macros objetivo</h4>
        <div className="grid grid-cols-2 gap-3">
          {[['kcal', 'Calorías (kcal)'], ['protein', 'Proteína (g)'], ['carbs', 'Carbohidratos (g)'], ['fats', 'Grasas (g)']].map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs text-muted mb-1">{label}</label>
              <input type="number" value={(dietForm as any)[key]}
                onChange={e => setDietForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h4 className="text-sm font-semibold">Consejo / Nota</h4>
        <textarea rows={3} value={dietForm.advice} onChange={e => setDietForm(f => ({ ...f, advice: e.target.value }))}
          placeholder="Indicaciones generales de esta dieta..."
          className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none"
        />
      </div>
    </div>
  )

  return null
}
