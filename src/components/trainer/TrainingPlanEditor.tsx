import { useState } from 'react'
import {
  Plus, Trash2, ChevronDown, ChevronUp, Copy, Video,
  Star, GripVertical, Search, X
} from 'lucide-react'
import { Button } from '../shared/Button'
import { Modal } from '../shared/Modal'
import { TrainingPlan, WeekPlan, DayPlan, Exercise } from '../../types'
import { DEFAULT_EXERCISES, TRAINING_TYPES } from '../../lib/constants'
import { toast } from '../shared/Toast'

interface Props {
  plan: TrainingPlan
  onChange: (plan: TrainingPlan) => void
  allClients?: { id: string; name: string; surname: string }[]
  onImportFromClient?: (clientId: string) => Promise<TrainingPlan | null>
}

// ── Helpers ──────────────────────────────────────────────
const emptyExercise = (): Exercise => ({
  name: '', sets: '3×10', weight: '', isMain: false, comment: '', videoUrl: ''
})
const emptyDay = (n: number): DayPlan => ({
  title: `DÍA ${n}`, focus: '', exercises: []
})
const emptyWeek = (n: number): WeekPlan => ({
  label: `Semana ${n}`, rpe: '@7', isCurrent: false, days: []
})

// ── Buscador de ejercicios ────────────────────────────────
function ExercisePicker({ onSelect, onClose }: { onSelect: (name: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const filtered = q
    ? DEFAULT_EXERCISES.filter(e => e.toLowerCase().includes(q.toLowerCase()))
    : DEFAULT_EXERCISES.slice(0, 12)

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          autoFocus
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar ejercicio..."
          className="w-full pl-9 pr-4 py-2.5 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
        />
      </div>
      <div className="max-h-56 overflow-y-auto space-y-0.5">
        {filtered.map(ex => (
          <button
            key={ex}
            onClick={() => { onSelect(ex); onClose() }}
            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-bg-alt hover:text-ink transition-colors text-muted"
          >
            {ex}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-3 py-4 text-sm text-muted text-center">
            Sin resultados.
            <button
              onClick={() => { onSelect(q); onClose() }}
              className="block mx-auto mt-2 text-accent hover:underline"
            >
              Añadir "{q}" directamente →
            </button>
          </div>
        )}
      </div>
      {q && filtered.length > 0 && (
        <button
          onClick={() => { onSelect(q); onClose() }}
          className="w-full text-center text-xs text-accent hover:underline py-1"
        >
          Usar "{q}" como nombre libre
        </button>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────
export function TrainingPlanEditor({ plan, onChange, allClients = [], onImportFromClient }: Props) {
  const [activeWeek, setActiveWeek] = useState(0)
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({ 0: true })
  const [pickerFor, setPickerFor] = useState<{ dayIdx: number } | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting] = useState(false)

  const weeks = plan.weeks || []
  const currentWeek = weeks[activeWeek]

  // ── Helpers de mutación ───────────────────────────────
  const updatePlan = (updates: Partial<TrainingPlan>) => onChange({ ...plan, ...updates })

  const updateWeek = (wi: number, updates: Partial<WeekPlan>) => {
    const w = [...weeks]
    w[wi] = { ...w[wi], ...updates }
    updatePlan({ weeks: w })
  }

  const updateDay = (wi: number, di: number, updates: Partial<DayPlan>) => {
    const w = [...weeks]
    const days = [...w[wi].days]
    days[di] = { ...days[di], ...updates }
    w[wi] = { ...w[wi], days }
    updatePlan({ weeks: w })
  }

  const updateExercise = (wi: number, di: number, ri: number, updates: Partial<Exercise>) => {
    const w = [...weeks]
    const days = [...w[wi].days]
    const exs = [...days[di].exercises]
    exs[ri] = { ...exs[ri], ...updates }
    days[di] = { ...days[di], exercises: exs }
    w[wi] = { ...w[wi], days }
    updatePlan({ weeks: w })
  }

  // ── Semanas ───────────────────────────────────────────
  const addWeek = () => {
    const newWeek = emptyWeek(weeks.length + 1)
    updatePlan({ weeks: [...weeks, newWeek] })
    setActiveWeek(weeks.length)
  }

  const copyWeek = (wi: number) => {
    const copy: WeekPlan = JSON.parse(JSON.stringify(weeks[wi]))
    copy.label = copy.label + ' (copia)'
    copy.isCurrent = false
    const w = [...weeks]
    w.splice(wi + 1, 0, copy)
    updatePlan({ weeks: w })
    setActiveWeek(wi + 1)
    toast('Semana copiada ✓', 'ok')
  }

  const deleteWeek = (wi: number) => {
    if (weeks.length <= 1) { toast('Debe haber al menos 1 semana', 'warn'); return }
    if (!confirm('¿Eliminar esta semana?')) return
    const w = weeks.filter((_, i) => i !== wi)
    updatePlan({ weeks: w })
    setActiveWeek(Math.max(0, wi - 1))
  }

  const setCurrentWeek = (wi: number) => {
    const w = weeks.map((wk, i) => ({ ...wk, isCurrent: i === wi }))
    updatePlan({ weeks: w })
  }

  // ── Días ──────────────────────────────────────────────
  const addDay = (wi: number) => {
    const days = [...(weeks[wi]?.days || []), emptyDay((weeks[wi]?.days?.length || 0) + 1)]
    updateWeek(wi, { days })
    setOpenDays(p => ({ ...p, [days.length - 1]: true }))
  }

  const copyDay = (wi: number, di: number) => {
    const copy: DayPlan = JSON.parse(JSON.stringify(weeks[wi].days[di]))
    copy.title = copy.title + ' (copia)'
    const days = [...weeks[wi].days]
    days.splice(di + 1, 0, copy)
    updateWeek(wi, { days })
    toast('Día copiado ✓', 'ok')
  }

  const deleteDay = (wi: number, di: number) => {
    const days = weeks[wi].days.filter((_, i) => i !== di)
    updateWeek(wi, { days })
  }

  // ── Ejercicios ────────────────────────────────────────
  const addExercise = (wi: number, di: number, name: string) => {
    const ex = { ...emptyExercise(), name }
    const exs = [...(weeks[wi].days[di]?.exercises || []), ex]
    updateDay(wi, di, { exercises: exs })
  }

  const copyExercise = (wi: number, di: number, ri: number) => {
    const copy: Exercise = JSON.parse(JSON.stringify(weeks[wi].days[di].exercises[ri]))
    const exs = [...weeks[wi].days[di].exercises]
    exs.splice(ri + 1, 0, copy)
    updateDay(wi, di, { exercises: exs })
    toast('Ejercicio duplicado ✓', 'ok')
  }

  const deleteExercise = (wi: number, di: number, ri: number) => {
    const exs = weeks[wi].days[di].exercises.filter((_, i) => i !== ri)
    updateDay(wi, di, { exercises: exs })
  }

  // ── Importar plan ─────────────────────────────────────
  const handleImport = async (clientId: string) => {
    if (!onImportFromClient) return
    setImporting(true)
    const imported = await onImportFromClient(clientId)
    if (imported) {
      updatePlan({ weeks: imported.weeks, type: imported.type })
      toast('Plan importado ✓', 'ok')
      setShowImport(false)
    } else {
      toast('Ese cliente no tiene plan', 'warn')
    }
    setImporting(false)
  }

  // ── Render ────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Cabecera con tipo y botón importar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={plan.type}
          onChange={e => updatePlan({ type: e.target.value })}
          className="text-sm bg-bg border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        >
          {TRAINING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {allClients.length > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowImport(true)}>
            <Copy className="w-3.5 h-3.5" /> Importar plan
          </Button>
        )}
      </div>

      {/* Selector de semanas */}
      <div className="flex items-center gap-2 flex-wrap">
        {weeks.map((w, wi) => (
          <button
            key={wi}
            onClick={() => setActiveWeek(wi)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeWeek === wi
                ? 'bg-ink text-white'
                : 'bg-card border border-border text-muted hover:border-accent hover:text-ink'
            }`}
          >
            {w.label}
            {w.isCurrent && <span className="ml-1.5 w-1.5 h-1.5 bg-ok rounded-full inline-block" />}
          </button>
        ))}
        <button
          onClick={addWeek}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border-2 border-dashed border-border text-muted hover:border-accent hover:text-accent transition-all"
        >
          + Semana
        </button>
      </div>

      {/* Edición de la semana activa */}
      {currentWeek && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Header semana */}
          <div className="px-5 py-4 border-b border-border flex items-center gap-3 flex-wrap">
            <input
              value={currentWeek.label}
              onChange={e => updateWeek(activeWeek, { label: e.target.value })}
              className="text-sm font-semibold bg-transparent outline-none border-b border-transparent hover:border-border focus:border-accent transition-colors flex-1 min-w-0"
            />
            <input
              value={currentWeek.rpe}
              onChange={e => updateWeek(activeWeek, { rpe: e.target.value })}
              placeholder="@7"
              className="w-16 text-sm text-center bg-bg border border-border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-accent/20"
            />
            <button
              onClick={() => setCurrentWeek(activeWeek)}
              title="Marcar como semana actual"
              className={`p-1.5 rounded-lg transition-colors ${
                currentWeek.isCurrent ? 'text-ok bg-ok/10' : 'text-muted hover:text-ok hover:bg-ok/10'
              }`}
            >
              <Star className="w-4 h-4" />
            </button>
            <button onClick={() => copyWeek(activeWeek)} title="Copiar semana" className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-colors">
              <Copy className="w-4 h-4" />
            </button>
            <button onClick={() => deleteWeek(activeWeek)} title="Eliminar semana" className="p-1.5 rounded-lg text-muted hover:text-warn hover:bg-warn/10 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Días */}
          <div className="divide-y divide-border">
            {currentWeek.days.map((day, di) => (
              <div key={di}>
                {/* Header día */}
                <div
                  className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-bg-alt/50 transition-colors"
                  onClick={() => setOpenDays(p => ({ ...p, [di]: !p[di] }))}
                >
                  <GripVertical className="w-4 h-4 text-muted/40 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <input
                      value={day.title}
                      onChange={e => { e.stopPropagation(); updateDay(activeWeek, di, { title: e.target.value }) }}
                      onClick={e => e.stopPropagation()}
                      className="text-sm font-semibold bg-transparent outline-none w-full"
                    />
                    <input
                      value={day.focus}
                      onChange={e => { e.stopPropagation(); updateDay(activeWeek, di, { focus: e.target.value }) }}
                      onClick={e => e.stopPropagation()}
                      placeholder="Foco del día (ej: Sentadilla / Banca)"
                      className="text-xs text-muted bg-transparent outline-none w-full mt-0.5"
                    />
                  </div>
                  <span className="text-xs text-muted">{day.exercises.length} ej.</span>
                  <button onClick={e => { e.stopPropagation(); copyDay(activeWeek, di) }} className="p-1 text-muted hover:text-accent transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteDay(activeWeek, di) }} className="p-1 text-muted hover:text-warn transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {openDays[di] ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                </div>

                {/* Ejercicios */}
                {openDays[di] && (
                  <div className="px-5 pb-4 bg-bg/30 space-y-2">
                    {day.exercises.map((ex, ri) => (
                      <div key={ri} className="bg-card border border-border rounded-xl p-4 space-y-3">
                        {/* Fila 1: nombre + series + peso + acciones */}
                        <div className="grid grid-cols-[1fr_80px_110px_auto] gap-2 items-center">
                          <input
                            value={ex.name}
                            onChange={e => updateExercise(activeWeek, di, ri, { name: e.target.value })}
                            placeholder="Nombre del ejercicio"
                            className="text-sm font-medium bg-transparent border-b border-transparent hover:border-border focus:border-accent outline-none transition-colors py-0.5"
                          />
                          <input
                            value={ex.sets}
                            onChange={e => updateExercise(activeWeek, di, ri, { sets: e.target.value })}
                            placeholder="3×10"
                            className="text-sm text-center bg-bg border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-accent/20"
                          />
                          <input
                            value={ex.weight}
                            onChange={e => updateExercise(activeWeek, di, ri, { weight: e.target.value })}
                            placeholder="Peso / Intensidad"
                            className="text-sm bg-bg border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-accent/20"
                          />
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateExercise(activeWeek, di, ri, { isMain: !ex.isMain })}
                              title={ex.isMain ? 'Principal' : 'Marcar como principal'}
                              className={`p-1.5 rounded-lg transition-colors ${ex.isMain ? 'text-accent bg-accent/10' : 'text-muted hover:text-accent'}`}
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => copyExercise(activeWeek, di, ri)} className="p-1.5 rounded-lg text-muted hover:text-accent transition-colors">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteExercise(activeWeek, di, ri)} className="p-1.5 rounded-lg text-muted hover:text-warn transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Fila 2: comentario + vídeo */}
                        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                          <input
                            value={ex.comment}
                            onChange={e => updateExercise(activeWeek, di, ri, { comment: e.target.value })}
                            placeholder="Indicaciones técnicas para el alumno..."
                            className="text-xs text-muted bg-transparent border-b border-transparent hover:border-border focus:border-accent outline-none transition-colors py-0.5 w-full"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              value={ex.videoUrl || ''}
                              onChange={e => updateExercise(activeWeek, di, ri, { videoUrl: e.target.value })}
                              placeholder="URL vídeo (YouTube...)"
                              className="text-xs w-48 bg-bg border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-accent/20"
                            />
                            {ex.videoUrl && (
                              <a href={ex.videoUrl} target="_blank" rel="noreferrer" className="p-1.5 text-muted hover:text-accent">
                                <Video className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Botón añadir ejercicio */}
                    <button
                      onClick={() => setPickerFor({ dayIdx: di })}
                      className="w-full border-2 border-dashed border-border rounded-xl py-3 text-sm text-muted hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Añadir ejercicio
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Botón añadir día */}
            <div className="px-5 py-3">
              <button
                onClick={() => addDay(activeWeek)}
                className="w-full border-2 border-dashed border-border rounded-xl py-3 text-sm text-muted hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Añadir día
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal buscador ejercicios */}
      <Modal open={!!pickerFor} onClose={() => setPickerFor(null)} title="Añadir ejercicio">
        {pickerFor && (
          <ExercisePicker
            onSelect={name => addExercise(activeWeek, pickerFor.dayIdx, name)}
            onClose={() => setPickerFor(null)}
          />
        )}
      </Modal>

      {/* Modal importar plan */}
      <Modal open={showImport} onClose={() => setShowImport(false)} title="Importar plan de otro cliente">
        <div className="space-y-2">
          <p className="text-sm text-muted mb-4">Selecciona un cliente para copiar su plan de entrenamiento:</p>
          {allClients.map(c => (
            <button
              key={c.id}
              onClick={() => handleImport(c.id)}
              disabled={importing}
              className="w-full flex items-center gap-3 px-4 py-3 bg-bg border border-border rounded-xl hover:border-accent hover:bg-bg-alt transition-all text-left"
            >
              <div className="w-8 h-8 rounded-full bg-bg-alt border border-border flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                {c.name[0]}
              </div>
              <span className="text-sm font-medium">{c.name} {c.surname}</span>
              {importing && <span className="ml-auto text-xs text-muted">Importando...</span>}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
