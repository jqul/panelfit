import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, X, ChevronDown, ChevronUp, Send, Clock, Users, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ClientData } from '../../types'
import { toast } from '../shared/Toast'

interface Question {
  id: string
  type: 'scale' | 'text' | 'yesno' | 'choice'
  label: string
  options?: string[]  // para choice
  required: boolean
}

interface SurveyTemplate {
  id: string
  trainer_id: string
  name: string
  questions: Question[]
  created_at: number
}

interface SurveySchedule {
  id: string
  trainer_id: string
  template_id: string
  client_id: string | null
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'once'
  day_of_week: number
  active: boolean
  last_sent_at: number | null
}

interface SurveyResponse {
  id: string
  template_id: string
  client_id: string
  answers: Record<string, any>
  completed_at: number
}

interface Props {
  trainerId: string
  clients: ClientData[]
}

const FREQ_LABELS = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  once: 'Una vez'
}

const DAY_LABELS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const DEFAULT_QUESTIONS: Question[] = [
  { id: 'q1', type: 'scale', label: '¿Cómo valorarías tu energía esta semana? (1-10)', required: true },
  { id: 'q2', type: 'scale', label: '¿Cómo has dormido esta semana? (1-10)', required: true },
  { id: 'q3', type: 'scale', label: '¿Nivel de estrés esta semana? (1-10)', required: true },
  { id: 'q4', type: 'yesno', label: '¿Has seguido la dieta esta semana?', required: false },
  { id: 'q5', type: 'text', label: '¿Algo que quieras comentar a tu entrenador?', required: false },
]

// ── Editor de plantilla ───────────────────────────────────
function TemplateEditor({
  initial, trainerId, onSave, onCancel
}: {
  initial?: SurveyTemplate
  trainerId: string
  onSave: (t: SurveyTemplate) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name || 'Encuesta semanal')
  const [questions, setQuestions] = useState<Question[]>(initial?.questions || DEFAULT_QUESTIONS)
  const [saving, setSaving] = useState(false)

  const addQuestion = (type: Question['type']) => {
    const q: Question = {
      id: `q_${Date.now()}`,
      type,
      label: type === 'scale' ? 'Nueva pregunta (1-10)' :
             type === 'yesno' ? 'Nueva pregunta (Sí/No)' :
             type === 'choice' ? 'Nueva pregunta de opción' : 'Nueva pregunta abierta',
      options: type === 'choice' ? ['Opción A', 'Opción B'] : undefined,
      required: false
    }
    setQuestions(qs => [...qs, q])
  }

  const updateQ = (id: string, updates: Partial<Question>) =>
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...updates } : q))

  const deleteQ = (id: string) => setQuestions(qs => qs.filter(q => q.id !== id))

  const moveQ = (id: string, dir: -1 | 1) => {
    const idx = questions.findIndex(q => q.id === id)
    if (idx + dir < 0 || idx + dir >= questions.length) return
    const qs = [...questions]
    ;[qs[idx], qs[idx + dir]] = [qs[idx + dir], qs[idx]]
    setQuestions(qs)
  }

  const handleSave = async () => {
    if (!name.trim() || !questions.length) return
    setSaving(true)
    const tmpl: SurveyTemplate = {
      id: initial?.id || `tmpl_${Date.now()}`,
      trainer_id: trainerId,
      name: name.trim(),
      questions,
      created_at: initial?.created_at || Date.now()
    }
    const { error } = initial
      ? await supabase.from('survey_templates').update({ name: tmpl.name, questions: tmpl.questions }).eq('id', tmpl.id)
      : await supabase.from('survey_templates').insert(tmpl)
    if (error) { toast('Error al guardar', 'warn'); setSaving(false); return }
    onSave(tmpl)
    setSaving(false)
  }

  const TYPE_ICONS = { scale: '📊', text: '✍️', yesno: '✅', choice: '🔘' }
  const TYPE_LABELS = { scale: 'Escala 1-10', text: 'Texto libre', yesno: 'Sí / No', choice: 'Opción múltiple' }

  return (
    <div className="bg-card border border-accent/20 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-accent/5">
        <h3 className="font-semibold text-sm">{initial ? 'Editar plantilla' : 'Nueva plantilla'}</h3>
        <button onClick={onCancel}><X className="w-4 h-4 text-muted" /></button>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Nombre de la encuesta</label>
          <input value={name} onChange={e => setName(e.target.value)} autoFocus
            className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
        </div>

        {/* Preguntas */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted">Preguntas</label>
          {questions.map((q, i) => (
            <div key={q.id} className="bg-bg border border-border rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm flex-shrink-0">{TYPE_ICONS[q.type]}</span>
                <input value={q.label} onChange={e => updateQ(q.id, { label: e.target.value })}
                  className="flex-1 text-sm bg-transparent outline-none font-medium" />
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => moveQ(q.id, -1)} disabled={i === 0}
                    className="p-1 text-muted hover:text-ink disabled:opacity-30">
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button onClick={() => moveQ(q.id, 1)} disabled={i === questions.length - 1}
                    className="p-1 text-muted hover:text-ink disabled:opacity-30">
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <button onClick={() => updateQ(q.id, { required: !q.required })}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${q.required ? 'bg-accent text-white border-accent' : 'border-border text-muted'}`}>
                    {q.required ? 'REQ' : 'OPC'}
                  </button>
                  <button onClick={() => deleteQ(q.id)} className="p-1 text-muted hover:text-warn">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {q.type === 'choice' && q.options && (
                <div className="flex flex-wrap gap-1 ml-6">
                  {q.options.map((opt, oi) => (
                    <input key={oi} value={opt}
                      onChange={e => {
                        const opts = [...(q.options || [])]
                        opts[oi] = e.target.value
                        updateQ(q.id, { options: opts })
                      }}
                      className="px-2 py-1 bg-bg-alt border border-border rounded-lg text-xs outline-none w-24"
                    />
                  ))}
                  <button onClick={() => updateQ(q.id, { options: [...(q.options || []), 'Opción'] })}
                    className="px-2 py-1 border border-dashed border-border rounded-lg text-xs text-muted hover:border-accent">
                    + Añadir
                  </button>
                </div>
              )}
              <p className="text-[10px] text-muted ml-6">{TYPE_LABELS[q.type]}</p>
            </div>
          ))}

          {/* Añadir pregunta */}
          <div className="flex gap-2 flex-wrap">
            {(['scale', 'yesno', 'text', 'choice'] as const).map(type => (
              <button key={type} onClick={() => addQuestion(type)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-border rounded-lg text-xs text-muted hover:border-accent hover:text-accent transition-colors">
                <Plus className="w-3 h-3" /> {TYPE_ICONS[type]} {TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !name.trim() || !questions.length}
            className="flex-1 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40">
            {saving ? 'Guardando...' : 'Guardar plantilla'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Programar envío ───────────────────────────────────────
function ScheduleEditor({
  trainerId, templates, clients, initial, onSave, onCancel
}: {
  trainerId: string
  templates: SurveyTemplate[]
  clients: ClientData[]
  initial?: SurveySchedule
  onSave: (s: SurveySchedule) => void
  onCancel: () => void
}) {
  const [templateId, setTemplateId] = useState(initial?.template_id || templates[0]?.id || '')
  const [clientId, setClientId] = useState<string | null>(initial?.client_id || null)
  const [frequency, setFrequency] = useState<SurveySchedule['frequency']>(initial?.frequency || 'weekly')
  const [dayOfWeek, setDayOfWeek] = useState(initial?.day_of_week || 5)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!templateId) return
    setSaving(true)
    const sched: SurveySchedule = {
      id: initial?.id || `sched_${Date.now()}`,
      trainer_id: trainerId,
      template_id: templateId,
      client_id: clientId,
      frequency,
      day_of_week: dayOfWeek,
      active: true,
      last_sent_at: null
    }
    const { error } = initial
      ? await supabase.from('survey_schedules').update(sched).eq('id', sched.id)
      : await supabase.from('survey_schedules').insert(sched)
    if (error) { toast('Error al programar', 'warn'); setSaving(false); return }
    onSave(sched)
    setSaving(false)
  }

  return (
    <div className="bg-card border border-accent/20 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-accent/5">
        <h3 className="font-semibold text-sm">Programar envío</h3>
        <button onClick={onCancel}><X className="w-4 h-4 text-muted" /></button>
      </div>
      <div className="p-5 space-y-4">
        {/* Plantilla */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Encuesta</label>
          <select value={templateId} onChange={e => setTemplateId(e.target.value)}
            className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none">
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {/* Cliente */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Destinatarios</label>
          <select value={clientId || ''} onChange={e => setClientId(e.target.value || null)}
            className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none">
            <option value="">Todos los clientes</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.surname}</option>)}
          </select>
        </div>

        {/* Frecuencia */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Frecuencia</label>
          <div className="grid grid-cols-4 gap-2">
            {(['weekly', 'biweekly', 'monthly', 'once'] as const).map(f => (
              <button key={f} onClick={() => setFrequency(f)}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${frequency === f ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
                {FREQ_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Día de envío */}
        {(frequency === 'weekly' || frequency === 'biweekly') && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Día de envío</label>
            <div className="flex gap-1 flex-wrap">
              {[1,2,3,4,5,6,7].map(d => (
                <button key={d} onClick={() => setDayOfWeek(d)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all min-w-[36px] ${dayOfWeek === d ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
                  {DAY_LABELS[d].slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        <div className="bg-bg-alt rounded-xl p-3 text-xs text-muted">
          <p className="font-semibold text-ink mb-1">Resumen del envío</p>
          <p>Encuesta: <span className="font-semibold">{templates.find(t => t.id === templateId)?.name || '—'}</span></p>
          <p>Para: <span className="font-semibold">{clientId ? clients.find(c => c.id === clientId)?.name : 'Todos los clientes'}</span></p>
          <p>Cuándo: <span className="font-semibold">
            {frequency === 'weekly' ? `Cada ${DAY_LABELS[dayOfWeek]}` :
             frequency === 'biweekly' ? `Cada 2 semanas (${DAY_LABELS[dayOfWeek]})` :
             frequency === 'monthly' ? 'Cada mes' : 'Una vez'}
          </span></p>
          <p className="mt-1 text-accent">El cliente recibirá el enlace por WhatsApp en su panel.</p>
        </div>

        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !templateId}
            className="flex-1 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40">
            {saving ? 'Programando...' : '📅 Programar envío'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Respuestas del cliente ────────────────────────────────
function ResponseViewer({ response, template, clientName }: {
  response: SurveyResponse
  template: SurveyTemplate
  clientName: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-bg-alt/30"
        onClick={() => setOpen(!open)}>
        <CheckCircle2 className="w-4 h-4 text-ok flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold">{clientName}</p>
          <p className="text-xs text-muted">
            {new Date(response.completed_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
      </div>
      {open && (
        <div className="border-t border-border divide-y divide-border/50">
          {template.questions.map(q => {
            const ans = response.answers[q.id]
            if (ans === undefined || ans === '') return null
            return (
              <div key={q.id} className="px-4 py-2.5">
                <p className="text-xs text-muted mb-1">{q.label}</p>
                {q.type === 'scale' && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-bg-alt rounded-full h-2 overflow-hidden">
                      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(ans / 10) * 100}%` }} />
                    </div>
                    <span className="text-sm font-bold text-accent w-6 text-right">{ans}</span>
                  </div>
                )}
                {q.type === 'yesno' && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${ans ? 'bg-ok/10 text-ok' : 'bg-warn/10 text-warn'}`}>
                    {ans ? '✓ Sí' : '✗ No'}
                  </span>
                )}
                {q.type === 'text' && <p className="text-sm">{ans}</p>}
                {q.type === 'choice' && <p className="text-sm font-semibold">{ans}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────
export function EncuestasTab({ trainerId, clients }: Props) {
  const [templates, setTemplates] = useState<SurveyTemplate[]>([])
  const [schedules, setSchedules] = useState<SurveySchedule[]>([])
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<'plantillas' | 'programacion' | 'respuestas'>('plantillas')
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<SurveyTemplate | undefined>()
  const [showScheduleEditor, setShowScheduleEditor] = useState(false)

  useEffect(() => { loadAll() }, [trainerId])

  const loadAll = async () => {
    setLoading(true)
    const [tmplRes, schedRes, respRes] = await Promise.all([
      supabase.from('survey_templates').select('*').eq('trainer_id', trainerId).order('created_at'),
      supabase.from('survey_schedules').select('*').eq('trainer_id', trainerId).order('created_at'),
      supabase.from('survey_responses').select('*').eq('trainer_id', trainerId).order('completed_at', { ascending: false }).limit(50)
    ])
    if (tmplRes.data) setTemplates(tmplRes.data)
    if (schedRes.data) setSchedules(schedRes.data)
    if (respRes.data) setResponses(respRes.data)
    setLoading(false)
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('¿Eliminar esta plantilla?')) return
    await supabase.from('survey_templates').delete().eq('id', id)
    setTemplates(ts => ts.filter(t => t.id !== id))
    toast('Plantilla eliminada', 'ok')
  }

  const deleteSchedule = async (id: string) => {
    await supabase.from('survey_schedules').delete().eq('id', id)
    setSchedules(ss => ss.filter(s => s.id !== id))
    toast('Programación eliminada', 'ok')
  }

  const toggleSchedule = async (id: string, active: boolean) => {
    await supabase.from('survey_schedules').update({ active }).eq('id', id)
    setSchedules(ss => ss.map(s => s.id === id ? { ...s, active } : s))
  }

  const sendNow = (schedule: SurveySchedule) => {
    const tmpl = templates.find(t => t.id === schedule.template_id)
    if (!tmpl) return
    const targetClients = schedule.client_id
      ? clients.filter(c => c.id === schedule.client_id)
      : clients
    targetClients.forEach(c => {
      const url = `${window.location.origin}?c=${c.token}&encuesta=1`
      window.open(`https://wa.me/?text=${encodeURIComponent(`Hola ${c.name} 👋\n\n📋 Te mando la encuesta de seguimiento:\n\n${url}\n\n¡Solo te llevará 2 minutos! 🙏`)}`, '_blank')
    })
    toast(`Encuesta enviada a ${targetClients.length} cliente${targetClients.length > 1 ? 's' : ''} ✓`, 'ok')
  }

  const SECTIONS = [
    { id: 'plantillas', label: '📝 Plantillas', count: templates.length },
    { id: 'programacion', label: '📅 Programación', count: schedules.length },
    { id: 'respuestas', label: '📊 Respuestas', count: responses.length },
  ] as const

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-muted">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm">Cargando encuestas...</p>
      </div>
    </div>
  )

  return (
    <div className="animate-fade-in space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold">Encuestas</h2>
          <p className="text-muted text-sm mt-1">Crea plantillas, programa envíos y revisa respuestas</p>
        </div>
        <div className="flex gap-2">
          {section === 'plantillas' && (
            <button onClick={() => { setEditingTemplate(undefined); setShowTemplateEditor(true) }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold">
              <Plus className="w-4 h-4" /> Nueva plantilla
            </button>
          )}
          {section === 'programacion' && templates.length > 0 && (
            <button onClick={() => setShowScheduleEditor(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold">
              <Clock className="w-4 h-4" /> Programar envío
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg p-1 rounded-xl border border-border w-fit">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${section === s.id ? 'bg-card shadow-sm text-ink' : 'text-muted hover:text-ink'}`}>
            {s.label}
            {s.count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${section === s.id ? 'bg-ink text-white' : 'bg-bg-alt text-muted'}`}>
                {s.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── PLANTILLAS ── */}
      {section === 'plantillas' && (
        <div className="space-y-3">
          {showTemplateEditor && (
            <TemplateEditor
              initial={editingTemplate}
              trainerId={trainerId}
              onSave={t => {
                setTemplates(ts => editingTemplate ? ts.map(x => x.id === t.id ? t : x) : [t, ...ts])
                setShowTemplateEditor(false)
                setEditingTemplate(undefined)
                toast('Plantilla guardada ✓', 'ok')
              }}
              onCancel={() => { setShowTemplateEditor(false); setEditingTemplate(undefined) }}
            />
          )}

          {templates.length === 0 && !showTemplateEditor && (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl text-muted">
              <p className="text-4xl mb-3">📝</p>
              <p className="font-serif text-lg font-bold">Sin plantillas</p>
              <p className="text-sm mt-1">Crea tu primera encuesta para empezar a medir el bienestar de tus clientes</p>
              <button onClick={() => setShowTemplateEditor(true)}
                className="mt-4 px-5 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold">
                Crear plantilla
              </button>
            </div>
          )}

          {templates.map(tmpl => (
            <div key={tmpl.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{tmpl.name}</p>
                  <p className="text-xs text-muted mt-0.5">{tmpl.questions.length} preguntas</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tmpl.questions.slice(0, 3).map(q => (
                      <span key={q.id} className="text-[10px] bg-bg-alt border border-border px-2 py-0.5 rounded-full text-muted truncate max-w-[160px]">
                        {q.label.slice(0, 40)}{q.label.length > 40 ? '...' : ''}
                      </span>
                    ))}
                    {tmpl.questions.length > 3 && (
                      <span className="text-[10px] text-muted">+{tmpl.questions.length - 3} más</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => { setEditingTemplate(tmpl); setShowTemplateEditor(true) }}
                    className="p-1.5 text-muted hover:text-accent"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteTemplate(tmpl.id)}
                    className="p-1.5 text-muted hover:text-warn"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PROGRAMACIÓN ── */}
      {section === 'programacion' && (
        <div className="space-y-3">
          {showScheduleEditor && (
            <ScheduleEditor
              trainerId={trainerId}
              templates={templates}
              clients={clients}
              onSave={s => {
                setSchedules(ss => [s, ...ss])
                setShowScheduleEditor(false)
                toast('Envío programado ✓', 'ok')
              }}
              onCancel={() => setShowScheduleEditor(false)}
            />
          )}

          {templates.length === 0 && (
            <div className="text-center py-8 text-muted text-sm border-2 border-dashed border-border rounded-2xl">
              <p>Primero crea una plantilla en la pestaña "Plantillas"</p>
            </div>
          )}

          {schedules.length === 0 && templates.length > 0 && !showScheduleEditor && (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl text-muted">
              <p className="text-4xl mb-3">📅</p>
              <p className="font-serif text-lg font-bold">Sin programaciones</p>
              <p className="text-sm mt-1">Programa el envío automático de encuestas a tus clientes</p>
              <button onClick={() => setShowScheduleEditor(true)}
                className="mt-4 px-5 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold">
                Programar envío
              </button>
            </div>
          )}

          {schedules.map(sched => {
            const tmpl = templates.find(t => t.id === sched.template_id)
            const client = clients.find(c => c.id === sched.client_id)
            return (
              <div key={sched.id} className={`bg-card border rounded-2xl p-4 ${sched.active ? 'border-ok/30' : 'border-border'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${sched.active ? 'bg-ok' : 'bg-border'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{tmpl?.name || 'Plantilla eliminada'}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {client ? `${client.name} ${client.surname}` : 'Todos los clientes'}
                      </span>
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {FREQ_LABELS[sched.frequency]}
                        {(sched.frequency === 'weekly' || sched.frequency === 'biweekly') && ` · ${DAY_LABELS[sched.day_of_week]}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => sendNow(sched)}
                      title="Enviar ahora por WhatsApp"
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-[#25D366] text-white rounded-lg text-xs font-semibold hover:opacity-90">
                      <Send className="w-3 h-3" /> Enviar
                    </button>
                    <button onClick={() => toggleSchedule(sched.id, !sched.active)}
                      className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${sched.active ? 'bg-ok' : 'bg-border'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${sched.active ? 'translate-x-4' : ''}`} />
                    </button>
                    <button onClick={() => deleteSchedule(sched.id)} className="p-1 text-muted hover:text-warn">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── RESPUESTAS ── */}
      {section === 'respuestas' && (
        <div className="space-y-3">
          {responses.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl text-muted">
              <p className="text-4xl mb-3">📊</p>
              <p className="font-serif text-lg font-bold">Sin respuestas aún</p>
              <p className="text-sm mt-1">Las respuestas de tus clientes aparecerán aquí</p>
            </div>
          )}
          {responses.map(resp => {
            const tmpl = templates.find(t => t.id === resp.template_id)
            const client = clients.find(c => c.id === resp.client_id)
            if (!tmpl || !client) return null
            return (
              <ResponseViewer
                key={resp.id}
                response={resp}
                template={tmpl}
                clientName={`${client.name} ${client.surname}`}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
