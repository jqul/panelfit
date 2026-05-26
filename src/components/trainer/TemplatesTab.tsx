import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientData, TrainingPlan, UserProfile } from '../../types'
import { toast } from '../shared/Toast'
import {
  Plus, Trash2, Copy, ChevronDown, ChevronUp, Edit2, ArrowLeft,
  Save, Tag, X, Check, Dumbbell, Timer, Camera, ClipboardList,
  MessageSquare, Video, GripVertical, Calendar
} from 'lucide-react'
import { useExerciseLibrary } from '../../hooks/useExerciseLibrary'

// ── Tipos ─────────────────────────────────────────────────
export interface TrainerLabel {
  id: string
  trainer_id: string
  name: string
  color: string
  emoji: string
  survey_template_id: string | null
  created_at: number
}

export interface ProgramTask {
  id: string
  type: 'workout' | 'cardio' | 'evolucion' | 'formulario' | 'mensaje' | 'video'
  title: string
  data: Record<string, any>
}

export interface ProgramDay {
  tasks: ProgramTask[]
}

export interface ProgramWeek {
  label: string
  days: ProgramDay[] // siempre 7
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

interface Props {
  trainerId: string
  clients: ClientData[]
  userProfile?: UserProfile
}

// ── Colores y config de tipos de tarea ───────────────────
const TASK_TYPES = [
  { id: 'workout',   label: 'Workout',            color: '#f59e0b', bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   icon: Dumbbell },
  { id: 'cardio',    label: 'Cardio',             color: '#ef4444', bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     icon: Timer },
  { id: 'evolucion', label: 'Registrar evolución',color: '#06b6d4', bg: 'bg-cyan-50',    border: 'border-cyan-200',    text: 'text-cyan-700',    icon: Camera },
  { id: 'formulario',label: 'Formulario',         color: '#22c55e', bg: 'bg-green-50',   border: 'border-green-200',   text: 'text-green-700',   icon: ClipboardList },
  { id: 'mensaje',   label: 'Mensaje',            color: '#8b5cf6', bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  icon: MessageSquare },
  { id: 'video',     label: 'Vídeo',              color: '#f97316', bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  icon: Video },
] as const

const TIPOS_ENTRENAMIENTO = [
  'Fuerza', 'Hipertrofia', 'Pérdida de grasa', 'Resistencia',
  'Rehabilitación', 'Rendimiento', 'General', 'Iniciación',
  'Mantenimiento', 'Definición', 'Volumen', 'Peaking',
]

const LABEL_COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e','#06b6d4',
  '#3b82f6','#8b5cf6','#ec4899','#6e5438','#64748b',
]

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// ── Utilidades ────────────────────────────────────────────
function emptyWeek(n: number): ProgramWeek {
  return {
    label: `Semana ${n}`,
    days: Array.from({ length: 7 }, () => ({ tasks: [] }))
  }
}

function emptyProgram(trainerId: string): Program {
  return {
    id: `prog_${Date.now()}`,
    trainer_id: trainerId,
    name: 'Nuevo programa',
    tipo: 'General',
    label_ids: [],
    weeks: [emptyWeek(1)],
    created_at: Date.now(),
    updated_at: Date.now(),
  }
}

// ── Label pill ────────────────────────────────────────────
export function LabelPill({ label, onRemove, small }: { label: TrainerLabel; onRemove?: () => void; small?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold border ${small ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'}`}
      style={{ backgroundColor: label.color + '18', borderColor: label.color + '40', color: label.color }}>
      <span>{label.emoji}</span>
      <span>{label.name}</span>
      {onRemove && <button onClick={onRemove} className="ml-0.5 hover:opacity-70"><X className="w-2.5 h-2.5" /></button>}
    </span>
  )
}

export function LabelSelector({ labels, selected, onChange }: {
  labels: TrainerLabel[]; selected: string[]; onChange: (ids: string[]) => void
}) {
  if (!labels.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map(label => {
        const active = selected.includes(label.id)
        return (
          <button key={label.id}
            onClick={() => onChange(active ? selected.filter(id => id !== label.id) : [...selected, label.id])}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border transition-all ${active ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
            style={{ backgroundColor: active ? label.color + '18' : 'transparent', borderColor: label.color + '60', color: label.color }}>
            <span>{label.emoji}</span>
            <span>{label.name}</span>
            {active && <Check className="w-2.5 h-2.5" />}
          </button>
        )
      })}
    </div>
  )
}

// ── Modal añadir tarea ────────────────────────────────────
function AddTaskModal({ dayIdx, weekIdx, surveyTemplates, onAdd, onClose }: {
  dayIdx: number; weekIdx: number
  surveyTemplates: { id: string; name: string }[]
  onAdd: (task: ProgramTask) => void
  onClose: () => void
}) {
  const [openType, setOpenType] = useState<string | null>(null)
  const [cardioType, setCardioType] = useState('Correr')
  const [cardioObjective, setCardioObjective] = useState('')
  const [evolucionItems, setEvolucionItems] = useState({ peso: true, fotos: false, medidas: false })
  const [formularioId, setFormularioId] = useState(surveyTemplates[0]?.id || '')
  const [mensaje, setMensaje] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoTitle, setVideoTitle] = useState('')

  const CARDIO_TYPES = ['Correr', 'Caminar', 'Ciclismo', 'Elíptica', 'Nadar', 'Subir escaleras', 'Remo', 'HIIT']
  const EVOLUCION_LABELS: Record<string, string> = { peso: '⚖️ Peso corporal', fotos: '📸 Fotos de progreso', medidas: '📏 Medidas corporales' }

  const saveTask = (type: string) => {
    let task: ProgramTask | null = null

    if (type === 'cardio') {
      task = { id: `t_${Date.now()}`, type: 'cardio', title: cardioType, data: { cardioType, objective: cardioObjective } }
    } else if (type === 'evolucion') {
      const items = Object.entries(evolucionItems).filter(([, v]) => v).map(([k]) => k)
      if (!items.length) return
      task = { id: `t_${Date.now()}`, type: 'evolucion', title: `Registrar: ${items.map(i => EVOLUCION_LABELS[i]).join(', ')}`, data: { items } }
    } else if (type === 'formulario') {
      const tmpl = surveyTemplates.find(t => t.id === formularioId)
      if (!tmpl) return
      task = { id: `t_${Date.now()}`, type: 'formulario', title: tmpl.name, data: { templateId: formularioId } }
    } else if (type === 'mensaje') {
      if (!mensaje.trim()) return
      task = { id: `t_${Date.now()}`, type: 'mensaje', title: mensaje.slice(0, 40), data: { text: mensaje } }
    } else if (type === 'video') {
      if (!videoUrl.trim()) return
      task = { id: `t_${Date.now()}`, type: 'video', title: videoTitle || 'Vídeo', data: { url: videoUrl, title: videoTitle } }
    }

    if (task) { onAdd(task); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Añadir tarea — {DAY_NAMES[dayIdx]}</h3>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {TASK_TYPES.map(type => {
            const Icon = type.icon
            const isOpen = openType === type.id
            return (
              <div key={type.id} className="border-b border-gray-100 last:border-0">
                {/* Header del tipo */}
                <button
                  onClick={() => setOpenType(isOpen ? null : type.id)}
                  className="w-full flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors text-left">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: type.color }} />
                  <span className="flex-1 font-medium text-sm">{type.label}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {/* Panel expandido */}
                {isOpen && (
                  <div className="px-6 pb-5 space-y-3 bg-gray-50/50">

                    {/* WORKOUT — mensaje simple, el workout se asigna desde el plan */}
                    {type.id === 'workout' && (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-500">Añade un día de entrenamiento. El cliente verá su rutina asignada.</p>
                        <div className="flex gap-2">
                          <input placeholder="Nombre del día (ej: Día de empuje)"
                            id="workout-title" className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-200" />
                          <button onClick={() => {
                            const title = (document.getElementById('workout-title') as HTMLInputElement)?.value || 'Workout'
                            onAdd({ id: `t_${Date.now()}`, type: 'workout', title, data: { title } }); onClose()
                          }} className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600">
                            Añadir
                          </button>
                        </div>
                      </div>
                    )}

                    {/* CARDIO */}
                    {type.id === 'cardio' && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-2">Tipo de cardio</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {CARDIO_TYPES.map(ct => (
                              <button key={ct} onClick={() => setCardioType(ct)}
                                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all text-left ${cardioType === ct ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                                {ct}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1.5">Objetivo / indicaciones</p>
                          <textarea value={cardioObjective} onChange={e => setCardioObjective(e.target.value)}
                            placeholder="Ej: 30 min al 70% FCM, distancia mínima 5km..."
                            rows={3} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none resize-none" />
                        </div>
                        <button onClick={() => saveTask('cardio')}
                          className="w-full py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold">
                          Guardar cardio
                        </button>
                      </div>
                    )}

                    {/* EVOLUCIÓN */}
                    {type.id === 'evolucion' && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-gray-500">¿Qué quieres que registre el cliente?</p>
                        {Object.entries(evolucionItems).map(([key, val]) => (
                          <label key={key} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${val ? 'bg-cyan-50 border-cyan-300' : 'bg-white border-gray-200'}`}>
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${val ? 'bg-cyan-500 border-cyan-500' : 'border-gray-300'}`}
                              onClick={() => setEvolucionItems(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}>
                              {val && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-sm font-medium">{EVOLUCION_LABELS[key]}</span>
                          </label>
                        ))}
                        <button onClick={() => saveTask('evolucion')}
                          className="w-full py-2.5 bg-cyan-500 text-white rounded-xl text-sm font-semibold">
                          Añadir registro
                        </button>
                      </div>
                    )}

                    {/* FORMULARIO */}
                    {type.id === 'formulario' && (
                      <div className="space-y-3">
                        {surveyTemplates.length === 0 ? (
                          <p className="text-sm text-gray-500">No tienes formularios creados. Ve a la pestaña Formularios para crear uno.</p>
                        ) : (
                          <>
                            <p className="text-xs font-semibold text-gray-500 mb-2">Selecciona el formulario</p>
                            <div className="space-y-1.5">
                              {surveyTemplates.map(t => (
                                <label key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${formularioId === t.id ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'}`}>
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${formularioId === t.id ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}
                                    onClick={() => setFormularioId(t.id)}>
                                    {formularioId === t.id && <div className="w-2 h-2 bg-white rounded-full" />}
                                  </div>
                                  <span className="text-sm">{t.name}</span>
                                </label>
                              ))}
                            </div>
                            <button onClick={() => saveTask('formulario')}
                              className="w-full py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold">
                              Añadir formulario
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* MENSAJE */}
                    {type.id === 'mensaje' && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-gray-500">Mensaje que verá el cliente este día</p>
                        <textarea value={mensaje} onChange={e => setMensaje(e.target.value)}
                          placeholder="Ej: ¡Hoy es día de descanso activo! Aprovecha para salir a caminar..."
                          rows={3} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none resize-none" />
                        <button onClick={() => saveTask('mensaje')} disabled={!mensaje.trim()}
                          className="w-full py-2.5 bg-violet-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40">
                          Añadir mensaje
                        </button>
                      </div>
                    )}

                    {/* VÍDEO */}
                    {type.id === 'video' && (
                      <div className="space-y-3">
                        <input value={videoTitle} onChange={e => setVideoTitle(e.target.value)}
                          placeholder="Título del vídeo"
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none" />
                        <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                          placeholder="URL del vídeo (YouTube, Vimeo...)"
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none" />
                        <button onClick={() => saveTask('video')} disabled={!videoUrl.trim()}
                          className="w-full py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40">
                          Añadir vídeo
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Task card (en el día) ─────────────────────────────────
function TaskCard({ task, onDelete }: { task: ProgramTask; onDelete: () => void }) {
  const meta = TASK_TYPES.find(t => t.id === task.type) || TASK_TYPES[0]
  const Icon = meta.icon
  return (
    <div className={`group relative flex items-start gap-2 px-3 py-2.5 rounded-xl border ${meta.bg} ${meta.border} text-xs`}>
      <div className="w-4 h-4 flex-shrink-0 mt-0.5">
        <Icon className={`w-4 h-4 ${meta.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold leading-tight truncate ${meta.text}`}>{task.title}</p>
        {task.data.objective && <p className="text-gray-500 text-[10px] mt-0.5 truncate">{task.data.objective}</p>}
        {task.data.text && <p className="text-gray-500 text-[10px] mt-0.5 truncate">"{task.data.text}"</p>}
      </div>
      <button onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-all flex-shrink-0">
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

// ── Vista calendario del programa ─────────────────────────
function ProgramEditor({ program: initialProgram, labels, surveyTemplates, onSave, onBack }: {
  program: Program
  labels: TrainerLabel[]
  surveyTemplates: { id: string; name: string }[]
  onSave: (p: Program) => void
  onBack: () => void
}) {
  const [program, setProgram] = useState<Program>(JSON.parse(JSON.stringify(initialProgram)))
  const [saving, setSaving] = useState(false)
  const [addTaskModal, setAddTaskModal] = useState<{ weekIdx: number; dayIdx: number } | null>(null)
  const [activeWeek, setActiveWeek] = useState(0)

  const updateProgram = (updates: Partial<Program>) => setProgram(p => ({ ...p, ...updates }))

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
    <div className="animate-fade-in flex flex-col gap-4 h-full">
      {addTaskModal && (
        <AddTaskModal
          weekIdx={addTaskModal.weekIdx}
          dayIdx={addTaskModal.dayIdx}
          surveyTemplates={surveyTemplates}
          onAdd={task => addTask(addTaskModal.weekIdx, addTaskModal.dayIdx, task)}
          onClose={() => setAddTaskModal(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-bg-alt text-muted transition-colors flex-shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <input value={program.name} onChange={e => updateProgram({ name: e.target.value })}
          className="flex-1 min-w-0 px-3 py-2 bg-bg border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-accent/20"
          placeholder="Nombre del programa" />
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 flex-shrink-0">
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* Tipo + Etiquetas */}
      <div className="flex flex-wrap gap-4 items-start">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Tipo de entrenamiento</p>
          <div className="flex flex-wrap gap-1.5">
            {TIPOS_ENTRENAMIENTO.map(tipo => (
              <button key={tipo} onClick={() => updateProgram({ tipo })}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${program.tipo === tipo ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent hover:text-accent'}`}>
                {tipo}
              </button>
            ))}
          </div>
        </div>
        {labels.length > 0 && (
          <div className="flex-shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Etiquetas</p>
            <LabelSelector labels={labels} selected={program.label_ids} onChange={ids => updateProgram({ label_ids: ids })} />
          </div>
        )}
      </div>

      {/* Stats rápidas */}
      <div className="flex gap-3 text-xs text-muted">
        <span>{program.weeks.length} semana{program.weeks.length !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>{totalTasks} tarea{totalTasks !== 1 ? 's' : ''} en total</span>
      </div>

      {/* Semanas tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {program.weeks.map((w, wi) => (
          <div key={wi} className="flex items-center gap-1">
            <button onClick={() => setActiveWeek(wi)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeWeek === wi ? 'bg-ink text-white' : 'bg-card border border-border text-muted hover:border-accent hover:text-ink'}`}>
              {w.label}
            </button>
            {program.weeks.length > 1 && activeWeek === wi && (
              <button onClick={() => deleteWeek(wi)} className="p-1 text-muted hover:text-warn rounded transition-colors">
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

      {/* Calendario 7 días */}
      {currentWeek && (
        <div className="grid grid-cols-7 gap-2 flex-1">
          {currentWeek.days.map((day, di) => (
            <div key={di} className="flex flex-col min-h-40">
              {/* Header día */}
              <div className="text-center mb-2">
                <p className={`text-xs font-bold uppercase tracking-wider ${di >= 5 ? 'text-accent' : 'text-muted'}`}>
                  {DAY_NAMES[di]}
                </p>
              </div>

              {/* Área de tareas */}
              <div className="flex-1 bg-bg-alt/40 border border-border/60 rounded-2xl p-2 space-y-1.5 min-h-[120px]">
                {day.tasks.map((task, ti) => (
                  <TaskCard key={task.id} task={task} onDelete={() => deleteTask(activeWeek, di, ti)} />
                ))}

                {/* Botón añadir */}
                <button
                  onClick={() => setAddTaskModal({ weekIdx: activeWeek, dayIdx: di })}
                  className="w-full flex items-center justify-center gap-1 py-2 rounded-xl border border-dashed border-border/60 text-muted hover:border-accent hover:text-accent hover:bg-accent/3 transition-all text-xs">
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

// ── Gestor de etiquetas ───────────────────────────────────
function LabelManager({ trainerId, labels, onUpdate, onClose }: {
  trainerId: string; labels: TrainerLabel[]
  onUpdate: (labels: TrainerLabel[]) => void; onClose: () => void
}) {
  const [list, setList] = useState<TrainerLabel[]>(labels)
  const [editing, setEditing] = useState<TrainerLabel | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(LABEL_COLORS[0])
  const [newEmoji, setNewEmoji] = useState('🏷️')
  const [saving, setSaving] = useState(false)

  const addLabel = async () => {
    if (!newName.trim()) return
    setSaving(true)
    const label: TrainerLabel = { id: `lbl_${Date.now()}`, trainer_id: trainerId, name: newName.trim(), color: newColor, emoji: newEmoji, survey_template_id: null, created_at: Date.now() }
    await supabase.from('labels').insert(label)
    const updated = [...list, label]
    setList(updated); onUpdate(updated)
    setNewName(''); setShowNew(false); setSaving(false)
    toast('Etiqueta creada ✓', 'ok')
  }

  const deleteLabel = async (id: string) => {
    await supabase.from('labels').delete().eq('id', id)
    const updated = list.filter(l => l.id !== id)
    setList(updated); onUpdate(updated)
  }

  const saveEdit = async (label: TrainerLabel) => {
    await supabase.from('labels').update({ name: label.name, color: label.color, emoji: label.emoji }).eq('id', label.id)
    const updated = list.map(l => l.id === label.id ? label : l)
    setList(updated); onUpdate(updated); setEditing(null)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 max-h-56 overflow-y-auto">
        {list.map(label => (
          <div key={label.id} className="border border-border rounded-xl overflow-hidden">
            {editing?.id === label.id ? (
              <div className="p-3 space-y-2">
                <div className="flex gap-2">
                  <input value={editing.emoji} onChange={e => setEditing({ ...editing, emoji: e.target.value })}
                    className="w-12 text-center px-2 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none" />
                  <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
                    className="flex-1 px-3 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none" />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {LABEL_COLORS.map(c => (
                    <button key={c} onClick={() => setEditing({ ...editing, color: c })}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${editing.color === c ? 'border-ink scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(null)} className="flex-1 py-1.5 border border-border rounded-lg text-xs text-muted">Cancelar</button>
                  <button onClick={() => saveEdit(editing)} className="flex-1 py-1.5 bg-ink text-white rounded-lg text-xs font-semibold">Guardar</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-3 py-2.5">
                <LabelPill label={label} />
                <div className="flex-1" />
                <button onClick={() => setEditing(label)} className="p-1 text-muted hover:text-accent"><Edit2 className="w-3 h-3" /></button>
                <button onClick={() => deleteLabel(label.id)} className="p-1 text-muted hover:text-warn"><Trash2 className="w-3 h-3" /></button>
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-muted text-center py-4">Sin etiquetas todavía</p>}
      </div>

      {showNew ? (
        <div className="border border-accent/30 rounded-xl p-3 space-y-2 bg-accent/3">
          <div className="flex gap-2">
            <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)}
              className="w-12 text-center px-2 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none" placeholder="🏷️" />
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Nombre de la etiqueta"
              className="flex-1 px-3 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none"
              onKeyDown={e => e.key === 'Enter' && addLabel()} autoFocus />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {LABEL_COLORS.map(c => (
              <button key={c} onClick={() => setNewColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${newColor === c ? 'border-ink scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowNew(false); setNewName('') }} className="flex-1 py-1.5 border border-border rounded-lg text-xs text-muted">Cancelar</button>
            <button onClick={addLabel} disabled={!newName.trim() || saving}
              className="flex-1 py-1.5 bg-ink text-white rounded-lg text-xs font-semibold disabled:opacity-40">
              {saving ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowNew(true)}
          className="w-full border-2 border-dashed border-border rounded-xl py-2.5 text-sm text-muted hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Nueva etiqueta
        </button>
      )}

      <button onClick={onClose} className="w-full py-2.5 bg-ink text-white rounded-xl text-sm font-bold">Cerrar</button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────
export function TemplatesTab({ trainerId, clients }: Props) {
  const [programs, setPrograms]   = useState<Program[]>([])
  const [labels, setLabels]       = useState<TrainerLabel[]>([])
  const [surveyTemplates, setSurveyTemplates] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState<Program | null>(null)
  const [filterLabel, setFilterLabel] = useState<string | null>(null)
  const [filterTipo, setFilterTipo]   = useState<string | null>(null)
  const [showLabelManager, setShowLabelManager] = useState(false)

  useEffect(() => { if (trainerId) loadAll() }, [trainerId])

  const loadAll = async () => {
    setLoading(true)
    const [progRes, labelRes, surveyRes] = await Promise.all([
      supabase.from('programs').select('*').eq('trainer_id', trainerId).order('created_at', { ascending: false }),
      supabase.from('labels').select('*').eq('trainer_id', trainerId).order('created_at'),
      supabase.from('survey_templates').select('id, name').eq('trainer_id', trainerId),
    ])
    if (progRes.data) setPrograms(progRes.data)
    if (labelRes.data) setLabels(labelRes.data)
    if (surveyRes.data) setSurveyTemplates(surveyRes.data)
    setLoading(false)
  }

  const saveProgram = async (prog: Program) => {
    const { error } = await supabase.from('programs').upsert(prog, { onConflict: 'id' })
    if (error) { toast('Error al guardar', 'warn'); return }
    setPrograms(ps => ps.find(p => p.id === prog.id) ? ps.map(p => p.id === prog.id ? prog : p) : [prog, ...ps])
    setEditing(null)
    toast('Programa guardado ✓', 'ok')
  }

  const deleteProgram = async (id: string) => {
    await supabase.from('programs').delete().eq('id', id)
    setPrograms(ps => ps.filter(p => p.id !== id))
    toast('Programa eliminado', 'ok')
  }

  const duplicateProgram = async (prog: Program) => {
    const copy: Program = { ...JSON.parse(JSON.stringify(prog)), id: `prog_${Date.now()}`, name: `${prog.name} (copia)`, created_at: Date.now(), updated_at: Date.now() }
    await supabase.from('programs').insert(copy)
    setPrograms(ps => [copy, ...ps])
    toast('Duplicado ✓', 'ok')
  }

  // Filtrado
  const filtered = programs.filter(p => {
    if (filterLabel && !p.label_ids.includes(filterLabel)) return false
    if (filterTipo && p.tipo !== filterTipo) return false
    return true
  })

  // Tipos usados
  const usedTipos = [...new Set(programs.map(p => p.tipo))]

  // ── Vista editor ──
  if (editing) {
    return (
      <ProgramEditor
        program={editing}
        labels={labels}
        surveyTemplates={surveyTemplates}
        onSave={saveProgram}
        onBack={() => setEditing(null)}
      />
    )
  }

  // ── Vista lista ──
  return (
    <div className="animate-fade-in space-y-5 max-w-4xl">
      {/* Modal etiquetas */}
      {showLabelManager && (
        <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-bold text-xl">Gestionar etiquetas</h3>
              <button onClick={() => setShowLabelManager(false)} className="p-2 rounded-xl hover:bg-bg-alt text-muted"><X className="w-4 h-4" /></button>
            </div>
            <LabelManager trainerId={trainerId} labels={labels} onUpdate={setLabels} onClose={() => setShowLabelManager(false)} />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-serif font-bold">Programas</h2>
          <p className="text-muted text-sm mt-1">{programs.length} programa{programs.length !== 1 ? 's' : ''} creado{programs.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowLabelManager(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-sm font-semibold text-muted hover:border-accent hover:text-accent transition-colors">
            <Tag className="w-3.5 h-3.5" /> Etiquetas
          </button>
          <button onClick={() => setEditing(emptyProgram(trainerId))}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
            <Plus className="w-4 h-4" /> Nuevo programa
          </button>
        </div>
      </div>

      {/* Filtros */}
      {(labels.length > 0 || usedTipos.length > 1) && (
        <div className="flex flex-wrap gap-2 items-center">
          {/* Filtro por etiqueta */}
          {labels.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setFilterLabel(null)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${!filterLabel ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
                Todos
              </button>
              {labels.map(label => (
                <button key={label.id} onClick={() => setFilterLabel(filterLabel === label.id ? null : label.id)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${filterLabel === label.id ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                  style={{ backgroundColor: filterLabel === label.id ? label.color + '18' : 'transparent', borderColor: label.color + '60', color: label.color }}>
                  {label.emoji} {label.name}
                </button>
              ))}
            </div>
          )}
          {/* Filtro por tipo */}
          {usedTipos.length > 1 && (
            <div className="flex gap-1.5 flex-wrap">
              {usedTipos.map(tipo => (
                <button key={tipo} onClick={() => setFilterTipo(filterTipo === tipo ? null : tipo)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${filterTipo === tipo ? 'bg-accent text-white border-accent' : 'border-border text-muted hover:border-accent'}`}>
                  {tipo}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lista de programas */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-card border border-border rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl text-muted">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-serif text-lg font-bold">{filterLabel || filterTipo ? 'Sin programas con este filtro' : 'Sin programas'}</p>
          <p className="text-sm mt-1">Crea tu primer programa para empezar a asignarlo a clientes</p>
          {!filterLabel && !filterTipo && (
            <button onClick={() => setEditing(emptyProgram(trainerId))}
              className="mt-4 px-5 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold">
              Crear programa
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(prog => {
            const progLabels = labels.filter(l => prog.label_ids.includes(l.id))
            const totalTasks = prog.weeks.reduce((a, w) => a + w.days.reduce((b, d) => b + d.tasks.length, 0), 0)
            // Preview de tipos de tarea usados
            const taskTypes = [...new Set(prog.weeks.flatMap(w => w.days.flatMap(d => d.tasks.map(t => t.type))))]

            return (
              <div key={prog.id}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:border-accent/40 hover:shadow-sm transition-all cursor-pointer group"
                onClick={() => setEditing(prog)}>
                {/* Color strip por tipo */}
                <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${TASK_TYPES.filter(t => taskTypes.includes(t.id as any)).map(t => t.color).join(', ') || '#e5e7eb'})` }} />

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base truncate">{prog.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold">{prog.tipo}</span>
                        <span className="text-[10px] text-muted">{prog.weeks.length} sem · {totalTasks} tareas</span>
                      </div>
                      {progLabels.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {progLabels.map(l => <LabelPill key={l.id} label={l} small />)}
                        </div>
                      )}
                    </div>
                    {/* Acciones — visibles al hover */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => duplicateProgram(prog)} className="p-1.5 text-muted hover:text-accent rounded-lg"><Copy className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteProgram(prog.id)} className="p-1.5 text-muted hover:text-warn rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>

                  {/* Preview mini del calendario */}
                  <div className="grid grid-cols-7 gap-1 mt-3">
                    {prog.weeks[0]?.days.map((day, di) => (
                      <div key={di} className="flex flex-col gap-0.5">
                        <p className="text-[8px] text-muted text-center font-bold">{DAY_NAMES[di][0]}</p>
                        <div className={`h-6 rounded-md flex items-center justify-center text-[10px] font-bold transition-colors ${day.tasks.length > 0 ? 'bg-accent/10 text-accent' : 'bg-bg-alt text-transparent'}`}>
                          {day.tasks.length > 0 && day.tasks.length}
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
    </div>
  )
}
