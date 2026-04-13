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
    <div className="fixed inset-0 z-50 bg-bg flex overflow-hidden">

      {/* ── SIDEBAR IZQUIERDO ── */}
      <aside className="w-56 flex-shrink-0 bg-card border-r border-border flex flex-col">
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
            <button key={id} onClick={() => setActiveTab(id)}
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
        <header className="bg-card border-b border-border flex-shrink-0 h-14 flex items-center justify-between px-6">
          <div>
            <h2 className="text-sm font-bold">{TABS.find(t => t.id === activeTab)?.label}</h2>
            <p className="text-[10px] text-muted">{TABS.find(t => t.id === activeTab)?.desc}</p>
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
        <main className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 space-y-4">
              <div className="h-8 w-48 bg-card border border-border rounded-lg animate-pulse" />
              <div className="h-48 bg-card border border-border rounded-2xl animate-pulse" />
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />)}</div>
            </div>
          ) : (
            <div className="p-6 h-full">
              {activeTab === 'plan' && plan && (
                <TrainingPlanEditor plan={plan} onChange={handlePlanChange}
                  allClients={otherClients} library={library.exercises} onImportFromClient={importFromClient} />
              )}
              {activeTab === 'dieta' && (
                <DietaTabEntrenador clientId={client.id} plan={plan} onChange={handlePlanChange} />
              )}
              {activeTab === 'vista' && <VistaTab plan={plan} logs={logs} />}
              {activeTab === 'entrenos' && <EntrenosTab logs={logs} plan={plan} />}
              {activeTab === 'progreso' && <ProgresoTab client={client} />}
              {activeTab === 'notas' && <NotasTab plan={plan} onChange={handlePlanChange} />}
              {activeTab === 'config' && <ConfigTab client={client} plan={plan} onChange={handlePlanChange} />}
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

      {/* Descansos */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-semibold">Tiempos de descanso</h4>
        {([['restMain', 'Principal (seg)'], ['restAcc', 'Accesorio (seg)'], ['restWarn', 'Aviso (seg)']] as const).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <label className="text-sm text-muted">{label}</label>
            <input type="number" value={plan[key]} onChange={e => onChange({ ...plan, [key]: Number(e.target.value) })}
              className="w-24 text-center px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20" />
          </div>
        ))}
      </div>

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

function DietaTabEntrenador({ clientId, plan, onChange }: { clientId: string; plan: TrainingPlan | null; onChange: (p: TrainingPlan) => void }) {
  const [subtab, setSubtab] = useState<'macros' | 'plan'>('macros')
  const macros = (plan as any)?.macros || { kcal: 0, protein: 0, carbs: 0, fats: 0, notaMacros: '' }
  const updateMacros = (updates: any) => { if (!plan) return; onChange({ ...plan, macros: { ...macros, ...updates } } as any) }

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex gap-1 bg-bg p-1 rounded-xl border border-border w-fit">
        {[{ id: 'macros', label: '📊 Macros' }, { id: 'plan', label: '🍽️ Plan completo' }].map(t => (
          <button key={t.id} onClick={() => setSubtab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${subtab === t.id ? 'bg-card shadow-sm text-ink' : 'text-muted'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {subtab === 'macros' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div><h4 className="text-sm font-semibold">Objetivos diarios</h4><p className="text-xs text-muted mt-0.5">El cliente verá estos macros en su panel.</p></div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'kcal', label: 'Calorías', unit: 'kcal', color: 'text-warn' },
                { key: 'protein', label: 'Proteína', unit: 'g', color: 'text-ok' },
                { key: 'carbs', label: 'Carbohidratos', unit: 'g', color: 'text-accent' },
                { key: 'fats', label: 'Grasas', unit: 'g', color: 'text-muted' },
              ].map(({ key, label, unit, color }) => (
                <div key={key} className="bg-bg border border-border rounded-xl p-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">{label}</label>
                  <div className="flex items-baseline gap-1">
                    <input type="number" value={macros[key] || ''} onChange={e => updateMacros({ [key]: Number(e.target.value) })}
                      placeholder="0" className={`w-full text-xl font-serif font-bold bg-transparent outline-none ${color}`} />
                    <span className="text-xs text-muted">{unit}</span>
                  </div>
                </div>
              ))}
            </div>
            <textarea rows={3} value={macros.notaMacros || ''} onChange={e => updateMacros({ notaMacros: e.target.value })}
              placeholder="Nota nutricional..." className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none resize-none" />
          </div>
        </div>
      )}
      {subtab === 'plan' && <DietEditor clientId={clientId} isTrainer={true} />}
    </div>
  )
}
