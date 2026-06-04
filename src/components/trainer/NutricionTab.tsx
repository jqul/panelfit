import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientData } from '../../types'
import { toast } from '../shared/Toast'
import { Plus, Trash2, Save, ChevronDown, ChevronUp, Copy, ArrowLeft } from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────
interface Meal {
  id: string
  name: string       // Desayuno, Comida, Cena, Snack...
  time?: string      // 08:00
  foods: string      // texto libre: "100g avena, 200ml leche..."
  kcal?: number
  protein?: number
  carbs?: number
  fat?: number
  notes?: string
}

interface NutriDay {
  label: string      // Lunes, Martes... o Día 1
  meals: Meal[]
  totalKcal?: number
  notes?: string
}

interface NutritionPlan {
  id: string
  trainer_id: string
  client_id: string
  name: string
  days: NutriDay[]
  notes?: string
  created_at: number
  updated_at: number
}

const MEAL_PRESETS = ['Desayuno', 'Media mañana', 'Comida', 'Merienda', 'Cena', 'Post-entreno']
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function emptyMeal(name = 'Desayuno'): Meal {
  return { id: `meal_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, name, time: '', foods: '', kcal: undefined, protein: undefined, carbs: undefined, fat: undefined }
}

function emptyDay(label: string): NutriDay {
  return { label, meals: [emptyMeal('Desayuno'), emptyMeal('Comida'), emptyMeal('Cena')] }
}

function emptyPlan(trainerId: string, clientId: string): NutritionPlan {
  return {
    id: `nutr_${Date.now()}`,
    trainer_id: trainerId,
    client_id: clientId,
    name: 'Plan nutricional',
    days: DAY_NAMES.map(d => emptyDay(d)),
    notes: '',
    created_at: Date.now(),
    updated_at: Date.now(),
  }
}

// ── Meal Card ─────────────────────────────────────────────
function MealCard({ meal, onChange, onDelete }: {
  meal: Meal
  onChange: (m: Meal) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(true)
  const totalKcal = meal.kcal

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-bg-alt/30" onClick={() => setOpen(v => !v)}>
        <div className="flex-1 flex items-center gap-2">
          <input value={meal.name} onChange={e => onChange({ ...meal, name: e.target.value })}
            onClick={e => e.stopPropagation()}
            className="text-sm font-semibold bg-transparent outline-none w-36 border-b border-transparent hover:border-border focus:border-accent" />
          {meal.time && <span className="text-[10px] text-muted">{meal.time}</span>}
          {totalKcal && <span className="text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">{totalKcal} kcal</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1 text-muted hover:text-warn rounded"><Trash2 className="w-3 h-3" /></button>
          {open ? <ChevronUp className="w-3.5 h-3.5 text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-muted" />}
        </div>
      </div>

      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/50">
          <div className="flex gap-2 mt-2">
            <input value={meal.time || ''} onChange={e => onChange({ ...meal, time: e.target.value })}
              type="time" placeholder="Hora"
              className="w-24 px-2 py-1.5 bg-bg border border-border rounded-lg text-xs outline-none" />
          </div>
          <textarea value={meal.foods} onChange={e => onChange({ ...meal, foods: e.target.value })}
            placeholder="Ej: 80g avena, 200ml leche semidesnatada, 1 plátano..."
            rows={2}
            className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-xs outline-none resize-none focus:ring-2 focus:ring-accent/20" />
          {/* Macros opcionales */}
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { key: 'kcal',    label: 'kcal',    color: 'text-accent' },
              { key: 'protein', label: 'Prot (g)', color: 'text-ok' },
              { key: 'carbs',   label: 'HC (g)',   color: 'text-warn' },
              { key: 'fat',     label: 'Grasas',  color: 'text-muted' },
            ].map(({ key, label, color }) => (
              <div key={key}>
                <p className={`text-[9px] font-bold uppercase mb-0.5 ${color}`}>{label}</p>
                <input type="number" value={(meal as any)[key] || ''} onChange={e => onChange({ ...meal, [key]: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="—" className="w-full px-2 py-1.5 bg-bg border border-border rounded-lg text-xs outline-none text-center" />
              </div>
            ))}
          </div>
          {meal.notes !== undefined && (
            <input value={meal.notes || ''} onChange={e => onChange({ ...meal, notes: e.target.value })}
              placeholder="Nota (opcional)..."
              className="w-full px-2 py-1.5 bg-bg border border-border rounded-lg text-xs outline-none" />
          )}
        </div>
      )}
    </div>
  )
}

// ── Day Editor ────────────────────────────────────────────
function DayEditor({ day, onChange }: { day: NutriDay; onChange: (d: NutriDay) => void }) {
  const [open, setOpen] = useState(true)
  const totalKcal = day.meals.reduce((a, m) => a + (m.kcal || 0), 0)
  const totalProt = day.meals.reduce((a, m) => a + (m.protein || 0), 0)

  const updateMeal = (i: number, m: Meal) => {
    const meals = [...day.meals]; meals[i] = m; onChange({ ...day, meals })
  }
  const deleteMeal = (i: number) => {
    onChange({ ...day, meals: day.meals.filter((_, idx) => idx !== i) })
  }
  const addMeal = (preset?: string) => {
    onChange({ ...day, meals: [...day.meals, emptyMeal(preset || 'Comida')] })
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-alt/30 transition-colors text-left">
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
            <MealCard key={meal.id} meal={meal} onChange={m => updateMeal(i, m)} onDelete={() => deleteMeal(i)} />
          ))}
          {/* Añadir comida */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {MEAL_PRESETS.filter(p => !day.meals.some(m => m.name === p)).map(preset => (
              <button key={preset} onClick={() => addMeal(preset)}
                className="px-2.5 py-1 rounded-lg text-xs border border-dashed border-border text-muted hover:border-accent hover:text-accent transition-all">
                + {preset}
              </button>
            ))}
            <button onClick={() => addMeal()}
              className="px-2.5 py-1 rounded-lg text-xs border border-dashed border-border text-muted hover:border-accent hover:text-accent transition-all flex items-center gap-1">
              <Plus className="w-3 h-3" /> Otra
            </button>
          </div>
          {/* Notas del día */}
          <input value={day.notes || ''} onChange={e => onChange({ ...day, notes: e.target.value })}
            placeholder="Notas del día (opcional)..."
            className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-xs outline-none mt-1" />
        </div>
      )}
    </div>
  )
}

// ── Main NutricionTab ─────────────────────────────────────
interface Props {
  client: ClientData
  trainerId: string
}

export function NutricionTab({ client, trainerId }: Props) {
  const [plan, setPlan] = useState<NutritionPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeDay, setActiveDay] = useState(0)
  const [planName, setPlanName] = useState('Plan nutricional')

  useEffect(() => { loadPlan() }, [client.id])

  const loadPlan = async () => {
    setLoading(true)
    const { data } = await supabase.from('nutrition_plans')
      .select('*').eq('client_id', client.id).maybeSingle()
    if (data) { setPlan(data); setPlanName(data.name) }
    setLoading(false)
  }

  const savePlan = async () => {
    if (!plan) return
    setSaving(true)
    const updated = { ...plan, name: planName, updated_at: Date.now() }
    const { error } = await supabase.from('nutrition_plans')
      .upsert(updated, { onConflict: 'id' })
    if (error) { toast('Error al guardar', 'warn'); setSaving(false); return }
    setPlan(updated)
    toast('Plan guardado ✓', 'ok')
    setSaving(false)
  }

  const createPlan = () => {
    const p = emptyPlan(trainerId, client.id)
    setPlan(p)
    setPlanName(p.name)
  }

  const updateDay = (i: number, day: NutriDay) => {
    if (!plan) return
    const days = [...plan.days]; days[i] = day
    setPlan({ ...plan, days })
  }

  const copyDay = (from: number, to: number) => {
    if (!plan) return
    const days = [...plan.days]
    days[to] = { ...days[from], label: days[to].label }
    setPlan({ ...plan, days })
    toast(`Copiado de ${days[from].label} a ${days[to].label}`, 'ok')
  }

  if (loading) return (
    <div className="space-y-3 animate-pulse">
      {[1,2,3].map(i => <div key={i} className="h-16 bg-card border border-border rounded-2xl" />)}
    </div>
  )

  if (!plan) return (
    <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
      <div className="text-4xl mb-3">🥗</div>
      <p className="font-serif text-lg font-bold text-ink">Sin plan nutricional</p>
      <p className="text-sm text-muted mt-1 max-w-xs mx-auto">Crea un plan de comidas personalizado para {client.name}. Define qué comer cada día con macros opcionales.</p>
      <button onClick={createPlan} className="mt-5 px-6 py-3 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
        Crear plan nutricional
      </button>
    </div>
  )

  const totalKcal = plan.days[activeDay]?.meals.reduce((a, m) => a + (m.kcal || 0), 0) || 0
  const totalProt = plan.days[activeDay]?.meals.reduce((a, m) => a + (m.protein || 0), 0) || 0
  const totalCarbs = plan.days[activeDay]?.meals.reduce((a, m) => a + (m.carbs || 0), 0) || 0
  const totalFat = plan.days[activeDay]?.meals.reduce((a, m) => a + (m.fat || 0), 0) || 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <input value={planName} onChange={e => setPlanName(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 bg-bg border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-accent/20" />
        <button onClick={savePlan} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40 flex-shrink-0">
          <Save className="w-3.5 h-3.5" /> {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* Selector de días */}
      <div className="flex gap-1.5 flex-wrap">
        {plan.days.map((day, i) => {
          const kcal = day.meals.reduce((a, m) => a + (m.kcal || 0), 0)
          return (
            <button key={i} onClick={() => setActiveDay(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeDay === i ? 'bg-ink text-white' : 'bg-card border border-border text-muted hover:border-accent'}`}>
              {day.label.slice(0, 3)}
              {kcal > 0 && <span className="ml-1 opacity-70">{kcal}</span>}
            </button>
          )
        })}
      </div>

      {/* Resumen macros del día */}
      {totalKcal > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'kcal',     value: totalKcal, color: 'text-accent', bg: 'bg-accent/8' },
            { label: 'Proteína', value: `${totalProt}g`, color: 'text-ok',   bg: 'bg-ok/8' },
            { label: 'Hidratos', value: `${totalCarbs}g`, color: 'text-warn', bg: 'bg-warn/8' },
            { label: 'Grasas',   value: `${totalFat}g`, color: 'text-muted', bg: 'bg-bg-alt' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-xl p-3 text-center ${bg}`}>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Editor del día activo */}
      {plan.days[activeDay] && (
        <div className="space-y-2">
          {/* Copiar de otro día */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted">Copiar de:</span>
            {plan.days.filter((_, i) => i !== activeDay).map((d, i) => {
              const realIdx = plan.days.findIndex(dd => dd.label === d.label)
              return (
                <button key={i} onClick={() => copyDay(realIdx, activeDay)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-border text-muted hover:border-accent hover:text-accent transition-all">
                  <Copy className="w-3 h-3" /> {d.label.slice(0, 3)}
                </button>
              )
            })}
          </div>

          {/* Comidas del día */}
          <div className="space-y-2">
            {plan.days[activeDay].meals.map((meal, i) => (
              <MealCard key={meal.id} meal={meal}
                onChange={m => {
                  const meals = [...plan.days[activeDay].meals]; meals[i] = m
                  updateDay(activeDay, { ...plan.days[activeDay], meals })
                }}
                onDelete={() => {
                  const meals = plan.days[activeDay].meals.filter((_, idx) => idx !== i)
                  updateDay(activeDay, { ...plan.days[activeDay], meals })
                }}
              />
            ))}
          </div>

          {/* Añadir comida */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {MEAL_PRESETS.filter(p => !plan.days[activeDay].meals.some(m => m.name === p)).map(preset => (
              <button key={preset}
                onClick={() => {
                  const meals = [...plan.days[activeDay].meals, emptyMeal(preset)]
                  updateDay(activeDay, { ...plan.days[activeDay], meals })
                }}
                className="px-2.5 py-1 rounded-lg text-xs border border-dashed border-border text-muted hover:border-accent hover:text-accent transition-all">
                + {preset}
              </button>
            ))}
            <button
              onClick={() => {
                const meals = [...plan.days[activeDay].meals, emptyMeal('Otra comida')]
                updateDay(activeDay, { ...plan.days[activeDay], meals })
              }}
              className="px-2.5 py-1 rounded-lg text-xs border border-dashed border-border text-muted hover:border-accent hover:text-accent transition-all flex items-center gap-1">
              <Plus className="w-3 h-3" /> Otra
            </button>
          </div>

          {/* Notas del día */}
          <input value={plan.days[activeDay].notes || ''}
            onChange={e => updateDay(activeDay, { ...plan.days[activeDay], notes: e.target.value })}
            placeholder="Notas del día (hidratación, suplementos, timing...)..."
            className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-xs outline-none" />
        </div>
      )}

      {/* Notas generales del plan */}
      <div>
        <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Notas del plan</label>
        <textarea value={plan.notes || ''} onChange={e => setPlan({ ...plan, notes: e.target.value })}
          placeholder="Indicaciones generales, alergias, preferencias..."
          rows={2}
          className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-xs outline-none resize-none" />
      </div>
    </div>
  )
}
