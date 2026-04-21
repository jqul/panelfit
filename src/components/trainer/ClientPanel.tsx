import { useState, useEffect, useRef } from 'react'
import {
  X, Save, ChevronLeft, FileText, Dumbbell, Settings,
  ClipboardList, StickyNote, Eye, TrendingUp, MessageSquare,
  CheckCircle2, ClipboardCheck, Link, MessageCircle,
  LayoutDashboard
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ClientData, TrainingPlan, TrainingLogs, UserProfile, TrainingTemplate } from '../../types'
import { Button } from '../shared/Button'
import { Modal } from '../shared/Modal'
import { toast } from '../shared/Toast'
import { TrainingPlanEditor } from './TrainingPlanEditor'
import { DietEditor } from '../shared/DietEditor'
import { ProgresoTab } from './ProgresoTab'
import { useExerciseLibrary } from '../../hooks/useExerciseLibrary'
import { BLOQUES_POR_ESPECIALIDAD, Especialidad } from '../../lib/especialidades'
import { PlanRow, RegistroRow } from '../../lib/supabase-types'
import { logError } from '../../lib/errors'

type Tab = 'plan' | 'dieta' | 'vista' | 'entrenos' | 'progreso' | 'notas' | 'config'

interface Props {
  client: ClientData
  userProfile: UserProfile
  allClients: ClientData[]
  onClose: () => void
  demoPlan?: any
  demoLogs?: any
}

const TABS: { id: Tab; icon: React.ElementType; label: string; desc: string }[] = [
  { id: 'plan',     icon: Dumbbell,      label: 'Plan',      desc: 'Rutina de entrenamiento' },
  { id: 'dieta',    icon: FileText,      label: 'Dieta',     desc: 'Macros y plan nutricional' },
  { id: 'vista',    icon: Eye,           label: 'Vista',     desc: 'Lo que ve el cliente' },
  { id: 'entrenos', icon: ClipboardList, label: 'Entrenos',  desc: 'Historial de sesiones' },
  { id: 'progreso', icon: TrendingUp,    label: 'Progreso',  desc: 'Métricas y evolución' },
  { id: 'notas',    icon: StickyNote,    label: 'Notas',     desc: 'Notas privadas' },
  { id: 'config',   icon: Settings,      label: 'Config',    desc: 'Acceso y automatizaciones' },
]

function loadTemplates(trainerId: string): TrainingTemplate[] {
  try { return JSON.parse(localStorage.getItem(`pf_templates_${trainerId}`) || '[]') } catch { return [] }
}

type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export function ClientPanel({ client, userProfile, allClients, onClose, demoPlan, demoLogs }: Props) {
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
  const [mobileShowSidebar, setMobileShowSidebar] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  const pendingPlan = useRef<TrainingPlan | null>(null)
  const library = useExerciseLibrary(userProfile.uid)
  const otherClients = allClients.filter(c => c.id !== client.id)
  const templates = loadTemplates(userProfile.uid)
  const trainerEsp: Especialidad[] = (() => {
    try {
      const p = JSON.parse(localStorage.getItem(`pf_trainer_profile_${userProfile.uid}`) || '{}')
      return p.especialidades || []
    } catch { return [] }
  })()

  useEffect(() => { loadData() }, [client.id])

  const loadData = async () => {
    setLoading(true)
    if (demoPlan) { setPlan(demoPlan); if (demoLogs) setLogs(demoLogs); setLoading(false); return }
    const { data: planData, error: planErr } = await supabase.from('planes').select('plan').eq('clientId', client.id).maybeSingle()
    if (planErr) logError('loadPlan', planErr)
    const planRow = planData as PlanRow | null
    if (planRow?.plan?.P) setPlan(planRow.plan.P as TrainingPlan)
    else setPlan({ clientId: client.id, type: 'hipertrofia', restMain: 180, restAcc: 90, restWarn: 30, weeks: [] })
    const { data: regData, error: regErr } = await supabase.from('registros').select('logs').eq('clientId', client.id).maybeSingle()
    if (regErr) logError('loadRegistros', regErr)
    const regRow = regData as RegistroRow | null
    if (regRow?.logs) setLogs(regRow.logs as TrainingLogs)
    setLoading(false)
  }

  const handlePlanChange = (newPlan: TrainingPlan) => {
    setPlan(newPlan); pendingPlan.current = newPlan
    clearTimeout(saveTimer.current); setSaveState('pending')
    saveTimer.current = setTimeout(() => savePlan(newPlan), 1500)
  }

  const savePlan = async (planToSave?: TrainingPlan) => {
    const p = planToSave || pendingPlan.current || plan; if (!p) return
    setSaveState('saving')
    if (demoPlan !== undefined) { setSaveState('saved'); setTimeout(() => setSaveState('idle'), 2000); return }
    const { error: updateError } = await supabase.from('planes').update({ plan: { P: p }, updatedAt: Date.now() }).eq('clientId', client.id)
    if (updateError) {
      const { error: insertError } = await supabase.from('planes').insert({ clientId: client.id, plan: { P: p }, updatedAt: Date.now() })
      if (insertError) { logError('savePlan', insertError); setSaveState('error'); return }
    }
    setSaveState('saved'); setTimeout(() => setSaveState('idle'), 2000)
  }

  const applyTemplate = (template: TrainingTemplate, fechaInicio: string, autoWelcome: boolean, autoCheckin: boolean) => {
    if (!plan) return
    const inicio = new Date(fechaInicio + 'T00:00:00')
    const dias = Math.max(0, Math.floor((new Date().getTime() - inicio.getTime()) / 86400000))
    const semanaActual = Math.min(Math.floor(dias / 7), template.weeks.length - 1)
    const weeks = JSON.parse(JSON.stringify(template.weeks))
    weeks.forEach((w: any, i: number) => { w.isCurrent = i === semanaActual })
    const newPlan: TrainingPlan = { ...plan, type: template.type, weeks, fechaInicio, autoCheckin } as any
    setPlan(newPlan); savePlan(newPlan)
    if (autoWelcome) {
      const url = `${window.location.origin}?c=${client.token}`
      const msg = encodeURIComponent(`Hola ${client.name} 👋\n\nTe he asignado tu nuevo programa. Ya puedes verlo:\n\n${url}\n\n💪`)
      setTimeout(() => window.open(`https://wa.me/?text=${msg}`, '_blank'), 500)
    }
    setShowTemplates(false); setWizardStep(1); setWizardTemplate(null)
    toast(`Plantilla "${template.name}" aplicada ✓`, 'ok')
  }

  const importFromClient = async (clientId: string): Promise<TrainingPlan | null> => {
    const { data } = await supabase.from('planes').select('plan').eq('clientId', clientId).maybeSingle()
    if ((data as any)?.plan?.P?.weeks?.length) return (data as any).plan.P as TrainingPlan
    return null
  }

  const clientUrl = `${window.location.origin}?c=${client.token}`
  const totalExs = plan?.weeks?.reduce((a, w) => a + w.days.reduce((b, d) => b + d.exercises.length, 0), 0) || 0
  const completedExs = Object.values(logs).filter(l => l.done).length
  const activeWeek = plan?.weeks?.find(w => w.isCurrent) || plan?.weeks?.[0]
  const adherencia = plan?.weeks?.length
    ? Math.round(completedExs / Math.max(totalExs, 1) * 100)
    : 0

  return (
    <div className="fixed inset-0 z-50 bg-bg flex overflow-hidden" style={{flexDirection:'row'}}>

      {/* ── SIDEBAR IZQUIERDO ── */}
      {/* Overlay móvil */}
      {mobileShowSidebar && (
        <div className="fixed inset-0 bg-ink/40 z-10 lg:hidden" onClick={() => setMobileShowSidebar(false)} />
      )}
      <aside className={`flex-shrink-0 bg-card border-r border-border flex flex-col transition-all z-20 ${
        mobileShowSidebar ? 'fixed inset-y-0 left-0 w-64' : 'hidden lg:flex lg:w-56'
      }`}>
        {/* Back + nombre */}
        <div className="px-4 py-4 border-b border-border">
          <button onClick={onClose} className="flex items-center gap-2 text-muted hover:text-ink transition-colors mb-3 text-sm">
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center font-serif text-lg text-accent font-bold flex-shrink-0">
              {client.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{client.name} {client.surname}</p>
              <p className="text-[10px] text-muted capitalize truncate">{plan?.type || 'Sin tipo'}</p>
            </div>
          </div>
        </div>

        {/* Stats cliente */}
        <div className="px-4 py-3 border-b border-border grid grid-cols-2 gap-2">
          {[
            { label: 'Semanas', value: plan?.weeks?.length || 0 },
            { label: 'Ejercicios', value: totalExs },
            { label: 'Completados', value: completedExs },
            { label: 'Adherencia', value: `${adherencia}%` },
          ].map(s => (
            <div key={s.label} className="bg-bg rounded-xl p-2 text-center">
              <p className="font-serif font-bold text-base text-ink">{s.value}</p>
              <p className="text-[9px] text-muted uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Nav tabs vertical */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {TABS.map(({ id, icon: Icon, label, desc }) => (
            <button key={id} onClick={() => { setActiveTab(id); setMobileShowSidebar(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                activeTab === id
                  ? 'bg-ink text-white'
                  : 'text-muted hover:bg-bg-alt hover:text-ink'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{label}</p>
                <p className={`text-[10px] leading-tight truncate ${activeTab === id ? 'text-white/60' : 'text-muted'}`}>{desc}</p>
              </div>
            </button>
          ))}
        </nav>

        {/* Acciones rápidas */}
        <div className="p-3 border-t border-border space-y-2">
          <button onClick={() => { navigator.clipboard.writeText(clientUrl); toast('Enlace copiado ✓', 'ok') }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-muted border border-border rounded-xl hover:border-accent hover:text-accent transition-colors">
            <Link className="w-3.5 h-3.5" /> Copiar enlace
          </button>
          <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Hola ${client.name} 👋\n\nTe comparto tu panel:\n\n${clientUrl}\n\n💪`)}`, '_blank')}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-[#25D366] border border-[#25D366]/30 rounded-xl hover:bg-[#25D366]/5 transition-colors">
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </button>
        </div>
      </aside>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-card border-b border-border flex-shrink-0 h-14 flex items-center justify-between px-3 lg:px-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileShowSidebar(true)} className="lg:hidden p-2 rounded-lg hover:bg-bg-alt text-muted">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div>
              <h2 className="text-sm font-bold">{TABS.find(t => t.id === activeTab)?.label}</h2>
              <p className="text-[10px] text-muted">{TABS.find(t => t.id === activeTab)?.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs transition-all ${
              saveState === 'saving' ? 'text-accent animate-pulse' :
              saveState === 'saved'  ? 'text-ok' :
              saveState === 'error'  ? 'text-warn' : 'opacity-0'
            }`}>
              {saveState === 'saving' ? 'Guardando...' : saveState === 'saved' ? '✓ Guardado' : saveState === 'error' ? '✗ Error' : '·'}
            </span>
            {activeTab === 'plan' && templates.length > 0 && (
              <button onClick={() => setShowTemplates(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-muted hover:border-accent hover:text-accent transition-colors">
                <ClipboardCheck className="w-3.5 h-3.5" /> Plantilla
              </button>
            )}
            <Button size="sm" onClick={() => savePlan()} disabled={saveState === 'saving'} className="gap-1.5">
              <Save className="w-3.5 h-3.5" /> Guardar
            </Button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Contenido tab */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="p-6 space-y-4">
              <div className="h-8 w-48 bg-card border border-border rounded-lg animate-pulse" />
              <div className="h-48 bg-card border border-border rounded-2xl animate-pulse" />
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />)}</div>
            </div>
          ) : (
            <div className="p-6 flex-1 overflow-hidden flex flex-col min-h-0">
              {activeTab === 'plan' && plan && (
                <div className="flex-1 overflow-hidden">
                  <TrainingPlanEditor plan={plan} onChange={handlePlanChange}
                    allClients={otherClients} library={library.exercises} onImportFromClient={importFromClient}
                    logs={logs} clientName={`${client.name} ${client.surname}`} />
                </div>
              )}
              {activeTab === 'dieta' && (
                <div className="flex-1 overflow-hidden min-h-0">
                  <DietaTabEntrenador clientId={client.id} plan={plan} onChange={handlePlanChange} client={client} trainerId={userProfile.uid} />
                </div>
              )}
              {activeTab === 'vista' && <div className="flex-1 overflow-y-auto"><VistaTab plan={plan} logs={logs} /></div>}
              {activeTab === 'entrenos' && <div className="flex-1 overflow-y-auto"><EntrenosTab logs={logs} plan={plan} /></div>}
              {activeTab === 'progreso' && <div className="flex-1 overflow-y-auto"><ProgresoTab client={client} logs={logs} plan={plan} /></div>}
              {activeTab === 'notas' && <div className="flex-1 overflow-y-auto"><NotasTab plan={plan} onChange={handlePlanChange} /></div>}
              {activeTab === 'config' && <div className="flex-1 overflow-y-auto"><ConfigTab client={client} plan={plan} onChange={handlePlanChange} /></div>}
            </div>
          )}
        </main>
      </div>

      {/* Wizard plantilla */}
      <Modal open={showTemplates} onClose={() => { setShowTemplates(false); setWizardStep(1); setWizardTemplate(null) }}
        title={wizardStep === 1 ? 'Elegir plantilla' : wizardStep === 2 ? 'Fecha de inicio' : 'Automatizaciones'}>
        <div className="flex gap-1.5 mb-5">
          {[1,2,3].map(s => <div key={s} className={`flex-1 h-1 rounded-full transition-all ${s <= wizardStep ? 'bg-ink' : 'bg-border'}`} />)}
        </div>

        {wizardStep === 1 && (
          <div className="space-y-2">
            <p className="text-sm text-muted mb-3">Selecciona la plantilla base para este cliente.</p>
            {templates.map(t => (
              <button key={t.id} onClick={() => { setWizardTemplate(t); setWizardStep(2) }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-bg border border-border rounded-xl hover:border-accent text-left transition-all">
                <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted">{t.weeks.length} sem · {t.type}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {wizardStep === 2 && wizardTemplate && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">Fecha de inicio</label>
              <input type="date" value={wizardFechaInicio} onChange={e => setWizardFechaInicio(e.target.value)}
                className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
              <p className="text-xs text-muted mt-1.5">
                {(() => {
                  const inicio = new Date(wizardFechaInicio + 'T00:00:00')
                  const dias = Math.max(0, Math.floor((new Date().getTime() - inicio.getTime()) / 86400000))
                  const sem = Math.min(Math.floor(dias / 7) + 1, wizardTemplate.weeks.length)
                  return `Hoy sería la semana ${sem} de ${wizardTemplate.weeks.length}.`
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
            <div className="space-y-2">
              {[
                { label: 'Mensaje de bienvenida', desc: 'Abre WhatsApp al asignar el plan', val: wizardAutoWelcome, set: setWizardAutoWelcome, emoji: '👋' },
                { label: 'Check-in semanal', desc: 'Recordatorio de encuesta semanal', val: wizardAutoCheckin, set: setWizardAutoCheckin, emoji: '📋' },
              ].map(a => (
                <div key={a.label} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${a.val ? 'bg-ok/5 border-ok/30' : 'bg-bg border-border'}`}
                  onClick={() => a.set(!a.val)}>
                  <span className="text-xl">{a.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{a.label}</p>
                    <p className="text-xs text-muted">{a.desc}</p>
                  </div>
                  <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-all ${a.val ? 'bg-ok' : 'bg-border'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-all ${a.val ? 'translate-x-4' : 'translate-x-0'}`} />
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

function VistaTab({ plan, logs }: { plan: TrainingPlan | null; logs: TrainingLogs }) {
  if (!plan?.weeks?.length) return (
    <div className="text-center py-16 text-muted">
      <Eye className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-serif text-lg">Sin plan asignado</p>
    </div>
  )
  const currentWeek = plan.weeks.find(w => w.isCurrent) || plan.weeks[0]
  const weekIdx = plan.weeks.indexOf(currentWeek)
  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h3 className="font-serif font-bold text-lg">Vista del cliente</h3>
        <p className="text-xs text-muted mt-0.5">Semana activa: <span className="font-semibold text-ink">{currentWeek.label}</span></p>
      </div>
      {currentWeek.days.map((day, di) => {
        const dayKey = `w${weekIdx}_d${di}`
        const done = day.exercises.filter((_, ri) => logs[`ex_${dayKey}_r${ri}`]?.done).length
        const total = day.exercises.length
        const pct = total ? Math.round(done / total * 100) : 0
        return (
          <div key={di} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${pct === 100 ? 'bg-ok text-white' : 'bg-bg-alt text-muted'}`}>
                {pct === 100 ? '✓' : `${pct}%`}
              </div>
              <div className="flex-1"><p className="font-semibold text-sm">{day.title}</p>{day.focus && <p className="text-xs text-muted">{day.focus}</p>}</div>
              <span className="text-xs text-muted">{done}/{total}</span>
            </div>
            <div className="divide-y divide-border">
              {day.exercises.map((ex, ri) => {
                const log = logs[`ex_${dayKey}_r${ri}`]
                return (
                  <div key={ri} className={`flex items-center gap-3 px-4 py-2.5 ${log?.done ? 'opacity-50' : ''}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${log?.done ? 'bg-ok text-white' : 'bg-bg-alt text-muted'}`}>{log?.done ? '✓' : ri + 1}</div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{ex.name}</p><p className="text-xs text-muted">{ex.sets}{ex.weight ? ` · ${ex.weight}` : ''}</p></div>
                    {log?.sets && Object.keys(log.sets).length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {Object.values(log.sets).slice(0, 4).map((s, si) => (
                          <span key={si} className="text-[9px] bg-ok/10 text-ok px-1.5 py-0.5 rounded font-medium">{s.weight}×{s.reps}</span>
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
      <p className="font-serif text-lg">Sin entrenamientos aún</p>
    </div>
  )
  return (
    <div className="max-w-2xl space-y-4">
      <div><h3 className="font-serif font-bold text-lg">Historial</h3><p className="text-xs text-muted">{dates.length} días con actividad</p></div>
      {dates.map(fecha => {
        const items = byDate[fecha]
        return (
          <div key={fecha} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-bg-alt/30">
              <CheckCircle2 className="w-4 h-4 text-ok flex-shrink-0" />
              <p className="text-sm font-semibold capitalize flex-1">{new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              <span className="text-xs text-muted">{items.length} ejercicios</span>
            </div>
            <div className="divide-y divide-border">
              {items.map(({ exName, sets, key }) => {
                const setsArr = Object.values(sets || {}) as any[]
                const mejor = setsArr.reduce((max: number, s: any) => Math.max(max, parseFloat(s.weight) || 0), 0)
                return (
                  <div key={key} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-7 h-7 rounded-lg bg-bg flex items-center justify-center flex-shrink-0"><Dumbbell className="w-3.5 h-3.5 text-muted" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{exName}</p>
                      <div className="flex gap-1.5 mt-0.5 flex-wrap">
                        {setsArr.map((s: any, si: number) => <span key={si} className="text-[9px] bg-bg-alt text-muted px-1.5 py-0.5 rounded">{s.weight}kg×{s.reps}</span>)}
                      </div>
                    </div>
                    {mejor > 0 && <div className="text-right flex-shrink-0"><p className="text-xs font-bold text-accent">{mejor}kg</p><p className="text-[9px] text-muted">mejor</p></div>}
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

function NotasTab({ plan, onChange }: { plan: TrainingPlan | null; onChange: (p: TrainingPlan) => void }) {
  if (!plan) return null
  const TAGS = ['⚠️ Lesión', '🔥 Alta intensidad', '🐢 Progreso lento', '⭐ Cliente VIP', '📞 Llamar esta semana']
  return (
    <div className="max-w-lg space-y-4">
      <div><h3 className="font-serif font-bold text-lg">Notas privadas</h3><p className="text-xs text-muted">Solo las ves tú.</p></div>
      <textarea rows={10} value={plan.coachNotes || ''} onChange={e => onChange({ ...plan, coachNotes: e.target.value })}
        placeholder="Ej: Cuidado con la rodilla izquierda..."
        className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none leading-relaxed" />
      <div className="flex flex-wrap gap-2">
        {TAGS.map(tag => (
          <button key={tag} onClick={() => onChange({ ...plan, coachNotes: (plan.coachNotes || '') + '\n[' + tag + '] ' })}
            className="px-3 py-1.5 text-xs border border-border rounded-lg hover:border-accent hover:text-accent transition-colors">{tag}</button>
        ))}
      </div>
    </div>
  )
}

function ConfigTab({ client, plan, onChange }: { client: ClientData; plan: TrainingPlan | null; onChange: (p: TrainingPlan) => void }) {
  const [revoking, setRevoking] = useState(false)
  const [newToken, setNewToken] = useState(client.token)
  const [showRevoke, setShowRevoke] = useState(false)
  const [pin, setPin] = useState((plan as any)?.pin || '')

  const revokeToken = async () => {
    setRevoking(true)
    const token = crypto.randomUUID().replace(/-/g, '')
    const { error } = await supabase.from('clientes').update({ token }).eq('id', client.id)
    if (error) toast('Error al regenerar enlace', 'warn')
    else { setNewToken(token); toast('Enlace regenerado ✓', 'ok'); setShowRevoke(false) }
    setRevoking(false)
  }

  const currentUrl = `${window.location.origin}?c=${newToken}`
  if (!plan) return null

  return (
    <div className="max-w-lg space-y-5">
      <h3 className="font-serif font-bold text-lg">Configuración</h3>

      {/* Automatizaciones */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div><h4 className="text-sm font-semibold">Automatizaciones</h4><p className="text-xs text-muted mt-0.5">Acciones automáticas para este cliente</p></div>
        {[
          { key: 'autoWelcome', label: 'Mensaje de bienvenida', desc: 'WhatsApp al asignar un plan nuevo', emoji: '👋' },
          { key: 'autoCheckin', label: 'Check-in semanal', desc: 'Recordatorio de encuesta al cerrar semana', emoji: '📋' },
          { key: 'autoInactividad', label: 'Alerta de inactividad', desc: '+3 días sin entrenar → WhatsApp', emoji: '⚠️' },
        ].map(a => (
          <div key={a.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${(plan as any)[a.key] ? 'bg-ok/5 border-ok/30' : 'bg-bg border-border'}`}
            onClick={() => onChange({ ...plan, [a.key]: !(plan as any)[a.key] } as TrainingPlan)}>
            <span className="text-lg">{a.emoji}</span>
            <div className="flex-1"><p className="text-sm font-semibold">{a.label}</p><p className="text-xs text-muted">{a.desc}</p></div>
            <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-all ${(plan as any)[a.key] ? 'bg-ok' : 'bg-border'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-all ${(plan as any)[a.key] ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Tiempos de descanso eliminados — ahora se configuran por ejercicio en el plan */}

      {/* Mensaje */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h4 className="text-sm font-semibold">Mensaje al cliente</h4>
        <textarea rows={3} value={plan.message || ''} onChange={e => onChange({ ...plan, message: e.target.value })}
          placeholder="Mensaje motivacional..." className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none" />
      </div>

      {/* Acceso */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-semibold">Acceso del cliente</h4>
        <div className="flex gap-2">
          <input readOnly value={currentUrl} className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-xs text-muted outline-none font-mono" />
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(currentUrl); toast('Copiado ✓', 'ok') }}>Copiar</Button>
        </div>
        <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Hola ${client.name} 👋\n\n${currentUrl}\n\n💪`)}`, '_blank')}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white rounded-xl text-sm font-bold hover:opacity-90">
          📱 Enviar por WhatsApp
        </button>
        {!showRevoke ? (
          <button onClick={() => setShowRevoke(true)} className="w-full py-2.5 border border-warn/30 text-warn rounded-xl text-sm font-semibold hover:bg-warn/5">🔒 Regenerar enlace</button>
        ) : (
          <div className="bg-warn/5 border border-warn/20 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-warn">⚠️ El enlace actual dejará de funcionar</p>
            <div className="flex gap-2">
              <button onClick={() => setShowRevoke(false)} className="flex-1 py-2 border border-border rounded-lg text-sm text-muted">Cancelar</button>
              <button onClick={revokeToken} disabled={revoking} className="flex-1 py-2 bg-warn text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                {revoking ? 'Regenerando...' : 'Sí, revocar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DietaTabEntrenador({ clientId, plan, onChange, client, trainerId }: { clientId: string; plan: TrainingPlan | null; onChange: (p: TrainingPlan) => void; client: ClientData; trainerId: string }) {
  const [subtab, setSubtab] = useState<'macros' | 'plan'>('macros')
  const macros = (plan as any)?.macros || { kcal: 0, protein: 0, carbs: 0, fats: 0, notaMacros: '' }
  const updateMacros = (updates: any) => { if (!plan) return; onChange({ ...plan, macros: { ...macros, ...updates } } as any) }

  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null)
  const [showCalc, setShowCalc] = useState(false)
  const [peso, setPeso] = useState(String(client.weight || ''))
  const [altura, setAltura] = useState('')
  const [edad, setEdad] = useState('')
  const [sexo, setSexo] = useState<'h' | 'm'>('h')
  const [actividad, setActividad] = useState(1.55)
  const [objetivo, setObjetivo] = useState<'deficit' | 'mantenimiento' | 'superavit'>('superavit')
  const [ratio, setRatio] = useState(2.0)

  const [dist, setDist] = useState<{ label: string; icon: string; pct: number; time?: string }[]>(
    (plan as any)?.macros?.dist || [
      { label: 'Desayuno', icon: '🌅', pct: 25, time: '08:00' },
      { label: 'Media mañana', icon: '🍎', pct: 15, time: '11:00' },
      { label: 'Comida', icon: '🍽️', pct: 35, time: '14:00' },
      { label: 'Cena', icon: '🌙', pct: 25, time: '20:30' },
    ]
  )
  const [sups, setSups] = useState<{ name: string; desc: string; visible: boolean }[]>(
    (plan as any)?.macros?.sups || [
      { name: 'Creatina', desc: 'Consume 5g de creatina diarios', visible: true },
      { name: 'Proteína Whey', desc: 'Consume cuando no llegues a proteína', visible: true },
      { name: 'Omega-3', desc: 'Consume un aporte de omega-3', visible: false },
    ]
  )
  const [showSups, setShowSups] = useState<boolean>((plan as any)?.macros?.showSups || false)
  const [openDist, setOpenDist] = useState(false)
  const [openSups, setOpenSups] = useState(false)
  const [equivs, setEquivs] = useState<{ food: string; per100: number }[]>(
    (plan as any)?.macros?.equivs || [
      { food: 'Pechuga de pollo', per100: 31 },
      { food: 'Pechuga collo', per100: 12 },
      { food: 'Pechuga', per100: 12 },
      { food: 'Pechuga de pollo', per100: 12 },
    ]
  )

  const saveSidePanel = () => { updateMacros({ dist, sups, showSups, equivs }); toast('Guardado ✓', 'ok') }

  const calcMacros = () => {
    const p = parseFloat(peso)
    const h = parseFloat(altura)
    const e = parseFloat(edad)
    if (isNaN(p) || p <= 0) { toast('Introduce el peso', 'warn'); return }
    if (isNaN(h) || h <= 0) { toast('Introduce la altura', 'warn'); return }
    if (isNaN(e) || e <= 0) { toast('Introduce la edad', 'warn'); return }
    const tmb = sexo === 'h' ? 88.362+(13.397*p)+(4.799*h)-(5.677*e) : 447.593+(9.247*p)+(3.098*h)-(4.330*e)
    const tdee = Math.round(tmb * actividad)
    const kcalObj = objetivo === 'deficit' ? tdee-400 : objetivo === 'superavit' ? tdee+300 : tdee
    const protG = Math.round(p * ratio); const fatG = Math.round(p * 1.0)
    const carbsG = Math.max(0, Math.round((kcalObj - protG*4 - fatG*9) / 4))
    updateMacros({ kcal: kcalObj, protein: protG, carbs: carbsG, fats: fatG })
    toast('Macros calculados ✓', 'ok')
  }

  const COLORS = { protein: '#c0392b', carbs: '#c49a00', fats: '#4a7c59' }
  const total = (macros.protein*4) + (macros.carbs*4) + (macros.fats*9)
  const slices = total > 0 ? [
    { label: 'Proteína', val: macros.protein*4, color: COLORS.protein, g: macros.protein },
    { label: 'Carbos',   val: macros.carbs*4,   color: COLORS.carbs,   g: macros.carbs },
    { label: 'Grasas',   val: macros.fats*9,    color: COLORS.fats,    g: macros.fats },
  ] : []

  // Donut grande centrado con etiquetas flotantes
  const DonutChart = () => {
    const W = 220; const cx = 110; const cy = 110; const r = 90; const ri = 58
    if (!slices.length) return (
      <div style={{width:W,height:W,borderRadius:'50%',border:'4px dashed #e5e2dc',display:'flex',alignItems:'center',justifyContent:'center',color:'#8a8278',fontSize:12}}>Sin datos</div>
    )
    let cum = -90
    const paths: {d:string;color:string;label:string;g:number;pct:number;midAngle:number}[] = []
    slices.forEach(s => {
      const pct = s.val/total; const angle = pct*360-0.5
      const s1 = cum*Math.PI/180; const e1 = (cum+angle)*Math.PI/180
      const mid = (cum + angle/2) * Math.PI/180
      const x1o=cx+r*Math.cos(s1);const y1o=cy+r*Math.sin(s1)
      const x2o=cx+r*Math.cos(e1);const y2o=cy+r*Math.sin(e1)
      const x1i=cx+ri*Math.cos(e1);const y1i=cy+ri*Math.sin(e1)
      const x2i=cx+ri*Math.cos(s1);const y2i=cy+ri*Math.sin(s1)
      const lg = angle>180?1:0
      const d=`M${x1o},${y1o} A${r},${r} 0 ${lg},1 ${x2o},${y2o} L${x1i},${y1i} A${ri},${ri} 0 ${lg},0 ${x2i},${y2i} Z`
      cum += angle+0.5
      paths.push({d,color:s.color,label:s.label,g:s.g,pct:Math.round(pct*100),midAngle:mid})
    })
    const hov = hoveredSlice !== null ? paths[hoveredSlice] : null
    // Etiquetas flotantes fuera del donut
    const labelR = r + 28
    return (
      <div style={{position:'relative',width:W+80,height:W}}>
        <svg viewBox={`0 0 ${W} ${W}`} style={{position:'absolute',left:40,top:0,width:W,height:W}}>
          {paths.map((p,i) => (
            <path key={i} d={p.d} fill={p.color}
              opacity={hoveredSlice===null?0.92:hoveredSlice===i?1:0.3}
              style={{cursor:'pointer',transition:'opacity 0.15s'}}
              onMouseEnter={()=>setHoveredSlice(i)} onMouseLeave={()=>setHoveredSlice(null)}/>
          ))}
          <circle cx={cx} cy={cy} r={ri-2} fill="white"/>
          {hov ? (
            <>
              <text x={cx} y={cy-10} textAnchor="middle" fontSize="18" fontWeight="800" fill={hov.color}>{hov.pct}%</text>
              <text x={cx} y={cy+8}  textAnchor="middle" fontSize="11" fill="#8a8278">{hov.label}</text>
              <text x={cx} y={cy+24} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1a1a1a">{hov.g}g</text>
            </>
          ) : (
            <>
              <text x={cx} y={cy-6}  textAnchor="middle" fontSize="24" fontWeight="800" fill="#1a1a1a">{macros.kcal||'—'}</text>
              <text x={cx} y={cy+14} textAnchor="middle" fontSize="11" fill="#8a8278">kcal</text>
            </>
          )}
        </svg>
        {/* Etiquetas flotantes */}
        {paths.map((p,i) => {
          const lx = 40 + cx + labelR * Math.cos(p.midAngle)
          const ly = cy + labelR * Math.sin(p.midAngle)
          const isRight = Math.cos(p.midAngle) > 0
          return (
            <div key={i} style={{
              position:'absolute', left:lx, top:ly,
              transform:`translate(${isRight?'0%':'-100%'},-50%)`,
              textAlign: isRight?'left':'right', pointerEvents:'none'
            }}>
              <div style={{fontSize:11,color:p.color,fontWeight:700}}>{p.label}</div>
              <div style={{fontSize:13,fontWeight:800,color:'#1a1a1a'}}>{p.pct}%</div>
            </div>
          )
        })}
      </div>
    )
  }

  const MACRO_CFG = [
    { key:'protein', label:'Proteína', icon:'🥩', color:COLORS.protein, per:4 },
    { key:'carbs',   label:'Carbos',   icon:'🌾', color:COLORS.carbs,   per:4 },
    { key:'fats',    label:'Grasas',   icon:'🥑', color:COLORS.fats,    per:9 },
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12,height:'100%',overflow:'hidden'}}>
      <div className="flex gap-1 bg-bg p-1 rounded-xl border border-border" style={{width:'fit-content',flexShrink:0}}>
        {[{id:'macros',label:'📊 Macros'},{id:'plan',label:'🍽️ Plan completo'}].map(t=>(
          <button key={t.id} onClick={()=>setSubtab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${subtab===t.id?'bg-white shadow-sm text-ink':'text-muted'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {subtab==='macros' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 260px',gap:16,flex:1,minHeight:0,overflow:'hidden'}}>

          {/* COLUMNA IZQUIERDA */}
          <div style={{overflowY:'auto',display:'flex',flexDirection:'column',gap:12,minWidth:0}}>
            <div className="bg-white rounded-2xl" style={{boxShadow:'0 2px 16px rgba(0,0,0,0.07)',padding:24,flexShrink:0}}>
              <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:'#8a8278',marginBottom:16}}>Objetivos diarios</p>

              {/* Donut centrado */}
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:20}}>
                <DonutChart />
                <div style={{display:'flex',alignItems:'center',gap:8,marginTop:12}}>
                  <p style={{fontSize:13,fontWeight:700,color:'#1a1a1a'}}>CALORÍAS TOTALES:</p>
                  <input type="number" value={macros.kcal||''} onChange={e=>updateMacros({kcal:Number(e.target.value)})}
                    placeholder="0" style={{fontSize:16,fontWeight:800,color:'#1a1a1a',background:'transparent',border:'none',outline:'none',width:70}}/>
                  <span style={{fontSize:13,color:'#8a8278'}}>kcal</span>
                  <button onClick={()=>setShowCalc(!showCalc)}
                    className={`ml-2 px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${showCalc?'bg-ink text-white':'border-border text-muted hover:border-accent'}`}>
                    🧮 Calcular
                  </button>
                </div>
                <div style={{display:'flex',gap:20,marginTop:8}}>
                  {slices.map(s=>(
                    <div key={s.label} style={{display:'flex',alignItems:'center',gap:5}}>
                      <div style={{width:8,height:8,borderRadius:'50%',backgroundColor:s.color}}/>
                      <span style={{fontSize:11,color:'#8a8278'}}>{s.label}: {total>0?Math.round(s.val/total*100):0}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3 macros grid igual */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                {MACRO_CFG.map(({key,label,icon,color,per})=>{
                  const pct = total>0?Math.round(macros[key]*per/total*100):0
                  return (
                    <div key={key} style={{borderRadius:12,padding:14,backgroundColor:color+'12',border:`1px solid ${color}25`}}>
                      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                        <span style={{fontSize:14}}>{icon}</span>
                        <span style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color}}>{label} - {macros[key]||0}g</span>
                      </div>
                      <div style={{display:'flex',alignItems:'baseline',gap:3,marginBottom:8}}>
                        <input type="number" value={macros[key]||''} onChange={e=>updateMacros({[key]:Number(e.target.value)})}
                          placeholder="0" style={{fontSize:32,fontWeight:800,color,background:'transparent',border:'none',outline:'none',width:'100%'}}/>
                        <span style={{fontSize:11,color:'#8a8278'}}>g</span>
                      </div>
                      <div style={{height:3,backgroundColor:'rgba(255,255,255,0.7)',borderRadius:2,overflow:'hidden',marginBottom:4}}>
                        <div style={{height:'100%',width:`${pct}%`,backgroundColor:color,borderRadius:2}}/>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between'}}>
                        <span style={{fontSize:10,color:'#8a8278'}}>{macros[key]?Math.round(macros[key]*per):0} kcal</span>
                        <span style={{fontSize:10,fontWeight:700,color}}>{pct}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Nota nutricional */}
              <div style={{marginTop:16,paddingTop:14,borderTop:'1px solid #ece9e3'}}>
                <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'#8a8278',marginBottom:8}}>Nota nutricional...</p>
                <textarea rows={3} value={macros.notaMacros||''} onChange={e=>updateMacros({notaMacros:e.target.value})}
                  placeholder={`Instructivos para ${client.name}:
• Distribuye en 4-5 comidas al día
• Prioriza proteína en cada comida (mínimo 30g)
• Fuentes recomendadas, incluidos de tahini...`}
                  style={{width:'100%',padding:'10px 12px',background:'#f8f6f2',border:'1px solid #ece9e3',borderRadius:10,fontSize:13,resize:'none',outline:'none',lineHeight:1.6,color:'#5a5650',fontFamily:'inherit',boxSizing:'border-box'}}/>
              </div>
            </div>

            {/* Calculadora */}
            {showCalc && (
              <div className="bg-white rounded-2xl p-5" style={{boxShadow:'0 2px 16px rgba(0,0,0,0.07)',flexShrink:0}}>
                <p className="font-semibold text-sm mb-3">Calculadora TDEE — Harris-Benedict</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                  <div>
                    <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',color:'#8a8278',marginBottom:4}}>Peso (kg)</p>
                    <input type="number" value={peso} onChange={e=>setPeso(e.target.value)} placeholder={String(client.weight||80)}
                      className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none"/>
                  </div>
                  <div>
                    <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',color:'#8a8278',marginBottom:4}}>Altura (cm)</p>
                    <input type="number" value={altura} onChange={e=>setAltura(e.target.value)} placeholder="175"
                      className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none"/>
                  </div>
                  <div>
                    <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',color:'#8a8278',marginBottom:4}}>Edad</p>
                    <input type="number" value={edad} onChange={e=>setEdad(e.target.value)} placeholder="30"
                      className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none"/>
                  </div>
                  <div>
                    <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',color:'#8a8278',marginBottom:4}}>Sexo</p>
                    <div className="flex gap-1">
                      {[{v:'h',l:'♂ Hombre'},{v:'m',l:'♀ Mujer'}].map(s=>(
                        <button key={s.v} onClick={()=>setSexo(s.v as any)}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium border ${sexo===s.v?'bg-ink text-white border-ink':'border-border text-muted'}`}>{s.l}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:4,marginBottom:12}}>
                  {[{val:1.2,l:'Sedentario'},{val:1.375,l:'Ligero'},{val:1.55,l:'Moderado'},{val:1.725,l:'Activo'},{val:1.9,l:'Muy activo'}].map(a=>(
                    <button key={a.val} onClick={()=>setActividad(a.val)}
                      className={`py-2 rounded-lg text-[9px] font-bold border ${actividad===a.val?'bg-ink text-white border-ink':'border-border text-muted'}`}>{a.l}</button>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
                  {[{v:'deficit',l:'🔥 Déficit',d:'-400 kcal'},{v:'mantenimiento',l:'⚖️ Mant.',d:'TDEE'},{v:'superavit',l:'💪 Superávit',d:'+300 kcal'}].map(o=>(
                    <button key={o.v} onClick={()=>setObjetivo(o.v as any)}
                      className={`py-2.5 rounded-xl border text-center ${objetivo===o.v?'bg-ink text-white border-ink':'border-border text-muted'}`}>
                      <p className="text-xs font-semibold">{o.l}</p><p className="text-[9px] opacity-70">{o.d}</p>
                    </button>
                  ))}
                </div>
                <div style={{marginBottom:12}}>
                  <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',color:'#8a8278',marginBottom:4}}>Proteína: <span style={{color:'#6e5438'}}>{ratio}g/kg</span></p>
                  <input type="range" min="1.6" max="2.4" step="0.1" value={ratio} onChange={e=>setRatio(Number(e.target.value))} className="w-full accent-[#6e5438]"/>
                </div>
                {peso&&altura&&edad&&(()=>{
                  const p=parseFloat(peso);const h=parseFloat(altura);const e=parseFloat(edad)
                  const tmb=sexo==='h'?88.362+(13.397*p)+(4.799*h)-(5.677*e):447.593+(9.247*p)+(3.098*h)-(4.330*e)
                  const tdee=Math.round(tmb*actividad)
                  const kcalObj=objetivo==='deficit'?tdee-400:objetivo==='superavit'?tdee+300:tdee
                  const protG=Math.round(p*ratio);const fatG=Math.round(p*1.0)
                  const carbsG=Math.max(0,Math.round((kcalObj-protG*4-fatG*9)/4))
                  return <div className="bg-bg-alt rounded-xl p-3 text-xs mb-3">
                    <p className="text-muted">TMB: <strong>{Math.round(tmb)}</strong> · TDEE: <strong>{tdee}</strong> kcal</p>
                    <p><strong style={{color:COLORS.protein}}>{kcalObj} kcal</strong> · Prot: <strong style={{color:COLORS.protein}}>{protG}g</strong> · Carbs: <strong style={{color:COLORS.carbs}}>{carbsG}g</strong> · Grasa: <strong style={{color:COLORS.fats}}>{fatG}g</strong></p>
                  </div>
                })()}
                <button onClick={calcMacros} className="w-full py-3 bg-ink text-white rounded-xl text-sm font-bold hover:opacity-90">🧮 Calcular y aplicar</button>
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA — sin scroll, todo visible */}
          <div style={{display:'flex',flexDirection:'column',gap:8,overflow:'hidden'}}>

            {/* Distribución por comidas */}
            <div className="bg-white rounded-2xl" style={{boxShadow:'0 2px 12px rgba(0,0,0,0.06)',padding:14,flexShrink:0}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:openDist?10:0,cursor:'pointer'}} onClick={()=>setOpenDist(!openDist)}>
                <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'#8a8278'}}>Distribución por comidas</p>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  {openDist && <button onClick={e=>{e.stopPropagation();setDist([...dist,{label:'Comida',icon:'🍴',pct:0,time:'12:00'}])}} style={{fontSize:10,color:'#6e5438',background:'none',border:'none',cursor:'pointer'}}>+ Añadir</button>}
                  <span style={{fontSize:10,color:'#8a8278'}}>{openDist?'▲':'▼'}</span>
                </div>
              </div>
              {openDist && dist.map((m,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:6,marginBottom:8,padding:'4px 6px',background:'#f8f6f2',borderRadius:8}}>
                  <span style={{fontSize:14}}>{m.icon}</span>
                  <input value={m.label} onChange={e=>{const d=[...dist];d[i]={...d[i],label:e.target.value};setDist(d)}}
                    style={{flex:1,fontSize:11,fontWeight:600,background:'transparent',border:'none',outline:'none',minWidth:0}}/>
                  <input value={m.time||''} onChange={e=>{const d=[...dist];d[i]={...d[i],time:e.target.value};setDist(d)}}
                    style={{width:40,fontSize:10,color:'#8a8278',background:'transparent',border:'none',outline:'none',textAlign:'right'}}/>
                  <input type="number" min={0} max={100} value={m.pct} onChange={e=>{const d=[...dist];d[i]={...d[i],pct:Number(e.target.value)};setDist(d)}}
                    style={{width:28,fontSize:10,textAlign:'center',background:'white',border:'1px solid #e5e2dc',borderRadius:4,padding:'1px 2px',outline:'none'}}/>
                  <span style={{fontSize:9,color:'#8a8278'}}>%</span>
                  <button onClick={()=>setDist(dist.filter((_,idx)=>idx!==i))} style={{color:'#8a8278',background:'none',border:'none',cursor:'pointer',fontSize:12,lineHeight:1}}>×</button>
                </div>
              ))}
              {openDist && <p style={{fontSize:9,color:dist.reduce((a,d)=>a+d.pct,0)===100?'#4caf7d':'#e07b54',textAlign:'right'}}>Total: {dist.reduce((a,d)=>a+d.pct,0)}%</p>}
            </div>

            {/* Suplementación */}
            <div className="bg-white rounded-2xl" style={{boxShadow:'0 2px 12px rgba(0,0,0,0.06)',padding:14,flexShrink:0}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:openSups?10:0,cursor:'pointer'}} onClick={()=>setOpenSups(!openSups)}>
                <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'#8a8278'}}>Suplementación básica</p>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  {openSups && <button onClick={e=>{e.stopPropagation();setSups([...sups,{name:'Suplemento',desc:'',visible:true}])}} style={{fontSize:10,color:'#6e5438',background:'none',border:'none',cursor:'pointer'}}>Añadir</button>}
                  <span style={{fontSize:10,color:'#8a8278'}}>{openSups?'▲':'▼'}</span>
                  <div onClick={()=>setShowSups(!showSups)} style={{width:28,height:16,borderRadius:8,background:showSups?'#4caf7d':'#d0ccc6',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0}}>
                    <div style={{position:'absolute',top:2,left:showSups?12:2,width:12,height:12,borderRadius:6,background:'white',transition:'left 0.2s'}}/>
                  </div>
                </div>
              </div>
              {openSups && sups.map((s,i)=>(
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:6,marginBottom:8,padding:'6px 8px',background:s.visible?'rgba(76,175,125,0.08)':'#f8f6f2',borderRadius:8}}>
                  <div style={{width:28,height:28,borderRadius:8,background:s.visible?'rgba(76,175,125,0.15)':'#ece9e3',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,cursor:'pointer'}}
                    onClick={()=>{const ss=[...sups];ss[i]={...ss[i],visible:!ss[i].visible};setSups(ss)}}>
                    <span style={{fontSize:11}}>{s.visible?'👁️':'🙈'}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <input value={s.name} onChange={e=>{const ss=[...sups];ss[i]={...ss[i],name:e.target.value};setSups(ss)}}
                      style={{display:'block',width:'100%',fontSize:11,fontWeight:700,background:'transparent',border:'none',outline:'none',marginBottom:2}}/>
                    <input value={s.desc} onChange={e=>{const ss=[...sups];ss[i]={...ss[i],desc:e.target.value};setSups(ss)}}
                      style={{display:'block',width:'100%',fontSize:10,color:'#8a8278',background:'transparent',border:'none',outline:'none'}}/>
                  </div>
                  <button onClick={()=>setSups(sups.filter((_,idx)=>idx!==i))} style={{color:'#8a8278',background:'none',border:'none',cursor:'pointer',fontSize:12,lineHeight:1}}>×</button>
                </div>
              ))}
            </div>

            {/* Equivalencias proteína */}
            {macros.protein > 0 && (
              <div className="bg-white rounded-2xl" style={{boxShadow:'0 2px 12px rgba(0,0,0,0.06)',padding:14,flexShrink:0}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'#8a8278'}}>Equivalencias de proteína</p>
                  <button onClick={()=>setEquivs([...equivs,{food:'Alimento',per100:20}])} style={{fontSize:10,color:'#6e5438',background:'none',border:'none',cursor:'pointer'}}>+</button>
                </div>
                {equivs.map((f,i)=>{
                  const g = Math.round(macros.protein/f.per100*100)
                  const maxG = Math.max(...equivs.map(e=>Math.round(macros.protein/e.per100*100)),1)
                  return (
                    <div key={i} style={{marginBottom:8}}>
                      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                        <input value={f.food} onChange={e=>{const eq=[...equivs];eq[i]={...eq[i],food:e.target.value};setEquivs(eq)}}
                          style={{flex:1,fontSize:11,background:'transparent',border:'none',outline:'none',minWidth:0}}/>
                        <input type="number" value={f.per100} onChange={e=>{const eq=[...equivs];eq[i]={...eq[i],per100:Number(e.target.value)};setEquivs(eq)}}
                          style={{width:24,fontSize:10,textAlign:'center',background:'#f0ede8',border:'none',borderRadius:4,padding:'1px 2px',outline:'none'}}/>
                        <span style={{fontSize:10,fontWeight:700,color:COLORS.protein,width:36,textAlign:'right'}}>{g}g</span>
                        <button onClick={()=>setEquivs(equivs.filter((_,idx)=>idx!==i))} style={{color:'#8a8278',background:'none',border:'none',cursor:'pointer',fontSize:11,lineHeight:1}}>×</button>
                      </div>
                      <div style={{height:3,background:'#f0ede8',borderRadius:2,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${Math.round(g/maxG*100)}%`,background:COLORS.protein+'88',borderRadius:2}}/>
                      </div>
                    </div>
                  )
                })}
                <p style={{fontSize:9,color:'#8a8278',marginTop:4,borderTop:'1px solid #ece9e3',paddingTop:4}}>Cantidades para {macros.protein}g proteína</p>
              </div>
            )}

            <button onClick={saveSidePanel}
              style={{padding:'8px 0',background:'#1a1a1a',color:'white',border:'none',borderRadius:12,fontSize:12,fontWeight:700,cursor:'pointer',flexShrink:0}}
              onMouseOver={e=>(e.currentTarget.style.opacity='0.85')} onMouseOut={e=>(e.currentTarget.style.opacity='1')}>
              💾 Guardar panel
            </button>
          </div>
        </div>
      )}

      {subtab==='plan' && (
        <div style={{flex:1,overflowY:'auto',minHeight:0}}>
          <DietEditor clientId={clientId} isTrainer={true} trainerId={trainerId}
            syncedMacros={{kcal:macros.kcal,protein:macros.protein,carbs:macros.carbs,fats:macros.fats}}
            onMacrosChange={m=>updateMacros(m)}/>
        </div>
      )}
    </div>
  )
}
