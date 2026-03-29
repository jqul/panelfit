import { useState, useEffect, useRef } from 'react'
import {
  X, Save, ChevronLeft, Camera, FileText, BarChart2,
  Dumbbell, Settings, ClipboardList, StickyNote, Eye,
  MessageSquare, CheckCircle2, Clock, TrendingUp
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ClientData, TrainingPlan, TrainingLogs, UserProfile } from '../../types'
import { Button } from '../shared/Button'
import { toast } from '../shared/Toast'
import { TrainingPlanEditor } from './TrainingPlanEditor'
import { useExerciseLibrary } from '../../hooks/useExerciseLibrary'

type Tab = 'plan' | 'vista' | 'entrenos' | 'encuesta' | 'notas' | 'config'

interface Props {
  client: ClientData
  userProfile: UserProfile
  allClients: ClientData[]
  onClose: () => void
}

const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: 'plan',     icon: Dumbbell,      label: 'Plan' },
  { id: 'vista',    icon: Eye,           label: 'Vista cliente' },
  { id: 'entrenos', icon: ClipboardList, label: 'Entrenos' },
  { id: 'encuesta', icon: MessageSquare, label: 'Encuesta' },
  { id: 'notas',    icon: StickyNote,    label: 'Notas' },
  { id: 'config',   icon: Settings,      label: 'Config' },
]

export function ClientPanel({ client, userProfile, allClients, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('plan')
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [logs, setLogs] = useState<TrainingLogs>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  const library = useExerciseLibrary(userProfile.uid)
  const otherClients = allClients.filter(c => c.id !== client.id)

  useEffect(() => { loadData() }, [client.id])

  const loadData = async () => {
    setLoading(true)
    // Plan
    const { data: planData } = await supabase
      .from('planes').select('datos').eq('cliente_id', client.id).single()
    if (planData?.datos?.P) setPlan(planData.datos.P as TrainingPlan)
    else setPlan({ clientId: client.id, type: 'hipertrofia', restMain: 180, restAcc: 90, restWarn: 30, weeks: [] })

    // Registros
    const { data: regData } = await supabase
      .from('registros').select('datos').eq('cliente_id', client.id).single()
    if (regData?.datos?.logs) setLogs(regData.datos.logs as TrainingLogs)

    setLoading(false)
  }

  const handlePlanChange = (newPlan: TrainingPlan) => {
    setPlan(newPlan)
    clearTimeout(saveTimer.current)
    setSaveMsg('Escribiendo...')
    saveTimer.current = setTimeout(() => savePlan(newPlan), 1500)
  }

  const savePlan = async (planToSave?: TrainingPlan) => {
    const p = planToSave || plan; if (!p) return
    setSaving(true); setSaveMsg('Guardando...')
    const { error } = await supabase.from('planes')
      .upsert({ cliente_id: client.id, datos: { P: p }, updated_at: new Date().toISOString() },
               { onConflict: 'cliente_id' })
    if (error) { toast('Error al guardar: ' + error.message, 'warn'); setSaveMsg('Error') }
    else { setSaveMsg('✓ Guardado'); setTimeout(() => setSaveMsg(''), 2000) }
    setSaving(false)
  }

  const importFromClient = async (clientId: string): Promise<TrainingPlan | null> => {
    const { data } = await supabase.from('planes').select('datos').eq('cliente_id', clientId).single()
    if (data?.datos?.P?.weeks?.length) return data.datos.P as TrainingPlan
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col animate-fade-in">
      {/* Header */}
      <header className="bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center h-14 px-4 gap-3">
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5 mr-2">
            <div className="w-8 h-8 rounded-full bg-bg-alt border border-border flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
              {client.name?.[0]?.toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-tight">{client.name} {client.surname}</p>
              <p className="text-[10px] text-muted">{plan?.type || 'Sin tipo'}</p>
            </div>
          </div>
          <nav className="flex-1 flex items-stretch overflow-x-auto scrollbar-hide">
            {TABS.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 h-14 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                  activeTab === id ? 'border-ink text-ink font-semibold' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2 flex-shrink-0">
            {saveMsg && <span className="text-xs text-muted hidden sm:block">{saveMsg}</span>}
            <Button size="sm" onClick={() => savePlan()} disabled={saving} className="gap-1.5">
              <Save className="w-3.5 h-3.5" /><span className="hidden sm:inline">Guardar</span>
            </Button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar PC */}
        <aside className="hidden lg:flex flex-col w-48 flex-shrink-0 bg-card border-r border-border overflow-y-auto">
          <div className="p-5 text-center border-b border-border">
            <div className="w-14 h-14 rounded-full bg-bg-alt border-2 border-border flex items-center justify-center font-serif text-2xl text-accent mx-auto mb-2">
              {client.name?.[0]?.toUpperCase()}
            </div>
            <h3 className="font-serif font-bold text-sm">{client.name} {client.surname}</h3>
            <p className="text-[10px] text-muted mt-0.5 capitalize">{plan?.type || '—'}</p>
          </div>
          <div className="p-4 space-y-2 border-b border-border text-xs">
            <div className="flex justify-between"><span className="text-muted">Semanas</span><span className="font-semibold">{plan?.weeks?.length || 0}</span></div>
            <div className="flex justify-between"><span className="text-muted">Ejercicios</span>
              <span className="font-semibold">
                {plan?.weeks?.reduce((a, w) => a + w.days.reduce((b, d) => b + d.exercises.length, 0), 0) || 0}
              </span>
            </div>
            <div className="flex justify-between"><span className="text-muted">Completados</span>
              <span className="font-semibold text-ok">{Object.values(logs).filter(l => l.done).length}</span>
            </div>
          </div>
          <div className="p-3 mt-auto space-y-2">
            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?c=${client.token}`); toast('Enlace copiado ✓', 'ok') }}
              className="w-full text-[11px] font-semibold text-accent border border-accent/30 rounded-lg py-2 hover:bg-accent/5 transition-colors"
            >🔗 Copiar enlace</button>
            <button onClick={() => {
              const url = `${window.location.origin}?c=${client.token}`
              const msg = encodeURIComponent(`Hola ${client.name} 👋\n\nTe comparto tu panel de entrenamiento:\n\n${url}\n\n💪`)
              window.open(`https://wa.me/?text=${msg}`, '_blank')
            }} className="w-full text-[11px] font-semibold text-[#25D366] border border-[#25D366]/30 rounded-lg py-2 hover:bg-[#25D366]/5 transition-colors">
              📱 WhatsApp
            </button>
          </div>
        </aside>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />)}</div>
            ) : (
              <>
                {activeTab === 'plan' && plan && (
                  <TrainingPlanEditor plan={plan} onChange={handlePlanChange}
                    allClients={otherClients} library={library.exercises} onImportFromClient={importFromClient} />
                )}
                {activeTab === 'vista' && <VistaTab plan={plan} logs={logs} />}
                {activeTab === 'entrenos' && <EntrenosTab logs={logs} plan={plan} />}
                {activeTab === 'encuesta' && <EncuestaTab client={client} plan={plan} onChange={handlePlanChange} />}
                {activeTab === 'notas' && <NotasTab plan={plan} onChange={handlePlanChange} />}
                {activeTab === 'config' && <ConfigTab client={client} plan={plan} onChange={handlePlanChange} />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// ── Vista previa cliente ───────────────────────────────────
function VistaTab({ plan, logs }: { plan: TrainingPlan | null; logs: TrainingLogs }) {
  if (!plan || !plan.weeks?.length) return (
    <div className="text-center py-16 text-muted">
      <Eye className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-serif text-lg">Sin plan asignado</p>
      <p className="text-sm mt-1">Crea semanas y días en el tab Plan primero.</p>
    </div>
  )

  const currentWeek = plan.weeks.find(w => w.isCurrent) || plan.weeks[0]
  const weekIdx = plan.weeks.indexOf(currentWeek)

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <h3 className="font-serif font-bold text-lg mb-1">Vista previa — lo que ve el cliente</h3>
        <p className="text-xs text-muted">Semana activa: <span className="font-semibold text-ink">{currentWeek.label}</span> {currentWeek.rpe && `· ${currentWeek.rpe}`}</p>
      </div>
      {currentWeek.days.map((day, di) => {
        const dayKey = `w${weekIdx}_d${di}`
        const done = day.exercises.filter((_, ri) => logs[`ex_${dayKey}_r${ri}`]?.done).length
        const total = day.exercises.length
        const pct = total ? Math.round(done / total * 100) : 0
        return (
          <div key={di} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                pct === 100 ? 'bg-ok text-white' : pct > 0 ? 'bg-accent/10 text-accent' : 'bg-bg-alt text-muted'
              }`}>{pct === 100 ? '✓' : `${pct}%`}</div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{day.title}</p>
                {day.focus && <p className="text-xs text-muted">{day.focus}</p>}
              </div>
              <span className="text-xs text-muted">{done}/{total}</span>
            </div>
            <div className="divide-y divide-border">
              {day.exercises.map((ex, ri) => {
                const log = logs[`ex_${dayKey}_r${ri}`]
                return (
                  <div key={ri} className={`flex items-center gap-3 px-4 py-2.5 ${log?.done ? 'opacity-50' : ''}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${log?.done ? 'bg-ok text-white' : 'bg-bg-alt text-muted'}`}>
                      {log?.done ? '✓' : ri + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ex.name}</p>
                      <p className="text-xs text-muted">{ex.sets}{ex.weight ? ` · ${ex.weight}` : ''}</p>
                    </div>
                    {ex.isMain && <span className="text-[10px] text-accent font-bold">PRINCIPAL</span>}
                    {log?.sets && Object.keys(log.sets).length > 0 && (
                      <div className="flex gap-1">
                        {Object.values(log.sets).slice(0, 4).map((s, si) => (
                          <span key={si} className="text-[9px] bg-ok/10 text-ok px-1.5 py-0.5 rounded font-medium">
                            {s.weight}×{s.reps}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Historial de entrenos ─────────────────────────────────
function EntrenosTab({ logs, plan }: { logs: TrainingLogs; plan: TrainingPlan | null }) {
  const byDate: Record<string, { exName: string; sets: any; key: string }[]> = {}

  Object.entries(logs).forEach(([key, log]) => {
    if (!log.dateDone) return
    const m = key.match(/ex_w(\d+)_d(\d+)_r(\d+)/)
    if (!m) return
    const wi = parseInt(m[1]), di = parseInt(m[2]), ri = parseInt(m[3])
    const exName = plan?.weeks?.[wi]?.days?.[di]?.exercises?.[ri]?.name || key
    if (!byDate[log.dateDone]) byDate[log.dateDone] = []
    byDate[log.dateDone].push({ exName, sets: log.sets, key })
  })

  const dates = Object.keys(byDate).sort().reverse()

  if (!dates.length) return (
    <div className="text-center py-16 text-muted">
      <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-serif text-lg">Sin entrenamientos registrados</p>
      <p className="text-sm mt-1">El cliente aún no ha completado ningún ejercicio.</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-serif font-bold text-lg">Historial de entrenos</h3>
        <p className="text-xs text-muted mt-0.5">{dates.length} días con actividad</p>
      </div>
      {dates.map(fecha => {
        const items = byDate[fecha]
        const fmtFecha = new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
        return (
          <div key={fecha} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-bg-alt/30">
              <CheckCircle2 className="w-4 h-4 text-ok flex-shrink-0" />
              <p className="text-sm font-semibold capitalize">{fmtFecha}</p>
              <span className="ml-auto text-xs text-muted">{items.length} ejercicios</span>
            </div>
            <div className="divide-y divide-border">
              {items.map(({ exName, sets, key }) => {
                const setsArr = Object.values(sets || {}) as any[]
                const mejor = setsArr.reduce((max: number, s: any) => Math.max(max, parseFloat(s.weight) || 0), 0)
                return (
                  <div key={key} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-7 h-7 rounded-lg bg-bg flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-3.5 h-3.5 text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{exName}</p>
                      <div className="flex gap-1.5 mt-0.5 flex-wrap">
                        {setsArr.map((s: any, si: number) => (
                          <span key={si} className="text-[9px] bg-bg-alt text-muted px-1.5 py-0.5 rounded font-medium">
                            {s.weight}kg × {s.reps}
                          </span>
                        ))}
                      </div>
                    </div>
                    {mejor > 0 && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-accent">{mejor} kg</p>
                        <p className="text-[9px] text-muted">mejor</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Encuesta ──────────────────────────────────────────────
function EncuestaTab({ client, plan, onChange }: { client: ClientData; plan: TrainingPlan | null; onChange: (p: TrainingPlan) => void }) {
  const [preguntas, setPreguntas] = useState<string[]>(
    (plan as any)?.encuesta?.preguntas || [
      '¿Cómo te has sentido esta semana en los entrenamientos?',
      '¿Has tenido alguna molestia o dolor?',
      '¿Estás descansando bien?',
      '¿Cómo ha ido la dieta?',
    ]
  )
  const [nueva, setNueva] = useState('')

  const addPregunta = () => {
    const t = nueva.trim(); if (!t) return
    setPreguntas(p => [...p, t]); setNueva('')
  }

  const deletePregunta = (i: number) => setPreguntas(p => p.filter((_, idx) => idx !== i))

  const copiarEnlace = () => {
    const url = `${window.location.origin}?c=${client.token}&encuesta=1`
    navigator.clipboard.writeText(url)
    toast('Enlace de encuesta copiado ✓', 'ok')
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h3 className="font-serif font-bold text-lg mb-1">Encuesta semanal</h3>
        <p className="text-xs text-muted">Configura las preguntas que verá el cliente. Comparte el enlace para que la rellene.</p>
      </div>

      <div className="space-y-2">
        {preguntas.map((p, i) => (
          <div key={i} className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3">
            <span className="text-xs font-bold text-muted w-5 flex-shrink-0">{i + 1}.</span>
            <p className="text-sm flex-1">{p}</p>
            <button onClick={() => deletePregunta(i)} className="p-1 text-muted hover:text-warn transition-colors flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input type="text" placeholder="Nueva pregunta..." value={nueva}
          onChange={e => setNueva(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addPregunta()}
          className="flex-1 px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        />
        <button onClick={addPregunta}
          className="px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity flex-shrink-0"
        >+ Añadir</button>
      </div>

      <button onClick={copiarEnlace}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-accent text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-opacity"
      >
        <MessageSquare className="w-4 h-4" /> Copiar enlace de encuesta
      </button>
    </div>
  )
}

// ── Notas privadas ────────────────────────────────────────
function NotasTab({ plan, onChange }: { plan: TrainingPlan | null; onChange: (p: TrainingPlan) => void }) {
  if (!plan) return null
  const TAGS = ['⚠️ Lesión', '🔥 Alta intensidad', '🐢 Progreso lento', '⭐ Cliente VIP', '📞 Llamar esta semana']
  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <h3 className="font-serif font-bold text-lg mb-1">Notas privadas</h3>
        <p className="text-xs text-muted mb-3">Solo las ves tú. El cliente no tiene acceso.</p>
        <textarea rows={8} value={plan.coachNotes || ''}
          onChange={e => onChange({ ...plan, coachNotes: e.target.value })}
          placeholder="Ej: Cuidado con la rodilla izquierda. Le cuesta la técnica en sentadilla..."
          className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none leading-relaxed"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {TAGS.map(tag => (
          <button key={tag} onClick={() => onChange({ ...plan, coachNotes: (plan.coachNotes || '') + '\n[' + tag + '] ' })}
            className="px-3 py-1.5 text-xs border border-border rounded-lg hover:border-accent hover:text-accent transition-colors"
          >{tag}</button>
        ))}
      </div>
    </div>
  )
}

// ── Configuración ─────────────────────────────────────────
function ConfigTab({ client, plan, onChange }: { client: ClientData; plan: TrainingPlan | null; onChange: (p: TrainingPlan) => void }) {
  if (!plan) return null
  return (
    <div className="space-y-5 max-w-lg">
      <h3 className="font-serif font-bold text-lg">Configuración</h3>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-semibold">Tiempos de descanso</h4>
        {([['restMain', 'Principal (seg)'], ['restAcc', 'Accesorio (seg)'], ['restWarn', 'Aviso (seg)']] as const).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <label className="text-sm text-muted">{label}</label>
            <input type="number" value={plan[key]}
              onChange={e => onChange({ ...plan, [key]: Number(e.target.value) })}
              className="w-24 text-center px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h4 className="text-sm font-semibold">Mensaje al cliente</h4>
        <textarea rows={3} value={plan.message || ''}
          onChange={e => onChange({ ...plan, message: e.target.value })}
          placeholder="Mensaje motivacional que verá el cliente en su panel..."
          className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h4 className="text-sm font-semibold">Acceso del cliente</h4>
        <div className="flex gap-2">
          <input readOnly value={`${window.location.origin}?c=${client.token}`}
            className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-xs text-muted outline-none font-mono"
          />
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?c=${client.token}`); toast('Copiado ✓', 'ok') }}>
            Copiar
          </Button>
        </div>
        <button onClick={() => {
          const url = `${window.location.origin}?c=${client.token}`
          const msg = encodeURIComponent(`Hola ${client.name} 👋\n\nTe comparto tu panel:\n\n${url}\n\n💪`)
          window.open(`https://wa.me/?text=${msg}`, '_blank')
        }} className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
          📱 Enviar por WhatsApp
        </button>
      </div>
    </div>
  )
}
