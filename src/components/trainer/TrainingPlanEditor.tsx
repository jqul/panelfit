import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Copy, Video, Star, GripVertical, X } from 'lucide-react'
import { Modal } from '../shared/Modal'
import { ExercisePicker } from './ExercisePicker'
import { TrainingPlan, WeekPlan, DayPlan, Exercise, LibraryExercise } from '../../types'
import { TRAINING_TYPES } from '../../lib/constants'
import { toast } from '../shared/Toast'

interface Props {
  plan: TrainingPlan
  onChange: (plan: TrainingPlan) => void
  allClients?: { id: string; name: string; surname: string }[]
  onImportFromClient?: (clientId: string) => Promise<TrainingPlan | null>
  library?: LibraryExercise[]
}

const emptyExercise = (): Exercise => ({ name: '', sets: '3×10', weight: '', isMain: false, comment: '', videoUrl: '' })
const emptyDay = (n: number): DayPlan => ({ title: `DÍA ${n}`, focus: '', exercises: [] })
const emptyWeek = (n: number): WeekPlan => ({ label: `Semana ${n}`, rpe: '@7', isCurrent: false, days: [] })

function getYTId(url: string) {
  const m = url?.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

export function TrainingPlanEditor({ plan, onChange, allClients = [], onImportFromClient, library = [] }: Props) {
  const [activeWeek, setActiveWeek] = useState(0)
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({ 0: true })
  const [pickerFor, setPickerFor] = useState<{ dayIdx: number } | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting] = useState(false)

  const weeks = plan.weeks || []
  const currentWeek = weeks[activeWeek]

  const updatePlan = (updates: Partial<TrainingPlan>) => onChange({ ...plan, ...updates })
  const updateWeek = (wi: number, updates: Partial<WeekPlan>) => {
    const w = [...weeks]; w[wi] = { ...w[wi], ...updates }; updatePlan({ weeks: w })
  }
  const updateDay = (wi: number, di: number, updates: Partial<DayPlan>) => {
    const w = [...weeks]; const days = [...w[wi].days]; days[di] = { ...days[di], ...updates }
    w[wi] = { ...w[wi], days }; updatePlan({ weeks: w })
  }
  const updateExercise = (wi: number, di: number, ri: number, updates: Partial<Exercise>) => {
    const w = [...weeks]; const days = [...w[wi].days]; const exs = [...days[di].exercises]
    exs[ri] = { ...exs[ri], ...updates }; days[di] = { ...days[di], exercises: exs }
    w[wi] = { ...w[wi], days }; updatePlan({ weeks: w })
  }

  // ── Semanas ───────────────────────────────────────────
  const addWeek = () => { updatePlan({ weeks: [...weeks, emptyWeek(weeks.length + 1)] }); setActiveWeek(weeks.length) }
  const copyWeek = (wi: number) => {
    const copy: WeekPlan = JSON.parse(JSON.stringify(weeks[wi]))
    copy.label = copy.label + ' (copia)'; copy.isCurrent = false
    const w = [...weeks]; w.splice(wi + 1, 0, copy)
    updatePlan({ weeks: w }); setActiveWeek(wi + 1); toast('Semana copiada ✓', 'ok')
  }
  const deleteWeek = (wi: number) => {
    if (weeks.length <= 1) { toast('Debe haber al menos 1 semana', 'warn'); return }
    if (!confirm('¿Eliminar esta semana?')) return
    const w = weeks.filter((_, i) => i !== wi)
    updatePlan({ weeks: w }); setActiveWeek(Math.max(0, wi - 1))
  }
  const setCurrentWeek = (wi: number) => updatePlan({ weeks: weeks.map((wk, i) => ({ ...wk, isCurrent: i === wi })) })

  // ── Días ──────────────────────────────────────────────
  const addDay = (wi: number) => {
    const days = [...(weeks[wi]?.days || []), emptyDay((weeks[wi]?.days?.length || 0) + 1)]
    updateWeek(wi, { days }); setOpenDays(p => ({ ...p, [days.length - 1]: true }))
  }
  const copyDay = (wi: number, di: number) => {
    const copy: DayPlan = JSON.parse(JSON.stringify(weeks[wi].days[di]))
    copy.title = copy.title + ' (copia)'
    const days = [...weeks[wi].days]; days.splice(di + 1, 0, copy)
    updateWeek(wi, { days }); toast('Día copiado ✓', 'ok')
  }
  const deleteDay = (wi: number, di: number) => updateWeek(wi, { days: weeks[wi].days.filter((_, i) => i !== di) })

  // ── Ejercicios ────────────────────────────────────────
  const addExercise = (wi: number, di: number, exercise: Exercise) => {
    const exs = [...(weeks[wi].days[di]?.exercises || []), exercise]
    updateDay(wi, di, { exercises: exs })
  }
  const copyExercise = (wi: number, di: number, ri: number) => {
    const copy: Exercise = JSON.parse(JSON.stringify(weeks[wi].days[di].exercises[ri]))
    const exs = [...weeks[wi].days[di].exercises]; exs.splice(ri + 1, 0, copy)
    updateDay(wi, di, { exercises: exs }); toast('Ejercicio duplicado ✓', 'ok')
  }
  const deleteExercise = (wi: number, di: number, ri: number) => {
    updateDay(wi, di, { exercises: weeks[wi].days[di].exercises.filter((_, i) => i !== ri) })
  }

  // ── Importar plan ─────────────────────────────────────
  const handleImport = async (clientId: string) => {
    if (!onImportFromClient) return
    setImporting(true)
    const imported = await onImportFromClient(clientId)
    if (imported) { updatePlan({ weeks: imported.weeks, type: imported.type }); toast('Plan importado ✓', 'ok'); setShowImport(false) }
    else toast('Ese cliente no tiene plan', 'warn')
    setImporting(false)
  }

  return (
    <div className="space-y-5">
      {/* Tipo + importar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={plan.type} onChange={e => updatePlan({ type: e.target.value })}
          className="text-sm bg-bg border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        >
          {TRAINING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {allClients.length > 0 && (
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-muted hover:border-accent hover:text-accent transition-colors"
          >
            <Copy className="w-3.5 h-3.5" /> Importar plan de cliente
          </button>
        )}
      </div>

      {/* Semanas */}
      <div className="flex items-center gap-2 flex-wrap">
        {weeks.map((w, wi) => (
          <button key={wi} onClick={() => setActiveWeek(wi)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeWeek === wi ? 'bg-ink text-white' : 'bg-card border border-border text-muted hover:border-accent hover:text-ink'
            }`}
          >
            {w.label}{w.isCurrent && <span className="ml-1.5 w-1.5 h-1.5 bg-ok rounded-full inline-block" />}
          </button>
        ))}
        <button onClick={addWeek}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border-2 border-dashed border-border text-muted hover:border-accent hover:text-accent transition-all"
        >+ Semana</button>
      </div>

      {/* Editor semana activa */}
      {currentWeek && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Header semana */}
          <div className="px-5 py-3.5 border-b border-border flex items-center gap-3 flex-wrap bg-bg-alt/30">
            <input value={currentWeek.label}
              onChange={e => updateWeek(activeWeek, { label: e.target.value })}
              aria-label="Nombre de semana" className="text-sm font-semibold bg-transparent outline-none border-b border-transparent hover:border-border focus:border-accent transition-colors flex-1 min-w-0"
            />
            <input value={currentWeek.rpe} onChange={e => updateWeek(activeWeek, { rpe: e.target.value })}
              placeholder="@7" aria-label="RPE de la semana"
              className="w-16 text-sm text-center bg-bg border border-border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-accent/20"
            />
            <button onClick={() => setCurrentWeek(activeWeek)} title="Marcar como semana actual" aria-label="Marcar como semana actual"
              className={`p-1.5 rounded-lg transition-colors ${currentWeek.isCurrent ? 'text-ok bg-ok/10' : 'text-muted hover:text-ok hover:bg-ok/10'}`}
            ><Star className="w-4 h-4" /></button>
            <button onClick={() => copyWeek(activeWeek)} title="Copiar semana" aria-label="Copiar semana" className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-colors"><Copy className="w-4 h-4" /></button>
            <button onClick={() => deleteWeek(activeWeek)} title="Eliminar semana" aria-label="Eliminar semana" className="p-1.5 rounded-lg text-muted hover:text-warn hover:bg-warn/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>

          {/* Días */}
          <div className="divide-y divide-border">
            {currentWeek.days.map((day, di) => (
              <div key={di}>
                {/* Header día */}
                <div
                  className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-bg-alt/40 transition-colors"
                  onClick={() => setOpenDays(p => ({ ...p, [di]: !p[di] }))}
                >
                  <GripVertical className="w-4 h-4 text-muted/40 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <input value={day.title}
                      onChange={e => { e.stopPropagation(); updateDay(activeWeek, di, { title: e.target.value }) }}
                      onClick={e => e.stopPropagation()}
                      className="text-sm font-semibold bg-transparent outline-none w-full"
                    />
                    <input value={day.focus}
                      onChange={e => { e.stopPropagation(); updateDay(activeWeek, di, { focus: e.target.value }) }}
                      onClick={e => e.stopPropagation()}
                      placeholder="Foco del día (ej: Sentadilla / Banca)"
                      className="text-xs text-muted bg-transparent outline-none w-full mt-0.5"
                    />
                  </div>
                  <span className="text-xs text-muted">{day.exercises.length} ej.</span>
                  <button onClick={e => { e.stopPropagation(); copyDay(activeWeek, di) }} className="p-1 text-muted hover:text-accent transition-colors"><Copy className="w-3.5 h-3.5" /></button>
                  <button onClick={e => { e.stopPropagation(); deleteDay(activeWeek, di) }} className="p-1 text-muted hover:text-warn transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  {openDays[di] ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                </div>

                {/* Ejercicios */}
                {openDays[di] && (
                  <div className="px-5 pb-4 bg-bg/30 space-y-2">
                    {day.exercises.map((ex, ri) => {
                      const ytId = ex.videoUrl ? getYTId(ex.videoUrl) : null
                      const extraVideos = (ex.videoUrls || []).filter(u => u !== ex.videoUrl)
                      return (
                        <div key={ri} className="bg-card border border-border rounded-xl p-4 space-y-3">
                          {/* Fila 1: nombre + series + peso + acciones */}
                          <div className="grid grid-cols-[1fr_80px_120px_auto] gap-2 items-center">
                            <input value={ex.name}
                              onChange={e => updateExercise(activeWeek, di, ri, { name: e.target.value })}
                              placeholder="Nombre del ejercicio"
                              className="text-sm font-medium bg-transparent border-b border-transparent hover:border-border focus:border-accent outline-none transition-colors py-0.5"
                            />
                            <input value={ex.sets}
                              onChange={e => updateExercise(activeWeek, di, ri, { sets: e.target.value })}
                              placeholder="3×10"
                              className="text-sm text-center bg-bg border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-accent/20"
                            />
                            <input value={ex.weight}
                              onChange={e => updateExercise(activeWeek, di, ri, { weight: e.target.value })}
                              placeholder="Peso / Intensidad"
                              className="text-sm bg-bg border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-accent/20"
                            />
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => updateExercise(activeWeek, di, ri, { isMain: !ex.isMain })}
                                title="Principal"
                                aria-label="Marcar como ejercicio principal"
                                className={`p-1.5 rounded-lg transition-colors ${ex.isMain ? 'text-accent bg-accent/10' : 'text-muted hover:text-accent'}`}
                              ><Star className="w-3.5 h-3.5" /></button>
                              <button
                                onClick={() => updateExercise(activeWeek, di, ri, { requiresVideo: !ex.requiresVideo })}
                                title={ex.requiresVideo ? 'Quitar requisito de vídeo' : 'Pedir vídeo de ejecución al cliente'}
                                aria-label="Pedir vídeo al cliente"
                                className={`p-1.5 rounded-lg transition-colors text-xs font-bold ${ex.requiresVideo ? 'text-warn bg-warn/10' : 'text-muted hover:text-warn'}`}
                              >📹</button>
                              <button onClick={() => copyExercise(activeWeek, di, ri)} className="p-1.5 rounded-lg text-muted hover:text-accent transition-colors"><Copy className="w-3.5 h-3.5" /></button>
                              <button onClick={() => deleteExercise(activeWeek, di, ri)} className="p-1.5 rounded-lg text-muted hover:text-warn transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>

                          {/* Fila 2: comentario */}
                          <input value={ex.comment}
                            onChange={e => updateExercise(activeWeek, di, ri, { comment: e.target.value })}
                            placeholder="Indicaciones técnicas para el alumno..."
                            className="w-full text-xs text-muted bg-transparent border-b border-transparent hover:border-border focus:border-accent outline-none transition-colors py-0.5"
                          />

                          {/* Fila 3: vídeo principal */}
                          <div className="flex items-center gap-2">
                            <Video className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                            <input value={ex.videoUrl || ''}
                              onChange={e => updateExercise(activeWeek, di, ri, { videoUrl: e.target.value })}
                              placeholder="URL vídeo principal (YouTube...)"
                              className="flex-1 text-xs bg-bg border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-accent/20"
                            />
                            {ytId && (
                              <a href={ex.videoUrl} target="_blank" rel="noreferrer" className="flex-shrink-0">
                                <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`}
                                  className="w-14 h-9 object-cover rounded border border-border" alt="" />
                              </a>
                            )}
                          </div>

                          {/* Vídeos adicionales de la biblioteca */}
                          {extraVideos.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {extraVideos.map((url, vi) => {
                                const id = getYTId(url)
                                return id ? (
                                  <a key={vi} href={url} target="_blank" rel="noreferrer">
                                    <img src={`https://img.youtube.com/vi/${id}/default.jpg`}
                                      className="w-14 h-9 object-cover rounded border border-border hover:border-accent transition-colors" alt="" />
                                  </a>
                                ) : null
                              })}
                              <button
                                onClick={() => updateExercise(activeWeek, di, ri, { videoUrls: [] })}
                                className="text-[10px] text-muted hover:text-warn"
                              ><X className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Botón añadir */}
                    <button onClick={() => setPickerFor({ dayIdx: di })}
                      className="w-full border-2 border-dashed border-border rounded-xl py-3 text-sm text-muted hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2"
                    ><Plus className="w-4 h-4" /> Añadir ejercicio</button>
                  </div>
                )}
              </div>
            ))}

            {/* Añadir día */}
            <div className="px-5 py-3">
              <button onClick={() => addDay(activeWeek)}
                className="w-full border-2 border-dashed border-border rounded-xl py-3 text-sm text-muted hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2"
              ><Plus className="w-4 h-4" /> Añadir día</button>
            </div>
          </div>
        </div>
      )}

      {/* Sin semanas */}
      {!weeks.length && (
        <div className="text-center py-12 text-muted">
          <p className="text-sm">Sin semanas aún.</p>
          <button onClick={addWeek} className="mt-3 text-accent hover:underline text-sm">Añadir primera semana →</button>
        </div>
      )}

      {/* Modal buscador ejercicios */}
      <Modal open={!!pickerFor} onClose={() => setPickerFor(null)} title="Añadir ejercicio" maxWidth="max-w-lg">
        {pickerFor && (
          <ExercisePicker
            library={library}
            onSelect={exercise => addExercise(activeWeek, pickerFor.dayIdx, exercise)}
            onClose={() => setPickerFor(null)}
          />
        )}
      </Modal>

      {/* Modal importar plan */}
      <Modal open={showImport} onClose={() => setShowImport(false)} title="Importar plan de otro cliente">
        <div className="space-y-2">
          <p className="text-sm text-muted mb-4">Selecciona un cliente para copiar su plan:</p>
          {allClients.map(c => (
            <button key={c.id} onClick={() => handleImport(c.id)} disabled={importing}
              className="w-full flex items-center gap-3 px-4 py-3 bg-bg border border-border rounded-xl hover:border-accent hover:bg-bg-alt transition-all text-left"
            >
              <div className="w-8 h-8 rounded-full bg-bg-alt border border-border flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                {c.name[0]}
              </div>
              <span className="text-sm font-medium">{c.name} {c.surname}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
