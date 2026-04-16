import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Clock, Utensils, X, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from './Toast'

export interface Meal {
  id: string; time: string; name: string; kcal: number; items: string[]
}

export interface DietPlan {
  clientId: string; kcal: number; protein: number; carbs: number; fats: number
  meals: Meal[]; advice: string; updatedAt: string
  mealDistribution?: { label: string; icon: string; pct: number }[]
  supplements?: { name: string; dosis: string; timing: string; visible: boolean }[]
  showSupplements?: boolean
}

const emptyDiet = (clientId: string): DietPlan => ({
  clientId, kcal: 0, protein: 0, carbs: 0, fats: 0, meals: [], advice: '', updatedAt: '',
  showSupplements: false,
  supplements: [
    { name: 'Creatina', dosis: '5g diarios', timing: 'Cualquier momento', visible: true },
    { name: 'Proteína whey', dosis: 'Si no llegas', timing: 'Post-entreno', visible: true },
    { name: 'Vitamina D', dosis: '2000 UI', timing: 'Con comida grasa', visible: false },
    { name: 'Omega-3', dosis: '2-3g EPA/DHA', timing: 'Con comidas', visible: false },
  ],
  mealDistribution: [
    { label: 'Desayuno', icon: '🌅', pct: 25 },
    { label: 'Media mañana', icon: '🍎', pct: 15 },
    { label: 'Comida', icon: '🍽️', pct: 35 },
    { label: 'Cena', icon: '🌙', pct: 25 },
  ],
})

const emptyMeal = (): Meal => ({ id: `meal_${Date.now()}`, time: '08:00', name: '', kcal: 0, items: [''] })

const DIET_TEMPLATES = [
  { name: 'Hipertrofia (2800 kcal)', diet: { kcal: 2800, protein: 180, carbs: 350, fats: 80, meals: [
    { id: 'm1', time: '08:00', name: 'Desayuno', kcal: 700, items: ['Avena 80g', 'Leche 300ml', 'Plátano 1ud', 'Proteína whey 30g'] },
    { id: 'm2', time: '11:00', name: 'Media mañana', kcal: 400, items: ['Arroz con leche 200g', 'Fruta 1ud'] },
    { id: 'm3', time: '14:00', name: 'Comida', kcal: 900, items: ['Arroz 150g (crudo)', 'Pollo 200g', 'Verdura al gusto', 'AOVE 20ml'] },
    { id: 'm4', time: '17:00', name: 'Merienda', kcal: 400, items: ['Pan integral 80g', 'Pavo 100g', 'Fruta 1ud'] },
    { id: 'm5', time: '21:00', name: 'Cena', kcal: 400, items: ['Salmón 200g', 'Patata 200g', 'Ensalada variada'] },
  ]}},
  { name: 'Déficit (2000 kcal)', diet: { kcal: 2000, protein: 160, carbs: 200, fats: 65, meals: [
    { id: 'm1', time: '08:00', name: 'Desayuno', kcal: 500, items: ['Huevos 3ud', 'Tostada integral 2ud', 'Café solo'] },
    { id: 'm2', time: '13:00', name: 'Comida', kcal: 700, items: ['Pollo 180g', 'Arroz 100g (crudo)', 'Verdura al vapor'] },
    { id: 'm3', time: '17:00', name: 'Merienda', kcal: 300, items: ['Yogur griego 200g', 'Nueces 20g'] },
    { id: 'm4', time: '21:00', name: 'Cena', kcal: 500, items: ['Merluza 200g', 'Ensalada grande', 'AOVE 10ml'] },
  ]}},
  { name: 'Mantenimiento (2400 kcal)', diet: { kcal: 2400, protein: 150, carbs: 280, fats: 75, meals: [
    { id: 'm1', time: '08:00', name: 'Desayuno', kcal: 600, items: ['Avena 60g', 'Leche 250ml', 'Fruta 1ud'] },
    { id: 'm2', time: '14:00', name: 'Comida', kcal: 900, items: ['Pasta 130g (crudo)', 'Carne picada 150g', 'Salsa de tomate'] },
    { id: 'm3', time: '17:00', name: 'Merienda', kcal: 300, items: ['Proteína whey 30g', 'Plátano 1ud'] },
    { id: 'm4', time: '21:00', name: 'Cena', kcal: 600, items: ['Tortilla 3 huevos', 'Ensalada', 'Pan integral 50g'] },
  ]}},
]

interface DietTemplate {
  id: string; name: string; trainerId: string; createdAt: number; diet: Partial<DietPlan>
}

function MacroPill({ label, value, unit, color, onChange }: { label: string; value: number; unit: string; color: string; onChange: (v: number) => void }) {
  return (
    <div className={`flex-1 bg-card border rounded-2xl p-4 ${color}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">{label}</p>
      <div className="flex items-baseline gap-1">
        <input type="number" min={0} max={9999} value={value} onChange={e => onChange(parseInt(e.target.value) || 0)}
          className="w-full text-2xl font-serif font-bold bg-transparent outline-none border-none p-0" />
        <span className="text-sm text-muted">{unit}</span>
      </div>
    </div>
  )
}

function MealCard({ meal, index, onChange, onDelete }: { meal: Meal; index: number; onChange: (m: Meal) => void; onDelete: () => void }) {
  const [open, setOpen] = useState(true)
  const updateItem = (i: number, val: string) => { const items = [...meal.items]; items[i] = val; onChange({ ...meal, items }) }
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-bg-alt/50" onClick={() => setOpen(o => !o)}>
        <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-bold flex-shrink-0">{index + 1}</div>
        <div className="flex-1 grid grid-cols-3 gap-3 min-w-0">
          <input type="time" value={meal.time} onClick={e => e.stopPropagation()} onChange={e => onChange({ ...meal, time: e.target.value })}
            className="bg-transparent text-sm font-semibold outline-none border-b border-transparent focus:border-accent" />
          <input type="text" placeholder="Nombre" value={meal.name} onClick={e => e.stopPropagation()} onChange={e => onChange({ ...meal, name: e.target.value })}
            className="bg-transparent text-sm font-semibold outline-none border-b border-transparent focus:border-accent" />
          <div className="flex items-center gap-1">
            <input type="number" min={0} value={meal.kcal || ''} placeholder="0" onClick={e => e.stopPropagation()} onChange={e => onChange({ ...meal, kcal: parseInt(e.target.value) || 0 })}
              className="w-20 bg-transparent text-sm text-right outline-none border-b border-transparent focus:border-accent" />
            <span className="text-xs text-muted">kcal</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-lg text-muted hover:text-warn"><Trash2 className="w-3.5 h-3.5" /></button>
          {open ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-border">
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted pt-3 mb-2">Alimentos</p>
          {meal.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-muted text-xs w-4 flex-shrink-0">{i + 1}.</span>
              <input type="text" placeholder="Ej: Avena 60g..." value={item} onChange={e => updateItem(i, e.target.value)}
                className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20" />
              {meal.items.length > 1 && (
                <button onClick={() => onChange({ ...meal, items: meal.items.filter((_, idx) => idx !== i) })} className="p-1.5 text-muted hover:text-warn flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
              )}
            </div>
          ))}
          <button onClick={() => onChange({ ...meal, items: [...meal.items, ''] })}
            className="w-full py-2 border border-dashed border-border rounded-lg text-xs text-muted hover:border-accent hover:text-accent transition-all">
            + Añadir alimento
          </button>
        </div>
      )}
    </div>
  )
}

interface Props {
  clientId: string; isTrainer: boolean; trainerId?: string
  syncedMacros?: { kcal: number; protein: number; carbs: number; fats: number }
  onMacrosChange?: (macros: { kcal: number; protein: number; carbs: number; fats: number }) => void
}

export function DietEditor({ clientId, isTrainer, trainerId, syncedMacros, onMacrosChange }: Props) {
  const [diet, setDiet] = useState<DietPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [openDist, setOpenDist] = useState(false)
  const [openSups, setOpenSups] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [savedTemplates, setSavedTemplates] = useState<DietTemplate[]>(() => {
    if (!trainerId) return []
    try { return JSON.parse(localStorage.getItem(`pf_diet_templates_${trainerId}`) || '[]') }
    catch { return [] }
  })

  useEffect(() => { loadDiet() }, [clientId])

  useEffect(() => {
    if (!syncedMacros || !diet) return
    const changed = syncedMacros.kcal !== diet.kcal || syncedMacros.protein !== diet.protein ||
      syncedMacros.carbs !== diet.carbs || syncedMacros.fats !== diet.fats
    if (changed) setDiet(d => d ? { ...d, ...syncedMacros } : d)
  }, [syncedMacros])

  const loadDiet = async () => {
    setLoading(true)
    const { data } = await supabase.from('dietas').select('datos').eq('cliente_id', clientId).maybeSingle()
    if (data?.datos) {
      const loaded = data.datos as DietPlan
      if (syncedMacros && (syncedMacros.kcal > 0 || syncedMacros.protein > 0)) {
        setDiet({ ...emptyDiet(clientId), ...loaded, ...syncedMacros })
      } else {
        setDiet({ ...emptyDiet(clientId), ...loaded })
      }
    } else {
      setDiet(syncedMacros ? { ...emptyDiet(clientId), ...syncedMacros } : emptyDiet(clientId))
    }
    setLoading(false)
  }

  const updateDiet = (updates: Partial<DietPlan>) => {
    if (!diet) return
    const newDiet = { ...diet, ...updates }
    setDiet(newDiet)
    if (onMacrosChange && (updates.kcal !== undefined || updates.protein !== undefined || updates.carbs !== undefined || updates.fats !== undefined)) {
      onMacrosChange({ kcal: newDiet.kcal, protein: newDiet.protein, carbs: newDiet.carbs, fats: newDiet.fats })
    }
  }

  const saveAsTemplate = () => {
    if (!diet || !trainerId || !templateName.trim()) return
    const tpl: DietTemplate = {
      id: `dt_${Date.now()}`, name: templateName.trim(), trainerId, createdAt: Date.now(),
      diet: { kcal: diet.kcal, protein: diet.protein, carbs: diet.carbs, fats: diet.fats,
        meals: diet.meals.map(m => ({ ...m, id: `meal_${Date.now()}_${Math.random()}` })),
        advice: diet.advice, mealDistribution: diet.mealDistribution,
        supplements: diet.supplements, showSupplements: diet.showSupplements }
    }
    const updated = [...savedTemplates, tpl]
    setSavedTemplates(updated)
    localStorage.setItem(`pf_diet_templates_${trainerId}`, JSON.stringify(updated))
    setTemplateName(''); setShowSaveTemplate(false)
    toast(`Plantilla "${tpl.name}" guardada ✓`, 'ok')
  }

  const deleteTemplate = (id: string) => {
    if (!trainerId) return
    const updated = savedTemplates.filter(t => t.id !== id)
    setSavedTemplates(updated)
    localStorage.setItem(`pf_diet_templates_${trainerId}`, JSON.stringify(updated))
    toast('Plantilla eliminada', 'ok')
  }

  const applyTemplate = (d: Partial<DietPlan>, name: string) => {
    if (!diet) return
    const meals = (d.meals || []).map((m: any) => ({ ...m, id: `meal_${Date.now()}_${Math.random().toString(36).slice(2)}` }))
    updateDiet({ ...d, meals })
    setShowTemplates(false)
    toast(`Plantilla "${name}" aplicada ✓`, 'ok')
  }

  const saveDiet = async () => {
    if (!diet) return
    setSaving(true)
    const toSave = { ...diet, updatedAt: new Date().toISOString() }
    const { error: updateError } = await supabase.from('dietas').update({ datos: toSave }).eq('cliente_id', clientId)
    if (updateError) {
      const { error: insertError } = await supabase.from('dietas').insert({ cliente_id: clientId, datos: toSave })
      if (insertError) { toast('Error al guardar: ' + insertError.message, 'warn'); setSaving(false); return }
    }
    setDiet(toSave); toast('Dieta guardada ✓', 'ok'); setSaving(false)
  }

  const sortedMeals = diet ? [...diet.meals].sort((a, b) => a.time.localeCompare(b.time)) : []
  const totalKcal = diet?.meals.reduce((s, m) => s + (m.kcal || 0), 0) || 0

  if (loading) return <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-20 bg-card border border-border rounded-2xl" />)}</div>
  if (!diet) return null

  if (!isTrainer) {
    if (!diet.meals.length && !diet.advice) return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-muted">
        <Utensils className="w-14 h-14 mb-4 opacity-20" />
        <h3 className="font-serif text-xl font-bold mb-1">Sin plan nutricional</h3>
        <p className="text-sm">Tu entrenador aún no ha creado tu dieta.</p>
      </div>
    )
    return (
      <div className="space-y-6 max-w-2xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[{label:'Calorías',value:diet.kcal,unit:'kcal',color:'border-accent/20'},{label:'Proteína',value:diet.protein,unit:'g',color:'border-ok/20'},{label:'Carbos',value:diet.carbs,unit:'g',color:'border-blue-200'},{label:'Grasas',value:diet.fats,unit:'g',color:'border-amber-200'}].map(m => (
            <div key={m.label} className={`bg-card border ${m.color} rounded-2xl p-4 text-center`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">{m.label}</p>
              <p className="text-2xl font-serif font-bold">{m.value}</p>
              <p className="text-xs text-muted">{m.unit}</p>
            </div>
          ))}
        </div>
        {diet.mealDistribution && diet.kcal > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Distribución diaria</p>
            <div className="space-y-2">
              {diet.mealDistribution.map(m => (
                <div key={m.label} className="flex items-center gap-3">
                  <span className="text-base">{m.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1"><p className="text-xs font-semibold">{m.label}</p><p className="text-xs text-muted">{Math.round(diet.kcal * m.pct / 100)} kcal</p></div>
                    <div className="h-1.5 bg-bg-alt rounded-full"><div className="h-full bg-accent rounded-full" style={{ width: `${m.pct}%` }} /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-3">
          {sortedMeals.map((meal, i) => (
            <div key={meal.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2 text-muted"><Clock className="w-4 h-4" /><span className="text-sm font-bold">{meal.time}</span></div>
                <h3 className="font-serif font-bold text-base flex-1">{meal.name}</h3>
                {meal.kcal > 0 && <span className="text-xs font-bold text-muted bg-bg px-2 py-1 rounded-full border border-border">{meal.kcal} kcal</span>}
              </div>
              <ul className="space-y-1">{meal.items.filter(Boolean).map((item, j) => <li key={j} className="flex items-start gap-2 text-sm text-muted"><span className="text-accent mt-0.5 flex-shrink-0">·</span>{item}</li>)}</ul>
            </div>
          ))}
        </div>
        {diet.showSupplements && (diet.supplements?.filter(s => s.visible).length ?? 0) > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Suplementación recomendada</p>
            <div className="space-y-2">{(diet.supplements || []).filter(s => s.visible).map((s, i) => <div key={i} className="p-2.5 bg-bg rounded-xl"><p className="text-xs font-semibold">{s.name}</p><p className="text-[10px] text-muted">{s.dosis} · {s.timing}</p></div>)}</div>
          </div>
        )}
        {diet.advice && <div className="bg-accent/5 border border-accent/20 rounded-2xl p-5"><p className="text-[10px] uppercase tracking-widest font-bold text-accent mb-2">Consejo del entrenador</p><p className="text-sm text-ink leading-relaxed italic">"{diet.advice}"</p></div>}
      </div>
    )
  }

  const dist = diet.mealDistribution || []
  const sups = diet.supplements || []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold">Plan Nutricional</h2>
          <p className="text-muted text-sm mt-0.5">{diet.meals.length} comidas · {totalKcal} kcal</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTemplates(!showTemplates)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-semibold transition-all ${showTemplates ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
            📋 Plantillas {savedTemplates.length > 0 && <span className="bg-accent text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">{savedTemplates.length}</span>}
          </button>
          <button onClick={saveDiet} disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">
            <Save className="w-4 h-4" />{saving ? 'Guardando...' : 'Guardar dieta'}
          </button>
        </div>
      </div>

      {showTemplates && (
        <div className="bg-card border border-accent/20 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Plantillas de dieta</p>
            {trainerId && <button onClick={() => setShowSaveTemplate(!showSaveTemplate)} className="text-xs text-accent hover:underline font-semibold">+ Guardar actual como plantilla</button>}
          </div>
          {showSaveTemplate && (
            <div className="flex gap-2 items-center bg-bg border border-border rounded-xl p-3">
              <input autoFocus value={templateName} onChange={e => setTemplateName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveAsTemplate()} placeholder="Nombre de la plantilla..."
                className="flex-1 bg-transparent text-sm outline-none" />
              <button onClick={saveAsTemplate} disabled={!templateName.trim()} className="px-3 py-1.5 bg-ink text-white rounded-lg text-xs font-semibold disabled:opacity-40">Guardar</button>
              <button onClick={() => setShowSaveTemplate(false)} className="text-muted hover:text-ink"><X className="w-4 h-4" /></button>
            </div>
          )}
          {savedTemplates.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-2">Mis plantillas</p>
              <div className="grid grid-cols-2 gap-2">
                {savedTemplates.map(tpl => (
                  <div key={tpl.id} className="bg-bg border border-border rounded-xl p-3 flex items-start justify-between gap-2 hover:border-accent transition-all">
                    <button onClick={() => applyTemplate(tpl.diet, tpl.name)} className="flex-1 text-left">
                      <p className="text-sm font-semibold">{tpl.name}</p>
                      <p className="text-xs text-muted">{(tpl.diet.meals || []).length} comidas · {tpl.diet.kcal || 0} kcal</p>
                    </button>
                    <button onClick={() => deleteTemplate(tpl.id)} className="text-muted hover:text-warn flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-2">Plantillas base</p>
            <div className="grid grid-cols-3 gap-2">
              {DIET_TEMPLATES.map(tpl => (
                <button key={tpl.name} onClick={() => applyTemplate({ ...tpl.diet, meals: tpl.diet.meals || [] } as Partial<DietPlan>, tpl.name)}
                  className="bg-bg border border-border rounded-xl p-3 text-left hover:border-accent transition-all">
                  <p className="text-sm font-semibold">{tpl.name}</p>
                  <p className="text-xs text-muted">{tpl.diet.meals.length} comidas · P:{tpl.diet.protein}g</p>
                </button>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-warn">⚠️ Aplicar sobreescribirá el plan actual</p>
        </div>
      )}

      <div>
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted mb-3">Objetivos diarios</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MacroPill label="Calorías" value={diet.kcal} unit="kcal" color="border-accent/20" onChange={v => updateDiet({ kcal: v })} />
          <MacroPill label="Proteína" value={diet.protein} unit="g" color="border-ok/20" onChange={v => updateDiet({ protein: v })} />
          <MacroPill label="Carbos" value={diet.carbs} unit="g" color="border-blue-200" onChange={v => updateDiet({ carbs: v })} />
          <MacroPill label="Grasas" value={diet.fats} unit="g" color="border-amber-200" onChange={v => updateDiet({ fats: v })} />
        </div>
        {syncedMacros && <p className="text-[10px] text-muted mt-2">↕ Sincronizado con la pestaña Macros</p>}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-bg-alt/30" onClick={() => setOpenDist(!openDist)}>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Distribución por comidas</p>
          <div className="flex items-center gap-3">
            {openDist && <button onClick={e => { e.stopPropagation(); updateDiet({ mealDistribution: [...dist, { label: 'Nueva comida', icon: '🍴', pct: 0 }] }) }} className="text-xs text-accent hover:underline">+ Añadir</button>}
            {openDist ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
          </div>
        </div>
        {openDist && (
          <div className="px-5 pb-4 pt-3 space-y-2 border-t border-border">
            {dist.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={m.icon} onChange={e => { const d=[...dist]; d[i]={...d[i],icon:e.target.value}; updateDiet({mealDistribution:d}) }} className="w-8 text-center bg-bg border border-border rounded-lg text-sm outline-none" />
                <input value={m.label} onChange={e => { const d=[...dist]; d[i]={...d[i],label:e.target.value}; updateDiet({mealDistribution:d}) }} className="flex-1 px-2 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none" />
                <input type="number" min={0} max={100} value={m.pct} onChange={e => { const d=[...dist]; d[i]={...d[i],pct:Number(e.target.value)}; updateDiet({mealDistribution:d}) }} className="w-16 text-center px-2 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none" />
                <span className="text-xs text-muted">%</span>
                <span className="text-xs text-muted w-16 text-right">{diet.kcal > 0 ? Math.round(diet.kcal * m.pct / 100) : 0} kcal</span>
                <button onClick={() => updateDiet({ mealDistribution: dist.filter((_, idx) => idx !== i) })} className="p-1 text-muted hover:text-warn"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <p className="text-[10px] text-muted">Total: {dist.reduce((a, d) => a + d.pct, 0)}%</p>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-bg-alt/30" onClick={() => setOpenSups(!openSups)}>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Suplementación</p>
          <div className="flex items-center gap-3">
            {openSups && <button onClick={e => { e.stopPropagation(); updateDiet({ supplements: [...sups, { name: 'Nuevo suplemento', dosis: '', timing: '', visible: true }] }) }} className="text-xs text-accent hover:underline">+ Añadir</button>}
            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              <span className="text-[10px] text-muted">Mostrar cliente</span>
              <div className={`w-8 h-5 rounded-full flex items-center px-0.5 cursor-pointer transition-all ${diet.showSupplements ? 'bg-ok' : 'bg-border'}`} onClick={() => updateDiet({ showSupplements: !diet.showSupplements })}>
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-all ${diet.showSupplements ? 'translate-x-3' : 'translate-x-0'}`} />
              </div>
            </div>
            {openSups ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
          </div>
        </div>
        {openSups && (
          <div className="px-5 pb-4 pt-3 space-y-2 border-t border-border">
            {sups.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <button onClick={() => { const ss=[...sups]; ss[i]={...ss[i],visible:!ss[i].visible}; updateDiet({supplements:ss}) }}
                  className={`p-1.5 rounded-lg flex-shrink-0 ${s.visible ? 'text-ok bg-ok/10' : 'text-muted bg-bg-alt'}`}>
                  {s.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <input value={s.name} onChange={e => { const ss=[...sups]; ss[i]={...ss[i],name:e.target.value}; updateDiet({supplements:ss}) }} className="flex-1 px-2 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none" placeholder="Nombre" />
                <input value={s.dosis} onChange={e => { const ss=[...sups]; ss[i]={...ss[i],dosis:e.target.value}; updateDiet({supplements:ss}) }} className="flex-1 px-2 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none" placeholder="Dosis" />
                <input value={s.timing} onChange={e => { const ss=[...sups]; ss[i]={...ss[i],timing:e.target.value}; updateDiet({supplements:ss}) }} className="flex-1 px-2 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none" placeholder="Timing" />
                <button onClick={() => updateDiet({ supplements: sups.filter((_, idx) => idx !== i) })} className="p-1 text-muted hover:text-warn flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted">Comidas del día</p>
        {diet.meals.length === 0 && <div className="bg-card border-2 border-dashed border-border rounded-2xl p-10 text-center text-muted"><Utensils className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">Aún no has añadido comidas.</p></div>}
        {sortedMeals.map((meal, i) => (
          <MealCard key={meal.id} meal={meal} index={i}
            onChange={m => { const idx=diet.meals.findIndex(x=>x.id===meal.id); const meals=[...diet.meals]; meals[idx]=m; updateDiet({meals}) }}
            onDelete={() => { const idx=diet.meals.findIndex(x=>x.id===meal.id); updateDiet({meals:diet.meals.filter((_,i)=>i!==idx)}) }}
          />
        ))}
        <button onClick={() => updateDiet({ meals: [...diet.meals, emptyMeal()] })}
          className="w-full py-3 border-2 border-dashed border-border rounded-2xl flex items-center justify-center gap-2 text-muted hover:border-accent hover:text-accent transition-all text-sm font-medium">
          <Plus className="w-4 h-4" /> Añadir comida
        </button>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted mb-2">Consejo / Nota para el cliente</p>
        <textarea rows={3} placeholder="Ej: Prioriza los carbohidratos antes del entrenamiento..." value={diet.advice}
          onChange={e => updateDiet({ advice: e.target.value })}
          className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none leading-relaxed" />
      </div>
    </div>
  )
}
