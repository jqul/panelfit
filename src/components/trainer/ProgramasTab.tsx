import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from '../shared/Toast'
import {
  Plus, Trash2, Copy, ChevronDown, ChevronUp, Edit2, ArrowLeft,
  Save, Tag, X, Check, Dumbbell, Timer, Camera, ClipboardList,
  MessageSquare, Video, Calendar
} from 'lucide-react'
import type { TrainerLabel } from './labels'
import { LabelPill, LabelSelector } from './labels'

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

interface Props { trainerId: string }

// ── Config tipos tarea ────────────────────────────────────
const TASK_TYPES = [
  { id: 'workout',    label: 'Workout',             color: '#f59e0b', bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  icon: Dumbbell },
  { id: 'cardio',     label: 'Cardio',              color: '#ef4444', bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    icon: Timer },
  { id: 'evolucion',  label: 'Registrar evolución', color: '#06b6d4', bg: 'bg-cyan-50',   border: 'border-cyan-200',   text: 'text-cyan-700',   icon: Camera },
  { id: 'formulario', label: 'Formulario',          color: '#22c55e', bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  icon: ClipboardList },
  { id: 'mensaje',    label: 'Mensaje',             color: '#8b5cf6', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', icon: MessageSquare },
  { id: 'video',      label: 'Vídeo',               color: '#f97316', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: Video },
] as const

const TIPOS = ['Fuerza','Hipertrofia','Pérdida de grasa','Resistencia','Rehabilitación','Rendimiento','General','Iniciación','Mantenimiento','Definición','Volumen','Peaking']
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
    <div className={`group relative flex items-start gap-2 px-2.5 py-2 rounded-xl border ${meta.bg} ${meta.border} text-xs`}>
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${meta.text}`} />
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
    <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
          <h3 className="font-bold text-lg">Añadir tarea — {DAY_NAMES[dayIdx]}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          {TASK_TYPES.map(type => {
            const isOpen = openType === type.id
            const Icon = type.icon
            return (
              <div key={type.id} className="border-b border-gray-100 last:border-0">
                <button onClick={() => setOpenType(isOpen ? null : type.id)}
                  className="w-full flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors text-left">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: type.color }} />
                  <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="flex-1 font-medium text-sm">{type.label}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 space-y-3 bg-gray-50/50">
                    {/* WORKOUT */}
                    {type.id === 'workout' && (
                      <div className="space-y-3">
                        {planTemplates.length === 0 ? (
                          <p className="text-sm text-gray-500">No tienes workouts creados. Ve a la pestaña Workouts para crear uno.</p>
                        ) : (
                          <>
                            <div className="relative">
                              <input value={workoutSearch} onChange={e => setWorkoutSearch(e.target.value)}
                                placeholder="Buscar workout..."
                                className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none" />
                              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </div>
                            <div className="max-h-52 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-2 bg-white">
                              {planTemplates
                                .filter(t => t.name.toLowerCase().includes(workoutSearch.toLowerCase()))
                                .map(tmpl => (
                                  <label key={tmpl.id}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${selectedWorkoutId === tmpl.id ? 'bg-amber-50 border-amber-300' : 'border-transparent hover:bg-gray-50'}`}>
                                    <div onClick={() => setSelectedWorkoutId(tmpl.id)}
                                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${selectedWorkoutId === tmpl.id ? 'border-amber-500 bg-amber-500' : 'border-gray-300'}`}>
                                      {selectedWorkoutId === tmpl.id && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{tmpl.name}</p>
                                      {tmpl.type && <p className="text-[10px] text-gray-400">{tmpl.type}</p>}
                                    </div>
                                  </label>
                                ))}
                              {planTemplates.filter(t => t.name.toLowerCase().includes(workoutSearch.toLowerCase())).length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-3">Sin resultados</p>
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
                              className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-40">
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
                              className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all text-left ${cardioType === ct ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                              {ct}
                            </button>
                          ))}
                        </div>
                        <textarea value={cardioObjective} onChange={e => setCardioObjective(e.target.value)}
                          placeholder="Ej: 30 min al 70% FCM..." rows={2}
                          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none resize-none" />
                        <button onClick={() => saveTask('cardio')}
                          className="w-full py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold">Guardar cardio</button>
                      </div>
                    )}
                    {/* EVOLUCIÓN */}
                    {type.id === 'evolucion' && (
                      <div className="space-y-2">
                        {Object.entries(evolucionItems).map(([key, val]) => (
                          <label key={key}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${val ? 'bg-cyan-50 border-cyan-300' : 'bg-white border-gray-200'}`}
                            onClick={() => setEvolucionItems(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}>
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${val ? 'bg-cyan-500 border-cyan-500' : 'border-gray-300'}`}>
                              {val && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-sm font-medium">{EVOLUCION_LABELS[key]}</span>
                          </label>
                        ))}
                        <button onClick={() => saveTask('evolucion')}
                          className="w-full py-2.5 bg-cyan-500 text-white rounded-xl text-sm font-semibold mt-2">Añadir registro</button>
                      </div>
                    )}
                    {/* FORMULARIO */}
                    {type.id === 'formulario' && (
                      <div className="space-y-2">
                        {surveyTemplates.length === 0 ? (
                          <p className="text-sm text-gray-500">No tienes formularios. Créalos en la pestaña Encuestas.</p>
                        ) : (
                          <>
                            {surveyTemplates.map(t => (
                              <label key={t.id}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${formularioId === t.id ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'}`}
                                onClick={() => setFormularioId(t.id)}>
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${formularioId === t.id ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                                  {formularioId === t.id && <div className="w-2 h-2 bg-white rounded-full" />}
                                </div>
                                <span className="text-sm">{t.name}</span>
                              </label>
                            ))}
                            <button onClick={() => saveTask('formulario')}
                              className="w-full py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold mt-1">Añadir formulario</button>
                          </>
                        )}
                      </div>
                    )}
                    {/* MENSAJE */}
                    {type.id === 'mensaje' && (
                      <div className="space-y-2">
                        <textarea value={mensaje} onChange={e => setMensaje(e.target.value)}
                          placeholder="Mensaje que verá el cliente este día..." rows={3}
                          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none resize-none" />
                        <button onClick={() => saveTask('mensaje')} disabled={!mensaje.trim()}
                          className="w-full py-2.5 bg-violet-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40">Añadir mensaje</button>
                      </div>
                    )}
                    {/* VÍDEO */}
                    {type.id === 'video' && (
                      <div className="space-y-2">
                        <input value={videoTitle} onChange={e => setVideoTitle(e.target.value)}
                          placeholder="Título del vídeo"
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none" />
                        <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                          placeholder="URL (YouTube, Vimeo...)"
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none" />
                        <button onClick={() => saveTask('video')} disabled={!videoUrl.trim()}
                          className="w-full py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40">Añadir vídeo</button>
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
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">Tipo</p>
          <div className="flex flex-wrap gap-1.5">
            {TIPOS.map(tipo => (
              <button key={tipo} onClick={() => update({ tipo })}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${program.tipo === tipo ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent hover:text-accent'}`}>
                {tipo}
              </button>
            ))}
          </div>
        </div>
        {labels.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">Etiquetas</p>
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

      {/* Calendario 7 días */}
      {currentWeek && (
        <div className="grid grid-cols-7 gap-2">
          {currentWeek.days.map((day, di) => (
            <div key={di} className="flex flex-col">
              <p className={`text-[10px] font-bold uppercase tracking-wider text-center mb-1.5 ${di >= 5 ? 'text-accent' : 'text-muted'}`}>
                {DAY_NAMES[di]}
              </p>
              <div className="flex-1 bg-bg-alt/40 border border-border/60 rounded-2xl p-2 space-y-1.5 min-h-[100px]">
                {day.tasks.map((task, ti) => (
                  <TaskCard key={task.id} task={task} onDelete={() => deleteTask(activeWeek, di, ti)} />
                ))}
                <button
                  onClick={() => setAddTaskModal({ weekIdx: activeWeek, dayIdx: di })}
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

// ── Main ──────────────────────────────────────────────────
export function ProgramasTab({ trainerId }: Props) {
  const [programs, setPrograms]   = useState<Program[]>([])
  const [labels, setLabels]       = useState<TrainerLabel[]>([])
  const [surveyTemplates, setSurveyTemplates] = useState<{ id: string; name: string }[]>([])
  const [planTemplates, setPlanTemplates] = useState<{ id: string; name: string; type: string }[]>([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState<Program | null>(null)
  const [filterLabel, setFilterLabel] = useState<string | null>(null)
  const [filterTipo, setFilterTipo]   = useState<string | null>(null)

  useEffect(() => { loadAll() }, [trainerId])

  const loadAll = async () => {
    setLoading(true)
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
    const { error } = await supabase.from('programs').upsert(prog, { onConflict: 'id' })
    if (error) { toast('Error al guardar', 'warn'); return }
    setPrograms(ps => ps.find(p => p.id === prog.id) ? ps.map(p => p.id === prog.id ? prog : p) : [prog, ...ps])
    setEditing(null)
    toast('Programa guardado ✓', 'ok')
  }

  const deleteProgram = async (id: string) => {
    await supabase.from('programs').delete().eq('id', id)
    setPrograms(ps => ps.filter(p => p.id !== id))
    toast('Eliminado', 'ok')
  }

  const duplicate = async (prog: Program) => {
    const copy: Program = { ...JSON.parse(JSON.stringify(prog)), id: `prog_${Date.now()}`, name: `${prog.name} (copia)`, created_at: Date.now(), updated_at: Date.now() }
    await supabase.from('programs').insert(copy)
    setPrograms(ps => [copy, ...ps])
    toast('Duplicado ✓', 'ok')
  }

  const usedTipos = [...new Set(programs.map(p => p.tipo))]
  const filtered = programs.filter(p => {
    if (filterLabel && !p.label_ids?.includes(filterLabel)) return false
    if (filterTipo && p.tipo !== filterTipo) return false
    return true
  })

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
          <p className="text-muted text-sm mt-1">{programs.length} programa{programs.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setEditing(emptyProgram(trainerId))}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
          <Plus className="w-4 h-4" /> Nuevo programa
        </button>
      </div>

      {/* Filtros */}
      {(labels.length > 0 || usedTipos.length > 1) && (
        <div className="flex flex-wrap gap-2">
          {labels.length > 0 && (
            <>
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
            </>
          )}
          {usedTipos.length > 1 && usedTipos.map(tipo => (
            <button key={tipo} onClick={() => setFilterTipo(filterTipo === tipo ? null : tipo)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${filterTipo === tipo ? 'bg-accent text-white border-accent' : 'border-border text-muted hover:border-accent'}`}>
              {tipo}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-card border border-border rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl text-muted">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-serif text-lg font-bold">Sin programas</p>
          <p className="text-sm mt-1">Crea programas semanales y asígnalos a tus clientes</p>
          <button onClick={() => setEditing(emptyProgram(trainerId))}
            className="mt-4 px-5 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold">
            Crear programa
          </button>
        </div>
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
                <div className="h-1.5" style={{ background: taskTypes.length ? `linear-gradient(90deg, ${TASK_TYPES.filter(t => taskTypes.includes(t.id as any)).map(t => t.color).join(', ')})` : '#e5e7eb' }} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base truncate">{prog.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold">{prog.tipo}</span>
                        <span className="text-[10px] text-muted">{(prog.weeks || []).length} sem · {totalTasks} tareas</span>
                        {progLabels.map(l => <LabelPill key={l.id} label={l} small />)}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => duplicate(prog)} className="p-1.5 text-muted hover:text-accent rounded-lg"><Copy className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteProgram(prog.id)} className="p-1.5 text-muted hover:text-warn rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  {/* Mini calendario preview */}
                  <div className="grid grid-cols-7 gap-1 mt-3">
                    {(prog.weeks[0]?.days || Array(7).fill({ tasks: [] })).map((d: any, di: number) => (
                      <div key={di} className="flex flex-col gap-0.5">
                        <p className="text-[8px] text-muted text-center font-bold">{DAY_NAMES[di][0]}</p>
                        <div className={`h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${d.tasks?.length > 0 ? 'bg-accent/10 text-accent' : 'bg-bg-alt text-transparent'}`}>
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
    </div>
  )
}
