import { TrainerLabel, LabelPill } from './labels'
import { useState, useEffect, useRef } from 'react'
import {
  X, Save, ChevronLeft, FileText, Dumbbell, Settings, Star,
  ClipboardList, StickyNote, Eye, TrendingUp, MessageSquare,
  CheckCircle2, ClipboardCheck, Link, MessageCircle,
  User, Bell, Plus, Trash2, Calendar
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ClientData, TrainingPlan, TrainingLogs, UserProfile, TrainingTemplate } from '../../types'
import { Button } from '../shared/Button'
import { Modal } from '../shared/Modal'
import { toast } from '../shared/Toast'
import { TrainingPlanEditor } from './TrainingPlanEditor'
import { DietEditor } from '../shared/DietEditor'
import { ProgresoTab } from './ProgresoTab'
import { InformePDF } from './InformePDF'
import { PlanGate } from '../shared/PlanGate'
import { useExerciseLibrary } from '../../hooks/useExerciseLibrary'
import { PlanRow, RegistroRow } from '../../lib/supabase-types'
import { logError } from '../../lib/errors'

type Tab = 'perfil' | 'plan' | 'dieta' | 'vista' | 'entrenos' | 'progreso' | 'valoracion' | 'notas' | 'config'

interface ClientAlert {
  id: string
  type: 'llamar' | 'revision' | 'valoracion' | 'otro'
  note: string
  date: string
  done: boolean
  createdAt: number
}

interface Props {
  client: ClientData
  userProfile: UserProfile
  allClients: ClientData[]
  onClose: () => void
  demoPlan?: any
  demoLogs?: any
}

const TABS: { id: Tab; icon: React.ElementType; label: string; desc: string }[] = [
  { id: 'perfil',   icon: User,          label: 'Perfil',    desc: 'Datos y estadísticas' },
  { id: 'plan',     icon: Dumbbell,      label: 'Plan',      desc: 'Rutina de entrenamiento' },
  { id: 'dieta',    icon: FileText,      label: 'Dieta',     desc: 'Macros y plan nutricional' },
  { id: 'vista',    icon: Eye,           label: 'Vista',     desc: 'Lo que ve el cliente' },
  { id: 'entrenos', icon: ClipboardList, label: 'Entrenos',  desc: 'Historial de sesiones' },
  { id: 'progreso', icon: TrendingUp,    label: 'Progreso',  desc: 'Métricas y evolución' },
  { id: 'valoracion',icon: Star,          label: 'Valoración',desc: 'Ficha de valoración' },
  { id: 'notas',    icon: StickyNote,    label: 'Notas',     desc: 'Notas privadas' },
  { id: 'config',   icon: Settings,      label: 'Config',    desc: 'Acceso y automatizaciones' },
]

const ALERT_TYPES = [
  { id: 'llamar',    label: 'Llamar',     emoji: '📞', color: 'text-blue-500',  bg: 'bg-blue-50',   border: 'border-blue-200' },
  { id: 'revision',  label: 'Revisión',   emoji: '📋', color: 'text-ok',        bg: 'bg-ok/10',     border: 'border-ok/30' },
  { id: 'valoracion',label: 'Valoración', emoji: '⭐', color: 'text-warn',      bg: 'bg-warn/10',   border: 'border-warn/30' },
  { id: 'otro',      label: 'Otro',       emoji: '🔔', color: 'text-muted',     bg: 'bg-bg-alt',    border: 'border-border' },
] as const

function useTemplates(trainerId: string) {
  const [templates, setTemplates] = useState<TrainingTemplate[]>(() => {
    try { return JSON.parse(localStorage.getItem(`pf_templates_${trainerId}`) || '[]') } catch { return [] }
  })

  useEffect(() => {
    if (!trainerId) return
    const syncFromSupabase = async () => {
      const { data } = await supabase.from('plan_templates')
        .select('*').eq('trainer_id', trainerId).order('created_at')
      if (data && data.length > 0) {
        const parsed = data.map((r: any) => ({ ...r.plan, id: r.id, name: r.name, description: r.description }))
        setTemplates(parsed)
        localStorage.setItem(`pf_templates_${trainerId}`, JSON.stringify(parsed))
      }
    }
    syncFromSupabase()
  }, [trainerId])

  const saveTemplate = async (tmpl: TrainingTemplate) => {
    const updated = templates.find(t => t.id === tmpl.id)
      ? templates.map(t => t.id === tmpl.id ? tmpl : t)
      : [...templates, tmpl]
    setTemplates(updated)
    localStorage.setItem(`pf_templates_${trainerId}`, JSON.stringify(updated))
    const row = { id: tmpl.id, trainer_id: trainerId, name: tmpl.name || 'Plantilla', description: (tmpl as any).description || '', plan: tmpl, created_at: Date.now(), updated_at: Date.now() }
    await supabase.from('plan_templates').upsert(row, { onConflict: 'id' })
  }

  const deleteTemplate = async (id: string) => {
    const updated = templates.filter(t => t.id !== id)
    setTemplates(updated)
    localStorage.setItem(`pf_templates_${trainerId}`, JSON.stringify(updated))
    await supabase.from('plan_templates').delete().eq('id', id)
  }

  return { templates, saveTemplate, deleteTemplate }
}

type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export function ClientPanel({ client, userProfile, allClients, onClose, demoPlan, demoLogs }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('perfil')
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [logs, setLogs] = useState<TrainingLogs>({})
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [showInforme, setShowInforme] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardTemplate, setWizardTemplate] = useState<TrainingTemplate | null>(null)
  const [wizardFechaInicio, setWizardFechaInicio] = useState(new Date().toISOString().split('T')[0])
  const [wizardAutoWelcome, setWizardAutoWelcome] = useState(true)
  const [wizardAutoCheckin, setWizardAutoCheckin] = useState(true)
  const [mobileShowSidebar, setMobileShowSidebar] = useState(false)
  const [alerts, setAlerts] = useState<ClientAlert[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [labels, setLabels] = useState<any[]>([])
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  const pendingPlan = useRef<TrainingPlan | null>(null)
  const library = useExerciseLibrary(userProfile.uid)
  const otherClients = allClients.filter(c => c.id !== client.id)
  const { templates } = useTemplates(userProfile.uid)

  useEffect(() => { loadData() }, [client.id])

  const loadData = async () => {
    setLoading(true)
    if (demoPlan) { setPlan(demoPlan); if (demoLogs) setLogs(demoLogs); setLoading(false); return }
    const { data: planData } = await supabase.from('planes').select('plan').eq('clientId', client.id).maybeSingle()
    const planRow = planData as PlanRow | null
    if (planRow?.plan?.P) setPlan(planRow.plan.P as TrainingPlan)
    else setPlan({ clientId: client.id, type: (client as any).objetivo || 'hipertrofia', restMain: 180, restAcc: 90, restWarn: 30, weeks: [] })
    const { data: regData } = await supabase.from('registros').select('logs').eq('clientId', client.id).maybeSingle()
    const regRow = regData as RegistroRow | null
    if (regRow?.logs) setLogs(regRow.logs as TrainingLogs)
    // Cargar alertas
    const { data: clientData } = await supabase.from('clientes').select('alerts').eq('id', client.id).maybeSingle()
    if (clientData?.alerts) setAlerts(clientData.alerts)
    // Cargar programas del entrenador
    const { data: labelsData } = await supabase.from('labels').select('*').eq('trainer_id', userProfile.uid).order('created_at')
    if (labelsData) setLabels(labelsData)
    const { data: progsData } = await supabase.from('programs').select('*').eq('trainer_id', userProfile.uid).order('created_at', { ascending: false })
    if (progsData) setPrograms(progsData)
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
    const { error } = await supabase.from('planes').upsert({ clientId: client.id, plan: { P: p }, updatedAt: Date.now() }, { onConflict: 'clientId' })
    if (error) { logError('savePlan', error); setSaveState('error'); return }
    setSaveState('saved'); setTimeout(() => setSaveState('idle'), 2000)
  }

  const saveAlerts = async (newAlerts: ClientAlert[]) => {
    setAlerts(newAlerts)
    await supabase.from('clientes').update({ alerts: newAlerts }).eq('id', client.id)
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
      const msg = encodeURIComponent(`Hola ${client.name} 👋\n\nTe he asignado tu nuevo programa:\n\n${url}\n\n💪`)
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
  const adherencia = plan?.weeks?.length ? Math.round(completedExs / Math.max(totalExs, 1) * 100) : 0
  const pendingAlerts = alerts.filter(a => !a.done)

  return (
    <div className="fixed inset-0 z-50 bg-bg flex overflow-hidden">

      {/* Sidebar */}
      {mobileShowSidebar && (
        <div className="fixed inset-0 bg-ink/40 z-10 lg:hidden" onClick={() => setMobileShowSidebar(false)} />
      )}
      <aside className={`flex-shrink-0 bg-card border-r border-border flex flex-col transition-all z-20 ${mobileShowSidebar ? 'fixed inset-y-0 left-0 w-64' : 'hidden lg:flex lg:w-56'}`}>
        <div className="px-4 py-4 border-b border-border">
          <button onClick={onClose} className="flex items-center gap-2 text-muted hover:text-ink transition-colors mb-3 text-sm">
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
          <button onClick={() => { setActiveTab('perfil'); setMobileShowSidebar(false) }}
            className="flex items-center gap-3 w-full text-left group hover:opacity-80 transition-opacity">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-serif text-lg font-bold flex-shrink-0 transition-colors ${activeTab === 'perfil' ? 'bg-ink text-white' : 'bg-accent/10 text-accent'}`}>
              {client.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{client.name} {client.surname}</p>
              <p className="text-[10px] text-muted capitalize truncate">{plan?.type || (client as any).objetivo || 'Sin tipo'}</p>
              {(client as any).phone && <p className="text-[10px] text-[#25D366] truncate">📱 {(client as any).phone}</p>}
            </div>
          </button>
        </div>

        {/* Stats */}
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

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {TABS.map(({ id, icon: Icon, label, desc }) => (
            <button key={id} onClick={() => { setActiveTab(id); setMobileShowSidebar(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${activeTab === id ? 'bg-ink text-white' : 'text-muted hover:bg-bg-alt hover:text-ink'}`}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{label}</p>
                <p className={`text-[10px] leading-tight truncate ${activeTab === id ? 'text-white/60' : 'text-muted'}`}>{desc}</p>
              </div>
              {/* Badge alertas en pestaña perfil */}
              {id === 'perfil' && pendingAlerts.length > 0 && (
                <span className="ml-auto text-[9px] font-bold bg-warn text-white px-1.5 py-0.5 rounded-full flex-shrink-0">
                  {pendingAlerts.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Acciones rápidas */}
        <div className="p-3 border-t border-border space-y-2">
          <button onClick={() => { navigator.clipboard.writeText(clientUrl); toast('Enlace copiado ✓', 'ok') }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-muted border border-border rounded-xl hover:border-accent hover:text-accent transition-colors">
            <Link className="w-3.5 h-3.5" /> Copiar enlace
          </button>
          <button onClick={() => {
              const phone = (client as any).phone?.replace(/\s+/g, '').replace(/^\+/, '')
              const msg = encodeURIComponent(`Hola ${client.name} 👋\n\nTe comparto tu panel:\n\n${clientUrl}\n\n💪`)
              window.open(phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank')
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-[#25D366] border border-[#25D366]/30 rounded-xl hover:bg-[#25D366]/5 transition-colors">
            <MessageCircle className="w-3.5 h-3.5" /> {(client as any).phone ? 'WhatsApp directo' : 'WhatsApp'}
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
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
            <span className={`text-xs transition-all ${saveState === 'saving' ? 'text-accent animate-pulse' : saveState === 'saved' ? 'text-ok' : saveState === 'error' ? 'text-warn' : 'opacity-0'}`}>
              {saveState === 'saving' ? 'Guardando...' : saveState === 'saved' ? '✓ Guardado' : saveState === 'error' ? '✗ Error' : '·'}
            </span>
            {activeTab === 'progreso' && (
              <PlanGate feature="pdf_report" planName={userProfile.planName} fallback={
                <button disabled className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-muted/40 cursor-not-allowed">🔒 Informe PDF</button>
              }>
                <button onClick={() => setShowInforme(true)} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-muted hover:border-accent hover:text-accent transition-colors">📄 Informe PDF</button>
              </PlanGate>
            )}
            {activeTab === 'plan' && templates.length > 0 && (
              <button onClick={() => setShowTemplates(true)} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-muted hover:border-accent hover:text-accent transition-colors">
                <ClipboardCheck className="w-3.5 h-3.5" /> Plantilla
              </button>
            )}
            {activeTab !== 'perfil' && (
              <Button size="sm" onClick={() => savePlan()} disabled={saveState === 'saving'} className="gap-1.5">
                <Save className="w-3.5 h-3.5" /> Guardar
              </Button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="p-6 space-y-4">
              <div className="h-8 w-48 bg-card border border-border rounded-lg animate-pulse" />
              <div className="h-48 bg-card border border-border rounded-2xl animate-pulse" />
            </div>
          ) : (
            <div className="p-6 flex-1 overflow-hidden flex flex-col min-h-0">
              {activeTab === 'perfil' && (
                <div className="flex-1 overflow-y-auto">
                  <PerfilTab
                    client={client} logs={logs} alerts={alerts}
                    onUpdate={async (updates) => {
                      await supabase.from('clientes').update(updates).eq('id', client.id)
                      Object.assign(client, updates)
                      toast('Datos actualizados ✓', 'ok')
                    }}
                    labels={labels}
                    onSaveAlerts={saveAlerts}
                  />
                </div>
              )}
              {activeTab === 'plan' && plan && (
                <div className="flex-1 overflow-hidden flex flex-col gap-4 min-h-0">
                  <PlanTab
                    client={client}
                    plan={plan}
                    programs={programs}
                    labels={labels}
                    onPlanChange={handlePlanChange}
                    onImportFromClient={importFromClient}
                    library={library.exercises}
                    logs={logs}
                    otherClients={otherClients}
                    trainerId={userProfile.uid}
                  />
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
              {activeTab === 'valoracion' && <div className="flex-1 overflow-y-auto"><ValoracionTab client={client} trainerId={userProfile.uid} /></div>}
              {activeTab === 'notas' && <div className="flex-1 overflow-y-auto"><NotasTab plan={plan} onChange={handlePlanChange} /></div>}
              {activeTab === 'config' && <div className="flex-1 overflow-y-auto"><ConfigTab client={client} plan={plan} onChange={handlePlanChange} /></div>}
            </div>
          )}
        </main>
      </div>

      {/* Informe PDF */}
      {showInforme && (
        <InformePDF client={client} plan={plan} logs={logs}
          trainerProfile={(() => { try { return JSON.parse(localStorage.getItem(`pf_trainer_profile_${userProfile.uid}`) || '{}') } catch { return {} } })()}
          onClose={() => setShowInforme(false)} />
      )}

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
                <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0"><ClipboardList className="w-4 h-4 text-accent" /></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold">{t.name}</p><p className="text-xs text-muted">{t.weeks.length} sem · {t.type}</p></div>
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
            {[
              { label: 'Mensaje de bienvenida', desc: 'Abre WhatsApp al asignar el plan', val: wizardAutoWelcome, set: setWizardAutoWelcome, emoji: '👋' },
              { label: 'Check-in semanal', desc: 'Recordatorio de encuesta semanal', val: wizardAutoCheckin, set: setWizardAutoCheckin, emoji: '📋' },
            ].map(a => (
              <div key={a.label} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${a.val ? 'bg-ok/5 border-ok/30' : 'bg-bg border-border'}`}
                onClick={() => a.set(!a.val)}>
                <span className="text-xl">{a.emoji}</span>
                <div className="flex-1"><p className="text-sm font-semibold">{a.label}</p><p className="text-xs text-muted">{a.desc}</p></div>
                <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-all ${a.val ? 'bg-ok' : 'bg-border'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-all ${a.val ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>
            ))}
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

// ── PerfilTab con alertas ─────────────────────────────────
function PerfilTab({ client, logs, alerts, labels, onUpdate, onSaveAlerts }: {
  client: ClientData; logs: TrainingLogs; alerts: ClientAlert[]
  onUpdate: (updates: Record<string, any>) => Promise<void>
  labels?: TrainerLabel[]
  onSaveAlerts: (alerts: ClientAlert[]) => Promise<void>
}) {
  const c = client as any
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: c.name || '', surname: c.surname || '', phone: c.phone || '', objetivo: c.objetivo || '', altura: c.altura || '', weight: c.weight || '', genero: c.genero || '', fechanacimiento: c.fechanacimiento || '' })
  const [saving, setSaving] = useState(false)
  const [showNewAlert, setShowNewAlert] = useState(false)
  const [newAlert, setNewAlert] = useState<{ type: ClientAlert['type']; note: string; date: string }>({
    type: 'llamar', note: '', date: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  })

  const edad = (() => {
    if (!c.fechanacimiento) return null
    const birth = new Date(c.fechanacimiento)
    const today = new Date()
    return today.getFullYear() - birth.getFullYear() - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0)
  })()

  const totalSessions = new Set(Object.values(logs).filter((l: any) => l.done && l.dateDone).map((l: any) => l.dateDone)).size
  const lastSession = Object.values(logs).filter((l: any) => l.done && l.dateDone).map((l: any) => l.dateDone as string).sort().reverse()[0]

  const handleSave = async () => {
    setSaving(true)
    await onUpdate({ name: form.name, surname: form.surname, phone: form.phone, objetivo: form.objetivo, altura: form.altura ? parseFloat(form.altura) : null, weight: form.weight ? parseFloat(form.weight) : 0, genero: form.genero || null, fechanacimiento: form.fechanacimiento || null })
    setEditing(false); setSaving(false)
  }

  const addAlert = async () => {
    if (!newAlert.note.trim()) return
    const alert: ClientAlert = {
      id: crypto.randomUUID().replace(/-/g, ''),
      type: newAlert.type, note: newAlert.note.trim(),
      date: newAlert.date, done: false, createdAt: Date.now()
    }
    await onSaveAlerts([...alerts, alert])
    setNewAlert({ type: 'llamar', note: '', date: new Date(Date.now() + 86400000).toISOString().split('T')[0] })
    setShowNewAlert(false)
    toast('Recordatorio añadido ✓', 'ok')
  }

  const toggleAlert = async (id: string) => {
    await onSaveAlerts(alerts.map(a => a.id === id ? { ...a, done: !a.done } : a))
  }

  const deleteAlert = async (id: string) => {
    await onSaveAlerts(alerts.filter(a => a.id !== id))
  }

  const pendingAlerts = alerts.filter(a => !a.done).sort((a, b) => a.date.localeCompare(b.date))
  const doneAlerts = alerts.filter(a => a.done)

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="animate-fade-in space-y-5 max-w-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-2xl font-serif font-bold text-accent flex-shrink-0">
            {c.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold">{c.name} {c.surname}</h2>
            <p className="text-sm text-muted capitalize">{c.objetivo || 'Sin objetivo'}{edad ? ` · ${edad} años` : ''}</p>
            {c.phone && <p className="text-xs text-[#25D366] mt-0.5">📱 {c.phone}</p>}
          </div>
        </div>
        <button onClick={() => setEditing(!editing)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${editing ? 'border-accent text-accent bg-accent/5' : 'border-border text-muted hover:border-accent hover:text-accent'}`}>
          {editing ? 'Cancelar' : '✏️ Editar'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Sesiones totales', value: totalSessions, icon: '🏋️', color: 'text-accent' },
          { label: 'Última sesión', value: lastSession ? new Date(lastSession + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '—', icon: '📅', color: 'text-ok' },
          { label: 'Peso actual', value: c.weight ? `${c.weight} kg` : '—', icon: '⚖️', color: 'text-ink' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-border rounded-2xl p-4 text-center" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <p className="text-xl mb-1">{s.icon}</p>
            <p className={`text-xl font-serif font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── ETIQUETAS ── */}
      {labels && labels.length > 0 && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div className="px-5 py-3 border-b border-border/50 bg-bg-alt/30">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">🏷️ Etiquetas</p>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {labels.map(label => {
                const clientLabelIds: string[] = (c.label_ids || [])
                const active = clientLabelIds.includes(label.id)
                return (
                  <button key={label.id}
                    onClick={async () => {
                      const current: string[] = c.label_ids || []
                      const updated = active ? current.filter((id: string) => id !== label.id) : [...current, label.id]
                      await onUpdate({ label_ids: updated })
                      ;(client as any).label_ids = updated
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                    style={{ backgroundColor: active ? label.color + '18' : 'transparent', borderColor: label.color + '40', color: label.color, opacity: active ? 1 : 0.5 }}>
                    <span>{label.emoji}</span>
                    <span>{label.name}</span>
                    {active && <span className="ml-0.5">✓</span>}
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-muted mt-2">Las etiquetas sugieren programas al asignar un plan</p>
          </div>
        </div>
      )}
      {/* ── RECORDATORIOS / ALERTAS ── */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div className="px-5 py-3 border-b border-border/50 bg-bg-alt/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-warn" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Recordatorios</p>
            {pendingAlerts.length > 0 && (
              <span className="text-[9px] font-bold bg-warn text-white px-1.5 py-0.5 rounded-full">{pendingAlerts.length}</span>
            )}
          </div>
          <button onClick={() => setShowNewAlert(!showNewAlert)}
            className="flex items-center gap-1 px-3 py-1.5 bg-ink text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">
            <Plus className="w-3 h-3" /> Añadir
          </button>
        </div>

        {/* Form nuevo recordatorio */}
        {showNewAlert && (
          <div className="px-5 py-4 border-b border-border/50 bg-warn/5 space-y-3">
            {/* Tipo */}
            <div className="flex gap-2 flex-wrap">
              {ALERT_TYPES.map(t => (
                <button key={t.id} onClick={() => setNewAlert(a => ({ ...a, type: t.id }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${newAlert.type === t.id ? `${t.bg} ${t.border} ${t.color}` : 'border-border text-muted hover:border-accent'}`}>
                  <span>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
            {/* Nota */}
            <input value={newAlert.note} onChange={e => setNewAlert(a => ({ ...a, note: e.target.value }))}
              placeholder="Descripción del recordatorio..."
              className="w-full px-3 py-2.5 bg-white border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20"
              onKeyDown={e => e.key === 'Enter' && addAlert()}
            />
            {/* Fecha */}
            <div className="flex gap-2 items-center">
              <Calendar className="w-3.5 h-3.5 text-muted flex-shrink-0" />
              <input type="date" value={newAlert.date} onChange={e => setNewAlert(a => ({ ...a, date: e.target.value }))}
                className="flex-1 px-3 py-2 bg-white border border-border rounded-xl text-sm outline-none" />
              <button onClick={addAlert}
                className="px-4 py-2 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
                Guardar
              </button>
            </div>
          </div>
        )}

        {/* Lista alertas pendientes */}
        <div className="divide-y divide-border/40">
          {pendingAlerts.length === 0 && !showNewAlert && (
            <div className="px-5 py-6 text-center">
              <p className="text-xs text-muted">Sin recordatorios pendientes</p>
              <button onClick={() => setShowNewAlert(true)} className="mt-2 text-accent text-xs hover:underline">+ Añadir recordatorio</button>
            </div>
          )}
          {pendingAlerts.map(alert => {
            const meta = ALERT_TYPES.find(t => t.id === alert.type)!
            const isOverdue = alert.date < today
            const isToday = alert.date === today
            return (
              <div key={alert.id} className={`flex items-start gap-3 px-5 py-3.5 ${isOverdue ? 'bg-warn/5' : ''}`}>
                <button onClick={() => toggleAlert(alert.id)}
                  className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${meta.border} hover:bg-ok hover:border-ok`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color} ${meta.border} border`}>
                      {meta.emoji} {meta.label}
                    </span>
                    <span className={`text-[10px] font-semibold ${isOverdue ? 'text-warn' : isToday ? 'text-ok' : 'text-muted'}`}>
                      {isOverdue ? '⚠ ' : isToday ? '📅 Hoy · ' : ''}{new Date(alert.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-sm mt-0.5">{alert.note}</p>
                </div>
                <button onClick={() => deleteAlert(alert.id)} className="p-1 text-muted hover:text-warn transition-colors flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}

          {/* Completados colapsados */}
          {doneAlerts.length > 0 && (
            <details className="group">
              <summary className="px-5 py-2.5 text-[10px] text-muted uppercase tracking-wider font-semibold cursor-pointer hover:bg-bg-alt/30 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-ok" />
                {doneAlerts.length} completado{doneAlerts.length > 1 ? 's' : ''}
              </summary>
              {doneAlerts.map(alert => {
                const meta = ALERT_TYPES.find(t => t.id === alert.type)!
                return (
                  <div key={alert.id} className="flex items-center gap-3 px-5 py-2.5 opacity-50">
                    <button onClick={() => toggleAlert(alert.id)}
                      className="w-5 h-5 rounded border-2 border-ok bg-ok flex-shrink-0 flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs line-through text-muted">{meta.emoji} {alert.note}</p>
                    </div>
                    <button onClick={() => deleteAlert(alert.id)} className="p-1 text-muted hover:text-warn flex-shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
            </details>
          )}
        </div>
      </div>

      {/* Datos personales */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div className="px-5 py-3 border-b border-border/50 bg-bg-alt/30">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Datos personales</p>
        </div>
        {!editing ? (
          <div className="divide-y divide-border/50">
            {[
              { label: 'Nombre completo', value: `${c.name || '—'} ${c.surname || ''}`.trim() },
              { label: 'WhatsApp', value: c.phone || '—' },
              { label: 'Objetivo', value: c.objetivo || '—' },
              { label: 'Altura', value: c.altura ? `${c.altura} cm` : '—' },
              { label: 'Peso', value: c.weight ? `${c.weight} kg` : '—' },
              { label: 'Género', value: c.genero === 'h' ? 'Masculino' : c.genero === 'm' ? 'Femenino' : '—' },
              { label: 'Fecha de nacimiento', value: c.fechanacimiento ? new Date(c.fechanacimiento + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
              { label: 'Edad', value: edad ? `${edad} años` : '—' },
            ].map(row => (
              <div key={row.label} className="flex items-center px-5 py-3 hover:bg-bg-alt/30 transition-colors">
                <p className="text-xs font-semibold text-muted w-36 flex-shrink-0">{row.label}</p>
                <p className="text-sm text-ink">{row.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-muted mb-1.5">Nombre</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" /></div>
              <div><label className="block text-xs font-bold text-muted mb-1.5">Apellido</label><input value={form.surname} onChange={e => setForm(f => ({ ...f, surname: e.target.value }))} className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" /></div>
            </div>
            <div><label className="block text-xs font-bold text-muted mb-1.5">📱 WhatsApp</label><input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+34 600 000 000" className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" /></div>
            <div><label className="block text-xs font-bold text-muted mb-1.5">Objetivo</label><input value={form.objetivo} onChange={e => setForm(f => ({ ...f, objetivo: e.target.value }))} placeholder="Hipertrofia, fuerza..." className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-muted mb-1.5">Altura (cm)</label><input type="number" value={form.altura} onChange={e => setForm(f => ({ ...f, altura: e.target.value }))} className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" /></div>
              <div><label className="block text-xs font-bold text-muted mb-1.5">Peso (kg)</label><input type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-muted mb-1.5">Género</label>
                <select value={form.genero} onChange={e => setForm(f => ({ ...f, genero: e.target.value }))} className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none">
                  <option value="">Sin especificar</option><option value="h">Masculino</option><option value="m">Femenino</option>
                </select></div>
              <div><label className="block text-xs font-bold text-muted mb-1.5">Fecha nacimiento</label><input type="date" value={form.fechanacimiento} onChange={e => setForm(f => ({ ...f, fechanacimiento: e.target.value }))} className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" /></div>
            </div>
            <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity">
              {saving ? 'Guardando...' : '✓ Guardar cambios'}
            </button>
          </div>
        )}
      </div>

      {/* Notas privadas */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div className="px-5 py-3 border-b border-border/50 bg-bg-alt/30">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">🔒 Notas privadas</p>
        </div>
        <div className="p-4">
          <textarea defaultValue={c.notas_privadas || ''}
            onBlur={async e => { await onUpdate({ notas_privadas: e.target.value }) }}
            placeholder="Observaciones, lesiones, preferencias, historial médico..."
            rows={4}
            className="w-full text-sm bg-bg border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent/20 resize-none leading-relaxed" />
          <p className="text-[10px] text-muted mt-1">Se guarda automáticamente al perder el foco</p>
        </div>
      </div>

      {/* WhatsApp directo */}
      {c.phone && (
        <button onClick={() => {
            const url = `${window.location.origin}?c=${client.token}`
            const phone = c.phone.replace(/\s+/g, '').replace(/^\+/, '')
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Hola ${c.name} 👋\n\nTe comparto tu panel:\n\n${url}\n\n💪`)}`, '_blank')
          }}
          className="w-full flex items-center justify-center gap-3 py-3.5 bg-[#25D366] text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-opacity">
          📱 Abrir WhatsApp con {c.name}
        </button>
      )}
    </div>
  )
}

// ── Resto de tabs (VistaTab, EntrenosTab, NotasTab, ConfigTab, DietaTabEntrenador) ──
// Se mantienen igual que en la versión anterior — no las reescribo para ahorrar espacio
// Importa el ClientPanel.tsx anterior para estas funciones o cópialas aquí

function VistaTab({ plan, logs }: { plan: TrainingPlan | null; logs: TrainingLogs }) {
  if (!plan?.weeks?.length) return <div className="text-center py-16 text-muted"><Eye className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="font-serif text-lg">Sin plan asignado</p></div>
  const currentWeek = plan.weeks.find(w => w.isCurrent) || plan.weeks[0]
  const weekIdx = plan.weeks.indexOf(currentWeek)
  return (
    <div className="max-w-2xl space-y-4">
      <div><h3 className="font-serif font-bold text-lg">Vista del cliente</h3><p className="text-xs text-muted mt-0.5">Semana activa: <span className="font-semibold text-ink">{currentWeek.label}</span></p></div>
      {currentWeek.days.map((day, di) => {
        const dayKey = `w${weekIdx}_d${di}`
        const done = day.exercises.filter((_, ri) => logs[`ex_${dayKey}_r${ri}`]?.done).length
        const total = day.exercises.length
        const pct = total ? Math.round(done / total * 100) : 0
        return (
          <div key={di} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${pct === 100 ? 'bg-ok text-white' : 'bg-bg-alt text-muted'}`}>{pct === 100 ? '✓' : `${pct}%`}</div>
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
  if (!dates.length) return <div className="text-center py-16 text-muted"><ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="font-serif text-lg">Sin entrenamientos aún</p></div>
  return (
    <div className="max-w-2xl space-y-4">
      <div><h3 className="font-serif font-bold text-lg">Historial</h3><p className="text-xs text-muted">{dates.length} días con actividad</p></div>
      {dates.map(fecha => (
        <div key={fecha} className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-bg-alt/30">
            <CheckCircle2 className="w-4 h-4 text-ok flex-shrink-0" />
            <p className="text-sm font-semibold capitalize flex-1">{new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <span className="text-xs text-muted">{byDate[fecha].length} ejercicios</span>
          </div>
          <div className="divide-y divide-border">
            {byDate[fecha].map(({ exName, sets, key }) => {
              const setsArr = Object.values(sets || {}) as any[]
              const mejor = setsArr.reduce((max: number, s: any) => Math.max(max, parseFloat(s.weight) || 0), 0)
              return (
                <div key={key} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-bg flex items-center justify-center flex-shrink-0"><Dumbbell className="w-3.5 h-3.5 text-muted" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{exName}</p>
                    <div className="flex gap-1.5 mt-0.5 flex-wrap">{setsArr.map((s: any, si: number) => <span key={si} className="text-[9px] bg-bg-alt text-muted px-1.5 py-0.5 rounded">{s.weight}kg×{s.reps}</span>)}</div>
                  </div>
                  {mejor > 0 && <div className="text-right flex-shrink-0"><p className="text-xs font-bold text-accent">{mejor}kg</p><p className="text-[9px] text-muted">mejor</p></div>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
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
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h4 className="text-sm font-semibold">Mensaje al cliente</h4>
        <textarea rows={3} value={plan.message || ''} onChange={e => onChange({ ...plan, message: e.target.value })}
          placeholder="Mensaje motivacional..." className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none" />
      </div>
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-semibold">Acceso del cliente</h4>
        <div className="flex gap-2">
          <input readOnly value={currentUrl} className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-xs text-muted outline-none font-mono" />
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(currentUrl); toast('Copiado ✓', 'ok') }}>Copiar</Button>
        </div>
        <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Hola ${client.name} 👋\n\n${currentUrl}\n\n💪`)}`, '_blank')}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white rounded-xl text-sm font-bold hover:opacity-90">📱 Enviar por WhatsApp</button>
        {!showRevoke
          ? <button onClick={() => setShowRevoke(true)} className="w-full py-2.5 border border-warn/30 text-warn rounded-xl text-sm font-semibold hover:bg-warn/5">🔒 Regenerar enlace</button>
          : <div className="bg-warn/5 border border-warn/20 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-warn">⚠️ El enlace actual dejará de funcionar</p>
              <div className="flex gap-2">
                <button onClick={() => setShowRevoke(false)} className="flex-1 py-2 border border-border rounded-lg text-sm text-muted">Cancelar</button>
                <button onClick={revokeToken} disabled={revoking} className="flex-1 py-2 bg-warn text-white rounded-lg text-sm font-semibold disabled:opacity-50">{revoking ? 'Regenerando...' : 'Sí, revocar'}</button>
              </div>
            </div>
        }
      </div>
    </div>
  )
}

function DietaTabEntrenador({ clientId, plan, onChange, client, trainerId }: { clientId: string; plan: TrainingPlan | null; onChange: (p: TrainingPlan) => void; client: ClientData; trainerId: string }) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <DietEditor clientId={clientId} isTrainer={true} trainerId={trainerId}
        syncedMacros={{ kcal: (plan as any)?.macros?.kcal || 0, protein: (plan as any)?.macros?.protein || 0, carbs: (plan as any)?.macros?.carbs || 0, fats: (plan as any)?.macros?.fats || 0 }}
        onMacrosChange={m => { if (!plan) return; onChange({ ...plan, macros: { ...(plan as any).macros, ...m } } as any) }} />
    </div>
  )
}

// ── PlanTab — selector de programa + editor ───────────────
function PlanTab({ client, plan, programs, labels, onPlanChange, onImportFromClient, library, logs, otherClients, trainerId }: {
  client: ClientData
  plan: TrainingPlan
  programs: any[]
  labels: any[]
  onPlanChange: (p: TrainingPlan) => void
  onImportFromClient: (id: string) => Promise<TrainingPlan | null>
  library: any[]
  logs: any
  otherClients: ClientData[]
  trainerId: string
}) {
  const [showProgramSelector, setShowProgramSelector] = useState(false)
  const [filterTipo, setFilterTipo] = useState<string | null>(null)
  const [filterLabel, setFilterLabel] = useState<string | null>(null)
  const [assigning, setAssigning] = useState(false)

  // Etiquetas del cliente
  const clientLabelIds: string[] = (client as any).label_ids || []
  const clientLabels = labels.filter(l => clientLabelIds.includes(l.id))

  // Tipos únicos de programas
  const tiposDisponibles = [...new Set(programs.map(p => p.tipo))]

  // Programas filtrados — por defecto muestra los que coinciden con etiquetas del cliente
  const filteredPrograms = programs.filter(p => {
    if (filterLabel && !p.label_ids?.includes(filterLabel)) return false
    if (filterTipo && p.tipo !== filterTipo) return false
    return true
  })

  // Programas sugeridos (coinciden con etiquetas del cliente)
  const suggestedPrograms = programs.filter(p =>
    p.label_ids?.some((id: string) => clientLabelIds.includes(id))
  )

  const assignProgram = async (prog: any) => {
    setAssigning(true)
    // Convertir programa a TrainingPlan
    const weeks = (prog.weeks || []).map((w: any) => ({
      label: w.label,
      rpe: '',
      isCurrent: false,
      days: (w.days || []).map((d: any) => ({
        title: d.tasks?.find((t: any) => t.type === 'workout')?.title || 'Día',
        focus: d.tasks?.filter((t: any) => t.type !== 'workout').map((t: any) => t.title).join(', ') || '',
        exercises: [],
      }))
    }))
    // Marcar semana 1 como actual
    if (weeks.length > 0) weeks[0].isCurrent = true

    const newPlan: TrainingPlan = {
      ...plan,
      type: prog.tipo,
      weeks,
      programId: prog.id,
      programName: prog.name,
      fechaInicio: new Date().toISOString().split('T')[0],
    } as any

    onPlanChange(newPlan)
    setShowProgramSelector(false)
    setAssigning(false)
    toast(`Programa "${prog.name}" asignado ✓`, 'ok')
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
      {/* Banner programa asignado + botón cambiar */}
      <div className="flex-shrink-0 mb-3">
        {(plan as any).programName ? (
          <div className="flex items-center gap-3 px-4 py-3 bg-ok/5 border border-ok/20 rounded-2xl">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-ok uppercase tracking-wider">Programa asignado</p>
              <p className="text-sm font-semibold text-ink truncate">{(plan as any).programName}</p>
              <p className="text-xs text-muted">Tipo: {plan.type} · Inicio: {(plan as any).fechaInicio || '—'}</p>
            </div>
            <button onClick={() => setShowProgramSelector(true)}
              className="flex-shrink-0 px-3 py-1.5 border border-border rounded-xl text-xs font-semibold text-muted hover:border-accent hover:text-accent transition-colors">
              Cambiar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 bg-accent/5 border border-accent/20 rounded-2xl">
            <div className="flex-1">
              <p className="text-sm font-semibold">Sin programa asignado</p>
              {clientLabels.length > 0 && suggestedPrograms.length > 0 && (
                <p className="text-xs text-muted mt-0.5">
                  Hay {suggestedPrograms.length} programa{suggestedPrograms.length > 1 ? 's' : ''} sugerido{suggestedPrograms.length > 1 ? 's' : ''} para {clientLabels.map(l => l.name).join(', ')}
                </p>
              )}
            </div>
            <button onClick={() => setShowProgramSelector(true)}
              className="flex-shrink-0 px-3 py-2 bg-ink text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity">
              Asignar programa
            </button>
          </div>
        )}
      </div>

      {/* Modal selector de programa */}
      {showProgramSelector && (
        <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-border flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-xl">Asignar programa</h3>
                  <p className="text-sm text-muted mt-0.5">{client.name} {client.surname}</p>
                </div>
                <button onClick={() => setShowProgramSelector(false)} className="p-2 rounded-xl hover:bg-bg-alt text-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filtros */}
              <div className="mt-4 space-y-2">
                {/* Etiquetas del cliente — filtro rápido */}
                {clientLabels.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted font-semibold">Etiquetas del cliente:</span>
                    {clientLabels.map(label => (
                      <button key={label.id}
                        onClick={() => setFilterLabel(filterLabel === label.id ? null : label.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${filterLabel === label.id ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                        style={{ backgroundColor: filterLabel === label.id ? label.color + '18' : 'transparent', borderColor: label.color + '60', color: label.color }}>
                        {label.emoji} {label.name}
                        {filterLabel === label.id && <Check className="w-2.5 h-2.5 ml-0.5" />}
                      </button>
                    ))}
                  </div>
                )}
                {/* Filtro por tipo */}
                {tiposDisponibles.length > 1 && (
                  <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => setFilterTipo(null)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${!filterTipo ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
                      Todos
                    </button>
                    {tiposDisponibles.map(tipo => (
                      <button key={tipo} onClick={() => setFilterTipo(filterTipo === tipo ? null : tipo)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${filterTipo === tipo ? 'bg-accent text-white border-accent' : 'border-border text-muted hover:border-accent'}`}>
                        {tipo}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Lista de programas */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredPrograms.length === 0 ? (
                <div className="text-center py-10 text-muted">
                  <p className="text-sm">Sin programas con este filtro</p>
                </div>
              ) : (
                filteredPrograms.map(prog => {
                  const progLabels = labels.filter(l => prog.label_ids?.includes(l.id))
                  const totalTasks = (prog.weeks || []).reduce((a: number, w: any) =>
                    a + (w.days || []).reduce((b: number, d: any) => b + (d.tasks?.length || 0), 0), 0)
                  const isSuggested = prog.label_ids?.some((id: string) => clientLabelIds.includes(id))

                  return (
                    <div key={prog.id}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl border cursor-pointer hover:border-accent/40 transition-all ${isSuggested ? 'bg-ok/3 border-ok/20' : 'bg-bg border-border'}`}
                      onClick={() => assignProgram(prog)}>
                      {/* Preview mini calendario */}
                      <div className="grid grid-cols-7 gap-0.5 flex-shrink-0 w-20">
                        {(prog.weeks?.[0]?.days || Array(7).fill({ tasks: [] })).map((d: any, i: number) => (
                          <div key={i} className={`h-4 rounded-sm ${(d.tasks?.length || 0) > 0 ? 'bg-accent/40' : 'bg-bg-alt'}`} />
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{prog.name}</p>
                          {isSuggested && <span className="text-[9px] bg-ok/10 text-ok px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">✓ Sugerido</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-semibold">{prog.tipo}</span>
                          <span className="text-[10px] text-muted">{(prog.weeks || []).length} sem · {totalTasks} tareas</span>
                          {progLabels.map((l: any) => (
                            <span key={l.id} className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold border"
                              style={{ backgroundColor: l.color + '15', borderColor: l.color + '40', color: l.color }}>
                              {l.emoji} {l.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button className="flex-shrink-0 px-3 py-1.5 bg-ink text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
                        disabled={assigning}>
                        {assigning ? '...' : 'Asignar'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Editor del plan */}
      <div className="flex-1 overflow-hidden min-h-0">
        <TrainingPlanEditor plan={plan} onChange={onPlanChange}
          allClients={otherClients} library={library}
          onImportFromClient={onImportFromClient} logs={logs}
          clientName={`${client.name} ${client.surname}`}
          trainerId={trainerId} />
      </div>
    </div>
  )
}

// ── ValoracionTab ─────────────────────────────────────────
interface Valoracion {
  id: string
  client_id: string
  trainer_id: string
  fecha: string
  peso: number | null
  imc: number | null
  grasa_corporal: number | null
  masa_muscular: number | null
  cintura: number | null
  cadera: number | null
  pecho: number | null
  brazo_d: number | null
  brazo_i: number | null
  muslo_d: number | null
  muslo_i: number | null
  notas: string
  fotos: string[]
  created_at: number
}

function emptyValoracion(clientId: string, trainerId: string): Valoracion {
  return {
    id: `val_${Date.now()}`,
    client_id: clientId,
    trainer_id: trainerId,
    fecha: new Date().toISOString().split('T')[0],
    peso: null, imc: null, grasa_corporal: null, masa_muscular: null,
    cintura: null, cadera: null, pecho: null,
    brazo_d: null, brazo_i: null, muslo_d: null, muslo_i: null,
    notas: '', fotos: [],
    created_at: Date.now(),
  }
}

function ValoracionTab({ client, trainerId }: { client: ClientData; trainerId: string }) {
  const [valoraciones, setValoraciones] = useState<Valoracion[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Valoracion | null>(null)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    loadValoraciones()
  }, [client.id])

  const loadValoraciones = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('valoraciones')
      .select('*')
      .eq('client_id', client.id)
      .order('fecha', { ascending: false })
    if (data) setValoraciones(data)
    setLoading(false)
  }

  const saveValoracion = async () => {
    if (!editing) return
    setSaving(true)
    const { error } = await supabase.from('valoraciones').upsert(editing, { onConflict: 'id' })
    if (error) { toast('Error al guardar', 'warn'); setSaving(false); return }
    setValoraciones(vs => vs.find(v => v.id === editing.id)
      ? vs.map(v => v.id === editing.id ? editing : v)
      : [editing, ...vs])
    setEditing(null)
    toast('Valoración guardada ✓', 'ok')
    setSaving(false)
  }

  const deleteValoracion = async (id: string) => {
    await supabase.from('valoraciones').delete().eq('id', id)
    setValoraciones(vs => vs.filter(v => v.id !== id))
    toast('Eliminada', 'ok')
  }

  const updateField = (field: keyof Valoracion, value: any) => {
    if (!editing) return
    const updated = { ...editing, [field]: value }
    // Calcular IMC automáticamente
    if ((field === 'peso' || field === 'altura') && updated.peso) {
      const altura = (client as any).altura
      if (altura) updated.imc = Math.round((updated.peso / ((altura / 100) ** 2)) * 10) / 10
    }
    setEditing(updated)
  }

  const CAMPOS_COMPOSICION = [
    { key: 'peso',           label: 'Peso',            unit: 'kg',  icon: '⚖️' },
    { key: 'imc',            label: 'IMC',             unit: '',    icon: '📊' },
    { key: 'grasa_corporal', label: '% Grasa corporal',unit: '%',   icon: '🔬' },
    { key: 'masa_muscular',  label: 'Masa muscular',   unit: 'kg',  icon: '💪' },
  ]

  const CAMPOS_MEDIDAS = [
    { key: 'cintura', label: 'Cintura', unit: 'cm' },
    { key: 'cadera',  label: 'Cadera',  unit: 'cm' },
    { key: 'pecho',   label: 'Pecho',   unit: 'cm' },
    { key: 'brazo_d', label: 'Brazo D', unit: 'cm' },
    { key: 'brazo_i', label: 'Brazo I', unit: 'cm' },
    { key: 'muslo_d', label: 'Muslo D', unit: 'cm' },
    { key: 'muslo_i', label: 'Muslo I', unit: 'cm' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // ── Editor ──
  if (editing) return (
    <div className="max-w-xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => setEditing(null)} className="p-2 rounded-xl hover:bg-bg-alt text-muted"><ChevronLeft className="w-4 h-4" /></button>
        <div className="flex-1">
          <h3 className="font-serif font-bold text-lg">Ficha de valoración</h3>
          <p className="text-xs text-muted">{client.name} {client.surname}</p>
        </div>
        <button onClick={saveValoracion} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40">
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* Fecha */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Fecha de la valoración</label>
        <input type="date" value={editing.fecha} onChange={e => updateField('fecha', e.target.value)}
          className="px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
      </div>

      {/* Composición corporal */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 bg-bg-alt/30">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Composición corporal</p>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          {CAMPOS_COMPOSICION.map(campo => (
            <div key={campo.key}>
              <label className="block text-xs font-semibold text-muted mb-1.5">
                {campo.icon} {campo.label} {campo.unit && <span className="text-muted/60">({campo.unit})</span>}
              </label>
              <input
                type="number" step="0.1"
                value={(editing as any)[campo.key] || ''}
                onChange={e => updateField(campo.key as keyof Valoracion, e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="—"
                className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 font-mono"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Medidas */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 bg-bg-alt/30">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Medidas (cm)</p>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          {CAMPOS_MEDIDAS.map(campo => (
            <div key={campo.key}>
              <label className="block text-xs font-semibold text-muted mb-1.5">{campo.label}</label>
              <input
                type="number" step="0.1"
                value={(editing as any)[campo.key] || ''}
                onChange={e => updateField(campo.key as keyof Valoracion, e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="—"
                className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 font-mono"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Notas */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 bg-bg-alt/30">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Observaciones</p>
        </div>
        <div className="p-4">
          <textarea value={editing.notas} onChange={e => updateField('notas', e.target.value)}
            placeholder="Observaciones, objetivos, notas del entrenador..."
            rows={4}
            className="w-full text-sm bg-bg border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent/20 resize-none leading-relaxed" />
        </div>
      </div>
    </div>
  )

  // ── Lista de valoraciones ──
  return (
    <div className="max-w-xl space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif font-bold text-lg">Fichas de valoración</h3>
          <p className="text-xs text-muted mt-0.5">{valoraciones.length} valoración{valoraciones.length !== 1 ? 'es' : ''}</p>
        </div>
        <button onClick={() => setEditing(emptyValoracion(client.id, trainerId))}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
          <Plus className="w-4 h-4" /> Nueva valoración
        </button>
      </div>

      {valoraciones.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl text-muted">
          <p className="text-3xl mb-3">📋</p>
          <p className="font-serif text-lg font-bold">Sin valoraciones</p>
          <p className="text-sm mt-1">Registra la primera valoración física del cliente</p>
          <button onClick={() => setEditing(emptyValoracion(client.id, trainerId))}
            className="mt-4 px-5 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold">
            Nueva valoración
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {valoraciones.map(val => {
            const isExpanded = expanded === val.id
            const hasData = val.peso || val.grasa_corporal || val.cintura
            return (
              <div key={val.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">
                      {new Date(val.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    {hasData && (
                      <div className="flex gap-3 mt-1 flex-wrap">
                        {val.peso && <span className="text-xs text-muted">⚖️ {val.peso}kg</span>}
                        {val.grasa_corporal && <span className="text-xs text-muted">🔬 {val.grasa_corporal}% grasa</span>}
                        {val.imc && <span className="text-xs text-muted">📊 IMC {val.imc}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setEditing(val)} className="p-1.5 text-muted hover:text-accent rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteValoracion(val.id)} className="p-1.5 text-muted hover:text-warn rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setExpanded(isExpanded ? null : val.id)} className="p-1.5 text-muted rounded-lg">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border px-5 py-4 space-y-3">
                    {/* Composición */}
                    <div className="grid grid-cols-4 gap-2">
                      {CAMPOS_COMPOSICION.map(c => (val as any)[c.key] ? (
                        <div key={c.key} className="bg-bg border border-border rounded-xl p-2.5 text-center">
                          <p className="text-sm font-serif font-bold">{(val as any)[c.key]}{c.unit}</p>
                          <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">{c.label}</p>
                        </div>
                      ) : null)}
                    </div>
                    {/* Medidas */}
                    {CAMPOS_MEDIDAS.some(c => (val as any)[c.key]) && (
                      <div className="flex flex-wrap gap-2">
                        {CAMPOS_MEDIDAS.map(c => (val as any)[c.key] ? (
                          <span key={c.key} className="text-xs bg-bg-alt border border-border px-2 py-1 rounded-lg font-medium">
                            {c.label}: {(val as any)[c.key]}cm
                          </span>
                        ) : null)}
                      </div>
                    )}
                    {/* Notas */}
                    {val.notas && (
                      <p className="text-xs text-muted leading-relaxed bg-bg-alt rounded-xl px-3 py-2">
                        {val.notas}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
