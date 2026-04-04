import { useState, useEffect, useRef } from 'react'
import {
  X, Save, ChevronLeft, FileText, Dumbbell, Settings,
  ClipboardList, StickyNote, Eye, TrendingUp, MessageSquare,
  CheckCircle2, ClipboardCheck, Camera
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ClientData, TrainingPlan, TrainingLogs, UserProfile, TrainingTemplate } from '../../types'
import { Button } from '../shared/Button'
import { Modal } from '../shared/Modal'
import { toast } from '../shared/Toast'
import { DietEditor } from '../shared/DietEditor'
import { useExerciseLibrary } from '../../hooks/useExerciseLibrary'
import { PlanRow, RegistroRow } from '../../lib/supabase-types'
import { logError } from '../../lib/errors'

type Tab = 'plan' | 'dieta' | 'vista' | 'entrenos' | 'progreso' | 'notas' | 'config'

interface Props {
  client: ClientData
  userProfile: UserProfile
  allClients: ClientData[]
  onClose: () => void
}

const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: 'plan',     icon: Dumbbell,       label: 'Plan' },
  { id: 'dieta',    icon: FileText,       label: 'Dieta' },
  { id: 'vista',    icon: Eye,            label: 'Vista' },
  { id: 'entrenos', icon: ClipboardList,  label: 'Entrenos' },
  { id: 'progreso', icon: TrendingUp,     label: 'Progreso' },
  { id: 'notas',    icon: StickyNote,     label: 'Notas' },
  { id: 'config',   icon: Settings,       label: 'Config' },
]

function loadTemplates(trainerId: string): TrainingTemplate[] {
  try { return JSON.parse(localStorage.getItem(`pf_templates_${trainerId}`) || '[]') } catch { return [] }
}

type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export function ClientPanel({ client, userProfile, allClients, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('plan')
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [logs, setLogs] = useState<TrainingLogs>({})
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [showTemplates, setShowTemplates] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardTemplate, setWizardTemplate] = useState<TrainingTemplate | null>(null)
  const [wizardFechaInicio, setWizardFechaInicio] = useState(new Date().toISOString().split('T')[0])
  const [wizardAutoWelcome, setWizardAutoWelcome] = useState(true)
  const [wizardAutoCheckin, setWizardAutoCheckin] = useState(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  const pendingPlan = useRef<TrainingPlan | null>(null)
  const library = useExerciseLibrary(userProfile.uid)
  const otherClients = allClients.filter(c => c.id !== client.id)
  const templates = loadTemplates(userProfile.uid)

  useEffect(() => { loadData() }, [client.id])

  const loadData = async () => {
    setLoading(true)
    const { data: planData, error: planErr } = await supabase
      .from('planes').select('plan').eq('clientId', client.id).maybeSingle()
    if (planErr) logError('loadPlan', planErr)
    const planRow = planData as PlanRow | null
    if (planRow?.plan?.P) setPlan(planRow.plan.P as TrainingPlan)
    else setPlan({ clientId: client.id, type: 'hipertrofia', restMain: 180, restAcc: 90, restWarn: 30, weeks: [] })

    const { data: regData, error: regErr } = await supabase
      .from('registros').select('logs').eq('clientId', client.id).maybeSingle()
    if (regErr) logError('loadRegistros', regErr)
    const regRow = regData as RegistroRow | null
    if (regRow?.logs) setLogs(regRow.logs as TrainingLogs)
    setLoading(false)
  }

  const handlePlanChange = (newPlan: TrainingPlan) => {
    setPlan(newPlan)
    pendingPlan.current = newPlan
    clearTimeout(saveTimer.current)
    setSaveState('pending')
    saveTimer.current = setTimeout(() => savePlan(newPlan), 1500)
  }

  const savePlan = async (planToSave?: TrainingPlan) => {
    const p = planToSave || pendingPlan.current || plan
    if (!p) return
    setSaveState('saving')
    const { error: updateError } = await supabase
      .from('planes')
      .update({ plan: { P: p }, updatedAt: Date.now() })
      .eq('clientId', client.id)
    if (updateError) {
      const { error: insertError } = await supabase
        .from('planes')
        .insert({ clientId: client.id, plan: { P: p }, updatedAt: Date.now() })
      if (insertError) {
        logError('savePlan', insertError)
        setSaveState('error')
        toast('Error al guardar. Reintentando...', 'warn')
        setTimeout(() => savePlan(p), 3000)
        return
      }
    }
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2000)
  }

  const applyTemplate = (template: TrainingTemplate, fechaInicio: string, autoWelcome: boolean, autoCheckin: boolean) => {
    if (!plan) return

    // Calcular qué semana es la actual basándose en la fecha de inicio
    const inicio = new Date(fechaInicio + 'T00:00:00')
    const hoy = new Date()
    const diasDesdeInicio = Math.max(0, Math.floor((hoy.getTime() - inicio.getTime()) / 86400000))
    const semanaActual = Math.min(Math.floor(diasDesdeInicio / 7), template.weeks.length - 1)

    const weeks = JSON.parse(JSON.stringify(template.weeks))
    weeks.forEach((w: any, i: number) => { w.isCurrent = i === semanaActual })

    const newPlan: TrainingPlan = {
      ...plan,
      type: template.type,
      weeks,
      fechaInicio,
      autoCheckin,
    } as any

    setPlan(newPlan)
    savePlan(newPlan)

    // Regla A: mensaje de bienvenida automático
    if (autoWelcome) {
      const url = `${window.location.origin}?c=${client.token}`
      const msg = encodeURIComponent(
        `Hola ${client.name} 👋\n\nTe he asignado tu nuevo programa de entrenamiento. ¡Ya puedes verlo en tu panel!\n\n${url}\n\n💪 ¡Vamos a por ello!`
      )
      setTimeout(() => window.open(`https://wa.me/?text=${msg}`, '_blank'), 500)
    }

    setShowTemplates(false)
    setWizardStep(1)
    setWizardTemplate(null)
    toast(`Plantilla "${template.name}" aplicada ✓`, 'ok')
  }

  const importFromClient = async (clientId: string): Promise<TrainingPlan | null> => {
    const { data } = await supabase.from('planes').select('plan').eq('clientId', clientId).maybeSingle()
    if ((data as any)?.plan?.P?.weeks?.length) return (data as any).plan.P as TrainingPlan
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col animate-fade-in">
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
              <p className="text-[10px] text-muted capitalize">{plan?.type || 'Sin tipo'}</p>
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
            <span className={`text-xs hidden sm:block transition-all ${
              saveState === 'pending' ? 'text-muted' :
              saveState === 'saving'  ? 'text-accent animate-pulse' :
              saveState === 'saved'   ? 'text-ok' :
              saveState === 'error'   ? 'text-warn' : 'opacity-0'
            }`}>
              {saveState === 'pending' ? '...' :
               saveState === 'saving'  ? 'Guardando...' :
               saveState === 'saved'   ? '✓ Guardado' :
               saveState === 'error'   ? '✗ Error' : ''}
            </span>
            <Button size="sm" onClick={() => savePlan()} disabled={saveState === 'saving'} className="gap-1.5">
              <Save className="w-3.5 h-3.5" /><span className="hidden sm:inline">Guardar</span>
            </Button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
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
              <span className="font-semibold">{plan?.weeks?.reduce((a, w) => a + w.days.reduce((b, d) => b + d.exercises.length, 0), 0) || 0}</span>
            </div>
            <div className="flex justify-between"><span className="text-muted">Completados</span>
              <span className="font-semibold text-ok">{Object.values(logs).filter(l => l.done).length}</span>
            </div>
          </div>
          <div className="p-3 mt-auto space-y-2">
            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?c=${client.token}`); toast('Enlace copiado ✓', 'ok') }}
              className="w-full text-[11px] font-semibold text-accent border border-accent/30 rounded-lg py-2 hover:bg-accent/5 transition-colors">
              🔗 Copiar enlace
            </button>
            <button onClick={() => {
              const url = `${window.location.origin}?c=${client.token}`
              const msg = encodeURIComponent(`Hola ${client.name} 👋\n\nTe comparto tu panel:\n\n${url}\n\n💪`)
              window.open(`https://wa.me/?text=${msg}`, '_blank')
            }} className="w-full text-[11px] font-semibold text-[#25D366] border border-[#25D366]/30 rounded-lg py-2 hover:bg-[#25D366]/5 transition-colors">
              📱 WhatsApp
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {[1,2,3].map(i => <div key={i} className="h-8 w-24 bg-card border border-border rounded-lg animate-pulse" />)}
                </div>
                <div className="h-48 bg-card border border-border rounded-2xl animate-pulse" />
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />)}
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'plan' && plan && (
                  <div className="space-y-4">
                    {/* Botón aplicar plantilla */}
                    {templates.length > 0 && (
                      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold">Aplicar plantilla</p>
                          <p className="text-xs text-muted">{templates.length} plantilla{templates.length !== 1 ? 's' : ''} disponible{templates.length !== 1 ? 's' : ''}</p>
                        </div>
                        <button onClick={() => setShowTemplates(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
                          <ClipboardCheck className="w-4 h-4" /> Elegir plantilla
                        </button>
                      </div>
                    )}
                    <TrainingPlanEditor plan={plan} onChange={handlePlanChange}
                      allClients={otherClients} library={library.exercises} onImportFromClient={importFromClient} />
                  </div>
                )}
                {activeTab === 'dieta' && <DietEditor clientId={client.id} isTrainer={true} />}
                {activeTab === 'vista' && <VistaTab plan={plan} logs={logs} />}
                {activeTab === 'entrenos' && <EntrenosTab logs={logs} plan={plan} />}
                {activeTab === 'progreso' && <ProgresoTab client={client} />}                {activeTab === 'notas' && <NotasTab plan={plan} onChange={handlePlanChange} />}
                {activeTab === 'config' && <ConfigTab client={client} plan={plan} onChange={handlePlanChange} />}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Wizard de plantilla — 3 pasos */}
      <Modal open={showTemplates} onClose={() => { setShowTemplates(false); setWizardStep(1); setWizardTemplate(null) }}
        title={wizardStep === 1 ? 'Paso 1 — Elegir plantilla' : wizardStep === 2 ? 'Paso 2 — Calendario' : 'Paso 3 — Automatizaciones'}>
        
        {/* Indicador de pasos */}
        <div className="flex items-center gap-2 mb-4">
          {[1,2,3].map(s => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${s <= wizardStep ? 'bg-ink' : 'bg-border'}`} />
          ))}
        </div>

        {wizardStep === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted">Selecciona la plantilla base para este cliente.</p>
            {templates.map(t => (
              <button key={t.id} onClick={() => { setWizardTemplate(t); setWizardStep(2) }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-bg border border-border rounded-xl hover:border-accent hover:bg-bg-alt transition-all text-left">
                <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted">{t.weeks.length} sem · {t.weeks.reduce((a, w) => a + w.days.length, 0)} días · {t.type}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {wizardStep === 2 && wizardTemplate && (
          <div className="space-y-4">
            <div className="bg-bg border border-border rounded-xl p-3 flex items-center gap-3">
              <ClipboardList className="w-4 h-4 text-accent flex-shrink-0" />
              <p className="text-sm font-semibold">{wizardTemplate.name}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">Fecha de inicio</label>
              <input type="date" value={wizardFechaInicio} onChange={e => setWizardFechaInicio(e.target.value)}
                className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20"
              />
              <p className="text-xs text-muted mt-1.5">
                El sistema activará automáticamente la semana correcta según esta fecha.
                {(() => {
                  const inicio = new Date(wizardFechaInicio + 'T00:00:00')
                  const dias = Math.max(0, Math.floor((new Date().getTime() - inicio.getTime()) / 86400000))
                  const sem = Math.min(Math.floor(dias / 7) + 1, wizardTemplate.weeks.length)
                  return ` Hoy sería la semana ${sem} de ${wizardTemplate.weeks.length}.`
                })()}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setWizardStep(1)} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted">← Atrás</button>
              <button onClick={() => setWizardStep(3)} className="flex-1 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold">Siguiente →</button>
            </div>
          </div>
        )}

        {wizardStep === 3 && wizardTemplate && (
          <div className="space-y-4">
            <p className="text-sm text-muted">Activa las automatizaciones para este cliente.</p>
            <div className="space-y-3">
              {[
                { key: 'welcome', label: 'Mensaje de bienvenida', desc: 'Abre WhatsApp con mensaje al asignar el plan', val: wizardAutoWelcome, set: setWizardAutoWelcome, emoji: '👋' },
                { key: 'checkin', label: 'Check-in semanal', desc: 'Recuérdame enviar encuesta al cerrar cada semana', val: wizardAutoCheckin, set: setWizardAutoCheckin, emoji: '📋' },
              ].map(a => (
                <div key={a.key} className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${a.val ? 'bg-ok/5 border-ok/30' : 'bg-bg border-border'}`}
                  onClick={() => a.set(!a.val)}>
                  <span className="text-xl">{a.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{a.label}</p>
                    <p className="text-xs text-muted">{a.desc}</p>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-all flex items-center ${a.val ? 'bg-ok' : 'bg-border'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-all ${a.val ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setWizardStep(2)} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted">← Atrás</button>
              <button onClick={() => applyTemplate(wizardTemplate, wizardFechaInicio, wizardAutoWelcome, wizardAutoCheckin)}
                className="flex-1 py-2.5 bg-ok text-white rounded-xl text-sm font-bold">✓ Aplicar plan</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── Vista previa ──────────────────────────────────────────
function VistaTab({ plan, logs }: { plan: TrainingPlan | null; logs: TrainingLogs }) {
  if (!plan?.weeks?.length) return (
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
        <p className="text-xs text-muted">Semana: <span className="font-semibold text-ink">{currentWeek.label}</span></p>
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
                    {log?.sets && Object.keys(log.sets).length > 0 && (
                      <div className="flex gap-1 flex-wrap">
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

// ── Historial entrenos ────────────────────────────────────
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
              <p className="text-sm font-semibold capitalize flex-1">{fmtFecha}</p>
              <span className="text-xs text-muted">{items.length} ejercicios</span>
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

// ── Notas ─────────────────────────────────────────────────
function NotasTab({ plan, onChange }: { plan: TrainingPlan | null; onChange: (p: TrainingPlan) => void }) {
  if (!plan) return null
  const TAGS = ['⚠️ Lesión', '🔥 Alta intensidad', '🐢 Progreso lento', '⭐ Cliente VIP', '📞 Llamar esta semana']
  return (
    <div className="space-y-4 max-w-lg">
      <h3 className="font-serif font-bold text-lg mb-1">Notas privadas</h3>
      <p className="text-xs text-muted mb-3">Solo las ves tú.</p>
      <textarea rows={8} value={plan.coachNotes || ''}
        onChange={e => onChange({ ...plan, coachNotes: e.target.value })}
        placeholder="Ej: Cuidado con la rodilla izquierda..."
        className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none leading-relaxed"
      />
      <div className="flex flex-wrap gap-2">
        {TAGS.map(tag => (
          <button key={tag} onClick={() => onChange({ ...plan, coachNotes: (plan.coachNotes || '') + '\n[' + tag + '] ' })}
            className="px-3 py-1.5 text-xs border border-border rounded-lg hover:border-accent hover:text-accent transition-colors">
            {tag}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Config ────────────────────────────────────────────────
function ConfigTab({ client, plan, onChange }: { client: ClientData; plan: TrainingPlan | null; onChange: (p: TrainingPlan) => void }) {
  const [revoking, setRevoking] = useState(false)
  const [newToken, setNewToken] = useState(client.token)
  const [showRevoke, setShowRevoke] = useState(false)
  const [pin, setPin] = useState((plan as any)?.pin || '')
  const [savingPin, setSavingPin] = useState(false)

  const revokeToken = async () => {
    setRevoking(true)
    const token = crypto.randomUUID().replace(/-/g, '')
    const { error } = await supabase.from('clientes').update({ token }).eq('id', client.id)
    if (error) { toast('Error al regenerar enlace', 'warn') }
    else {
      setNewToken(token)
      toast('Enlace regenerado ✓ El enlace anterior ya no funciona.', 'ok')
      setShowRevoke(false)
    }
    setRevoking(false)
  }

  const savePin = () => {
    if (pin && (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin))) {
      toast('El PIN debe ser 4-6 dígitos numéricos', 'warn'); return
    }
    if (!plan) return
    onChange({ ...plan, pin: pin || undefined } as any)
    toast(pin ? 'PIN guardado ✓' : 'PIN eliminado ✓', 'ok')
  }

  const currentUrl = `${window.location.origin}?c=${newToken}`

  if (!plan) return null
  return (
    <div className="space-y-5 max-w-lg">
      <h3 className="font-serif font-bold text-lg">Configuración</h3>

      {/* Tiempos descanso */}
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

      {/* Mensaje */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h4 className="text-sm font-semibold">Mensaje al cliente</h4>
        <textarea rows={3} value={plan.message || ''}
          onChange={e => onChange({ ...plan, message: e.target.value })}
          placeholder="Mensaje motivacional que verá el cliente..."
          className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none"
        />
      </div>

      {/* Acceso y seguridad */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-semibold">Acceso del cliente</h4>

        {/* URL actual */}
        <div className="flex gap-2">
          <input readOnly value={currentUrl}
            className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-xs text-muted outline-none font-mono"
          />
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(currentUrl); toast('Copiado ✓', 'ok') }}>
            Copiar
          </Button>
        </div>

        {/* WhatsApp */}
        <button onClick={() => {
          const msg = encodeURIComponent(`Hola ${client.name} 👋\n\nTe comparto tu panel:\n\n${currentUrl}\n\n💪`)
          window.open(`https://wa.me/?text=${msg}`, '_blank')
        }} className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
          📱 Enviar por WhatsApp
        </button>

        {/* PIN opcional */}
        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">PIN de acceso</p>
              <p className="text-xs text-muted">4-6 dígitos. El cliente lo necesitará para entrar.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input type="number" value={pin} onChange={e => setPin(e.target.value)}
              placeholder="Sin PIN (acceso libre)"
              maxLength={6}
              className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20"
            />
            <Button variant="outline" size="sm" onClick={savePin}>
              {pin ? 'Guardar PIN' : 'Sin PIN'}
            </Button>
          </div>
        </div>

        {/* Revocar enlace */}
        <div className="border-t border-border pt-4 space-y-2">
          <div>
            <p className="text-sm font-semibold text-warn">Revocar enlace actual</p>
            <p className="text-xs text-muted">Genera un nuevo enlace. El anterior dejará de funcionar inmediatamente.</p>
          </div>
          {!showRevoke ? (
            <button onClick={() => setShowRevoke(true)}
              className="w-full py-2.5 border border-warn/30 text-warn rounded-xl text-sm font-semibold hover:bg-warn/5 transition-colors">
              🔒 Regenerar enlace de acceso
            </button>
          ) : (
            <div className="bg-warn/5 border border-warn/20 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-warn">⚠️ ¿Estás seguro?</p>
              <p className="text-xs text-muted">El enlace actual dejará de funcionar. Tendrás que enviar el nuevo al cliente.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowRevoke(false)}
                  className="flex-1 py-2 border border-border rounded-lg text-sm text-muted hover:bg-bg-alt transition-colors">
                  Cancelar
                </button>
                <button onClick={revokeToken} disabled={revoking}
                  className="flex-1 py-2 bg-warn text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {revoking ? 'Regenerando...' : 'Sí, revocar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
