import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Clock, Utensils, X, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from './Toast'

// ── Tipos ─────────────────────────────────────────────────────────
export interface Meal {
  id: string
  time: string       // "08:00"
  name: string       // "Desayuno"
  kcal: number
  items: string[]    // ["Avena 60g", "Proteína 30g"]
}

export interface DietPlan {
  clientId: string
  kcal: number
  protein: number
  carbs: number
  fats: number
  meals: Meal[]
  advice: string
  updatedAt: string
}

const emptyDiet = (clientId: string): DietPlan => ({
  clientId, kcal: 2000, protein: 150, carbs: 200, fats: 60,
  meals: [], advice: '', updatedAt: '',
})

const emptyMeal = (): Meal => ({
  id: `meal_${Date.now()}`,
  time: '08:00', name: '', kcal: 0, items: [''],
})

// ── Macros pill ───────────────────────────────────────────────────
function MacroPill({ label, value, unit, color, onChange }: {
  label: string; value: number; unit: string
  color: string; onChange: (v: number) => void
}) {
  return (
    <div className={`flex-1 bg-card border rounded-2xl p-4 ${color}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">{label}</p>
      <div className="flex items-baseline gap-1">
        <input
          type="number" min={0} max={9999}
          value={value}
          onChange={e => onChange(parseInt(e.target.value) || 0)}
          className="w-full text-2xl font-serif font-bold bg-transparent outline-none focus:ring-0 border-none p-0"
        />
        <span className="text-sm text-muted">{unit}</span>
      </div>
    </div>
  )
}

// ── Editor de una comida ──────────────────────────────────────────
function MealCard({
  meal, index, onChange, onDelete
}: {
  meal: Meal; index: number
  onChange: (m: Meal) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(true)

  const updateItem = (i: number, val: string) => {
    const items = [...meal.items]
    items[i] = val
    onChange({ ...meal, items })
  }

  const addItem = () => onChange({ ...meal, items: [...meal.items, ''] })

  const removeItem = (i: number) =>
    onChange({ ...meal, items: meal.items.filter((_, idx) => idx !== i) })

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header comida */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-bg-alt/50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-bold flex-shrink-0">
          {index + 1}
        </div>
        <div className="flex-1 grid grid-cols-3 gap-3 min-w-0">
          <input
            type="time"
            value={meal.time}
            onClick={e => e.stopPropagation()}
            onChange={e => onChange({ ...meal, time: e.target.value })}
            className="bg-transparent text-sm font-semibold outline-none border-b border-transparent focus:border-accent"
          />
          <input
            type="text"
            placeholder="Nombre (ej: Desayuno)"
            value={meal.name}
            onClick={e => e.stopPropagation()}
            onChange={e => onChange({ ...meal, name: e.target.value })}
            className="bg-transparent text-sm font-semibold outline-none border-b border-transparent focus:border-accent col-span-1"
          />
          <div className="flex items-center gap-1">
            <input
              type="number" min={0}
              value={meal.kcal || ''}
              placeholder="0"
              onClick={e => e.stopPropagation()}
              onChange={e => onChange({ ...meal, kcal: parseInt(e.target.value) || 0 })}
              className="w-20 bg-transparent text-sm text-right outline-none border-b border-transparent focus:border-accent"
            />
            <span className="text-xs text-muted">kcal</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {open ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
        </div>
      </div>

      {/* Alimentos */}
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-border">
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted pt-3 mb-2">Alimentos</p>
          {meal.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-muted text-xs w-4 flex-shrink-0">{i + 1}.</span>
              <input
                type="text"
                placeholder="Ej: Avena 60g, Leche 200ml..."
                value={item}
                onChange={e => updateItem(i, e.target.value)}
                className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
              {meal.items.length > 1 && (
                <button
                  onClick={() => removeItem(i)}
                  className="p-1.5 text-muted hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addItem}
            className="w-full py-2 border border-dashed border-border rounded-lg text-xs text-muted hover:border-accent hover:text-accent transition-all"
          >
            + Añadir alimento
          </button>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────
interface Props {
  clientId: string
  isTrainer: boolean
}

export function DietEditor({ clientId, isTrainer }: Props) {
  const [diet, setDiet] = useState<DietPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadDiet()
  }, [clientId])

  const loadDiet = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('dietas')
      .select('datos')
      .eq('cliente_id', clientId)
      .maybeSingle()

    if (data?.datos) {
      setDiet(data.datos as DietPlan)
    } else {
      setDiet(emptyDiet(clientId))
    }
    setLoading(false)
  }

  const saveDiet = async () => {
    if (!diet) return
    setSaving(true)
    const toSave = { ...diet, updatedAt: new Date().toISOString() }
    const { error: updateError } = await supabase
      .from('dietas')
      .update({ datos: toSave })
      .eq('cliente_id', clientId)

    if (updateError) {
      const { error: insertError } = await supabase
        .from('dietas')
        .insert({ cliente_id: clientId, datos: toSave })
      if (insertError) { toast('Error al guardar: ' + insertError.message, 'warn'); setSaving(false); return }
    }
    setDiet(toSave); toast('Dieta guardada ✓', 'ok')
    setSaving(false)
  }

  const addMeal = () => {
    if (!diet) return
    setDiet({ ...diet, meals: [...diet.meals, emptyMeal()] })
  }

  const updateMeal = (i: number, meal: Meal) => {
    if (!diet) return
    const meals = [...diet.meals]
    meals[i] = meal
    setDiet({ ...diet, meals })
  }

  const deleteMeal = (i: number) => {
    if (!diet) return
    setDiet({ ...diet, meals: diet.meals.filter((_, idx) => idx !== i) })
  }

  const sortedMeals = diet ? [...diet.meals].sort((a, b) => a.time.localeCompare(b.time)) : []
  const totalKcal = diet?.meals.reduce((s, m) => s + (m.kcal || 0), 0) || 0

  if (loading) return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map(i => <div key={i} className="h-20 bg-card border border-border rounded-2xl" />)}
    </div>
  )

  if (!diet) return null

  // ── Vista cliente (solo lectura) ──────────────────────────────
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
        {/* Macros */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Calorías', value: diet.kcal, unit: 'kcal', color: 'border-accent/20' },
            { label: 'Proteína', value: diet.protein, unit: 'g', color: 'border-ok/20' },
            { label: 'Carbos', value: diet.carbs, unit: 'g', color: 'border-blue-200' },
            { label: 'Grasas', value: diet.fats, unit: 'g', color: 'border-amber-200' },
          ].map(m => (
            <div key={m.label} className={`bg-card border ${m.color} rounded-2xl p-4 text-center`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">{m.label}</p>
              <p className="text-2xl font-serif font-bold">{m.value}</p>
              <p className="text-xs text-muted">{m.unit}</p>
            </div>
          ))}
        </div>

        {/* Comidas */}
        <div className="space-y-3">
          {sortedMeals.map((meal, i) => (
            <div key={meal.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2 text-muted">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-bold">{meal.time}</span>
                </div>
                <h3 className="font-serif font-bold text-base flex-1">{meal.name}</h3>
                {meal.kcal > 0 && (
                  <span className="text-xs font-bold text-muted bg-bg px-2 py-1 rounded-full border border-border">
                    {meal.kcal} kcal
                  </span>
                )}
              </div>
              <ul className="space-y-1">
                {meal.items.filter(Boolean).map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-muted">
                    <span className="text-accent mt-0.5 flex-shrink-0">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Consejo */}
        {diet.advice && (
          <div className="bg-accent/5 border border-accent/20 rounded-2xl p-5">
            <p className="text-[10px] uppercase tracking-widest font-bold text-accent mb-2">Consejo del entrenador</p>
            <p className="text-sm text-ink leading-relaxed italic">"{diet.advice}"</p>
          </div>
        )}
      </div>
    )
  }

  // ── Vista entrenador (editable) ───────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header con botón guardar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold">Plan Nutricional</h2>
          <p className="text-muted text-sm mt-0.5">
            {diet.meals.length} comidas · {totalKcal} kcal registradas
          </p>
        </div>
        <button
          onClick={saveDiet}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Guardar dieta'}
        </button>
      </div>

      {/* Macros */}
      <div>
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted mb-3">Objetivos diarios</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MacroPill
            label="Calorías" value={diet.kcal} unit="kcal" color="border-accent/20"
            onChange={v => setDiet({ ...diet, kcal: v })}
          />
          <MacroPill
            label="Proteína" value={diet.protein} unit="g" color="border-ok/20"
            onChange={v => setDiet({ ...diet, protein: v })}
          />
          <MacroPill
            label="Carbos" value={diet.carbs} unit="g" color="border-blue-200"
            onChange={v => setDiet({ ...diet, carbs: v })}
          />
          <MacroPill
            label="Grasas" value={diet.fats} unit="g" color="border-amber-200"
            onChange={v => setDiet({ ...diet, fats: v })}
          />
        </div>
      </div>

      {/* Comidas */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted">Comidas del día</p>
        {diet.meals.length === 0 && (
          <div className="bg-card border-2 border-dashed border-border rounded-2xl p-10 text-center text-muted">
            <Utensils className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aún no has añadido comidas. Pulsa el botón de abajo.</p>
          </div>
        )}
        {sortedMeals.map((meal, i) => (
          <MealCard
            key={meal.id}
            meal={meal}
            index={i}
            onChange={m => {
              const idx = diet.meals.findIndex(x => x.id === meal.id)
              updateMeal(idx, m)
            }}
            onDelete={() => {
              const idx = diet.meals.findIndex(x => x.id === meal.id)
              deleteMeal(idx)
            }}
          />
        ))}
        <button
          onClick={addMeal}
          className="w-full py-3 border-2 border-dashed border-border rounded-2xl flex items-center justify-center gap-2 text-muted hover:border-accent hover:text-accent transition-all text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Añadir comida
        </button>
      </div>

      {/* Consejo nutricional */}
      <div>
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted mb-2">Consejo / Nota para el cliente</p>
        <textarea
          rows={3}
          placeholder="Ej: Prioriza los carbohidratos antes del entrenamiento. Bebe al menos 2.5L de agua al día..."
          value={diet.advice}
          onChange={e => setDiet({ ...diet, advice: e.target.value })}
          className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none leading-relaxed"
        />
      </div>
    </div>
  )
}
