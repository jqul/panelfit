import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from '../shared/Toast'
import {
  Plus, Trash2, Copy, ChevronDown, ChevronUp, ArrowLeft,
  Save, X, Check, Dumbbell, Timer, Camera, ClipboardList,
  MessageSquare, Video, Calendar, Tag, Users, Search, MoreHorizontal
} from 'lucide-react'
import { ActionMenu } from '../shared/ActionMenu'
import { Modal } from '../shared/Modal'
import { matchesQuery, plural } from '../../lib/workoutList'
import type { TrainerLabel } from './labels'
import { LabelPill, LabelSelector } from './labels'
import type { ClientData, TrainingPlan } from '../../types'
import { DEMO_TRAINER_ID, DEMO_PROGRAMS, DEMO_LABELS, DEMO_PLAN_TEMPLATES, DEMO_COHORTES } from '../../lib/demo-data'
import { localDateKey } from '../../lib/dates'
import { snapshotBeforeAssign, restoreSnapshots } from '../../lib/planSnapshot'
import { programToPlanWeeks, workoutTemplateIds } from '../../lib/programPlan'
import { loadProgramTemplates } from '../../lib/programTemplates'

// ── Tipos ─────────────────────────────────────────────────
export interface ProgramTask {
  id: string
  type: 'workout' | 'cardio' | 'evolucion' | 'formulario' | 'mensaje' | 'video'
  title: string
  data: Record<string, any>
}

interface ProgramDay { tasks: ProgramTask[] }

interface ProgramWeek {
  label: string
  days: ProgramDay[]
}

export interface Program {
  id: string
  trainer_id: string
  name: string
  tipo: string
  label_ids: string[]
  weeks: ProgramWeek[]
  created_at: number
  updated_at: number
}

interface Props { trainerId: string; onManageLabels: () => void; clients: ClientData[] }

// ── Config tipos tarea ────────────────────────────────────
const TASK_TYPES = [
  { id: 'workout', label: 'Workout', color: '#6e5438', bg: 'bg-bg-alt', border: 'border-border', text: 'text-ink', icon: Dumbbell },
  { id: 'cardio', label: 'Cardio', color: '#8a7358', bg: 'bg-bg-alt', border: 'border-border', text: 'text-ink', icon: Timer },
  { id: 'evolucion', label: 'Registrar evolución', color: '#a38b6f', bg: 'bg-bg-alt', border: 'border-border', text: 'text-ink', icon: Camera },
  { id: 'formulario', label: 'Formulario', color: '#7d7468', bg: 'bg-bg-alt', border: 'border-border', text: 'text-ink', icon: ClipboardList },
  { id: 'mensaje', label: 'Mensaje', color: '#5a4a38', bg: 'bg-bg-alt', border: 'border-border', text: 'text-ink', icon: MessageSquare },
  { id: 'video', label: 'Vídeo', color: '#b39d82', bg: 'bg-bg-alt', border: 'border-border', text: 'text-ink', icon: Video },
] as const

const TIPOS_DEFAULT = ['Fuerza','Hipertrofia','Pérdida de grasa','Resistencia','Rehabilitación','Rendimiento','General','Iniciación','Mantenimiento','Definición','Volumen','Peaking']
const LS_PROG_TYPES = (uid: string) => `pf_prog_types_${uid}`
const DAY_NAMES = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const CARDIO_TYPES = ['Correr','Caminar','Ciclismo','Elíptica','Nadar','Subir escaleras','Remo','HIIT']
const EVOLUCION_LABELS: Record<string, string> = { peso: '⚖️ Peso corporal', fotos: '📸 Fotos de progreso', medidas: '📏 Medidas corporales' }

function emptyWeek(n: number): ProgramWeek {
  return { label: `Semana ${n}`, days: Array.from({ length: 7 }, () => ({ tasks: [] })) }
}
function emptyProgram(trainerId: string): Program {
  return { id: `prog_${Date.now()}`, trainer_id: trainerId, name: 'Nuevo programa', tipo: 'General', label_ids: [], weeks: [emptyWeek(1)], created_at: Date.now(), updated_at: Date.now() }
}

// ── Task card ─────────────────────────────────────────────
function TaskCard({ task, onDelete }: { task: ProgramTask; onDelete: () => void }) {
  const meta = TASK_TYPES.find(t => t.id === task.type) || TASK_TYPES[0]
  const Icon = meta.icon
  return (
    <div className={`group relative flex items-start gap-2 pl-2.5 pr-1 py-2 rounded-xl border ${meta.bg} ${meta.border} text-xs`}>
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${meta.text}`} />
      <div className="flex-1 min-w-0">
        <p className={`font-semibold leading-tight truncate ${meta.text}`}>{task.title}</p>
        {task.data.objective && <p className="text-muted text-[11px] mt-0.5 truncate">{task.data.objective}</p>}
        {task.data.text && <p className="text-muted text-[11px] mt-0.5 truncate">"{task.data.text}"</p>}
      </div>
      {/* Visible siempre salvo en pantallas anchas con ratón, donde aparece al pasar el cursor o al
          enfocarla con el teclado (antes solo aparecía al pasar el ratón y en táctil no se podía borrar) */}
      <button onClick={onDelete} aria-label={`Quitar la tarea "${task.title}"`} title="Quitar tarea"
        className="p-2 -my-1 lg:p-1 lg:my-0 rounded-lg text-muted hover:text-warn hover:bg-warn/10 transition-colors flex-shrink-0 lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100 lg:[@media(hover:hover)]:focus-visible:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Modal añadir tarea ────────────────────────────────────
function AddTaskModal({ dayIdx, surveyTemplates, planTemplates, onAdd, onClose }: {
  dayIdx: number
  surveyTemplates: { id: string; name: string }[]
  planTemplates: { id: string; name: string; type: string }[]
  onAdd: (task: ProgramTask) => void
  onClose: () => void
}) {
  const [openType, setOpenType] = useState<string | null>(null)
  const [cardioType, setCardioType] = useState('Correr')
  const [cardioObjective, setCardioObjective] = useState('')
  const [evolucionItems, setEvolucionItems] = useState({ peso: true, fotos: false, medidas: false })
  const [workoutSearch, setWorkoutSearch] = useState('')
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)
  const [formularioId, setFormularioId] = useState(surveyTemplates[0]?.id || '')
  const [mensaje, setMensaje] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoTitle, setVideoTitle] = useState('')

  const saveTask = (type: string) => {
    let task: ProgramTask | null = null
    if (type === 'cardio') task = { id: `t_${Date.now()}`, type: 'cardio', title: cardioType, data: { cardioType, objective: cardioObjective } }
    else if (type === 'evolucion') {
      const items = Object.entries(evolucionItems).filter(([, v]) => v).map(([k]) => k)
      if (!items.length) return
      task = { id: `t_${Date.now()}`, type: 'evolucion', title: `Registrar: ${items.map(i => EVOLUCION_LABELS[i]).join(', ')}`, data: { items } }
    }
    else if (type === 'formulario') {
      const tmpl = surveyTemplates.find(t => t.id === formularioId)
      if (!tmpl) return
      task = { id: `t_${Date.now()}`, type: 'formulario', title: tmpl.name, data: { templateId: formularioId } }
    }
    else if (type === 'mensaje') {
      if (!mensaje.trim()) return
      task = { id: `t_${Date.now()}`, type: 'mensaje', title: mensaje.slice(0, 40), data: { text: mensaje } }
    }
    else if (type === 'video') {
      if (!videoUrl.trim()) return
      task = { id: `t_${Date.now()}`, type: 'video', title: videoTitle || 'Vídeo', data: { url: videoUrl, title: videoTitle } }
    }
    if (task) { onAdd(task); onClose() }
  }

  return (
    <Modal open onClose={onClose} title={`Añadir tarea — ${DAY_NAMES[dayIdx]}`} variant="drawer" bare>
          {TASK_TYPES.map(type => {
            const isOpen = openType === type.id
            const Icon = type.icon
            return (
              <div key={type.id} className="border-b border-border last:border-0">
                <button onClick={() => setOpenType(isOpen ? null : type.id)}
                  className="w-full flex items-center gap-3 px-6 py-4 hover:bg-bg-alt transition-colors text-left">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: type.color }} />
                  <Icon className="w-4 h-4 text-muted flex-shrink-0" />
                  <span className="flex-1 font-medium text-sm">{type.label}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 space-y-3 bg-bg-alt/40">
                    {/* WORKOUT */}
                    {type.id === 'workout' && (
                      <div className="space-y-3">
                        {planTemplates.length === 0 ? (
                          <p className="text-sm text-muted">No tienes workouts creados. Ve a la pestaña Workouts para crear uno.</p>
                        ) : (
                          <>
                            <div className="relative">
                              <input value={workoutSearch} onChange={e => setWorkoutSearch(e.target.value)}
                                placeholder="Buscar workout..."
                                className="w-full pl-8 pr-3 py-2 bg-card border border-border rounded-xl text-sm outline-none" />
                              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </div>
                            <div className="max-h-52 overflow-y-auto space-y-1 border border-border rounded-xl p-2 bg-card">
                              {planTemplates
                                .filter(t => t.name.toLowerCase().includes(workoutSearch.toLowerCase()))
                                .map(tmpl => (
                                  <label key={tmpl.id}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${selectedWorkoutId === tmpl.id ? 'bg-accent/10 border-accent' : 'border-transparent hover:bg-bg-alt'}`}>
                                    <div onClick={() => setSelectedWorkoutId(tmpl.id)}
                                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${selectedWorkoutId === tmpl.id ? 'border-accent bg-accent' : 'border-border'}`}>
                                      {selectedWorkoutId === tmpl.id && <div className="w-2 h-2 bg-card rounded-full" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{tmpl.name}</p>
                                      {tmpl.type && <p className="text-[11px] text-muted">{tmpl.type}</p>}
                                    </div>
                                  </label>
                                ))}
                              {planTemplates.filter(t => t.name.toLowerCase().includes(workoutSearch.toLowerCase())).length === 0 && (
                                <p className="text-sm text-muted text-center py-3">Sin resultados</p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                if (!selectedWorkoutId) return
                                const tmpl = planTemplates.find(t => t.id === selectedWorkoutId)!
                                onAdd({ id: `t_${Date.now()}`, type: 'workout', title: tmpl.name, data: { templateId: tmpl.id, templateName: tmpl.name } })
                                onClose()
                              }}
                              disabled={!selectedWorkoutId}
                              className="w-full py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40">
                              Añadir workout
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {/* CARDIO */}
                    {type.id === 'cardio' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-1.5">
                          {CARDIO_TYPES.map(ct => (
                            <button key={ct} onClick={() => setCardioType(ct)}
                              className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all text-left ${cardioType === ct ? 'bg-accent/10 border-accent text-accent' : 'bg-card border-border text-muted'}`}>
                              {ct}
                            </button>
                          ))}
                        </div>
                        <textarea value={cardioObjective} onChange={e => setCardioObjective(e.target.value)}
                          placeholder="Ej: 30 min al 70% FCM..." rows={2}
                          className="w-full px-3 py-2.5 bg-card border border-border rounded-xl text-sm outline-none resize-none" />
                        <button onClick={() => saveTask('cardio')}
                          className="w-full py-2.5 bg-ink text-white rounded-xl text-sm font-semibold">Guardar cardio</button>
                      </div>
                    )}
                    {/* EVOLUCIÓN */}
                    {type.id === 'evolucion' && (
                      <div className="space-y-2">
                        {Object.entries(evolucionItems).map(([key, val]) => (
                          <label key={key}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${val ? 'bg-accent/10 border-accent' : 'bg-card border-border'}`}
                            onClick={() => setEvolucionItems(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}>
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${val ? 'bg-accent border-accent' : 'border-border'}`}>
                              {val && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-sm font-medium">{EVOLUCION_LABELS[key]}</span>
                          </label>
                        ))}
                        <button onClick={() => saveTask('evolucion')}
                          className="w-full py-2.5 bg-ink text-white rounded-xl text-sm font-semibold mt-2">Añadir registro</button>
                      </div>
                    )}
                    {/* FORMULARIO */}
                    {type.id === 'formulario' && (
                      <div className="space-y-2">
                        {surveyTemplates.length === 0 ? (
                          <p className="text-sm text-muted">No tienes formularios. Créalos en la pestaña Encuestas.</p>
                        ) : (
                          <>
                            {surveyTemplates.map(t => (
                              <label key={t.id}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${formularioId === t.id ? 'bg-accent/10 border-accent' : 'bg-card border-border'}`}
                                onClick={() => setFormularioId(t.id)}>
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${formularioId === t.id ? 'border-accent bg-accent' : 'border-border'}`}>
                                  {formularioId === t.id && <div className="w-2 h-2 bg-card rounded-full" />}
                                </div>
                                <span className="text-sm">{t.name}</span>
                              </label>
                            ))}
                            <button onClick={() => saveTask('formulario')}
                              className="w-full py-2.5 bg-ink text-white rounded-xl text-sm font-semibold mt-1">Añadir formulario</button>
                          </>
                        )}
                      </div>
                    )}
                    {/* MENSAJE */}
                    {type.id === 'mensaje' && (
                      <div className="space-y-2">
                        <textarea value={mensaje} onChange={e => setMensaje(e.target.value)}
                          placeholder="Mensaje que verá el cliente este día..." rows={3}
                          className="w-full px-3 py-2.5 bg-card border border-border rounded-xl text-sm outline-none resize-none" />
                        <button onClick={() => saveTask('mensaje')} disabled={!mensaje.trim()}
                          className="w-full py-2.5 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40">Añadir mensaje</button>
                      </div>
                    )}
                    {/* VÍDEO */}
                    {type.id === 'video' && (
                      <div className="space-y-2">
                        <input value={videoTitle} onChange={e => setVideoTitle(e.target.value)}
                          placeholder="Título del vídeo"
                          className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm outline-none" />
                        <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                          placeholder="URL (YouTube, Vimeo...)"
                          className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm outline-none" />
                        <button onClick={() => saveTask('video')} disabled={!videoUrl.trim()}
                          className="w-full py-2.5 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40">Añadir vídeo</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
    </Modal>
  )
}

// ── Editor calendario ─────────────────────────────────────
function ProgramEditor({ program: initial, labels, surveyTemplates, planTemplates, onSave, onBack }: {
  program: Program; labels: TrainerLabel[]
  surveyTemplates: { id: string; name: string }[]
  planTemplates: { id: string; name: string; type: string }[]
  onSave: (p: Program) => void; onBack: () => void
}) {
  const [program, setProgram] = useState<Program>(JSON.parse(JSON.stringify(initial)))
  const [saving, setSaving] = useState(false)
  const [addTaskModal, setAddTaskModal] = useState<{ weekIdx: number; dayIdx: number } | null>(null)
  const [activeWeek, setActiveWeek] = useState(0)
  const [addingType, setAddingType] = useState(false)
  const [newTypeInput, setNewTypeInput] = useState('')
  const [customTypes, setCustomTypes] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_PROG_TYPES(initial.trainer_id)) || '[]') } catch { return [] }
  })
  const allTipos = [...TIPOS_DEFAULT, ...customTypes]

  const addCustomType = () => {
    const tipo = newTypeInput.trim()
    if (!tipo) return
    const updated = [...customTypes, tipo]
    setCustomTypes(updated)
    localStorage.setItem(LS_PROG_TYPES(initial.trainer_id), JSON.stringify(updated))
    update({ tipo })
    setNewTypeInput('')
    setAddingType(false)
  }

  const update = (u: Partial<Program>) => setProgram(p => ({ ...p, ...u }))

  const addWeek = () => {
    setProgram(p => ({ ...p, weeks: [...p.weeks, emptyWeek(p.weeks.length + 1)] }))
    setActiveWeek(program.weeks.length)
  }

  const deleteWeek = (wi: number) => {
    if (program.weeks.length <= 1) return
    setProgram(p => ({ ...p, weeks: p.weeks.filter((_, i) => i !== wi) }))
    setActiveWeek(Math.max(0, wi - 1))
  }

  const addTask = (weekIdx: number, dayIdx: number, task: ProgramTask) => {
    setProgram(p => {
      const weeks = JSON.parse(JSON.stringify(p.weeks))
      weeks[weekIdx].days[dayIdx].tasks.push(task)
      return { ...p, weeks }
    })
  }

  const deleteTask = (weekIdx: number, dayIdx: number, taskIdx: number) => {
    setProgram(p => {
      const weeks = JSON.parse(JSON.stringify(p.weeks))
      weeks[weekIdx].days[dayIdx].tasks.splice(taskIdx, 1)
      return { ...p, weeks }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave({ ...program, updated_at: Date.now() })
    setSaving(false)
  }

  const currentWeek = program.weeks[activeWeek]
  const totalTasks = program.weeks.reduce((a, w) => a + w.days.reduce((b, d) => b + d.tasks.length, 0), 0)

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      {addTaskModal && (
        <AddTaskModal
          dayIdx={addTaskModal.dayIdx}
          surveyTemplates={surveyTemplates}
          planTemplates={planTemplates}
          onAdd={task => addTask(addTaskModal.weekIdx, addTaskModal.dayIdx, task)}
          onClose={() => setAddTaskModal(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-bg-alt text-muted"><ArrowLeft className="w-4 h-4" /></button>
        <input value={program.name} onChange={e => update({ name: e.target.value })}
          className="flex-1 min-w-0 px-3 py-2 bg-bg border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-accent/20" />
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40 flex-shrink-0">
          <Save className="w-3.5 h-3.5" /> {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* Tipo + etiquetas */}
      <div className="flex flex-wrap gap-4 items-start">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">Tipo</p>
          <div className="flex flex-wrap gap-1.5">
            {allTipos.map(tipo => (
              <button key={tipo} onClick={() => update({ tipo })}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${program.tipo === tipo ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent hover:text-accent'}`}>
                {tipo}
              </button>
            ))}
            {addingType ? (
              <div className="flex gap-1.5 items-center">
                <input autoFocus value={newTypeInput} onChange={e => setNewTypeInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCustomType(); if (e.key === 'Escape') { setAddingType(false); setNewTypeInput('') } }}
                  placeholder="Nuevo tipo..." className="px-3 py-1 bg-bg border border-accent/40 rounded-lg text-xs outline-none w-32" />
                <button onClick={addCustomType} className="px-2 py-1 bg-ink text-white rounded-lg text-xs font-semibold">Crear</button>
                <button onClick={() => { setAddingType(false); setNewTypeInput('') }} className="px-2 py-1 border border-border rounded-lg text-xs text-muted">✕</button>
              </div>
            ) : (
              <button onClick={() => setAddingType(true)}
                className="px-3 py-1 rounded-lg text-xs font-semibold border border-dashed border-border text-muted hover:border-accent hover:text-accent">
                + Nuevo tipo
              </button>
            )}
          </div>
        </div>
        {labels.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">Etiquetas</p>
            <LabelSelector labels={labels} selected={program.label_ids} onChange={(ids: string[]) => update({ label_ids: ids })} />
          </div>
        )}
      </div>

      <p className="text-xs text-muted">{program.weeks.length} semana{program.weeks.length !== 1 ? 's' : ''} · {totalTasks} tareas</p>

      {/* Semanas tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {program.weeks.map((w, wi) => (
          <div key={wi} className="flex items-center gap-0.5">
            <button onClick={() => setActiveWeek(wi)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeWeek === wi ? 'bg-ink text-white' : 'bg-card border border-border text-muted hover:border-accent'}`}>
              {w.label}
            </button>
            {program.weeks.length > 1 && activeWeek === wi && (
              <button onClick={() => deleteWeek(wi)} className="p-1 text-muted hover:text-warn rounded transition-colors ml-0.5">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        <button onClick={addWeek}
          className="px-3 py-1.5 rounded-lg text-sm border-2 border-dashed border-border text-muted hover:border-accent hover:text-accent transition-all flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Semana
        </button>
      </div>

      {/* Calendario: 7 columnas solo desde 1024 px, 2 en tablet y un día por fila en móvil (con 7 columnas de ~40 px las tareas quedaban en un icono) */}
      {currentWeek && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3 lg:gap-2">
          {currentWeek.days.map((day, di) => (
            <div key={di} className="flex flex-col">
              <p className={`text-[11px] font-bold uppercase tracking-wider text-left lg:text-center mb-1.5 ${di >= 5 ? 'text-accent' : 'text-muted'}`}>
                {DAY_NAMES[di]}
              </p>
              <div className="flex-1 bg-bg-alt/40 border border-border/60 rounded-2xl p-2 space-y-1.5 lg:min-h-[100px]">
                {day.tasks.map((task, ti) => (
                  <TaskCard key={task.id} task={task} onDelete={() => deleteTask(activeWeek, di, ti)} />
                ))}
                <button
                  onClick={() => setAddTaskModal({ weekIdx: activeWeek, dayIdx: di })}
                  aria-label={`Añadir tarea el ${DAY_NAMES[di]}`}
                  className="w-full flex items-center justify-center py-2 rounded-xl border border-dashed border-border/60 text-muted hover:border-accent hover:text-accent hover:bg-accent/3 transition-all">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Asignación masiva ───────────────────────────────────────
function BulkAssignModal({ program, clients, trainerId, onClose }: {
  program: Program; clients: ClientData[]; trainerId: string; onClose: () => void
}) {
  const [mode, setMode] = useState<'clients' | 'group'>('clients')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [cohortes, setCohortes] = useState<{ id: string; name: string }[]>([])
  const [selectedCohorte, setSelectedCohorte] = useState('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    if (trainerId === DEMO_TRAINER_ID) { setCohortes(DEMO_COHORTES.map(c => ({ id: c.id, name: c.nombre }))); return }
    supabase.from('cohortes').select('id, name').eq('trainer_id', trainerId).then(({ data }) => setCohortes(data || []))
  }, [trainerId])

  const filteredClients = clients.filter(c => `${c.name} ${c.surname}`.toLowerCase().includes(search.toLowerCase()))
  const toggle = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const confirm = async () => {
    let targetIds: string[] = []
    if (mode === 'group') {
      if (!selectedCohorte) { toast('Elige un grupo', 'warn'); return }
      const { data } = await supabase.from('cohorte_clientes').select('client_id').eq('cohorte_id', selectedCohorte)
      targetIds = (data || []).map(r => r.client_id)
    } else {
      targetIds = [...selectedIds]
    }
    if (targetIds.length === 0) { toast('Selecciona al menos un cliente', 'warn'); return }

    setAssigning(true)
    // Los ejercicios de cada día vienen de los workouts que usa el programa: sin leerlos se asignaría
    // un plan de días vacíos, así que si falla no se asigna nada.
    const isDemo = trainerId === DEMO_TRAINER_ID
    const templates = isDemo ? {} : await loadProgramTemplates(trainerId, workoutTemplateIds(program.weeks))
    if (templates === null) {
      setAssigning(false)
      toast('No se pudieron leer los workouts del programa: no se ha asignado nada', 'warn')
      return
    }
    // Copia del plan (y del borrador, que esta asignación descarta) antes de sustituirlos.
    // Si no se pueden leer los planes actuales, no se toca nada.
    const previous = isDemo ? [] : await snapshotBeforeAssign(targetIds, program.name)
    if (previous === null) {
      setAssigning(false)
      toast('No se pudo guardar una copia del plan anterior: no se ha asignado nada', 'warn')
      return
    }
    const { weeks, missing } = programToPlanWeeks(program.weeks, templates)
    const results = await Promise.all(targetIds.map(async clientId => {
      const newPlan: TrainingPlan = {
        clientId, type: program.tipo, restMain: 180, restAcc: 90, restWarn: 30,
        weeks: JSON.parse(JSON.stringify(weeks)),
        programId: program.id, programName: program.name,
        fechaInicio: localDateKey(),
      }
      const { error } = await supabase.from('planes').upsert(
        { clientId, plan: { P: newPlan }, borrador_activo: false, plan_borrador: null, updatedAt: Date.now() },
        { onConflict: 'clientId' }
      )
      return !error
    }))
    setAssigning(false)
    const ok = results.filter(Boolean).length
    const assignedIds = new Set(targetIds.filter((_, i) => results[i]))
    const undoable = previous.filter(r => assignedIds.has(r.clientId))
    if (missing.length) toast(`${missing.length === 1 ? 'Un workout del programa ya no existe' : `${missing.length} workouts del programa ya no existen`} (${missing.join(', ')}): esos días quedan sin ejercicios`, 'warn')
    toast(`Programa asignado a ${ok}/${targetIds.length} cliente${targetIds.length > 1 ? 's' : ''} ✓`, ok === targetIds.length ? 'ok' : 'warn',
      undoable.length ? {
        label: 'Deshacer',
        onClick: async () => {
          const n = await restoreSnapshots(undoable)
          toast(n === undoable.length ? `Plan anterior restaurado en ${n} cliente${n > 1 ? 's' : ''} ✓` : `Solo se pudo restaurar ${n}/${undoable.length}; el resto está en el historial del plan`, n === undoable.length ? 'ok' : 'warn')
        },
      } : undefined)
    onClose()
  }

  const targetCount = mode === 'group'
    ? (selectedCohorte ? undefined : 0)
    : selectedIds.size

  return (
    <Modal open onClose={onClose} title="Asignar a varios" variant="drawer" bare
      footer={
        <button onClick={confirm} disabled={assigning || targetCount === 0}
            className="w-full py-3 bg-ink text-white rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2">
            <Users className="w-4 h-4" />
            {assigning ? 'Asignando...' : mode === 'clients' ? `Asignar a ${selectedIds.size} cliente${selectedIds.size !== 1 ? 's' : ''}` : 'Asignar a todo el grupo'}
          </button>
      }>
      <p className="px-6 pt-4 text-xs text-muted">{program.name} — se publica de inmediato, sin borrador y sustituye el plan actual de cada cliente. Se guarda una copia del plan anterior en su historial y podrás deshacerlo desde el aviso.</p>
        <div className="px-6 pt-4 flex gap-2 flex-shrink-0">
          <button onClick={() => setMode('clients')} className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${mode === 'clients' ? 'bg-ink text-white border-ink' : 'border-border text-muted'}`}>Elegir clientes</button>
          <button onClick={() => setMode('group')} className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${mode === 'group' ? 'bg-ink text-white border-ink' : 'border-border text-muted'}`}>Grupo completo</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {mode === 'clients' ? (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..."
                  className="w-full pl-8 pr-3 py-2 bg-card border border-border rounded-xl text-sm outline-none" />
              </div>
              <div className="space-y-1 border border-border rounded-xl p-2 max-h-64 overflow-y-auto">
                {filteredClients.length === 0 && <p className="text-sm text-muted text-center py-3">Sin resultados</p>}
                {filteredClients.map(c => (
                  <label key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-bg-alt cursor-pointer">
                    <div onClick={() => toggle(c.id)}
                      className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${selectedIds.has(c.id) ? 'border-accent bg-accent' : 'border-border'}`}>
                      {selectedIds.has(c.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm truncate">{c.name} {c.surname}</span>
                  </label>
                ))}
              </div>
            </>
          ) : (
            cohortes.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">No tienes grupos creados todavía (pestaña Grupos).</p>
            ) : (
              <div className="space-y-1">
                {cohortes.map(c => (
                  <label key={c.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${selectedCohorte === c.id ? 'bg-accent/10 border-accent' : 'border-border'}`}>
                    <input type="radio" name="cohorte" checked={selectedCohorte === c.id} onChange={() => setSelectedCohorte(c.id)} className="accent-accent" />
                    <span className="text-sm">{c.name}</span>
                  </label>
                ))}
              </div>
            )
          )}
        </div>

    </Modal>
  )
}

// ── Main ──────────────────────────────────────────────────
export function ProgramasTab({ trainerId, onManageLabels, clients }: Props) {
  const [programs, setPrograms]   = useState<Program[]>([])
  const [labels, setLabels]       = useState<TrainerLabel[]>([])
  const [surveyTemplates, setSurveyTemplates] = useState<{ id: string; name: string }[]>([])
  const [planTemplates, setPlanTemplates] = useState<{ id: string; name: string; type: string }[]>([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState<Program | null>(null)
  const [filterLabel, setFilterLabel] = useState<string | null>(null)
  const [filterTipo, setFilterTipo]   = useState<string | null>(null)
  const [query, setQuery]             = useState('')
  const [bulkAssignFor, setBulkAssignFor] = useState<Program | null>(null)

  useEffect(() => { loadAll() }, [trainerId])

  const loadAll = async () => {
    setLoading(true)
    if (trainerId === DEMO_TRAINER_ID) {
      setPrograms(DEMO_PROGRAMS as unknown as Program[])
      setLabels(DEMO_LABELS)
      setSurveyTemplates([{ id: 'demo-tmpl-001', name: 'Check-in semanal' }])
      setPlanTemplates(DEMO_PLAN_TEMPLATES.map(t => ({ id: t.id, name: t.name, type: t.type })))
      setLoading(false)
      return
    }
    const [progRes, labelRes, surveyRes, planRes] = await Promise.all([
      supabase.from('programs').select('*').eq('trainer_id', trainerId).order('created_at', { ascending: false }),
      supabase.from('labels').select('*').eq('trainer_id', trainerId).order('created_at'),
      supabase.from('survey_templates').select('id, name').eq('trainer_id', trainerId),
      supabase.from('plan_templates').select('id, name, plan').eq('trainer_id', trainerId).order('created_at', { ascending: false }),
    ])
    if (progRes.data) setPrograms(progRes.data)
    if (labelRes.data) setLabels(labelRes.data)
    if (surveyRes.data) setSurveyTemplates(surveyRes.data)
    if (planRes.data) setPlanTemplates(planRes.data.map((r: any) => ({ id: r.id, name: r.name, type: r.plan?.type || 'General' })))
    setLoading(false)
  }

  const saveProgram = async (prog: Program) => {
    if (trainerId !== DEMO_TRAINER_ID) {
      const { error } = await supabase.from('programs').upsert(prog, { onConflict: 'id' })
      if (error) { toast('Error al guardar', 'warn'); return }
    }
    setPrograms(ps => ps.find(p => p.id === prog.id) ? ps.map(p => p.id === prog.id ? prog : p) : [prog, ...ps])
    setEditing(null)
    toast('Programa guardado ✓', 'ok')
  }

  const deleteProgram = async (id: string) => {
    // Antes se borraba al instante con un icono que solo aparecía al pasar el ratón.
    if (!window.confirm('¿Eliminar este programa? Los clientes que ya lo tienen asignado no se verán afectados.')) return
    if (trainerId !== DEMO_TRAINER_ID) await supabase.from('programs').delete().eq('id', id)
    setPrograms(ps => ps.filter(p => p.id !== id))
    toast('Eliminado', 'ok')
  }

  const duplicate = async (prog: Program) => {
    const copy: Program = { ...JSON.parse(JSON.stringify(prog)), id: `prog_${Date.now()}`, name: `${prog.name} (copia)`, created_at: Date.now(), updated_at: Date.now() }
    if (trainerId !== DEMO_TRAINER_ID) await supabase.from('programs').insert(copy)
    setPrograms(ps => [copy, ...ps])
    toast('Duplicado ✓', 'ok')
  }

  const usedTipos = [...new Set(programs.map(p => p.tipo))]
  const filtered = programs.filter(p => {
    if (filterLabel && !p.label_ids?.includes(filterLabel)) return false
    if (filterTipo && p.tipo !== filterTipo) return false
    if (!matchesQuery(p.name, query)) return false
    return true
  })
  const hasFilters = !!(query.trim() || filterLabel || filterTipo)
  const clearFilters = () => { setQuery(''); setFilterLabel(null); setFilterTipo(null) }

  if (editing) return (
    <ProgramEditor
      program={editing} labels={labels}
      surveyTemplates={surveyTemplates} planTemplates={planTemplates}
      onSave={saveProgram} onBack={() => setEditing(null)}
    />
  )

  return (
    <div className="animate-fade-in space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-serif font-bold">Programas</h2>
          <p className="text-muted text-sm mt-1">Recorridos de varias semanas: workouts, cardio y tareas asignados a cada día · {plural(programs.length, 'programa', 'programas')}</p>
        </div>
        <div className="flex items-center gap-2">
          <ActionMenu title="Más herramientas" buttonClassName="p-2.5 rounded-xl border border-border text-muted hover:border-ink hover:text-ink transition-colors"
            trigger={<MoreHorizontal className="w-4 h-4" />}>
            <button onClick={onManageLabels} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-bg-alt">
              <Tag className="w-3.5 h-3.5 text-muted flex-shrink-0" /> Gestionar etiquetas
            </button>
          </ActionMenu>
          <button onClick={() => setEditing(emptyProgram(trainerId))}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
            <Plus className="w-4 h-4" /> Nuevo programa
          </button>
        </div>
      </div>

      {/* Buscar y filtrar */}
      {programs.length > 0 && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar programa..."
              aria-label="Buscar programa"
              className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
          </div>
          {usedTipos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              <button onClick={() => setFilterTipo(null)} aria-pressed={!filterTipo}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all whitespace-nowrap flex-shrink-0 ${!filterTipo ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
                Todos
              </button>
              {usedTipos.map(tipo => (
                <button key={tipo} onClick={() => setFilterTipo(filterTipo === tipo ? null : tipo)} aria-pressed={filterTipo === tipo}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all whitespace-nowrap flex-shrink-0 ${filterTipo === tipo ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
                  {tipo}
                </button>
              ))}
            </div>
          )}
          {labels.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" aria-label="Filtrar por etiqueta">
              {labels.map(label => {
                const active = filterLabel === label.id
                return (
                  <button key={label.id} onClick={() => setFilterLabel(active ? null : label.id)} aria-pressed={active}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-all whitespace-nowrap flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                    style={{ backgroundColor: active ? label.color + '18' : 'transparent', borderColor: label.color + '60', color: label.color }}>
                    {label.emoji} {label.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-card border border-border rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        programs.length > 0 && hasFilters ? (
          // Tiene programas pero el filtro no devuelve nada
          <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl text-muted">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-serif text-lg font-bold">Ningún programa coincide</p>
            <p className="text-sm mt-1">Prueba con otra búsqueda o crea un programa nuevo</p>
            <button onClick={clearFilters} className="mt-3 text-accent text-sm hover:underline">Quitar filtros</button>
          </div>
        ) : (
          // No tiene ningún programa
          <div className="border-2 border-dashed border-border rounded-2xl overflow-hidden">
            <div className="px-8 py-10 text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-accent opacity-60" />
              </div>
              <p className="font-serif text-xl font-bold text-ink">Crea tu primer programa</p>
              <p className="text-sm text-muted mt-2 max-w-sm mx-auto">Un programa es un calendario semanal donde asignas workouts, cardio y tareas a cada día. Créalo una vez y asígnalo a varios clientes.</p>
              <button onClick={() => setEditing(emptyProgram(trainerId))}
                className="mt-5 px-6 py-3 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
                Crear programa
              </button>
            </div>
            <div className="border-t border-border/50 px-8 py-5 bg-bg-alt/30">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Ejemplo de estructura</p>
              <div className="grid grid-cols-7 gap-1.5">
                {['L','M','X','J','V','S','D'].map((d, i) => (
                  <div key={d} className={`text-center rounded-lg py-2 text-xs font-semibold ${i < 5 ? 'bg-accent/8 text-accent' : 'bg-bg-alt text-muted'}`}>
                    <p className="text-[11px] mb-1">{d}</p>
                    {i < 5 ? <div className="w-1.5 h-1.5 bg-accent/40 rounded-full mx-auto" /> : <div className="w-1.5 h-1.5 rounded-full mx-auto" />}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted mt-2 text-center">5 días de entrenamiento + fin de semana libre</p>
            </div>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(prog => {
            const progLabels = labels.filter(l => prog.label_ids?.includes(l.id))
            const totalTasks = (prog.weeks || []).reduce((a, w) => a + w.days.reduce((b, d) => b + d.tasks.length, 0), 0)
            const taskTypes = [...new Set((prog.weeks || []).flatMap(w => w.days.flatMap(d => d.tasks.map(t => t.type))))]
            return (
              <div key={prog.id}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:border-accent/40 hover:shadow-sm transition-all cursor-pointer group"
                onClick={() => setEditing(prog)}>
                <div className="h-1.5" style={{ background: taskTypes.length ? `linear-gradient(90deg, ${TASK_TYPES.filter(t => taskTypes.includes(t.id)).map(t => t.color).join(', ')})` : '#e5e7eb' }} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base truncate">{prog.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[11px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold">{prog.tipo}</span>
                        <span className="text-[11px] text-muted">{plural((prog.weeks || []).length, 'semana', 'semanas')} · {plural(totalTasks, 'tarea', 'tareas')}</span>
                        {progLabels.map(l => <LabelPill key={l.id} label={l} small />)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setBulkAssignFor(prog)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-ink hover:border-ink transition-colors">
                        <Users className="w-3.5 h-3.5" /> Asignar
                      </button>
                      <ActionMenu title="Acciones del programa">
                        <button onClick={() => duplicate(prog)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-bg-alt">
                          <Copy className="w-3.5 h-3.5 text-muted flex-shrink-0" /> Duplicar
                        </button>
                        <div className="h-px bg-border my-1" />
                        <button onClick={() => deleteProgram(prog.id)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-warn hover:bg-warn/5">
                          <Trash2 className="w-3.5 h-3.5 flex-shrink-0" /> Eliminar
                        </button>
                      </ActionMenu>
                    </div>
                  </div>
                  {/* Mini calendario preview */}
                  <div className="grid grid-cols-7 gap-1 mt-3">
                    {(prog.weeks[0]?.days || Array(7).fill({ tasks: [] })).map((d: any, di: number) => (
                      <div key={di} className="flex flex-col gap-0.5">
                        <p className="text-[8px] text-muted text-center font-bold">{DAY_NAMES[di][0]}</p>
                        <div className={`h-6 rounded-md flex items-center justify-center text-[11px] font-bold ${d.tasks?.length > 0 ? 'bg-accent/10 text-accent' : 'bg-bg-alt text-transparent'}`}>
                          {d.tasks?.length > 0 && d.tasks.length}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {bulkAssignFor && (
        <BulkAssignModal program={bulkAssignFor} clients={clients} trainerId={trainerId} onClose={() => setBulkAssignFor(null)} />
      )}
    </div>
  )
}
