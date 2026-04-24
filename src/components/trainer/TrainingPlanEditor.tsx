import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Copy, Video, Star, GripVertical, X, Timer, Clock } from 'lucide-react'
import { Modal } from '../shared/Modal'
import { ExercisePicker } from './ExercisePicker'
import { TrainingPlan, WeekPlan, DayPlan, Exercise, LibraryExercise, TrainingLogs } from '../../types'
import { TRAINING_TYPES } from '../../lib/constants'
import { toast } from '../shared/Toast'

interface Props {
  plan: TrainingPlan
  onChange: (plan: TrainingPlan) => void
  allClients?: { id: string; name: string; surname: string }[]
  onImportFromClient?: (clientId: string) => Promise<TrainingPlan | null>
  library?: LibraryExercise[]
  logs?: TrainingLogs
  clientName?: string
}

const emptyExercise = (): Exercise => ({
  name: '', sets: '3×10', weight: '', isMain: false,
  comment: '', videoUrl: '', restSets: 90, restAfter: 120
})
const emptyDay = (n: number): DayPlan => ({ title: `DÍA ${n}`, focus: '', exercises: [] })
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
  library = [], logs = {}, clientName = ''
}: Props) {
  const [activeWeek, setActiveWeek] = useState(0)
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({ 0: true })
  const [pickerFor, setPickerFor] = useState<{ dayIdx: number } | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedEx, setSelectedEx] = useState<SelectedEx | null>(null)
  const [restPopup, setRestPopup] = useState<{ wi: number; di: number; ri: number; field: 'restSets' | 'restAfter' } | null>(null)
  const [confirmDeleteWeek, setConfirmDeleteWeek] = useState<number | null>(null)
  const [dragging, setDragging] = useState<{ di: number; ri: number } | null>(null)
  const [dragOver, setDragOver] = useState<{ di: number; ri: number } | null>(null)

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

  const addWeek = () => {
    updatePlan({ weeks: [...weeks, emptyWeek(weeks.length + 1)] })
    setActiveWeek(weeks.length)
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
    updatePlan({ weeks: w }); setActiveWeek(Math.max(0, wi - 1))
    setConfirmDeleteWeek(null)
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
    const exs = [...(weeks[wi].days[di]?.exercises || []), exercise]
    updateDay(wi, di, { exercises: exs })
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

  const handleImport = async (clientId: string) => {
    if (!onImportFromClient) return
    setImporting(true)
    const imported = await onImportFromClient(clientId)
    if (imported) { updatePlan({ weeks: imported.weeks, type: imported.type }); toast('Importado ✓', 'ok'); setShowImport(false) }
    else toast('Sin plan', 'warn')
    setImporting(false)
  }


  const moveExercise = (di: number, fromRi: number, toRi: number) => {
    if (fromRi === toRi) return
    const exs = [...weeks[activeWeek].days[di].exercises]
    const [moved] = exs.splice(fromRi, 1)
    exs.splice(toRi, 0, moved)
    updateDay(activeWeek, di, { exercises: exs })
  }

  const selEx = selectedEx ? weeks[selectedEx.wi]?.days[selectedEx.di]?.exercises[selectedEx.ri] : null
  const selLibEx = selEx ? library.find(l => l.name.toLowerCase() === selEx.name.toLowerCase()) : undefined

  return (
    <div className="flex gap-4 h-full min-h-0" onClick={() => setRestPopup(null)}>

      {/* ── PANEL CENTRAL ── */}
      <div className="flex-1 min-w-0 overflow-y-auto space-y-3">

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap sticky top-0 bg-bg z-10 pb-2 pt-1">
          <select value={plan.type} onChange={e => updatePlan({ type: e.target.value })}
            className="text-sm bg-card border border-border rounded-lg px-3 py-2 outline-none font-medium">
            {TRAINING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {allClients.length > 0 && (
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-muted hover:border-accent hover:text-accent transition-colors">
              <Copy className="w-3.5 h-3.5" /> Importar
            </button>
          )}
        </div>

        {/* Semanas — tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {weeks.map((w, wi) => (
            <button key={wi} onClick={() => setActiveWeek(wi)}
              className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeWeek === wi
                  ? 'bg-ink text-white shadow-sm'
                  : 'bg-card border border-border text-muted hover:border-accent hover:text-ink'
              }`}>
              {w.label}
              {w.isCurrent && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-ok rounded-full border-2 border-bg" />
              )}
            </button>
          ))}
          <button onClick={addWeek}
            className="px-3 py-1.5 rounded-lg text-sm border-2 border-dashed border-border text-muted hover:border-accent hover:text-accent transition-all">
            + Semana
          </button>
        </div>

        {/* Semana activa */}
        {currentWeek && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">

            {/* Header semana */}
            <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-bg-alt/40">
              <input value={currentWeek.label}
                onChange={e => updateWeek(activeWeek, { label: e.target.value })}
                className="flex-1 text-sm font-bold bg-transparent outline-none min-w-0 hover:underline focus:underline underline-offset-2"
              />
              <input value={currentWeek.rpe} onChange={e => updateWeek(activeWeek, { rpe: e.target.value })}
                placeholder="@7" title="RPE objetivo"
                className="w-12 text-[11px] text-center font-mono bg-bg border border-border rounded-md px-1 py-0.5 outline-none"
              />
              <button onClick={() => setCurrentWeek(activeWeek)} title="Marcar como semana activa"
                className={`p-1.5 rounded-lg transition-colors ${currentWeek.isCurrent ? 'text-ok bg-ok/10' : 'text-muted hover:text-ok hover:bg-ok/5'}`}>
                <Star className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => copyWeek(activeWeek)} className="p-1.5 text-muted hover:text-accent rounded-lg"><Copy className="w-3.5 h-3.5" /></button>
              {confirmDeleteWeek === activeWeek ? (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <span className="text-[10px] text-warn font-semibold">¿Borrar?</span>
                  <button onClick={confirmDeleteWeekFn}
                    className="px-2 py-1 bg-warn text-white rounded text-[10px] font-bold">Sí</button>
                  <button onClick={() => setConfirmDeleteWeek(null)}
                    className="px-2 py-1 border border-border rounded text-[10px] text-muted">No</button>
                </div>
              ) : (
                <button onClick={() => deleteWeek(activeWeek)} className="p-1.5 text-muted hover:text-warn rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
              )}
            </div>

            {/* Días */}
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
                    <span className="text-[10px] text-muted bg-bg-alt border border-border px-2 py-0.5 rounded-full font-medium">
                      {day.exercises.length}ej
                    </span>
                    <button onClick={e => { e.stopPropagation(); copyDay(activeWeek, di) }}
                      className="p-1 text-muted hover:text-accent opacity-0 group-hover/day:opacity-100 transition-all"><Copy className="w-3 h-3" /></button>
                    <button onClick={e => { e.stopPropagation(); deleteDay(activeWeek, di) }}
                      className="p-1 text-muted hover:text-warn opacity-0 group-hover/day:opacity-100 transition-all"><Trash2 className="w-3 h-3" /></button>
                    {openDays[di]
                      ? <ChevronUp className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                      : <ChevronDown className="w-3.5 h-3.5 text-muted flex-shrink-0" />}
                  </div>

                  {/* Tabla ejercicios */}
                  {openDays[di] && (
                    <div className="border-t border-border/50">
                      {/* Cabecera tabla */}
                      {day.exercises.length > 0 && (
                        <div className="grid gap-0 px-4 py-1.5 bg-bg-alt/30 border-b border-border/30"
                          style={{ gridTemplateColumns: '20px 1fr 80px 140px 90px 80px 90px' }}>
                          {['', 'EJERCICIO', 'SERIES', 'PESO / INT.', 'REST SETS', 'SERIES LOG', 'FAVORITO'].map((h, i) => (
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

                          return (
                            <div key={ri} className={`transition-colors ${isSelected ? 'bg-accent/4' : 'hover:bg-bg-alt/20'}`}>

                              {/* Fila principal */}
                              <div className="grid items-center gap-0 px-4 py-2 cursor-pointer"
                                style={{ gridTemplateColumns: '20px 1fr 80px 140px 90px 80px 90px' }}
                                onClick={() => setSelectedEx(isSelected ? null : { wi: activeWeek, di, ri })}>

                                {/* Nº / main */}
                                <div className="flex items-center justify-center">
                                  {ex.isMain
                                    ? <span className="w-4 h-4 rounded-full bg-accent flex items-center justify-center text-white text-[8px] font-bold">{ri + 1}</span>
                                    : <span className="text-[10px] text-muted font-bold">{ri + 1}</span>
                                  }
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

                                {/* Rest sets — botón clickable */}
                                <div className="relative flex justify-center" onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={() => setRestPopup(isRestPopupOpen ? null : { wi: activeWeek, di, ri, field: 'restSets' })}
                                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all w-full justify-center ${
                                      isRestPopupOpen && restPopup?.field === 'restSets'
                                        ? 'bg-accent text-white border-accent'
                                        : 'bg-bg border-border text-muted hover:border-accent hover:text-accent'
                                    }`}>
                                    <Timer className="w-3 h-3 flex-shrink-0" />
                                    {fmtRest(restSets)}
                                  </button>
                                  {isRestPopupOpen && restPopup?.field === 'restSets' && (
                                    <RestPopup
                                      value={restSets}
                                      label="Descanso entre series"
                                      onChange={v => updateExercise(activeWeek, di, ri, { restSets: v })}
                                      onClose={() => setRestPopup(null)}
                                    />
                                  )}
                                </div>

                                {/* Series log del cliente — solo lectura */}
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
                                  {/* Botones reordenar — útiles en móvil */}
                                  <div className="flex flex-col gap-0 mr-0.5">
                                    <button onClick={e => { e.stopPropagation(); if (ri > 0) moveExercise(di, ri, ri - 1) }}
                                      disabled={ri === 0}
                                      className="p-0.5 text-muted hover:text-ink disabled:opacity-20 transition-colors leading-none">
                                      <ChevronUp className="w-3 h-3" />
                                    </button>
                                    <button onClick={e => { e.stopPropagation(); if (ri < day.exercises.length - 1) moveExercise(di, ri, ri + 1) }}
                                      disabled={ri === day.exercises.length - 1}
                                      className="p-0.5 text-muted hover:text-ink disabled:opacity-20 transition-colors leading-none">
                                      <ChevronDown className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <button onClick={e => { e.stopPropagation(); updateExercise(activeWeek, di, ri, { isMain: !ex.isMain }) }}
                                    title="Marcar como principal"
                                    className={`p-1.5 rounded transition-colors ${ex.isMain ? 'text-accent' : 'text-muted hover:text-accent'}`}>
                                    <Star className="w-3 h-3" />
                                  </button>
                                  <button onClick={e => { e.stopPropagation(); copyExercise(activeWeek, di, ri) }}
                                    className="p-1.5 text-muted hover:text-accent rounded transition-colors">
                                    <Copy className="w-3 h-3" />
                                  </button>
                                  <button onClick={e => { e.stopPropagation(); deleteExercise(activeWeek, di, ri) }}
                                    className="p-1.5 text-muted hover:text-warn rounded transition-colors">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Panel expandido */}
                              {isSelected && (
                                <div className="mx-4 mb-2 rounded-xl border border-accent/20 bg-accent/3 overflow-hidden"
                                  onClick={e => e.stopPropagation()}>

                                  <div className="grid grid-cols-2 divide-x divide-border/50">
                                    {/* Columna izquierda */}
                                    <div className="p-3 space-y-2">
                                      <input value={ex.comment}
                                        onChange={e => updateExercise(activeWeek, di, ri, { comment: e.target.value })}
                                        placeholder="Indicaciones técnicas para el alumno..."
                                        className="w-full text-xs text-muted bg-bg border border-border/50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-accent/20"
                                      />
                                      <div className="flex items-center gap-2">
                                        <Video className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                                        <input value={ex.videoUrl || ''}
                                          onChange={e => updateExercise(activeWeek, di, ri, { videoUrl: e.target.value })}
                                          placeholder="URL vídeo YouTube..."
                                          className="flex-1 text-xs bg-bg border border-border/50 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-accent/20"
                                        />
                                      </div>
                                      <button
                                        onClick={() => updateExercise(activeWeek, di, ri, { requiresVideo: !ex.requiresVideo })}
                                        className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                                          ex.requiresVideo ? 'bg-warn/10 border-warn/30 text-warn' : 'border-border/50 text-muted hover:border-warn/40 hover:text-warn'
                                        }`}>
                                        <span>📹</span>
                                        {ex.requiresVideo ? '✓ Pidiendo vídeo de ejecución' : 'Pedir vídeo de ejecución al cliente'}
                                      </button>
                                    </div>

                                    {/* Columna derecha — descansos */}
                                    <div className="p-3 space-y-3">
                                      <div className="flex items-center gap-1.5">
                                        <Timer className="w-3.5 h-3.5 text-accent" />
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Tiempos de descanso</p>
                                      </div>

                                      {/* Entre series */}
                                      <div className="space-y-1.5">
                                        <p className="text-[10px] text-muted font-semibold uppercase tracking-wider">Entre series</p>
                                        <div className="flex flex-wrap gap-1">
                                          {REST_PRESETS.map(p => (
                                            <button key={p} onClick={() => updateExercise(activeWeek, di, ri, { restSets: p })}
                                              className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all ${
                                                restSets === p ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'
                                              }`}>
                                              {fmtRest(p)}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Tras el ejercicio */}
                                      <div className="space-y-1.5">
                                        <p className="text-[10px] text-muted font-semibold uppercase tracking-wider">Tras el ejercicio</p>
                                        <div className="flex flex-wrap gap-1">
                                          {REST_PRESETS.map(p => (
                                            <button key={p} onClick={() => updateExercise(activeWeek, di, ri, { restAfter: p })}
                                              className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all ${
                                                restAfter === p ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'
                                              }`}>
                                              {fmtRest(p)}
                                            </button>
                                          ))}
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

                      {/* Añadir ejercicio */}
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

              {/* Añadir día */}
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

      {/* ── PANEL DERECHO ── */}
      <div className={`flex-shrink-0 transition-all duration-200 overflow-hidden ${selEx ? 'w-72' : 'w-0'}`}>
        {selEx && selectedEx && (
          <ExerciseAnalyticsPanel
            ex={selEx} libEx={selLibEx} logs={logs} plan={plan}
            exName={selEx.name} clientName={clientName}
            onClose={() => setSelectedEx(null)}
          />
        )}
      </div>

      {/* Modales */}
      <Modal open={!!pickerFor} onClose={() => setPickerFor(null)} title="Añadir ejercicio" maxWidth="max-w-lg">
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
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
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

// ── Analytics Panel ───────────────────────────────────────
interface AnalyticsPanelProps {
  ex: Exercise; libEx: LibraryExercise | undefined
  logs: TrainingLogs; plan: TrainingPlan
  exName: string; clientName: string; onClose: () => void
}

function fmtRestLocal(s: number) {
  if (!s) return '—'
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60), r = s % 60
  return r > 0 ? `${m}m${r}s` : `${m}m`
}

function MiniLineChart({ data, color = '#6e5438' }: { data: { x: string; y: number }[]; color?: string }) {
  if (data.length < 2) return (
    <div className="h-20 flex items-center justify-center text-xs text-muted">Sin suficientes datos</div>
  )
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
        <linearGradient id={`g${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#g${color.replace('#', '')})`} />
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

function ExerciseAnalyticsPanel({ ex, libEx, logs, plan, exName, clientName, onClose }: AnalyticsPanelProps) {
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

  return (
    <div className="w-72 space-y-2.5 overflow-y-auto max-h-full pb-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted">Analytics</p>
          <p className="font-serif font-bold text-base leading-tight mt-0.5">{exName || 'Ejercicio'}</p>
          {clientName && <p className="text-[10px] text-muted">{clientName}</p>}
        </div>
        <button onClick={onClose} className="p-1 text-muted hover:text-ink rounded flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tiempos configurados */}
      <div className="bg-accent/5 border border-accent/15 rounded-xl px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Timer className="w-3 h-3 text-accent" />
          <span className="text-[10px] text-accent font-bold">Descansos</span>
        </div>
        <div className="flex gap-3 text-[10px]">
          <span className="text-muted">entre series: <span className="font-bold text-ink">{fmtRestLocal(ex.restSets ?? 90)}</span></span>
          <span className="text-muted">tras: <span className="font-bold text-ink">{fmtRestLocal(ex.restAfter ?? 120)}</span></span>
        </div>
      </div>

      {exLogs.length > 0 ? (
        <>
          {/* KPIs */}
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

          {/* Gráfica */}
          {chartData.length >= 2 && (
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-[9px] uppercase tracking-wider text-muted font-bold mb-2">Progresión de peso</p>
              <MiniLineChart data={chartData} />
            </div>
          )}

          {/* Última sesión */}
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

          {/* Historial barras */}
          <div className="bg-card border border-border rounded-xl p-3">
            <p className="text-[9px] uppercase tracking-wider text-muted font-bold mb-2">Historial</p>
            <div className="flex items-end gap-0.5 h-10">
              {chartData.slice(-10).map((d, i) => {
                const maxY = Math.max(...chartData.map(c => c.y), 1)
                const h = Math.max(3, Math.round((d.y / maxY) * 36))
                const isLast = i === chartData.slice(-10).length - 1
                return (
                  <div key={i} className="flex-1">
                    <div className={`w-full rounded-sm transition-all ${isLast ? 'bg-accent' : 'bg-bg-alt border border-border/50'}`}
                      style={{ height: h }} />
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

      {/* Vídeo */}
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
