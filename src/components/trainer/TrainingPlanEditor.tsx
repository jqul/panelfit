import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Copy, Video, Star, GripVertical, X, Info } from 'lucide-react'
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

interface SelectedEx { wi: number; di: number; ri: number }

export function TrainingPlanEditor({ plan, onChange, allClients = [], onImportFromClient, library = [] }: Props) {
  const [activeWeek, setActiveWeek] = useState(0)
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({ 0: true })
  const [pickerFor, setPickerFor] = useState<{ dayIdx: number } | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedEx, setSelectedEx] = useState<SelectedEx | null>(null)

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
    // Actualizar panel derecho si es el ejercicio seleccionado
    if (selectedEx?.wi === wi && selectedEx?.di === di && selectedEx?.ri === ri) {
      setSelectedEx({ wi, di, ri }) // forzar re-render
    }
  }

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
    if (selectedEx?.wi === wi && selectedEx?.di === di && selectedEx?.ri === ri) setSelectedEx(null)
  }

  const handleImport = async (clientId: string) => {
    if (!onImportFromClient) return
    setImporting(true)
    const imported = await onImportFromClient(clientId)
    if (imported) { updatePlan({ weeks: imported.weeks, type: imported.type }); toast('Plan importado ✓', 'ok'); setShowImport(false) }
    else toast('Ese cliente no tiene plan', 'warn')
    setImporting(false)
  }

  // Ejercicio seleccionado para panel derecho
  const selEx = selectedEx ? weeks[selectedEx.wi]?.days[selectedEx.di]?.exercises[selectedEx.ri] : null
  const selLibEx = selEx ? library.find(l => l.name.toLowerCase() === selEx.name.toLowerCase()) : null

  return (
    <div className="flex gap-0 h-full min-h-0">
      {/* ── PANEL CENTRAL ── */}
      <div className="flex-1 min-w-0 space-y-4 overflow-y-auto pr-0">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap sticky top-0 bg-bg z-10 pb-2 pt-1">
          <select value={plan.type} onChange={e => updatePlan({ type: e.target.value })}
            className="text-sm bg-card border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-accent/20">
            {TRAINING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {allClients.length > 0 && (
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-muted hover:border-accent hover:text-accent transition-colors">
              <Copy className="w-3.5 h-3.5" /> Importar de cliente
            </button>
          )}
        </div>

        {/* Tabs semanas */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {weeks.map((w, wi) => (
            <button key={wi} onClick={() => setActiveWeek(wi)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeWeek === wi ? 'bg-ink text-white' : 'bg-card border border-border text-muted hover:border-accent hover:text-ink'
              }`}>
              {w.label}
              {w.isCurrent && <span className="ml-1.5 w-1.5 h-1.5 bg-ok rounded-full inline-block" />}
            </button>
          ))}
          <button onClick={addWeek}
            className="px-3 py-1.5 rounded-lg text-sm border-2 border-dashed border-border text-muted hover:border-accent hover:text-accent transition-all">
            + Semana
          </button>
        </div>

        {/* Editor semana */}
        {currentWeek && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Header semana */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-bg-alt/30">
              <input value={currentWeek.label}
                onChange={e => updateWeek(activeWeek, { label: e.target.value })}
                className="flex-1 text-sm font-bold bg-transparent outline-none border-b border-transparent hover:border-border focus:border-accent transition-colors min-w-0"
              />
              <input value={currentWeek.rpe} onChange={e => updateWeek(activeWeek, { rpe: e.target.value })}
                placeholder="@7"
                className="w-14 text-xs text-center bg-bg border border-border rounded-lg px-2 py-1 outline-none"
              />
              <button onClick={() => setCurrentWeek(activeWeek)}
                className={`p-1.5 rounded-lg transition-colors ${currentWeek.isCurrent ? 'text-ok bg-ok/10' : 'text-muted hover:text-ok'}`}>
                <Star className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => copyWeek(activeWeek)} className="p-1.5 text-muted hover:text-accent rounded-lg transition-colors"><Copy className="w-3.5 h-3.5" /></button>
              <button onClick={() => deleteWeek(activeWeek)} className="p-1.5 text-muted hover:text-warn rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>

            {/* Días */}
            <div className="divide-y divide-border">
              {currentWeek.days.map((day, di) => (
                <div key={di}>
                  {/* Header día */}
                  <div className="flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-bg-alt/30 transition-colors"
                    onClick={() => setOpenDays(p => ({ ...p, [di]: !p[di] }))}>
                    <GripVertical className="w-3.5 h-3.5 text-muted/30 flex-shrink-0" />
                    <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                      <input value={day.title}
                        onChange={e => updateDay(activeWeek, di, { title: e.target.value })}
                        className="text-sm font-semibold bg-transparent outline-none w-full"
                      />
                      <input value={day.focus}
                        onChange={e => updateDay(activeWeek, di, { focus: e.target.value })}
                        placeholder="Foco del día..."
                        className="text-xs text-muted bg-transparent outline-none w-full"
                      />
                    </div>
                    <span className="text-[10px] text-muted bg-bg-alt px-2 py-0.5 rounded-full">{day.exercises.length} ej.</span>
                    <button onClick={e => { e.stopPropagation(); copyDay(activeWeek, di) }} className="p-1 text-muted hover:text-accent transition-colors"><Copy className="w-3 h-3" /></button>
                    <button onClick={e => { e.stopPropagation(); deleteDay(activeWeek, di) }} className="p-1 text-muted hover:text-warn transition-colors"><Trash2 className="w-3 h-3" /></button>
                    {openDays[di] ? <ChevronUp className="w-3.5 h-3.5 text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-muted" />}
                  </div>

                  {/* Ejercicios */}
                  {openDays[di] && (
                    <div className="px-4 pb-3 bg-bg/20 space-y-1.5">
                      {/* Cabecera columnas */}
                      <div className="grid grid-cols-[1fr_72px_120px_auto] gap-2 px-3 py-1">
                        <p className="text-[9px] uppercase tracking-wider text-muted font-bold">Ejercicio</p>
                        <p className="text-[9px] uppercase tracking-wider text-muted font-bold text-center">Series</p>
                        <p className="text-[9px] uppercase tracking-wider text-muted font-bold">Peso / Int.</p>
                        <div className="w-20" />
                      </div>

                      {day.exercises.map((ex, ri) => {
                        const isSelected = selectedEx?.wi === activeWeek && selectedEx?.di === di && selectedEx?.ri === ri
                        const ytId = ex.videoUrl ? getYTId(ex.videoUrl) : null

                        return (
                          <div key={ri}
                            className={`rounded-xl border transition-all cursor-pointer ${isSelected ? 'border-accent bg-accent/3 shadow-sm' : 'border-border bg-card hover:border-accent/40'}`}
                            onClick={() => setSelectedEx(isSelected ? null : { wi: activeWeek, di, ri })}>
                            <div className="grid grid-cols-[1fr_72px_120px_auto] gap-2 items-center px-3 py-2.5">
                              {/* Nombre */}
                              <div className="flex items-center gap-2 min-w-0">
                                {ex.isMain && <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />}
                                <input value={ex.name}
                                  onChange={e => { e.stopPropagation(); updateExercise(activeWeek, di, ri, { name: e.target.value }) }}
                                  onClick={e => e.stopPropagation()}
                                  placeholder="Nombre del ejercicio"
                                  className="text-sm font-medium bg-transparent outline-none w-full truncate"
                                />
                              </div>
                              {/* Series */}
                              <input value={ex.sets}
                                onChange={e => { e.stopPropagation(); updateExercise(activeWeek, di, ri, { sets: e.target.value }) }}
                                onClick={e => e.stopPropagation()}
                                placeholder="3×10"
                                className="text-sm font-bold text-center bg-bg border border-border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-accent/20 w-full"
                              />
                              {/* Peso */}
                              <input value={ex.weight}
                                onChange={e => { e.stopPropagation(); updateExercise(activeWeek, di, ri, { weight: e.target.value }) }}
                                onClick={e => e.stopPropagation()}
                                placeholder="Peso / Intensidad"
                                className="text-sm bg-bg border border-border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-accent/20 w-full"
                              />
                              {/* Acciones */}
                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                {ytId && (
                                  <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`}
                                    className="w-10 h-7 object-cover rounded border border-border mr-1" alt="" />
                                )}
                                <button onClick={e => { e.stopPropagation(); updateExercise(activeWeek, di, ri, { isMain: !ex.isMain }) }}
                                  className={`p-1 rounded transition-colors ${ex.isMain ? 'text-accent' : 'text-muted hover:text-accent'}`}>
                                  <Star className="w-3 h-3" />
                                </button>
                                <button onClick={e => { e.stopPropagation(); copyExercise(activeWeek, di, ri) }}
                                  className="p-1 rounded text-muted hover:text-accent transition-colors">
                                  <Copy className="w-3 h-3" />
                                </button>
                                <button onClick={e => { e.stopPropagation(); deleteExercise(activeWeek, di, ri) }}
                                  className="p-1 rounded text-muted hover:text-warn transition-colors">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Expandido si seleccionado */}
                            {isSelected && (
                              <div className="px-3 pb-3 space-y-2 border-t border-accent/20 mt-0.5 pt-2" onClick={e => e.stopPropagation()}>
                                <input value={ex.comment}
                                  onChange={e => updateExercise(activeWeek, di, ri, { comment: e.target.value })}
                                  placeholder="Indicaciones técnicas para el alumno..."
                                  className="w-full text-xs text-muted bg-bg-alt border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-accent/20"
                                />
                                <div className="flex items-center gap-2">
                                  <Video className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                                  <input value={ex.videoUrl || ''}
                                    onChange={e => updateExercise(activeWeek, di, ri, { videoUrl: e.target.value })}
                                    placeholder="URL vídeo YouTube..."
                                    className="flex-1 text-xs bg-bg border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-accent/20"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}

                      <button onClick={() => setPickerFor({ dayIdx: di })}
                        className="w-full border-2 border-dashed border-border rounded-xl py-2.5 text-sm text-muted hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2">
                        <Plus className="w-3.5 h-3.5" /> Añadir ejercicio
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <div className="px-4 py-3">
                <button onClick={() => addDay(activeWeek)}
                  className="w-full border-2 border-dashed border-border rounded-xl py-2.5 text-sm text-muted hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2">
                  <Plus className="w-3.5 h-3.5" /> Añadir día
                </button>
              </div>
            </div>
          </div>
        )}

        {!weeks.length && (
          <div className="text-center py-12 text-muted">
            <p className="text-sm">Sin semanas aún.</p>
            <button onClick={addWeek} className="mt-3 text-accent hover:underline text-sm">Añadir primera semana →</button>
          </div>
        )}
      </div>

      {/* ── PANEL DERECHO CONTEXTUAL ── */}
      <div className={`flex-shrink-0 transition-all duration-300 overflow-hidden ${selEx ? 'w-64 ml-4' : 'w-0 ml-0'}`}>
        {selEx && (
          <div className="w-64 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Detalle</p>
              <button onClick={() => setSelectedEx(null)} className="p-1 text-muted hover:text-ink rounded-lg">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Nombre ejercicio */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="font-serif font-bold text-base">{selEx.name || 'Sin nombre'}</p>
              {selEx.isMain && <span className="text-[10px] text-accent font-bold uppercase tracking-wider">Principal</span>}
              <div className="flex gap-2 mt-3">
                <div className="flex-1 bg-bg rounded-xl p-2.5 text-center">
                  <p className="text-lg font-bold font-serif">{selEx.sets || '—'}</p>
                  <p className="text-[9px] text-muted uppercase tracking-wider">Series</p>
                </div>
                <div className="flex-1 bg-bg rounded-xl p-2.5 text-center">
                  <p className="text-lg font-bold font-serif truncate">{selEx.weight || '—'}</p>
                  <p className="text-[9px] text-muted uppercase tracking-wider">Peso</p>
                </div>
              </div>
            </div>

            {/* Vídeo */}
            {selEx.videoUrl && getYTId(selEx.videoUrl) && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <a href={selEx.videoUrl} target="_blank" rel="noreferrer">
                  <img src={`https://img.youtube.com/vi/${getYTId(selEx.videoUrl)}/mqdefault.jpg`}
                    className="w-full aspect-video object-cover" alt="" />
                </a>
                <p className="text-[10px] text-muted px-3 py-2">Ver vídeo de referencia →</p>
              </div>
            )}

            {/* Info de biblioteca */}
            {selLibEx && (
              <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted font-bold flex items-center gap-1.5">
                  <Info className="w-3 h-3" /> Biblioteca
                </p>
                {selLibEx.description && (
                  <p className="text-xs text-muted leading-relaxed">{selLibEx.description}</p>
                )}
                {selLibEx.category && (
                  <span className="inline-block text-[10px] bg-bg-alt border border-border px-2 py-0.5 rounded-full text-muted">{selLibEx.category}</span>
                )}
                {(selLibEx.videos || []).length > 1 && (
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {selLibEx.videos!.slice(0, 4).map((v, i) => {
                      const ytId = getYTId(v.url)
                      return ytId ? (
                        <a key={i} href={v.url} target="_blank" rel="noreferrer"
                          className="rounded-lg overflow-hidden border border-border">
                          <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`} className="w-full aspect-video object-cover" alt="" />
                          {v.label && <p className="text-[9px] text-muted px-1.5 py-1 truncate">{v.label}</p>}
                        </a>
                      ) : null
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Indicaciones */}
            {selEx.comment && (
              <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-accent font-bold mb-2">Indicaciones</p>
                <p className="text-xs text-ink/80 leading-relaxed">{selEx.comment}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modales */}
      <Modal open={!!pickerFor} onClose={() => setPickerFor(null)} title="Añadir ejercicio" maxWidth="max-w-lg">
        {pickerFor && (
          <ExercisePicker
            library={library}
            onSelect={exercise => addExercise(activeWeek, pickerFor.dayIdx, exercise)}
            onClose={() => setPickerFor(null)}
          />
        )}
      </Modal>

      <Modal open={showImport} onClose={() => setShowImport(false)} title="Importar plan de otro cliente">
        <div className="space-y-2">
          <p className="text-sm text-muted mb-4">Selecciona un cliente para copiar su plan:</p>
          {allClients.map(c => (
            <button key={c.id} onClick={() => handleImport(c.id)} disabled={importing}
              className="w-full flex items-center gap-3 px-4 py-3 bg-bg border border-border rounded-xl hover:border-accent hover:bg-bg-alt transition-all text-left">
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
