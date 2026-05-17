import { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Copy, Video, Star, GripVertical, X, Timer, Clock, Info, Flame, Pencil, Check } from 'lucide-react'
import { Modal } from '../shared/Modal'
import { ExercisePicker } from './ExercisePicker'
import { TrainingPlan, WeekPlan, DayPlan, Exercise, LibraryExercise, TrainingLogs } from '../../types'
import { TRAINING_TYPES } from '../../lib/constants'
import { toast } from '../shared/Toast'
import { supabase } from '../../lib/supabase'

interface Props {
  plan: TrainingPlan
  onChange: (plan: TrainingPlan) => void
  allClients?: { id: string; name: string; surname: string }[]
  onImportFromClient?: (clientId: string) => Promise<TrainingPlan | null>
  library?: LibraryExercise[]
  logs?: TrainingLogs
  clientName?: string
  trainerId?: string
}

const emptyExercise = (): Exercise => ({
  name: '', sets: '3×10', weight: '', isMain: false,
  comment: '', videoUrl: '', restSets: 90, restAfter: 120
})
const emptyDay = (n: number): DayPlan => ({ title: `DÍA ${n}`, focus: '', exercises: [], warmupExercises: [] } as any)
const emptyWeek = (n: number): WeekPlan => ({ label: `Semana ${n}`, rpe: '@7', isCurrent: false, days: [] })

function getYTId(url: string) {
  const m = url?.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}
function fmtRest(s: number) {
  if (!s) return '—'
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60), r = s % 60
  return r > 0 ? `${m}m${r}s` : `${m}m`
}

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
function useSeriesTypes(trainerId?: string) {
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
function SeriesTypesManager({ types, onSave, onClose }: {
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
function SeriesInfoModal({ types, onClose, onManage }: {
  types: SeriesTypeDef[]
  onClose: () => void
  onManage: () => void
}) {
  return (
    <div className="fixed inset-0 z-[70] bg-ink/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-bold text-xl">Tipos de serie</h3>
          <div className="flex items-center gap-2">
            <button onClick={onManage} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-xl text-xs font-semibold text-muted hover:border-accent hover:text-accent transition-colors">
              <Pencil className="w-3 h-3" /> Gestionar
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-bg-alt text-muted"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="space-y-3">
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

// ── RestPicker popup ──────────────────────────────────────
const REST_PRESETS = [30, 45, 60, 90, 120, 150, 180, 240, 300]

function RestPopup({ value, onChange, onClose, label }: {
  value: number; onChange: (v: number) => void; onClose: () => void; label: string
}) {
  return (
    <div className="absolute z-30 top-full mt-1 right-0 bg-card border border-border rounded-2xl shadow-xl p-3 w-56"
      onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
        <button onClick={onClose} className="p-0.5 text-muted hover:text-ink"><X className="w-3 h-3" /></button>
      </div>
      <div className="grid grid-cols-3 gap-1 mb-2">
        {REST_PRESETS.map(p => (
          <button key={p} onClick={() => { onChange(p); onClose() }}
            className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
              value === p ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent hover:text-accent'
            }`}>
            {fmtRest(p)}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 border border-border rounded-lg px-2 py-1.5">
        <Clock className="w-3 h-3 text-muted flex-shrink-0" />
        <input type="number" value={value} min={0} max={600} step={5}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 text-xs bg-transparent outline-none font-bold" />
        <span className="text-[10px] text-muted">seg</span>
      </div>
    </div>
  )
}

interface SelectedEx { wi: number; di: number; ri: number }

export function TrainingPlanEditor({
  plan, onChange, allClients = [], onImportFromClient,
  library = [], logs = {}, clientName = '', trainerId
}: Props) {
  const [activeWeek, setActiveWeek] = useState(0)
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({ 0: true })
  const [pickerFor, setPickerFor] = useState<{ dayIdx: number } | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedEx, setSelectedEx] = useState<SelectedEx | null>(null)
  const [restPopup, setRestPopup] = useState<{ wi: number; di: number; ri: number; field: 'restSets' | 'restAfter' } | null>(null)
  const [confirmDeleteWeek, setConfirmDeleteWeek] = useState<number | null>(null)
  const [showSeriesInfo, setShowSeriesInfo] = useState(false)
  const [showSeriesManager, setShowSeriesManager] = useState(false)
  const [openWarmup, setOpenWarmup] = useState<Record<number, boolean>>({})

  const { types: seriesTypes, saveTypes } = useSeriesTypes(trainerId)

  const weeks = plan.weeks || []
  const currentWeek = weeks[activeWeek]

  const updatePlan = (updates: Partial<TrainingPlan>) => onChange({ ...plan, ...updates })
  const updateWeek = (wi: number, u: Partial<WeekPlan>) => {
    const w = [...weeks]; w[wi] = { ...w[wi], ...u }; updatePlan({ weeks: w })
  }
  const updateDay = (wi: number, di: number, u: Partial<DayPlan>) => {
    const w = [...weeks]; const days = [...w[wi].days]; days[di] = { ...days[di], ...u }
    w[wi] = { ...w[wi], days }; updatePlan({ weeks: w })
  }
  const updateExercise = (wi: number, di: number, ri: number, u: Partial<Exercise>) => {
    const w = [...weeks]; const days = [...w[wi].days]; const exs = [...days[di].exercises]
    exs[ri] = { ...exs[ri], ...u }; days[di] = { ...days[di], exercises: exs }
    w[wi] = { ...w[wi], days }; updatePlan({ weeks: w })
    if (selectedEx?.wi === wi && selectedEx?.di === di && selectedEx?.ri === ri)
      setSelectedEx({ wi, di, ri })
  }

  const addWeek = () => { updatePlan({ weeks: [...weeks, emptyWeek(weeks.length + 1)] }); setActiveWeek(weeks.length) }
  const copyWeek = (wi: number) => {
    const copy: WeekPlan = JSON.parse(JSON.stringify(weeks[wi]))
    copy.label += ' (copia)'; copy.isCurrent = false
    const w = [...weeks]; w.splice(wi + 1, 0, copy)
    updatePlan({ weeks: w }); setActiveWeek(wi + 1); toast('Semana copiada ✓', 'ok')
  }
  const deleteWeek = (wi: number) => {
    if (weeks.length <= 1) { toast('Debe haber al menos 1 semana', 'warn'); return }
    setConfirmDeleteWeek(wi)
  }
  const confirmDeleteWeekFn = () => {
    const wi = confirmDeleteWeek; if (wi === null) return
    const w = weeks.filter((_, i) => i !== wi)
    updatePlan({ weeks: w }); setActiveWeek(Math.max(0, wi - 1)); setConfirmDeleteWeek(null)
  }
  const setCurrentWeek = (wi: number) =>
    updatePlan({ weeks: weeks.map((wk, i) => ({ ...wk, isCurrent: i === wi })) })

  const addDay = (wi: number) => {
    const days = [...(weeks[wi]?.days || []), emptyDay((weeks[wi]?.days?.length || 0) + 1)]
    updateWeek(wi, { days }); setOpenDays(p => ({ ...p, [days.length - 1]: true }))
  }
  const copyDay = (wi: number, di: number) => {
    const copy: DayPlan = JSON.parse(JSON.stringify(weeks[wi].days[di]))
    copy.title += ' (copia)'
    const days = [...weeks[wi].days]; days.splice(di + 1, 0, copy)
    updateWeek(wi, { days }); toast('Día copiado ✓', 'ok')
  }
  const deleteDay = (wi: number, di: number) =>
    updateWeek(wi, { days: weeks[wi].days.filter((_, i) => i !== di) })

  const addExercise = (wi: number, di: number, exercise: Exercise) => {
    updateDay(wi, di, { exercises: [...(weeks[wi].days[di]?.exercises || []), exercise] })
  }
  const copyExercise = (wi: number, di: number, ri: number) => {
    const copy: Exercise = JSON.parse(JSON.stringify(weeks[wi].days[di].exercises[ri]))
    const exs = [...weeks[wi].days[di].exercises]; exs.splice(ri + 1, 0, copy)
    updateDay(wi, di, { exercises: exs }); toast('Duplicado ✓', 'ok')
  }
  const deleteExercise = (wi: number, di: number, ri: number) => {
    updateDay(wi, di, { exercises: weeks[wi].days[di].exercises.filter((_, i) => i !== ri) })
    if (selectedEx?.wi === wi && selectedEx?.di === di && selectedEx?.ri === ri) setSelectedEx(null)
  }
  const moveExercise = (di: number, fromRi: number, toRi: number) => {
    if (fromRi === toRi) return
    const exs = [...weeks[activeWeek].days[di].exercises]
    const [moved] = exs.splice(fromRi, 1); exs.splice(toRi, 0, moved)
    updateDay(activeWeek, di, { exercises: exs })
  }

  const handleImport = async (clientId: string) => {
    if (!onImportFromClient) return
    setImporting(true)
    const imported = await onImportFromClient(clientId)
    if (imported) { updatePlan({ weeks: imported.weeks, type: imported.type }); toast('Importado ✓', 'ok'); setShowImport(false) }
    else toast('Sin plan', 'warn')
    setImporting(false)
  }

  const selEx = selectedEx ? weeks[selectedEx.wi]?.days[selectedEx.di]?.exercises[selectedEx.ri] : null
  const selLibEx = selEx ? library.find(l => l.name.toLowerCase() === selEx.name.toLowerCase()) : undefined

  return (
    <div className="flex gap-4 h-full min-h-0" onClick={() => setRestPopup(null)}>

      {/* Modales globales */}
      {showSeriesInfo && (
        <SeriesInfoModal
          types={seriesTypes}
          onClose={() => setShowSeriesInfo(false)}
          onManage={() => { setShowSeriesInfo(false); setShowSeriesManager(true) }}
        />
      )}

      <Modal open={showSeriesManager} onClose={() => setShowSeriesManager(false)} title="Gestionar tipos de serie">
        <SeriesTypesManager
          types={seriesTypes}
          onSave={saveTypes}
          onClose={() => setShowSeriesManager(false)}
        />
      </Modal>

      {/* ── PANEL CENTRAL ── */}
      <div className="flex-1 min-w-0 overflow-y-auto space-y-3">

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap sticky top-0 bg-bg z-10 pb-2 pt-1">
          <select value={plan.type || ''} onChange={e => updatePlan({ type: e.target.value })}
            className="text-sm bg-card border border-border rounded-lg px-3 py-2 outline-none font-medium">
            {plan.type && !TRAINING_TYPES.find(t => t.value === plan.type) && <option value={plan.type}>{plan.type}</option>}
            {TRAINING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {allClients.length > 0 && (
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-muted hover:border-accent hover:text-accent transition-colors">
              <Copy className="w-3.5 h-3.5" /> Importar
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setShowSeriesInfo(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-muted hover:border-accent hover:text-accent transition-colors">
              <Info className="w-3.5 h-3.5" /> Tipos de serie
            </button>
            <button onClick={() => setShowSeriesManager(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-muted hover:border-accent hover:text-accent transition-colors">
              <Pencil className="w-3.5 h-3.5" /> Gestionar
            </button>
          </div>
        </div>

        {/* Semanas tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {weeks.map((w, wi) => (
            <button key={wi} onClick={() => setActiveWeek(wi)}
              className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeWeek === wi ? 'bg-ink text-white shadow-sm' : 'bg-card border border-border text-muted hover:border-accent hover:text-ink'
              }`}>
              {w.label}
              {w.isCurrent && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-ok rounded-full border-2 border-bg" />}
            </button>
          ))}
          <button onClick={addWeek} className="px-3 py-1.5 rounded-lg text-sm border-2 border-dashed border-border text-muted hover:border-accent hover:text-accent transition-all">
            + Semana
          </button>
        </div>

        {/* Semana activa */}
        {currentWeek && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-bg-alt/40">
              <input value={currentWeek.label} onChange={e => updateWeek(activeWeek, { label: e.target.value })}
                className="flex-1 text-sm font-bold bg-transparent outline-none min-w-0 hover:underline focus:underline underline-offset-2" />
              <input value={currentWeek.rpe} onChange={e => updateWeek(activeWeek, { rpe: e.target.value })}
                placeholder="@7" title="RPE objetivo"
                className="w-12 text-[11px] text-center font-mono bg-bg border border-border rounded-md px-1 py-0.5 outline-none" />
              <button onClick={() => setCurrentWeek(activeWeek)}
                className={`p-1.5 rounded-lg transition-colors ${currentWeek.isCurrent ? 'text-ok bg-ok/10' : 'text-muted hover:text-ok hover:bg-ok/5'}`}>
                <Star className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => copyWeek(activeWeek)} className="p-1.5 text-muted hover:text-accent rounded-lg"><Copy className="w-3.5 h-3.5" /></button>
              {confirmDeleteWeek === activeWeek ? (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <span className="text-[10px] text-warn font-semibold">¿Borrar?</span>
                  <button onClick={confirmDeleteWeekFn} className="px-2 py-1 bg-warn text-white rounded text-[10px] font-bold">Sí</button>
                  <button onClick={() => setConfirmDeleteWeek(null)} className="px-2 py-1 border border-border rounded text-[10px] text-muted">No</button>
                </div>
              ) : (
                <button onClick={() => deleteWeek(activeWeek)} className="p-1.5 text-muted hover:text-warn rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
              )}
            </div>

            <div className="divide-y divide-border">
              {currentWeek.days.map((day, di) => (
                <div key={di} className="group/day">
                  {/* Header día */}
                  <div className="flex items-center gap-2 px-4 py-2 hover:bg-bg-alt/20 transition-colors cursor-pointer select-none"
                    onClick={() => setOpenDays(p => ({ ...p, [di]: !p[di] }))}>
                    <GripVertical className="w-3 h-3 text-muted/30 flex-shrink-0" />
                    <div className="flex-1 min-w-0 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <input value={day.title} onChange={e => updateDay(activeWeek, di, { title: e.target.value })}
                        className="text-sm font-bold bg-transparent outline-none w-32 hover:underline focus:underline underline-offset-2" />
                      <input value={day.focus} onChange={e => updateDay(activeWeek, di, { focus: e.target.value })}
                        placeholder="foco del día..." className="text-xs text-muted bg-transparent outline-none flex-1 min-w-0" />
                    </div>
                    <span className="text-[10px] text-muted bg-bg-alt border border-border px-2 py-0.5 rounded-full font-medium">{day.exercises.length}ej</span>
                    <button onClick={e => { e.stopPropagation(); copyDay(activeWeek, di) }} className="p-1 text-muted hover:text-accent opacity-0 group-hover/day:opacity-100 transition-all"><Copy className="w-3 h-3" /></button>
                    <button onClick={e => { e.stopPropagation(); deleteDay(activeWeek, di) }} className="p-1 text-muted hover:text-warn opacity-0 group-hover/day:opacity-100 transition-all"><Trash2 className="w-3 h-3" /></button>
                    {openDays[di] ? <ChevronUp className="w-3.5 h-3.5 text-muted flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted flex-shrink-0" />}
                  </div>

                  {openDays[di] && (
                    <div className="border-t border-border/50">

                      {/* CALENTAMIENTO — lista de ejercicios real */}
                      <WarmupSection
                        warmupExercises={(day as any).warmupExercises || []}
                        isOpen={!!openWarmup[di]}
                        onToggle={() => setOpenWarmup(p => ({ ...p, [di]: !p[di] }))}
                        library={library}
                        onAdd={(ex) => {
                          const warmupExercises = [...((day as any).warmupExercises || []), ex]
                          updateDay(activeWeek, di, { warmupExercises } as any)
                        }}
                        onUpdate={(ri, u) => {
                          const warmupExercises = [...((day as any).warmupExercises || [])]
                          warmupExercises[ri] = { ...warmupExercises[ri], ...u }
                          updateDay(activeWeek, di, { warmupExercises } as any)
                        }}
                        onDelete={(ri) => {
                          const warmupExercises = ((day as any).warmupExercises || []).filter((_: any, i: number) => i !== ri)
                          updateDay(activeWeek, di, { warmupExercises } as any)
                        }}
                        onMove={(fromRi, toRi) => {
                          const warmupExercises = [...((day as any).warmupExercises || [])]
                          const [moved] = warmupExercises.splice(fromRi, 1)
                          warmupExercises.splice(toRi, 0, moved)
                          updateDay(activeWeek, di, { warmupExercises } as any)
                        }}
                      />

                      {/* Cabecera tabla */}
                      {day.exercises.length > 0 && (
                        <div className="grid gap-0 px-4 py-1.5 bg-bg-alt/30 border-b border-border/30"
                          style={{ gridTemplateColumns: '20px 1fr 80px 140px 110px 90px 70px 80px' }}>
                          {['', 'EJERCICIO', 'SERIES', 'PESO / INT.', 'TIPO SERIE', 'REST', 'LOG', 'ACCIONES'].map((h, i) => (
                            <p key={i} className="text-[9px] font-bold uppercase tracking-wider text-muted text-center first:text-left">{h}</p>
                          ))}
                        </div>
                      )}

                      {/* Filas ejercicios */}
                      <div className="divide-y divide-border/30">
                        {day.exercises.map((ex, ri) => {
                          const isSelected = selectedEx?.wi === activeWeek && selectedEx?.di === di && selectedEx?.ri === ri
                          const ytId = ex.videoUrl ? getYTId(ex.videoUrl) : null
                          const restSets = ex.restSets ?? 90
                          const restAfter = ex.restAfter ?? 120
                          const isRestPopupOpen = restPopup?.wi === activeWeek && restPopup?.di === di && restPopup?.ri === ri
                          const seriesTypeId = (ex as any).seriesType || 'normal'
                          const seriesMeta = seriesTypes.find(s => s.id === seriesTypeId) || seriesTypes[0] || DEFAULT_SERIES_TYPES[0]

                          return (
                            <div key={ri} className={`transition-colors ${isSelected ? 'bg-accent/4' : 'hover:bg-bg-alt/20'}`}>
                              <div className="grid items-center gap-0 px-4 py-2 cursor-pointer"
                                style={{ gridTemplateColumns: '20px 1fr 80px 140px 110px 90px 70px 80px' }}
                                onClick={() => setSelectedEx(isSelected ? null : { wi: activeWeek, di, ri })}>

                                {/* Nº */}
                                <div className="flex items-center justify-center">
                                  {ex.isMain
                                    ? <span className="w-4 h-4 rounded-full bg-accent flex items-center justify-center text-white text-[8px] font-bold">{ri + 1}</span>
                                    : <span className="text-[10px] text-muted font-bold">{ri + 1}</span>}
                                </div>

                                {/* Nombre */}
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <input value={ex.name}
                                    onChange={e => { e.stopPropagation(); updateExercise(activeWeek, di, ri, { name: e.target.value }) }}
                                    onClick={e => e.stopPropagation()}
                                    placeholder="Nombre del ejercicio"
                                    className={`text-sm bg-transparent outline-none w-full truncate ${isSelected ? 'font-semibold text-accent' : 'font-medium'}`}
                                  />
                                  {ytId && <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`} className="w-8 h-5 object-cover rounded flex-shrink-0" alt="" />}
                                </div>

                                {/* Series */}
                                <input value={ex.sets}
                                  onChange={e => { e.stopPropagation(); updateExercise(activeWeek, di, ri, { sets: e.target.value }) }}
                                  onClick={e => e.stopPropagation()}
                                  placeholder="3×10"
                                  className="text-xs font-bold text-center bg-bg border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-accent/20 w-full"
                                />

                                {/* Peso */}
                                <input value={ex.weight}
                                  onChange={e => { e.stopPropagation(); updateExercise(activeWeek, di, ri, { weight: e.target.value }) }}
                                  onClick={e => e.stopPropagation()}
                                  placeholder="Peso / Intensidad"
                                  className="text-xs bg-bg border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-accent/20 w-full mx-1"
                                />

                                {/* Tipo serie */}
                                <div onClick={e => e.stopPropagation()} className="px-1">
                                  <select value={seriesTypeId}
                                    onChange={e => updateExercise(activeWeek, di, ri, { seriesType: e.target.value } as any)}
                                    className="w-full text-[10px] font-bold bg-bg border border-border rounded-lg px-1.5 py-1.5 outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer"
                                    title={seriesMeta?.desc}>
                                    {seriesTypes.map(t => (
                                      <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Rest sets */}
                                <div className="relative flex justify-center" onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={() => setRestPopup(isRestPopupOpen ? null : { wi: activeWeek, di, ri, field: 'restSets' })}
                                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all w-full justify-center ${
                                      isRestPopupOpen ? 'bg-accent text-white border-accent' : 'bg-bg border-border text-muted hover:border-accent hover:text-accent'
                                    }`}>
                                    <Timer className="w-3 h-3 flex-shrink-0" />
                                    {fmtRest(restSets)}
                                  </button>
                                  {isRestPopupOpen && restPopup?.field === 'restSets' && (
                                    <RestPopup value={restSets} label="Descanso entre series"
                                      onChange={v => updateExercise(activeWeek, di, ri, { restSets: v })}
                                      onClose={() => setRestPopup(null)} />
                                  )}
                                </div>

                                {/* Log */}
                                <div className="flex justify-center">
                                  {(() => {
                                    const key = `ex_w${activeWeek}_d${di}_r${ri}`
                                    const log = logs[key]
                                    const sets = Object.values(log?.sets || {})
                                    return sets.length > 0
                                      ? <span className="text-[10px] font-bold text-ok">{sets.length}×✓</span>
                                      : <span className="text-[10px] text-muted/40">—</span>
                                  })()}
                                </div>

                                {/* Acciones */}
                                <div className="flex items-center justify-end gap-0.5">
                                  <div className="flex flex-col gap-0 mr-0.5">
                                    <button onClick={e => { e.stopPropagation(); if (ri > 0) moveExercise(di, ri, ri - 1) }} disabled={ri === 0}
                                      className="p-0.5 text-muted hover:text-ink disabled:opacity-20 transition-colors leading-none"><ChevronUp className="w-3 h-3" /></button>
                                    <button onClick={e => { e.stopPropagation(); if (ri < day.exercises.length - 1) moveExercise(di, ri, ri + 1) }} disabled={ri === day.exercises.length - 1}
                                      className="p-0.5 text-muted hover:text-ink disabled:opacity-20 transition-colors leading-none"><ChevronDown className="w-3 h-3" /></button>
                                  </div>
                                  <button onClick={e => { e.stopPropagation(); updateExercise(activeWeek, di, ri, { isMain: !ex.isMain }) }}
                                    className={`p-1.5 rounded transition-colors ${ex.isMain ? 'text-accent' : 'text-muted hover:text-accent'}`}>
                                    <Star className="w-3 h-3" />
                                  </button>
                                  <button onClick={e => { e.stopPropagation(); copyExercise(activeWeek, di, ri) }}
                                    className="p-1.5 text-muted hover:text-accent rounded transition-colors"><Copy className="w-3 h-3" /></button>
                                  <button onClick={e => { e.stopPropagation(); deleteExercise(activeWeek, di, ri) }}
                                    className="p-1.5 text-muted hover:text-warn rounded transition-colors"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              </div>

                              {/* Panel expandido */}
                              {isSelected && (
                                <div className="mx-4 mb-2 rounded-xl border border-accent/20 bg-accent/3 overflow-hidden" onClick={e => e.stopPropagation()}>

                                  {/* Tipo serie — info */}
                                  <div className="px-4 py-2.5 border-b border-accent/10 bg-accent/5 flex items-center gap-3">
                                    <span className="text-base">{seriesMeta?.emoji}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-accent">{seriesMeta?.label}</p>
                                      <p className="text-[10px] text-muted leading-tight">{seriesMeta?.desc}</p>
                                    </div>
                                    <button onClick={() => setShowSeriesInfo(true)}
                                      className="flex items-center gap-1 px-2 py-1 bg-white border border-accent/20 rounded-lg text-[10px] text-accent font-semibold hover:bg-accent/5 flex-shrink-0">
                                      <Info className="w-3 h-3" /> Saber más
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-2 divide-x divide-border/50">
                                    <div className="p-3 space-y-2">
                                      <input value={ex.comment}
                                        onChange={e => updateExercise(activeWeek, di, ri, { comment: e.target.value })}
                                        placeholder="Indicaciones técnicas para el alumno..."
                                        className="w-full text-xs text-muted bg-bg border border-border/50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-accent/20" />
                                      <div className="flex items-center gap-2">
                                        <Video className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                                        <input value={ex.videoUrl || ''}
                                          onChange={e => updateExercise(activeWeek, di, ri, { videoUrl: e.target.value })}
                                          placeholder="URL vídeo YouTube..."
                                          className="flex-1 text-xs bg-bg border border-border/50 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-accent/20" />
                                      </div>
                                      <button onClick={() => updateExercise(activeWeek, di, ri, { requiresVideo: !ex.requiresVideo })}
                                        className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                                          ex.requiresVideo ? 'bg-warn/10 border-warn/30 text-warn' : 'border-border/50 text-muted hover:border-warn/40 hover:text-warn'
                                        }`}>
                                        <span>📹</span>
                                        {ex.requiresVideo ? '✓ Pidiendo vídeo de ejecución' : 'Pedir vídeo de ejecución al cliente'}
                                      </button>
                                    </div>
                                    <div className="p-3 space-y-3">
                                      <div className="flex items-center gap-1.5">
                                        <Timer className="w-3.5 h-3.5 text-accent" />
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Tiempos de descanso</p>
                                      </div>
                                      <div className="space-y-1.5">
                                        <p className="text-[10px] text-muted font-semibold uppercase tracking-wider">Entre series</p>
                                        <div className="flex flex-wrap gap-1">
                                          {REST_PRESETS.map(p => (
                                            <button key={p} onClick={() => updateExercise(activeWeek, di, ri, { restSets: p })}
                                              className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all ${restSets === p ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
                                              {fmtRest(p)}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="space-y-1.5">
                                        <p className="text-[10px] text-muted font-semibold uppercase tracking-wider">Tras el ejercicio</p>
                                        <div className="flex flex-wrap gap-1">
                                          {REST_PRESETS.map(p => (
                                            <button key={p} onClick={() => updateExercise(activeWeek, di, ri, { restAfter: p })}
                                              className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all ${restAfter === p ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
                                              {fmtRest(p)}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      {/* Toggle mostrar/ocultar timer al cliente */}
                                      <div
                                        onClick={() => updateExercise(activeWeek, di, ri, { hideRest: !(ex as any).hideRest } as any)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-xl border cursor-pointer transition-all mt-1 ${
                                          (ex as any).hideRest
                                            ? 'bg-warn/5 border-warn/30'
                                            : 'bg-ok/5 border-ok/20'
                                        }`}>
                                        <div>
                                          <p className="text-[10px] font-bold text-ink">Mostrar timer al cliente</p>
                                          <p className="text-[9px] text-muted">
                                            {(ex as any).hideRest ? 'Oculto — el cliente no verá la cuenta atrás' : 'Visible — el cliente verá el descanso'}
                                          </p>
                                        </div>
                                        <div className={`w-8 h-5 rounded-full flex items-center px-0.5 transition-all flex-shrink-0 ${(ex as any).hideRest ? 'bg-warn/40' : 'bg-ok'}`}>
                                          <div className={`w-4 h-4 bg-white rounded-full shadow transition-all ${(ex as any).hideRest ? 'translate-x-0' : 'translate-x-3'}`} />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      <div className="px-4 py-2">
                        <button onClick={() => setPickerFor({ dayIdx: di })}
                          className="w-full border border-dashed border-border rounded-lg py-2 text-xs text-muted hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-1.5">
                          <Plus className="w-3.5 h-3.5" /> Añadir ejercicio
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="px-4 py-3 border-t border-border/50 bg-bg-alt/10">
                <button onClick={() => addDay(activeWeek)}
                  className="w-full border border-dashed border-border rounded-lg py-2 text-xs text-muted hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Añadir día
                </button>
              </div>
            </div>
          </div>
        )}

        {!weeks.length && (
          <div className="text-center py-16 text-muted border-2 border-dashed border-border rounded-2xl">
            <p className="text-sm font-medium mb-2">Sin semanas todavía</p>
            <button onClick={addWeek} className="text-accent hover:underline text-sm font-semibold">+ Añadir primera semana</button>
          </div>
        )}
      </div>

      {/* Panel derecho analytics */}
      <div className={`flex-shrink-0 transition-all duration-200 overflow-hidden ${selEx ? 'w-72' : 'w-0'}`}>
        {selEx && selectedEx && (
          <ExerciseAnalyticsPanel
            ex={selEx} libEx={selLibEx} logs={logs} plan={plan}
            exName={selEx.name} clientName={clientName}
            seriesTypes={seriesTypes}
            onClose={() => setSelectedEx(null)}
          />
        )}
      </div>

      <Modal open={!!pickerFor} onClose={() => setPickerFor(null)} title="Añadir ejercicio" maxWidth="max-w-2xl">
        {pickerFor && (
          <ExercisePicker library={library}
            onSelect={ex => addExercise(activeWeek, pickerFor.dayIdx, ex)}
            onClose={() => setPickerFor(null)} />
        )}
      </Modal>

      <Modal open={showImport} onClose={() => setShowImport(false)} title="Importar plan de otro cliente">
        <div className="space-y-2">
          <p className="text-sm text-muted mb-3">Copia el plan de otro cliente:</p>
          {allClients.map(c => (
            <button key={c.id} onClick={() => handleImport(c.id)} disabled={importing}
              className="w-full flex items-center gap-3 px-4 py-3 bg-bg border border-border rounded-xl hover:border-accent text-left transition-all">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">{c.name[0]}</div>
              <span className="text-sm font-medium">{c.name} {c.surname}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}


// ── WarmupSection ────────────────────────────────────────
interface WarmupSectionProps {
  warmupExercises: Exercise[]
  isOpen: boolean
  onToggle: () => void
  library: LibraryExercise[]
  onAdd: (ex: Exercise) => void
  onUpdate: (ri: number, updates: Partial<Exercise>) => void
  onDelete: (ri: number) => void
  onMove: (fromRi: number, toRi: number) => void
}

function WarmupSection({ warmupExercises, isOpen, onToggle, library, onAdd, onUpdate, onDelete, onMove }: WarmupSectionProps) {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div className="border-b border-border/30 bg-orange-50/40">
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors w-full text-left px-4 py-2.5">
        <Flame className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Calentamiento</span>
        {warmupExercises.length > 0
          ? <span className="ml-1 text-[10px] bg-orange-100 text-orange-500 px-1.5 py-0.5 rounded-full font-bold">{warmupExercises.length} ejerc.</span>
          : <span className="ml-auto text-[10px] text-orange-300 font-normal">Sin definir</span>
        }
        {isOpen
          ? <ChevronUp className="w-3 h-3 flex-shrink-0 ml-auto" />
          : <ChevronDown className="w-3 h-3 flex-shrink-0 ml-auto" />
        }
      </button>

      {isOpen && (
        <div className="px-4 pb-3 space-y-1.5">
          {/* Lista de ejercicios */}
          {warmupExercises.length > 0 && (
            <div className="space-y-1">
              {warmupExercises.map((ex, ri) => (
                <div key={ri} className="flex items-center gap-2 bg-white/80 border border-orange-100 rounded-xl px-3 py-2 group">
                  <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-[9px] font-bold text-orange-500 flex-shrink-0">
                    {ri + 1}
                  </div>
                  <input
                    value={ex.name}
                    onChange={e => onUpdate(ri, { name: e.target.value })}
                    placeholder="Nombre del ejercicio"
                    className="flex-1 text-xs font-medium bg-transparent outline-none min-w-0 text-gray-700"
                  />
                  <input
                    value={ex.sets}
                    onChange={e => onUpdate(ri, { sets: e.target.value })}
                    placeholder="2×10"
                    className="w-14 text-[10px] font-bold text-center bg-orange-50 border border-orange-100 rounded-lg px-1.5 py-1 outline-none"
                  />
                  <input
                    value={ex.weight || ''}
                    onChange={e => onUpdate(ri, { weight: e.target.value })}
                    placeholder="Peso"
                    className="w-16 text-[10px] text-center bg-orange-50 border border-orange-100 rounded-lg px-1.5 py-1 outline-none"
                  />
                  <input
                    value={ex.videoUrl || ''}
                    onChange={e => onUpdate(ri, { videoUrl: e.target.value })}
                    placeholder="URL vídeo..."
                    className="w-24 text-[10px] bg-orange-50 border border-orange-100 rounded-lg px-1.5 py-1 outline-none hidden sm:block"
                  />
                  <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => ri > 0 && onMove(ri, ri - 1)}
                      disabled={ri === 0}
                      className="p-0.5 text-orange-300 hover:text-orange-600 disabled:opacity-20">
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => ri < warmupExercises.length - 1 && onMove(ri, ri + 1)}
                      disabled={ri === warmupExercises.length - 1}
                      className="p-0.5 text-orange-300 hover:text-orange-600 disabled:opacity-20">
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDelete(ri)}
                      className="p-0.5 text-orange-300 hover:text-warn ml-0.5">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botón añadir */}
          <button
            onClick={() => setShowPicker(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-orange-200 rounded-xl text-[11px] text-orange-400 hover:border-orange-400 hover:text-orange-600 transition-all">
            <Plus className="w-3.5 h-3.5" /> Añadir ejercicio de calentamiento
          </button>
          <p className="text-[10px] text-orange-300 text-center">
            El cliente lo verá antes de empezar los ejercicios principales
          </p>
        </div>
      )}

      {/* Picker de ejercicios de la librería */}
      <Modal open={showPicker} onClose={() => setShowPicker(false)} title="Añadir ejercicio de calentamiento" maxWidth="max-w-2xl">
        <ExercisePicker
          library={library}
          onSelect={ex => { onAdd(ex); setShowPicker(false) }}
          onClose={() => setShowPicker(false)}
        />
      </Modal>
    </div>
  )
}

// ── Analytics Panel ───────────────────────────────────────
interface AnalyticsPanelProps {
  ex: Exercise; libEx: LibraryExercise | undefined
  logs: TrainingLogs; plan: TrainingPlan
  exName: string; clientName: string
  seriesTypes: SeriesTypeDef[]
  onClose: () => void
}

function fmtRestLocal(s: number) {
  if (!s) return '—'
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60), r = s % 60
  return r > 0 ? `${m}m${r}s` : `${m}m`
}

function MiniLineChart({ data, color = '#6e5438' }: { data: { x: string; y: number }[]; color?: string }) {
  if (data.length < 2) return <div className="h-20 flex items-center justify-center text-xs text-muted">Sin suficientes datos</div>
  const vals = data.map(d => d.y)
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1
  const w = 260, h = 80, pad = 8
  const points = data.map((d, i) => ({
    px: pad + (i / (data.length - 1)) * (w - pad * 2),
    py: h - pad - ((d.y - min) / range) * (h - pad * 2),
    label: d.x, val: d.y
  }))
  const polyline = points.map(p => `${p.px},${p.py}`).join(' ')
  const area = `${pad},${h - pad} ${polyline} ${w - pad},${h - pad}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 80 }}>
      <defs>
        <linearGradient id={`g${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#g${color.replace('#','')})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.px} cy={p.py} r="3" fill={color} />
          {(i === 0 || i === points.length - 1) && (
            <text x={p.px} y={p.py - 6} textAnchor="middle" fontSize="9" fill={color} fontWeight="700">{p.val}kg</text>
          )}
        </g>
      ))}
      {points.filter((_, i) => i === 0 || i === points.length - 1).map((p, i) => (
        <text key={i} x={p.px} y={h - 1} textAnchor="middle" fontSize="8" fill="#8a8278">{p.label.slice(5)}</text>
      ))}
    </svg>
  )
}

function ExerciseAnalyticsPanel({ ex, libEx, logs, plan, exName, clientName, seriesTypes, onClose }: AnalyticsPanelProps) {
  const exLogs: { date: string; sets: { weight: string; reps: string }[]; bestWeight: number }[] = []
  plan.weeks.forEach((week, wi) => {
    week.days.forEach((day, di) => {
      day.exercises.forEach((planEx, ri) => {
        if (planEx.name.toLowerCase() !== exName.toLowerCase()) return
        const key = `ex_w${wi}_d${di}_r${ri}`
        const log = logs[key]
        if (!log?.dateDone) return
        const sets = Object.values(log.sets || {}).map((s: any) => ({ weight: s.weight || '0', reps: s.reps || '0' }))
        const bestWeight = Math.max(0, ...sets.map(s => parseFloat(s.weight) || 0))
        exLogs.push({ date: log.dateDone, sets, bestWeight })
      })
    })
  })
  exLogs.sort((a, b) => a.date.localeCompare(b.date))
  const byDate: Record<string, typeof exLogs[0]> = {}
  exLogs.forEach(l => { if (!byDate[l.date] || l.bestWeight > byDate[l.date].bestWeight) byDate[l.date] = l })
  const chartData = Object.entries(byDate).map(([date, l]) => ({ x: date, y: l.bestWeight }))
  const lastLog = exLogs[exLogs.length - 1]
  const prevLog = exLogs[exLogs.length - 2]
  const bestEver = Math.max(0, ...exLogs.map(l => l.bestWeight))
  const est1RM = lastLog ? Math.round(lastLog.sets.reduce((best, s) => {
    const w = parseFloat(s.weight) || 0, r = parseInt(s.reps) || 1
    return Math.max(best, w * (1 + r / 30))
  }, 0)) : 0
  const trend = lastLog && prevLog ? lastLog.bestWeight - prevLog.bestWeight : 0
  const ytId = ex.videoUrl ? getYTId(ex.videoUrl) : null
  const seriesTypeId = (ex as any).seriesType || 'normal'
  const seriesMeta = seriesTypes.find(s => s.id === seriesTypeId) || DEFAULT_SERIES_TYPES[0]

  return (
    <div className="w-72 space-y-2.5 overflow-y-auto max-h-full pb-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted">Analytics</p>
          <p className="font-serif font-bold text-base leading-tight mt-0.5">{exName || 'Ejercicio'}</p>
          {clientName && <p className="text-[10px] text-muted">{clientName}</p>}
        </div>
        <button onClick={onClose} className="p-1 text-muted hover:text-ink rounded flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
      </div>

      <div className="bg-accent/5 border border-accent/15 rounded-xl px-3 py-2 flex items-center gap-2">
        <span className="text-base">{seriesMeta?.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-accent">{seriesMeta?.label}</p>
          <p className="text-[9px] text-muted leading-tight truncate">{seriesMeta?.desc}</p>
        </div>
      </div>

      <div className="bg-accent/5 border border-accent/15 rounded-xl px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5"><Timer className="w-3 h-3 text-accent" /><span className="text-[10px] text-accent font-bold">Descansos</span></div>
        <div className="flex gap-3 text-[10px]">
          <span className="text-muted">series: <span className="font-bold text-ink">{fmtRestLocal(ex.restSets ?? 90)}</span></span>
          <span className="text-muted">tras: <span className="font-bold text-ink">{fmtRestLocal(ex.restAfter ?? 120)}</span></span>
        </div>
      </div>

      {exLogs.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: 'Mejor', value: bestEver > 0 ? `${bestEver}kg` : '—', color: 'text-accent' },
              { label: '1RM est.', value: est1RM > 0 ? `~${est1RM}kg` : '—', color: 'text-ok' },
              { label: 'Tendencia', value: trend !== 0 ? `${trend > 0 ? '+' : ''}${trend}kg` : '—', color: trend > 0 ? 'text-ok' : trend < 0 ? 'text-warn' : 'text-muted' },
            ].map((k, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-2 text-center">
                <p className={`font-bold text-sm ${k.color}`}>{k.value}</p>
                <p className="text-[8px] text-muted uppercase tracking-wider mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
          {chartData.length >= 2 && (
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-[9px] uppercase tracking-wider text-muted font-bold mb-2">Progresión de peso</p>
              <MiniLineChart data={chartData} />
            </div>
          )}
          {lastLog && (
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-[9px] uppercase tracking-wider text-muted font-bold mb-2">
                Última sesión · {new Date(lastLog.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </p>
              <div className="space-y-1">
                {lastLog.sets.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-bg-alt text-[9px] font-bold flex items-center justify-center text-muted flex-shrink-0">{i+1}</span>
                    <div className="flex-1 bg-bg rounded px-2 py-1 flex justify-between">
                      <span className="text-xs font-bold">{s.weight}kg</span>
                      <span className="text-xs text-muted">×{s.reps}</span>
                    </div>
                  </div>
                ))}
              </div>
              {prevLog && (
                <p className="text-[10px] text-muted mt-1.5">
                  Anterior: <span className="font-semibold">{prevLog.bestWeight}kg</span>
                  {trend !== 0 && <span className={`ml-1 font-bold ${trend > 0 ? 'text-ok' : 'text-warn'}`}>{trend > 0 ? `↑+${trend}kg` : `↓${trend}kg`}</span>}
                </p>
              )}
            </div>
          )}
          <div className="bg-card border border-border rounded-xl p-3">
            <p className="text-[9px] uppercase tracking-wider text-muted font-bold mb-2">Historial</p>
            <div className="flex items-end gap-0.5 h-10">
              {chartData.slice(-10).map((d, i) => {
                const maxY = Math.max(...chartData.map(c => c.y), 1)
                const h = Math.max(3, Math.round((d.y / maxY) * 36))
                const isLast = i === chartData.slice(-10).length - 1
                return (
                  <div key={i} className="flex-1">
                    <div className={`w-full rounded-sm ${isLast ? 'bg-accent' : 'bg-bg-alt border border-border/50'}`} style={{ height: h }} />
                  </div>
                )
              })}
            </div>
            <p className="text-[9px] text-muted mt-1">{exLogs.length} sesión{exLogs.length !== 1 ? 'es' : ''}</p>
          </div>
        </>
      ) : (
        <div className="bg-card border border-border rounded-xl p-5 text-center">
          <p className="text-xl mb-1.5">📊</p>
          <p className="text-sm font-semibold">Sin historial aún</p>
          <p className="text-xs text-muted mt-1">Los datos aparecen cuando el cliente completa sesiones.</p>
        </div>
      )}

      {ytId && (
        <div className="rounded-xl overflow-hidden border border-border">
          <a href={ex.videoUrl} target="_blank" rel="noreferrer">
            <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} className="w-full aspect-video object-cover" alt="" />
          </a>
          <p className="text-[10px] text-muted px-3 py-1.5">📹 Ver vídeo de referencia</p>
        </div>
      )}

      {libEx?.description && (
        <div className="bg-accent/5 border border-accent/15 rounded-xl p-3">
          <p className="text-[9px] uppercase tracking-wider text-accent font-bold mb-1">Notas técnicas</p>
          <p className="text-xs leading-relaxed">{libEx.description}</p>
        </div>
      )}

      {ex.comment && (
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[9px] uppercase tracking-wider text-muted font-bold mb-1">Indicaciones al cliente</p>
          <p className="text-xs text-muted leading-relaxed">{ex.comment}</p>
        </div>
      )}
    </div>
  )
}
