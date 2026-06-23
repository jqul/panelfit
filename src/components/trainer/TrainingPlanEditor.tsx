import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Copy, Video, Star, GripVertical, Timer, Info, Pencil, BatteryLow, Layers, Dumbbell, Flame } from 'lucide-react'
import { useCustomPeriodizationBlocks, PeriodizationBlock } from '../../lib/periodizationBlocks'
import { BlockManager } from './training-plan-editor/BlockManager'
import { WendlerModal } from './training-plan-editor/WendlerModal'
import { ConditioningModal } from './training-plan-editor/ConditioningModal'
import { Modal } from '../shared/Modal'
import { ExercisePicker } from './ExercisePicker'
import { TrainingPlan, WeekPlan, DayPlan, Exercise, LibraryExercise, TrainingLogs } from '../../types'
import { TRAINING_TYPES } from '../../lib/constants'
import { toast } from '../shared/Toast'
import { getYTId } from './training-plan-editor/utils'
import { fmtRest, REST_PRESETS, RestPopup } from './training-plan-editor/RestPopup'
import { DEFAULT_SERIES_TYPES, useSeriesTypes, SeriesTypesManager, SeriesInfoModal } from './training-plan-editor/seriesTypes'
import { WarmupSection } from './training-plan-editor/WarmupSection'
import { ExerciseAnalyticsPanel } from './training-plan-editor/ExerciseAnalyticsPanel'

export { getYTId } from './training-plan-editor/utils'
export type { SeriesTypeDef } from './training-plan-editor/seriesTypes'
export { DEFAULT_SERIES_TYPES } from './training-plan-editor/seriesTypes'

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

const emptyDay = (n: number): DayPlan => ({ title: `DÍA ${n}`, focus: '', exercises: [], warmupExercises: [] })
const emptyWeek = (n: number): WeekPlan => ({ label: `Semana ${n}`, rpe: '@7', isCurrent: false, days: [] })

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
  const [showBlockPicker, setShowBlockPicker] = useState(false)
  const [showBlockManager, setShowBlockManager] = useState(false)
  const [showWendler, setShowWendler] = useState(false)
  const [showConditioning, setShowConditioning] = useState(false)
  const { blocks: periodizationBlocks, saveBlocks: savePeriodizationBlocks } = useCustomPeriodizationBlocks(trainerId)

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
  const applyBlock = (block: PeriodizationBlock) => {
    if (!currentWeek) return
    const baseLabel = currentWeek.label.replace(/\s*\(bloque.*\)$/i, '')
    const newWeeks: WeekPlan[] = block.steps.map((step, i) => ({
      ...JSON.parse(JSON.stringify(currentWeek)),
      label: `${baseLabel} (bloque ${i + 1}/${block.steps.length})`,
      rpe: step.rpe,
      isDeload: step.isDeload,
      isCurrent: false,
    }))
    updatePlan({ weeks: [...weeks, ...newWeeks] })
    setActiveWeek(weeks.length)
    setShowBlockPicker(false)
    toast(`${block.label} aplicado: ${newWeeks.length} semanas creadas ✓`, 'ok')
  }
  const applyWendlerCycle = (newWeeks: WeekPlan[]) => {
    updatePlan({ weeks: [...weeks, ...newWeeks] })
    setActiveWeek(weeks.length)
    setShowWendler(false)
    toast(`Ciclo 5/3/1 creado: ${newWeeks.length} semanas ✓`, 'ok')
  }
  const applyConditioningDay = (day: DayPlan) => {
    if (!currentWeek) return
    const days = [...currentWeek.days, day]
    updateWeek(activeWeek, { days })
    setOpenDays(p => ({ ...p, [days.length - 1]: true }))
    setShowConditioning(false)
    toast(`"${day.title}" añadido a la semana ✓`, 'ok')
  }
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
              {w.isDeload && <BatteryLow className="inline w-3 h-3 ml-1 -mt-0.5 text-warn" />}
              {w.isCurrent && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-ok rounded-full border-2 border-bg" />}
            </button>
          ))}
          <button onClick={addWeek} className="px-3 py-1.5 rounded-lg text-sm border-2 border-dashed border-border text-muted hover:border-accent hover:text-accent transition-all">
            + Semana
          </button>
          {currentWeek && (
            <button onClick={() => setShowBlockPicker(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border-2 border-dashed border-accent/40 text-accent hover:border-accent transition-all">
              <Layers className="w-3.5 h-3.5" /> Aplicar bloque
            </button>
          )}
          <button onClick={() => setShowWendler(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border-2 border-dashed border-ok/40 text-ok hover:border-ok transition-all">
            <Dumbbell className="w-3.5 h-3.5" /> Ciclo 5/3/1
          </button>
          <button onClick={() => setShowConditioning(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border-2 border-dashed border-warn/40 text-warn hover:border-warn transition-all">
            <Flame className="w-3.5 h-3.5" /> Acondicionamiento
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
              <button onClick={() => updateWeek(activeWeek, { isDeload: !currentWeek.isDeload })}
                title="Marcar como semana de descarga (deload)"
                className={`p-1.5 rounded-lg transition-colors ${currentWeek.isDeload ? 'text-warn bg-warn/10' : 'text-muted hover:text-warn hover:bg-warn/5'}`}>
                <BatteryLow className="w-3.5 h-3.5" />
              </button>
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
                        warmupExercises={day.warmupExercises || []}
                        isOpen={!!openWarmup[di]}
                        onToggle={() => setOpenWarmup(p => ({ ...p, [di]: !p[di] }))}
                        library={library}
                        onAdd={(ex) => {
                          const warmupExercises = [...(day.warmupExercises || []), ex]
                          updateDay(activeWeek, di, { warmupExercises })
                        }}
                        onUpdate={(ri, u) => {
                          const warmupExercises = [...(day.warmupExercises || [])]
                          warmupExercises[ri] = { ...warmupExercises[ri], ...u }
                          updateDay(activeWeek, di, { warmupExercises })
                        }}
                        onDelete={(ri) => {
                          const warmupExercises = (day.warmupExercises || []).filter((_, i) => i !== ri)
                          updateDay(activeWeek, di, { warmupExercises })
                        }}
                        onMove={(fromRi, toRi) => {
                          const warmupExercises = [...(day.warmupExercises || [])]
                          const [moved] = warmupExercises.splice(fromRi, 1)
                          warmupExercises.splice(toRi, 0, moved)
                          updateDay(activeWeek, di, { warmupExercises })
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
                          const seriesTypeId = ex.seriesType || 'normal'
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
                                  title="Puedes escribir un % (ej. 75%) y se calculará el peso real a partir del 1RM estimado del cliente"
                                  className="text-xs bg-bg border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-accent/20 w-full mx-1"
                                />

                                {/* Tipo serie */}
                                <div onClick={e => e.stopPropagation()} className="px-1">
                                  <select value={seriesTypeId}
                                    onChange={e => updateExercise(activeWeek, di, ri, { seriesType: e.target.value })}
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
                                        onClick={() => updateExercise(activeWeek, di, ri, { hideRest: !ex.hideRest })}
                                        className={`flex items-center justify-between px-3 py-2 rounded-xl border cursor-pointer transition-all mt-1 ${
                                          ex.hideRest
                                            ? 'bg-warn/5 border-warn/30'
                                            : 'bg-ok/5 border-ok/20'
                                        }`}>
                                        <div>
                                          <p className="text-[10px] font-bold text-ink">Mostrar timer al cliente</p>
                                          <p className="text-[9px] text-muted">
                                            {ex.hideRest ? 'Oculto — el cliente no verá la cuenta atrás' : 'Visible — el cliente verá el descanso'}
                                          </p>
                                        </div>
                                        <div className={`w-8 h-5 rounded-full flex items-center px-0.5 transition-all flex-shrink-0 ${ex.hideRest ? 'bg-warn/40' : 'bg-ok'}`}>
                                          <div className={`w-4 h-4 bg-white rounded-full shadow transition-all ${ex.hideRest ? 'translate-x-0' : 'translate-x-3'}`} />
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

      <Modal open={showBlockPicker} onClose={() => setShowBlockPicker(false)} title="Aplicar bloque de periodización">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-muted flex-1">
              Genera nuevas semanas clonando los días/ejercicios de "{currentWeek?.label}", ajustando el RPE objetivo y marcando la descarga según el bloque.
            </p>
            <button onClick={() => setShowBlockManager(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 border border-border rounded-lg text-xs font-semibold text-muted hover:border-accent hover:text-accent flex-shrink-0 ml-2">
              <Pencil className="w-3 h-3" /> Editar
            </button>
          </div>
          {periodizationBlocks.map(block => (
            <button key={block.id} onClick={() => applyBlock(block)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-bg border border-border rounded-xl hover:border-accent text-left transition-all">
              <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0"><Layers className="w-4 h-4 text-accent" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{block.label}</p>
                <p className="text-xs text-muted">{block.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={showBlockManager} onClose={() => setShowBlockManager(false)} title="Gestionar bloques de periodización">
        <BlockManager blocks={periodizationBlocks} onSave={savePeriodizationBlocks} onClose={() => setShowBlockManager(false)} />
      </Modal>

      <Modal open={showWendler} onClose={() => setShowWendler(false)} title="Generar ciclo 5/3/1">
        <WendlerModal onGenerate={applyWendlerCycle} onClose={() => setShowWendler(false)} />
      </Modal>

      <Modal open={showConditioning} onClose={() => setShowConditioning(false)} title="Bloques de acondicionamiento">
        <ConditioningModal trainerId={trainerId} onApply={applyConditioningDay} onClose={() => setShowConditioning(false)} />
      </Modal>
    </div>
  )
}
