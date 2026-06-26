import { useState, useEffect, useRef } from 'react'
import {
  X, Save, ChevronLeft, FileText, Dumbbell, Settings, Star,
  ClipboardList, Eye, TrendingUp, StickyNote,
  ClipboardCheck, Link, MessageCircle, User
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ClientData, TrainingPlan, TrainingLogs, UserProfile, TrainingTemplate } from '../../types'
import { Button } from '../shared/Button'
import { Modal } from '../shared/Modal'
import { toast } from '../shared/Toast'
import { ProgresoTab } from './ProgresoTab'
import { InformePDF } from './InformePDF'
import { PlanGate } from '../shared/PlanGate'
import { useExerciseLibrary } from '../../hooks/useExerciseLibrary'
import { PlanRow, RegistroRow } from '../../lib/supabase-types'
import { logError } from '../../lib/errors'
import { sendPush } from '../../lib/usePushNotifications'
import { PerfilTab, ClientAlert } from './client-panel/PerfilTab'
import { VistaTab } from './client-panel/VistaTab'
import { EntrenosTab } from './client-panel/EntrenosTab'
import { NotasTab } from './client-panel/NotasTab'
import { ConfigTab } from './client-panel/ConfigTab'
import { DietaTabEntrenador } from './client-panel/DietaTabEntrenador'
import { PlanTab } from './client-panel/PlanTab'
import { ValoracionTab } from './client-panel/ValoracionTab'
import { TrainingSession } from './TrainingSession'

type Tab = 'perfil' | 'plan' | 'dieta' | 'vista' | 'entrenos' | 'progreso' | 'valoracion' | 'notas' | 'config'

interface Props {
  client: ClientData
  userProfile: UserProfile
  allClients: ClientData[]
  onClose: () => void
  demoPlan?: TrainingPlan
  demoLogs?: TrainingLogs
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
    const row = { id: tmpl.id, trainer_id: trainerId, name: tmpl.name || 'Plantilla', description: tmpl.description || '', plan: tmpl, created_at: Date.now(), updated_at: Date.now() }
    const { error } = await supabase.from('plan_templates').upsert(row, { onConflict: 'id' })
    if (error) { logError('ClientPanel:saveTemplate', error); toast('No se pudo guardar la plantilla en la nube', 'warn') }
  }

  const deleteTemplate = async (id: string) => {
    const updated = templates.filter(t => t.id !== id)
    setTemplates(updated)
    localStorage.setItem(`pf_templates_${trainerId}`, JSON.stringify(updated))
    const { error } = await supabase.from('plan_templates').delete().eq('id', id)
    if (error) { logError('ClientPanel:deleteTemplate', error); toast('No se pudo eliminar la plantilla en la nube', 'warn') }
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
  const [showDayPicker, setShowDayPicker] = useState(false)
  const [liveSession, setLiveSession] = useState<{ weekIdx: number; dayIdx: number } | null>(null)
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
    else setPlan({ clientId: client.id, type: client.objetivo || 'hipertrofia', restMain: 180, restAcc: 90, restWarn: 30, weeks: [] })
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

  const saveLogs = async (newLogs: TrainingLogs) => {
    setLogs(newLogs)
    if (demoPlan !== undefined) return
    await supabase.from('registros').upsert({ clientId: client.id, logs: newLogs }, { onConflict: 'clientId' })
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
    const newPlan: TrainingPlan = { ...plan, type: template.type, weeks, fechaInicio, autoCheckin }
    setPlan(newPlan); savePlan(newPlan)
    if (autoWelcome) {
      const url = `${window.location.origin}?c=${client.token}`
      const msg = encodeURIComponent(`Hola ${client.name} 👋\n\nTe he asignado tu nuevo programa:\n\n${url}\n\n💪`)
      setTimeout(() => window.open(`https://wa.me/?text=${msg}`, '_blank'), 500)
      // Push real y automático al cliente — esto sí llega sin que nadie tenga que pulsar nada
      sendPush({ clientId: client.id }, 'Nueva rutina disponible 💪', `${client.name}, tu entrenador te ha asignado un nuevo programa`)
    }
    setShowTemplates(false); setWizardStep(1); setWizardTemplate(null)
    toast(`Plantilla "${template.name}" aplicada ✓`, 'ok')
    sendPush({ clientId: client.id }, 'Nuevo plan asignado 🏋️', `Tu entrenador te ha asignado "${template.name}"`)
  }

  const importFromClient = async (clientId: string): Promise<TrainingPlan | null> => {
    const { data } = await supabase.from('planes').select('plan').eq('clientId', clientId).maybeSingle()
    const planRow = data as PlanRow | null
    const importedPlan = planRow?.plan?.P as TrainingPlan | undefined
    if (importedPlan?.weeks?.length) return importedPlan
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
              <p className="text-[10px] text-muted capitalize truncate">{plan?.type || client.objetivo || 'Sin tipo'}</p>
              {client.phone && <p className="text-[10px] text-[#25D366] truncate">📱 {client.phone}</p>}
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
              const phone = client.phone?.replace(/\s+/g, '').replace(/^\+/, '')
              const msg = encodeURIComponent(`Hola ${client.name} 👋\n\nTe comparto tu panel:\n\n${clientUrl}\n\n💪`)
              window.open(phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank')
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-[#25D366] border border-[#25D366]/30 rounded-xl hover:bg-[#25D366]/5 transition-colors">
            <MessageCircle className="w-3.5 h-3.5" /> {client.phone ? 'WhatsApp directo' : 'WhatsApp'}
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
            {activeTab === 'plan' && plan?.weeks?.length ? (
              <button onClick={() => setShowDayPicker(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-ok text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">
                ▶ Sesión en vivo
              </button>
            ) : null}
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
                    plan={plan} onPlanChange={handlePlanChange} trainerId={userProfile.uid}
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
              {activeTab === 'entrenos' && <div className="flex-1 overflow-y-auto"><EntrenosTab logs={logs} plan={plan} clientId={client.id} /></div>}
              {activeTab === 'progreso' && <div className="flex-1 overflow-y-auto"><ProgresoTab client={client} logs={logs} plan={plan} library={library.exercises} trainerId={userProfile.uid} /></div>}
              {activeTab === 'valoracion' && <div className="flex-1 overflow-y-auto"><ValoracionTab client={client} trainerId={userProfile.uid} /></div>}
              {activeTab === 'notas' && <div className="flex-1 overflow-y-auto"><NotasTab plan={plan} onChange={handlePlanChange} /></div>}
              {activeTab === 'config' && <div className="flex-1 overflow-y-auto"><ConfigTab client={client} plan={plan} onChange={handlePlanChange} /></div>}
            </div>
          )}
        </main>
      </div>

      {/* Selector de día para sesión en vivo */}
      <Modal open={showDayPicker} onClose={() => setShowDayPicker(false)} title="¿Qué día vais a entrenar?">
        <div className="space-y-2">
          {plan?.weeks?.map((week, wi) => (
            <div key={wi} className={week.isCurrent ? '' : 'opacity-60'}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">{week.label}{week.isCurrent ? ' · actual' : ''}</p>
              <div className="space-y-1.5 mb-3">
                {week.days.map((day, di) => (
                  <button key={di} onClick={() => { setLiveSession({ weekIdx: wi, dayIdx: di }); setShowDayPicker(false) }}
                    className="w-full flex items-center justify-between px-3 py-2.5 border border-border rounded-xl text-left hover:border-ok transition-colors">
                    <span className="text-sm font-semibold">{day.title}</span>
                    <span className="text-xs text-muted">{day.exercises.length} ej.</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Sesión en vivo — el entrenador registra desde su propio dispositivo */}
      {liveSession && plan && (
        <div className="fixed inset-0 z-[80] bg-bg">
          <TrainingSession
            day={plan.weeks[liveSession.weekIdx].days[liveSession.dayIdx]}
            dayKey={`w${liveSession.weekIdx}_d${liveSession.dayIdx}`}
            plan={plan}
            logs={logs}
            onLogsChange={saveLogs}
            onFinish={() => setLiveSession(null)}
            onBack={() => setLiveSession(null)}
            clientId={client.id}
            clientName={client.name}
          />
        </div>
      )}

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
