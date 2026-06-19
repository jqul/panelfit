import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from '../shared/Toast'
import { Plus, Trash2, Copy, ChevronDown, ChevronUp, ArrowLeft, Save, X } from 'lucide-react'
import { TrainerLabel, LabelSelector, LabelPill } from './labels'

// ── Tipos ─────────────────────────────────────────────────
interface Meal {
  id: string
  name: string
  time?: string
  foods: string
  kcal?: number
  protein?: number
  carbs?: number
  fat?: number
  notes?: string
}

interface NutriDay {
  label: string
  meals: Meal[]
  notes?: string
}

export interface NutritionTemplate {
  id: string
  trainer_id: string
  name: string
  tipo: string
  days: NutriDay[]
  notes?: string
  label_ids: string[]
  suplementos?: string
  modo_macros?: boolean
  macros_diarios?: { kcal: number; protein: number; carbs: number; fat: number }
  created_at: number
  updated_at: number
}

interface Props { trainerId: string }

const MEAL_PRESETS = ['Desayuno', 'Media mañana', 'Comida', 'Merienda', 'Cena', 'Post-entreno']
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const TIPOS_DEFAULT = ['Volumen', 'Definición', 'Mantenimiento', 'Pérdida de grasa', 'Rendimiento', 'Cetogénica', 'Vegetariana', 'General']
const LS_NUTR_TIPOS = (uid: string) => `pf_nutr_tipos_${uid}`
const LS_KEY = (uid: string) => `pf_nutrition_templates_${uid}`

function emptyMeal(name = 'Desayuno'): Meal {
  return { id: `meal_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, name, time: '', foods: '' }
}

function emptyTemplate(trainerId: string): NutritionTemplate {
  return {
    id: `nutr_tmpl_${Date.now()}`,
    trainer_id: trainerId,
    name: 'Nueva plantilla nutricional',
    tipo: 'General',
    label_ids: [],
    days: DAY_NAMES.map(label => ({
      label,
      meals: [emptyMeal('Desayuno'), emptyMeal('Comida'), emptyMeal('Cena')],
    })),
    notes: '',
    created_at: Date.now(),
    updated_at: Date.now(),
  }
}

// ── Meal Editor ───────────────────────────────────────────
function MealEditor({ meal, onChange, onDelete }: {
  meal: Meal; onChange: (m: Meal) => void; onDelete: () => void
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-bg-alt/30" onClick={() => setOpen(v => !v)}>
        <input value={meal.name} onChange={e => onChange({ ...meal, name: e.target.value })}
          onClick={e => e.stopPropagation()}
          className="text-sm font-semibold bg-transparent outline-none flex-1 border-b border-transparent hover:border-border focus:border-accent" />
        {meal.time && <span className="text-[10px] text-muted">{meal.time}</span>}
        {meal.kcal && <span className="text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">{meal.kcal} kcal</span>}
        <div className="flex items-center gap-1">
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1 text-muted hover:text-warn rounded"><Trash2 className="w-3 h-3" /></button>
          {open ? <ChevronUp className="w-3.5 h-3.5 text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-muted" />}
        </div>
      </div>
      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/50">
          <input type="time" value={meal.time || ''} onChange={e => onChange({ ...meal, time: e.target.value })}
            className="mt-2 w-24 px-2 py-1.5 bg-bg border border-border rounded-lg text-xs outline-none" />
          <textarea value={meal.foods} onChange={e => onChange({ ...meal, foods: e.target.value })}
            placeholder="Ej: 80g avena, 200ml leche, 1 plátano..."
            rows={2}
            className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-xs outline-none resize-none focus:ring-2 focus:ring-accent/20" />
          <div className="grid grid-cols-4 gap-1.5">
            {([
              { key: 'kcal', label: 'kcal', color: 'text-accent' },
              { key: 'protein', label: 'Prot (g)', color: 'text-ok' },
              { key: 'carbs', label: 'HC (g)', color: 'text-warn' },
              { key: 'fat', label: 'Grasas', color: 'text-muted' },
            ] as const).map(({ key, label, color }) => (
              <div key={key}>
                <p className={`text-[9px] font-bold uppercase mb-0.5 ${color}`}>{label}</p>
                <input type="number" value={meal[key] || ''} onChange={e => onChange({ ...meal, [key]: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="—" className="w-full px-2 py-1.5 bg-bg border border-border rounded-lg text-xs outline-none text-center" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Day Editor ────────────────────────────────────────────
function DayEditor({ day, onChange }: { day: NutriDay; onChange: (d: NutriDay) => void }) {
  const [open, setOpen] = useState(false)
  const totalKcal = day.meals.reduce((a, m) => a + (m.kcal || 0), 0)
  const totalProt = day.meals.reduce((a, m) => a + (m.protein || 0), 0)

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-alt/30 text-left">
        <div className="flex-1">
          <p className="font-semibold text-sm">{day.label}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted">{day.meals.length} comidas</span>
            {totalKcal > 0 && <span className="text-[10px] font-bold text-accent">{totalKcal} kcal</span>}
            {totalProt > 0 && <span className="text-[10px] text-ok">{totalProt}g prot</span>}
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          {day.meals.map((meal, i) => (
            <MealEditor key={meal.id} meal={meal}
              onChange={m => { const meals = [...day.meals]; meals[i] = m; onChange({ ...day, meals }) }}
              onDelete={() => onChange({ ...day, meals: day.meals.filter((_, idx) => idx !== i) })} />
          ))}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {MEAL_PRESETS.filter(p => !day.meals.some(m => m.name === p)).map(preset => (
              <button key={preset} onClick={() => onChange({ ...day, meals: [...day.meals, emptyMeal(preset)] })}
                className="px-2.5 py-1 rounded-lg text-xs border border-dashed border-border text-muted hover:border-accent hover:text-accent">
                + {preset}
              </button>
            ))}
            <button onClick={() => onChange({ ...day, meals: [...day.meals, emptyMeal('Comida')] })}
              className="px-2.5 py-1 rounded-lg text-xs border border-dashed border-border text-muted hover:border-accent hover:text-accent flex items-center gap-1">
              <Plus className="w-3 h-3" /> Otra
            </button>
          </div>
          <input value={day.notes || ''} onChange={e => onChange({ ...day, notes: e.target.value })}
            placeholder="Notas del día..."
            className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-xs outline-none mt-1" />
        </div>
      )}
    </div>
  )
}

// ── Editor completo ───────────────────────────────────────
function TemplateEditor({ template: initial, labels, onSave, onBack }: {
  template: NutritionTemplate
  labels: TrainerLabel[]
  onSave: (t: NutritionTemplate) => Promise<void>
  onBack: () => void
}) {
  const [tmpl, setTmpl] = useState<NutritionTemplate>(JSON.parse(JSON.stringify(initial)))
  const [saving, setSaving] = useState(false)
  const [activeDay, setActiveDay] = useState(0)
  const [addingTipo, setAddingTipo] = useState(false)
  const [newTipoInput, setNewTipoInput] = useState('')
  const [customTipos, setCustomTipos] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_NUTR_TIPOS(initial.trainer_id)) || '[]') } catch { return [] }
  })
  const allTipos = [...TIPOS_DEFAULT, ...customTipos]

  const addCustomTipo = () => {
    const tipo = newTipoInput.trim()
    if (!tipo) return
    const updated = [...customTipos, tipo]
    setCustomTipos(updated)
    localStorage.setItem(LS_NUTR_TIPOS(initial.trainer_id), JSON.stringify(updated))
    setTmpl(t => ({ ...t, tipo }))
    setNewTipoInput('')
    setAddingTipo(false)
  }

  const deleteTipo = (tipo: string) => {
    const updated = customTipos.filter(t => t !== tipo)
    setCustomTipos(updated)
    localStorage.setItem(LS_NUTR_TIPOS(initial.trainer_id), JSON.stringify(updated))
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave({ ...tmpl, updated_at: Date.now() })
    setSaving(false)
  }

  const updateDay = (i: number, day: NutriDay) => {
    const days = [...tmpl.days]; days[i] = day; setTmpl({ ...tmpl, days })
  }

  const copyDay = (from: number) => {
    const days = [...tmpl.days]
    days[activeDay] = { ...days[from], label: days[activeDay].label }
    setTmpl({ ...tmpl, days })
    toast(`Copiado de ${days[from].label}`, 'ok')
  }

  const totalKcal = tmpl.days[activeDay]?.meals.reduce((a, m) => a + (m.kcal || 0), 0) || 0
  const totalProt = tmpl.days[activeDay]?.meals.reduce((a, m) => a + (m.protein || 0), 0) || 0
  const totalCarbs = tmpl.days[activeDay]?.meals.reduce((a, m) => a + (m.carbs || 0), 0) || 0
  const totalFat = tmpl.days[activeDay]?.meals.reduce((a, m) => a + (m.fat || 0), 0) || 0

  return (
    <div className="animate-fade-in space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-bg-alt text-muted"><ArrowLeft className="w-4 h-4" /></button>
        <input value={tmpl.name} onChange={e => setTmpl({ ...tmpl, name: e.target.value })}
          className="flex-1 min-w-0 px-3 py-2 bg-bg border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-accent/20" />
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40">
          <Save className="w-3.5 h-3.5" /> {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* Tipo + etiquetas */}
      <div className="flex flex-wrap gap-3 items-start">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">Tipo</p>
          <div className="flex flex-wrap gap-1.5">
            {allTipos.map(tipo => (
              <div key={tipo} className="flex items-center gap-0.5 group">
                <button onClick={() => setTmpl(t => ({ ...t, tipo }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${tmpl.tipo === tipo ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
                  {tipo}
                </button>
                {customTipos.includes(tipo) && (
                  <button onClick={() => deleteTipo(tipo)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-muted hover:text-warn transition-all">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {addingTipo ? (
              <div className="flex gap-1.5 items-center">
                <input autoFocus value={newTipoInput} onChange={e => setNewTipoInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCustomTipo(); if (e.key === 'Escape') { setAddingTipo(false); setNewTipoInput('') } }}
                  placeholder="Nuevo tipo..."
                  className="px-3 py-1 bg-bg border border-accent/40 rounded-lg text-xs outline-none w-32" />
                <button onClick={addCustomTipo} className="px-2 py-1 bg-ink text-white rounded-lg text-xs font-semibold">Crear</button>
                <button onClick={() => { setAddingTipo(false); setNewTipoInput('') }} className="px-2 py-1 border border-border rounded-lg text-xs text-muted">✕</button>
              </div>
            ) : (
              <button onClick={() => setAddingTipo(true)}
                className="px-3 py-1 rounded-lg text-xs font-semibold border border-dashed border-border text-muted hover:border-accent hover:text-accent">
                + Nuevo tipo
              </button>
            )}
          </div>
        </div>
        {labels.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">Etiquetas</p>
            <LabelSelector labels={labels} selected={tmpl.label_ids} onChange={ids => setTmpl({ ...tmpl, label_ids: ids })} />
          </div>
        )}
      </div>

      {/* Selector de días */}
      <div className="flex gap-1.5 flex-wrap">
        {tmpl.days.map((day, i) => {
          const kcal = day.meals.reduce((a, m) => a + (m.kcal || 0), 0)
          return (
            <button key={i} onClick={() => setActiveDay(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeDay === i ? 'bg-ink text-white' : 'bg-card border border-border text-muted hover:border-accent'}`}>
              {day.label.slice(0, 3)}
              {kcal > 0 && <span className="ml-1 opacity-60">{kcal}</span>}
            </button>
          )
        })}
      </div>

      {/* Toggle modo macros */}
      <div className="flex items-center gap-3 p-3 bg-bg-alt/50 rounded-xl border border-border/50">
        <div className="flex-1">
          <p className="text-sm font-semibold">Solo macros diarios</p>
          <p className="text-xs text-muted">Define kcal y macros sin detallar comidas</p>
        </div>
        <button onClick={() => setTmpl(t => ({ ...t, modo_macros: !t.modo_macros }))}
          className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-all ${tmpl.modo_macros ? 'bg-accent' : 'bg-border'}`}>
          <div className={`w-5 h-5 bg-white rounded-full shadow transition-all ${tmpl.modo_macros ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Modo macros */}
      {tmpl.modo_macros && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Objetivos diarios</p>
          <div className="grid grid-cols-4 gap-3">
            {([
              { key: 'kcal',    label: 'kcal',    color: 'text-accent' },
              { key: 'protein', label: 'Prot (g)', color: 'text-ok' },
              { key: 'carbs',   label: 'HC (g)',   color: 'text-warn' },
              { key: 'fat',     label: 'Grasas',  color: 'text-muted' },
            ] as const).map(({ key, label, color }) => (
              <div key={key}>
                <p className={`text-[10px] font-bold uppercase mb-1 ${color}`}>{label}</p>
                <input type="number"
                  value={tmpl.macros_diarios?.[key] || ''}
                  onChange={e => setTmpl(t => ({ ...t, macros_diarios: { ...(t.macros_diarios || { kcal: 0, protein: 0, carbs: 0, fat: 0 }), [key]: Number(e.target.value) } }))}
                  placeholder="0"
                  className="w-full px-2 py-2 bg-bg border border-border rounded-xl text-sm outline-none text-center font-mono" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumen macros */}
      {totalKcal > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'kcal', value: totalKcal, color: 'text-accent', bg: 'bg-accent/8' },
            { label: 'Proteína', value: `${totalProt}g`, color: 'text-ok', bg: 'bg-ok/8' },
            { label: 'Hidratos', value: `${totalCarbs}g`, color: 'text-warn', bg: 'bg-warn/8' },
            { label: 'Grasas', value: `${totalFat}g`, color: 'text-muted', bg: 'bg-bg-alt' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-xl p-3 text-center ${bg}`}>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Copiar de otro día */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted">Copiar de:</span>
        {tmpl.days.filter((_, i) => i !== activeDay).map((d, i) => {
          const realIdx = tmpl.days.findIndex(dd => dd.label === d.label)
          return (
            <button key={i} onClick={() => copyDay(realIdx)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-border text-muted hover:border-accent hover:text-accent">
              <Copy className="w-3 h-3" /> {d.label.slice(0, 3)}
            </button>
          )
        })}
      </div>

      {/* Editor del día activo */}
      {tmpl.days[activeDay] && (
        <DayEditor day={tmpl.days[activeDay]} onChange={day => updateDay(activeDay, day)} />
      )}

      {/* Suplementos */}
      {!tmpl.modo_macros && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 bg-bg-alt/30">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Suplementación</p>
          </div>
          <div className="p-4">
            <textarea
              value={tmpl.suplementos || ''}
              onChange={e => setTmpl(t => ({ ...t, suplementos: e.target.value }))}
              placeholder="Ej: Creatina 5g post-entreno, Proteína 30g tras sesión, Vitamina D 2000UI con desayuno..."
              rows={3}
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-xs outline-none resize-none focus:ring-2 focus:ring-accent/20" />
          </div>
        </div>
      )}

      {/* Notas generales */}
      <div>
        <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Notas generales</label>
        <textarea value={tmpl.notes || ''} onChange={e => setTmpl({ ...tmpl, notes: e.target.value })}
          placeholder="Indicaciones generales, alergias, timing de comidas..."
          rows={2}
          className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-xs outline-none resize-none" />
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────
export function NutricionLibreria({ trainerId }: Props) {
  const [templates, setTemplates] = useState<NutritionTemplate[]>([])
  const [labels, setLabels] = useState<TrainerLabel[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<NutritionTemplate | null>(null)
  const [filterLabel, setFilterLabel] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { loadAll() }, [trainerId])

  const loadAll = async () => {
    setLoading(true)
    const [tmplRes, labelRes] = await Promise.all([
      supabase.from('nutrition_templates').select('*').eq('trainer_id', trainerId).order('created_at', { ascending: false }),
      supabase.from('labels').select('*').eq('trainer_id', trainerId).order('created_at'),
    ])
    if (tmplRes.data) { setTemplates(tmplRes.data); localStorage.setItem(LS_KEY(trainerId), JSON.stringify(tmplRes.data)) }
    if (labelRes.data) setLabels(labelRes.data)
    setLoading(false)
  }

  const saveTemplate = async (tmpl: NutritionTemplate) => {
    const { error: updateErr } = await supabase.from('nutrition_templates').update(tmpl).eq('id', tmpl.id)
    if (updateErr) {
      const { error: insertErr } = await supabase.from('nutrition_templates').insert(tmpl)
      if (insertErr) { toast('Error al guardar', 'warn'); return }
    }
    setTemplates(ts => ts.find(t => t.id === tmpl.id) ? ts.map(t => t.id === tmpl.id ? tmpl : t) : [tmpl, ...ts])
    setEditing(null)
    toast('Plantilla guardada ✓', 'ok')
  }

  const deleteTemplate = async (id: string) => {
    await supabase.from('nutrition_templates').delete().eq('id', id)
    setTemplates(ts => ts.filter(t => t.id !== id))
    toast('Eliminada', 'ok')
  }

  const duplicate = async (tmpl: NutritionTemplate) => {
    const copy: NutritionTemplate = { ...JSON.parse(JSON.stringify(tmpl)), id: `nutr_tmpl_${Date.now()}`, name: `${tmpl.name} (copia)`, created_at: Date.now(), updated_at: Date.now() }
    await supabase.from('nutrition_templates').insert(copy)
    setTemplates(ts => [copy, ...ts])
    toast('Duplicada ✓', 'ok')
  }

  const filtered = filterLabel ? templates.filter(t => t.label_ids?.includes(filterLabel)) : templates

  if (editing) return (
    <TemplateEditor template={editing} labels={labels} onSave={saveTemplate} onBack={() => setEditing(null)} />
  )

  return (
    <div className="animate-fade-in space-y-5 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-serif font-bold">Nutrición</h2>
          <p className="text-muted text-sm mt-1">Plantillas de dieta reutilizables para tus clientes</p>
        </div>
        <button onClick={() => setEditing(emptyTemplate(trainerId))}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
          <Plus className="w-4 h-4" /> Nueva plantilla
        </button>
      </div>

      {/* Filtro etiquetas */}
      {labels.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterLabel(null)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${!filterLabel ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
            Todos ({templates.length})
          </button>
          {labels.map(label => {
            const count = templates.filter(t => t.label_ids?.includes(label.id)).length
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
        <div className="border-2 border-dashed border-border rounded-2xl overflow-hidden">
          <div className="px-8 py-10 text-center">
            <div className="text-4xl mb-3">🥗</div>
            <p className="font-serif text-xl font-bold text-ink">Crea tu primera plantilla nutricional</p>
            <p className="text-sm text-muted mt-2 max-w-xs mx-auto">Define planes de comidas reutilizables con macros, horarios y notas. Asígnalos a tus clientes desde la pestaña Dieta.</p>
            <button onClick={() => setEditing(emptyTemplate(trainerId))}
              className="mt-5 px-6 py-3 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
              Crear plantilla
            </button>
          </div>
          <div className="border-t border-border/50 px-8 py-5 bg-bg-alt/30">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Flujo recomendado</p>
            <div className="flex items-start gap-6 flex-wrap">
              {[
                { step: '1', label: 'Crea plantillas', desc: 'Define planes de comidas tipo', color: 'bg-accent/10 text-accent' },
                { step: '2', label: 'Asigna al cliente', desc: 'Desde la pestaña Dieta del cliente', color: 'bg-ok/10 text-ok' },
                { step: '3', label: 'Personaliza', desc: 'Ajusta macros o comidas al cliente', color: 'bg-ink/10 text-ink' },
              ].map(({ step, label, desc, color }) => (
                <div key={step} className="flex items-start gap-3 flex-1 min-w-32">
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
      ) : (
        <div className="space-y-3">
          {filtered.map(tmpl => {
            const tmplLabels = labels.filter(l => tmpl.label_ids?.includes(l.id))
            const totalDays = tmpl.days.filter(d => d.meals.some(m => m.foods)).length
            const avgKcal = Math.round(tmpl.days.reduce((a, d) => a + d.meals.reduce((b, m) => b + (m.kcal || 0), 0), 0) / Math.max(tmpl.days.length, 1))
            const isExpanded = expanded === tmpl.id
            return (
              <div key={tmpl.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:border-accent/30 transition-colors">
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{tmpl.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold">{tmpl.tipo}</span>
                      <span className="text-[10px] text-muted">{totalDays} días definidos</span>
                      {avgKcal > 0 && <span className="text-[10px] text-muted">{avgKcal} kcal/día avg</span>}
                      {tmplLabels.map(l => <LabelPill key={l.id} label={l} small />)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setEditing(tmpl)} className="p-1.5 text-muted hover:text-accent rounded-lg text-xs font-semibold px-2 border border-border">Editar</button>
                    <button onClick={() => duplicate(tmpl)} className="p-1.5 text-muted hover:text-accent rounded-lg"><Copy className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteTemplate(tmpl.id)} className="p-1.5 text-muted hover:text-warn rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setExpanded(isExpanded ? null : tmpl.id)} className="p-1.5 text-muted rounded-lg">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-border px-5 py-4">
                    <div className="grid grid-cols-7 gap-1">
                      {tmpl.days.map((day, i) => {
                        const kcal = day.meals.reduce((a, m) => a + (m.kcal || 0), 0)
                        const hasMeals = day.meals.some(m => m.foods)
                        return (
                          <div key={i} className="text-center">
                            <p className="text-[9px] text-muted font-bold mb-1">{day.label.slice(0,3)}</p>
                            <div className={`rounded-lg py-2 ${hasMeals ? 'bg-accent/10' : 'bg-bg-alt'}`}>
                              <p className="text-[10px] font-bold text-accent">{hasMeals ? day.meals.length : '—'}</p>
                              {kcal > 0 && <p className="text-[9px] text-muted">{kcal}</p>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
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
