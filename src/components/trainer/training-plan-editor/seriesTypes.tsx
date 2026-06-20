import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { toast } from '../../shared/Toast'
import { supabase } from '../../../lib/supabase'

// ── Tipos de serie ────────────────────────────────────────
export interface SeriesTypeDef {
  id: string
  label: string
  emoji: string
  desc: string
  detail: string
  custom?: boolean
}

export const DEFAULT_SERIES_TYPES: SeriesTypeDef[] = [
  { id: 'normal',      label: 'Normal',      emoji: '▶',  desc: 'Series estándar con descanso completo entre cada una.', detail: 'Realiza cada serie con el mismo peso y repeticiones, descansando el tiempo indicado entre ellas. Es el método más común y efectivo para fuerza e hipertrofia.' },
  { id: 'descendente', label: 'Descendente', emoji: '📉', desc: 'Reduces el peso en cada serie manteniendo las repeticiones.', detail: 'Empieza con el peso más alto y ve bajando en cada serie (ej: 80kg → 70kg → 60kg). Permite más volumen total y mayor fatiga muscular.' },
  { id: 'superserie',  label: 'Superserie',  emoji: '⚡', desc: 'Dos ejercicios seguidos sin descanso entre ellos.', detail: 'Realiza un ejercicio inmediatamente después del otro sin pausa. Puede ser agonista-antagonista (bíceps + tríceps) o mismo músculo para mayor intensidad.' },
  { id: 'piramide',    label: 'Pirámide',    emoji: '🔺', desc: 'Aumentas el peso y reduces reps en cada serie.', detail: 'Progresión ascendente: cada serie sube el peso y baja las repeticiones (ej: 60kg×12 → 70kg×8 → 80kg×5). Ideal para ganar fuerza progresivamente en la sesión.' },
  { id: 'rest_pause',  label: 'Rest-Pause',  emoji: '⏸', desc: 'Mini descansos dentro de una misma serie.', detail: 'Lleva el peso al fallo, descansa 10-20 segundos, y sigue con el mismo peso hasta el siguiente fallo. Repite 2-3 veces. Maximiza el reclutamiento muscular.' },
  { id: 'cluster',     label: 'Cluster',     emoji: '🔗', desc: 'Grupos de reps con microdescansos de 10-15s.', detail: 'Divide las repeticiones en grupos (ej: 3+3+3 con 15s de descanso). Permite usar más peso del habitual con mejor técnica, muy efectivo para fuerza máxima.' },
  { id: 'dropset',     label: 'Drop Set',    emoji: '🎯', desc: 'Al fallo, reduces el peso y continúas sin descanso.', detail: 'Lleva el peso al fallo muscular y sin descanso reduce el peso un 20-30% para continuar. Se pueden hacer 2-3 drops seguidos. Máxima congestión muscular.' },
]

const EMOJIS_QUICK = ['▶','📉','⚡','🔺','⏸','🔗','🎯','💪','🏋️','🔄','⬆️','🌀','🔥','⭐','🎪','🧨','💥','🏆','🎯','🔑']

// ── Hook para cargar/guardar tipos de serie del entrenador ────────────────
export function useSeriesTypes(trainerId?: string) {
  const LS_KEY = `pf_series_types_${trainerId}`
  const [types, setTypes] = useState<SeriesTypeDef[]>(() => {
    if (!trainerId) return DEFAULT_SERIES_TYPES
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null')
      return saved || DEFAULT_SERIES_TYPES
    } catch { return DEFAULT_SERIES_TYPES }
  })

  useEffect(() => {
    if (!trainerId) return
    // Intentar cargar desde Supabase
    supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle().then(({ data }) => {
      if (data?.profile?.seriesTypes) {
        setTypes(data.profile.seriesTypes)
        localStorage.setItem(LS_KEY, JSON.stringify(data.profile.seriesTypes))
      }
    })
  }, [trainerId])

  const saveTypes = async (newTypes: SeriesTypeDef[]) => {
    setTypes(newTypes)
    if (trainerId) {
      localStorage.setItem(LS_KEY, JSON.stringify(newTypes))
      // Merge con el profile existente
      const { data } = await supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle()
      const profile = { ...(data?.profile || {}), seriesTypes: newTypes, updatedAt: Date.now() }
      await supabase.from('entrenadores').update({ profile }).eq('uid', trainerId)
    }
  }

  return { types, saveTypes }
}

// ── Modal gestión de tipos de serie ──────────────────────
export function SeriesTypesManager({ types, onSave, onClose }: {
  types: SeriesTypeDef[]
  onSave: (types: SeriesTypeDef[]) => void
  onClose: () => void
}) {
  const [list, setList] = useState<SeriesTypeDef[]>(JSON.parse(JSON.stringify(types)))
  const [editing, setEditing] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)

  const update = (id: string, updates: Partial<SeriesTypeDef>) => {
    setList(l => l.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  const addNew = () => {
    const id = `custom_${Date.now()}`
    const newType: SeriesTypeDef = {
      id, label: 'Mi tipo', emoji: '💪',
      desc: 'Descripción corta', detail: 'Explica cómo se ejecuta este tipo de serie...',
      custom: true
    }
    setList(l => [...l, newType])
    setEditing(id)
  }

  const remove = (id: string) => {
    setList(l => l.filter(t => t.id !== id))
    if (editing === id) setEditing(null)
  }

  const handleSave = () => {
    onSave(list)
    toast('Tipos de serie guardados ✓', 'ok')
    onClose()
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Personaliza los tipos de serie. Los predefinidos también son editables.</p>

      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
        {list.map(t => (
          <div key={t.id} className={`border rounded-2xl overflow-hidden transition-all ${editing === t.id ? 'border-accent/40 bg-accent/3' : 'border-border bg-bg'}`}>
            {/* Fila compacta */}
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Emoji picker */}
              <div className="relative flex-shrink-0">
                <button onClick={() => setShowEmojiPicker(showEmojiPicker === t.id ? null : t.id)}
                  className="text-xl w-9 h-9 flex items-center justify-center rounded-xl hover:bg-bg-alt border border-border transition-colors">
                  {t.emoji}
                </button>
                {showEmojiPicker === t.id && (
                  <div className="absolute z-20 top-full mt-1 left-0 bg-card border border-border rounded-2xl shadow-xl p-2 w-52">
                    <div className="flex flex-wrap gap-1">
                      {EMOJIS_QUICK.map(em => (
                        <button key={em} onClick={() => { update(t.id, { emoji: em }); setShowEmojiPicker(null) }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-alt text-lg transition-colors">
                          {em}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 border-t border-border pt-2">
                      <input
                        placeholder="O escribe cualquier emoji..."
                        className="w-full text-sm bg-bg border border-border rounded-lg px-2 py-1.5 outline-none"
                        onChange={e => { if (e.target.value) update(t.id, { emoji: e.target.value }); setShowEmojiPicker(null) }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Nombre */}
              <input value={t.label} onChange={e => update(t.id, { label: e.target.value })}
                className="flex-1 text-sm font-bold bg-transparent outline-none min-w-0 border-b border-transparent focus:border-accent/40 pb-0.5 transition-colors" />

              {/* Acciones */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setEditing(editing === t.id ? null : t.id)}
                  className={`p-1.5 rounded-lg transition-colors ${editing === t.id ? 'text-accent bg-accent/10' : 'text-muted hover:text-accent hover:bg-accent/5'}`}>
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => remove(t.id)}
                  className="p-1.5 rounded-lg text-muted hover:text-warn hover:bg-warn/5 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Panel expandido edición */}
            {editing === t.id && (
              <div className="px-4 pb-4 space-y-3 border-t border-border/50">
                <div className="pt-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">Descripción corta (aparece en el selector)</label>
                  <input value={t.desc} onChange={e => update(t.id, { desc: e.target.value })}
                    placeholder="Ej: Reduces el peso en cada serie..."
                    className="w-full text-xs bg-bg border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent/20" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">Explicación detallada (para el botón ℹ️)</label>
                  <textarea value={t.detail} onChange={e => update(t.id, { detail: e.target.value })}
                    placeholder="Explica cómo se ejecuta, para qué sirve, ejemplos..."
                    rows={3}
                    className="w-full text-xs bg-bg border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent/20 resize-none leading-relaxed" />
                </div>
                <button onClick={() => setEditing(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-semibold">
                  <Check className="w-3 h-3" /> Listo
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={addNew}
        className="w-full border-2 border-dashed border-border rounded-2xl py-3 text-sm text-muted hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> Crear tipo personalizado
      </button>

      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted hover:bg-bg-alt transition-colors">Cancelar</button>
        <button onClick={handleSave} className="flex-1 py-2.5 bg-ink text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">Guardar tipos</button>
      </div>
    </div>
  )
}

// ── Modal info de un tipo de serie ────────────────────────
export function SeriesInfoModal({ types, onClose, onManage }: {
  types: SeriesTypeDef[]
  onClose: () => void
  onManage: () => void
}) {
  return (
    <div className="fixed inset-0 z-[70] bg-ink/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: '85vh' }}>
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border flex-shrink-0">
          <h3 className="font-serif font-bold text-xl">Tipos de serie</h3>
          <div className="flex items-center gap-2">
            <button onClick={onManage} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-xl text-xs font-semibold text-muted hover:border-accent hover:text-accent transition-colors">
              <Pencil className="w-3 h-3" /> Gestionar
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-bg-alt text-muted"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="space-y-3 p-6 pt-4 overflow-y-auto flex-1 min-h-0">
          {types.map(t => (
            <div key={t.id} className="bg-bg border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">{t.emoji}</span>
                <p className="font-semibold text-sm">{t.label}</p>
                {t.custom && <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-bold">Personalizado</span>}
              </div>
              <p className="text-xs text-muted leading-relaxed">{t.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
