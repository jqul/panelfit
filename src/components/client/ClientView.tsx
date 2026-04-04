import { useState, useEffect, useCallback } from 'react'
import { Home, Dumbbell, BarChart2, Utensils, MoreHorizontal, MessageSquare, Wifi, WifiOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { TrainingPlan, TrainingLogs, WeightEntry } from '../../types'
import { ClientDashboard } from './ClientDashboard'
import { TrainingPlanView } from './TrainingPlanView'
import { ProgresoClienteTab } from './ProgresoClienteTab'
import { DietEditor } from '../shared/DietEditor'
import { PlanRow, RegistroRow, ClienteRow } from '../../lib/supabase-types'
import { EncuestaClienteTab } from './EncuestaClienteTab'
import { logError } from '../../lib/errors'

interface ClientViewProps { token: string; showEncuesta?: boolean }
type Tab = 'hoy' | 'entreno' | 'progreso' | 'dieta' | 'mas' | 'encuesta'
type SyncState = 'idle' | 'saving' | 'saved' | 'error' | 'offline'

export function ClientView({ token, showEncuesta }: ClientViewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [client, setClient] = useState<ClienteRow | null>(null)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)
  const [pinVerified, setPinVerified] = useState(false)
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [logs, setLogs] = useState<TrainingLogs>({})
  const [weightHistory] = useState<WeightEntry[]>([])
  const [activeTab, setActiveTab] = useState<Tab>(showEncuesta ? 'encuesta' : 'hoy')
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    loadData()
    const online = () => { setIsOnline(true); setSyncState('idle') }
    const offline = () => { setIsOnline(false); setSyncState('offline') }
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  }, [token])

  const loadData = async () => {
    setLoading(true)
    const { data: clientData, error: cErr } = await supabase
      .from('clientes').select('*').eq('token', token).maybeSingle()
    if (cErr) logError('ClientView:loadClient', cErr)
    if (!clientData) { setError('Enlace no válido o expirado.'); setLoading(false); return }
    setClient(clientData)

    // Cargar logs desde localStorage primero (offline-first)
    const localLogs = localStorage.getItem(`pf_logs_${clientData.id}`)
    if (localLogs) {
      try { setLogs(JSON.parse(localLogs)) } catch {}
    }

    const { data: planData, error: planErr } = await supabase
      .from('planes').select('plan').eq('clientId', clientData.id).maybeSingle()
    if (planErr) logError('ClientView:loadPlan', planErr)
    const planRow = planData as PlanRow | null
    if (planRow?.plan?.P) setPlan(planRow.plan.P as TrainingPlan)

    const { data: regData, error: regErr } = await supabase
      .from('registros').select('logs').eq('clientId', clientData.id).maybeSingle()
    if (regErr) logError('ClientView:loadRegistros', regErr)
    const regRow = regData as RegistroRow | null
    if (regRow?.logs) setLogs(regRow.logs as TrainingLogs)

    setLoading(false)
  }

  const handleLogsChange = useCallback(async (newLogs: TrainingLogs) => {
    setLogs(newLogs)
    setSyncState('saving')
    if (client?.id) localStorage.setItem(`pf_logs_${client.id}`, JSON.stringify(newLogs))

    if (!navigator.onLine) { setSyncState('offline'); return }

    if (client?.id) {
      const { error: updateErr } = await supabase.from('registros')
        .update({ logs: newLogs, updatedAt: Date.now() }).eq('clientId', client.id)
      if (updateErr) {
        const { error: insertErr } = await supabase.from('registros')
          .insert({ clientId: client.id, logs: newLogs, updatedAt: Date.now() })
        if (insertErr) { logError('ClientView:saveLogs', insertErr); setSyncState('error'); return }
      }
      setSyncState('saved')
      setTimeout(() => setSyncState('idle'), 2000)
    }
  }, [client?.id])

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></h1>
        <div className="flex gap-1 justify-center">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <h1 className="text-3xl font-serif font-bold mb-6">Panel<span className="text-accent italic">Fit</span></h1>
        <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
          <AlertCircle className="w-10 h-10 text-warn mx-auto" />
          <p className="text-warn font-semibold">Enlace no válido</p>
          <p className="text-muted text-sm">{error}</p>
          <p className="text-muted text-sm">Pide a tu entrenador que te envíe el enlace correcto.</p>
        </div>
      </div>
    </div>
  )

  // PIN
  const planPin = (plan as unknown as { pin?: string })?.pin
  if (!loading && !error && planPin && !pinVerified) {
    const checkPin = () => {
      if (pinInput === planPin) { setPinVerified(true); setPinError(false) }
      else { setPinError(true); setPinInput('') }
    }
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="w-full max-w-xs text-center space-y-6">
          <h1 className="text-3xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></h1>
          <div className="space-y-3">
            <input type="number" value={pinInput} onChange={e => { setPinInput(e.target.value); setPinError(false) }}
              onKeyDown={e => e.key === 'Enter' && checkPin()}
              placeholder="PIN de acceso"
              className={`w-full px-4 py-4 bg-card border rounded-2xl text-center font-serif outline-none tracking-widest ${pinError ? 'border-warn' : 'border-border focus:border-accent'}`}
              style={{ fontSize: '24px' }} autoFocus />
            {pinError && <p className="text-sm text-warn">PIN incorrecto.</p>}
            <button onClick={checkPin} style={{ minHeight: '52px' }}
              className="w-full py-4 bg-ink text-white rounded-2xl font-bold hover:opacity-90">
              Entrar
            </button>
          </div>
          <p className="text-xs text-muted">Si no recuerdas tu PIN, contacta con tu entrenador.</p>
        </div>
      </div>
    )
  }

  if (!client) return null

  const clientName = `${client.name || ''} ${client.surname || ''}`.trim()
  const trainerProfile = (() => {
    try { return JSON.parse(localStorage.getItem(`pf_trainer_profile_${client.trainerId}`) || '{}') } catch { return {} }
  })()
  const brandName = trainerProfile.brandName || 'PanelFit'
  const brandLogo = trainerProfile.brandLogo || null

  const TABS = [
    { id: 'hoy' as Tab,      icon: Home,           label: 'Hoy' },
    { id: 'entreno' as Tab,  icon: Dumbbell,       label: 'Entreno' },
    { id: 'progreso' as Tab, icon: BarChart2,      label: 'Progreso' },
    { id: 'dieta' as Tab,    icon: Utensils,       label: 'Dieta' },
    { id: 'mas' as Tab,      icon: MoreHorizontal, label: 'Más' },
  ]

  // Indicador de sync
  const SyncIndicator = () => {
    if (syncState === 'idle') return null
    return (
      <div className={`fixed top-16 left-0 right-0 z-20 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold transition-all ${
        syncState === 'saving' ? 'bg-accent/10 text-accent' :
        syncState === 'saved' ? 'bg-ok/10 text-ok' :
        syncState === 'offline' ? 'bg-warn/10 text-warn' :
        'bg-warn/10 text-warn'
      }`}>
        {syncState === 'saving' && <><span className="w-2 h-2 bg-accent rounded-full animate-pulse" />Guardando...</>}
        {syncState === 'saved' && <><CheckCircle2 className="w-3.5 h-3.5" />Guardado</>}
        {syncState === 'offline' && <><WifiOff className="w-3.5 h-3.5" />Sin conexión — guardado localmente</>}
        {syncState === 'error' && <><AlertCircle className="w-3.5 h-3.5" />Error al guardar</>}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            {brandLogo && (
              <img src={brandLogo} className="w-8 h-8 rounded-full object-cover border border-border flex-shrink-0" alt="Logo" />
            )}
            <span className="font-serif font-bold text-base">{brandName}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Indicador online/offline compacto */}
            {!isOnline && (
              <div className="flex items-center gap-1 text-warn">
                <WifiOff className="w-4 h-4" />
              </div>
            )}
            <div className="text-right">
              <p className="text-xs font-semibold">{clientName}</p>
              {plan?.type && <p className="text-[10px] text-muted capitalize">{plan.type}</p>}
            </div>
          </div>
        </div>
      </header>

      {/* Sync banner */}
      <SyncIndicator />

      {/* Contenido */}
      <main className="flex-1 pb-20 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-card border border-border rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {activeTab === 'hoy' && (
              plan
                ? <ClientDashboard plan={plan} logs={logs} onLogsChange={handleLogsChange}
                    weightHistory={weightHistory} clientName={clientName} clientId={client.id} objetivo={(client as any).objetivo} />
                : <NoPlanView />
            )}
            {activeTab === 'entreno' && (
              plan
                ? <TrainingPlanView plan={plan} logs={logs} onLogsChange={handleLogsChange} />
                : <NoPlanView />
            )}
            {activeTab === 'progreso' && <ProgresoClienteTab clientId={client.id} logs={logs} />}
            {activeTab === 'dieta' && <DietEditor clientId={client.id} isTrainer={false} />}
            {activeTab === 'encuesta' && <EncuestaClienteTab client={client} />}
            {activeTab === 'mas' && <MasTab client={client} plan={plan} />}
          </>
        )}
      </main>

      {/* Tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-10">
        <div className="flex max-w-2xl mx-auto">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
              style={{ minHeight: '56px' }}
              aria-label={label}
              aria-current={activeTab === id ? 'page' : undefined}>
              <Icon className={`w-5 h-5 transition-colors ${activeTab === id ? 'text-ink' : 'text-muted'}`} />
              <span className={`text-[10px] font-medium ${activeTab === id ? 'text-ink font-bold' : 'text-muted'}`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

function NoPlanView() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center text-muted">
      <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-20" />
      <p className="font-serif text-xl font-bold mb-2">Sin plan asignado</p>
      <p className="text-sm">Tu entrenador aún no ha creado tu programa. ¡Pronto lo tendrás!</p>
    </div>
  )
}

function MasTab({ client, plan }: { client: ClienteRow; plan: TrainingPlan | null }) {
  const trainerPhone = localStorage.getItem(`pf_trainer_phone_${client.trainerId}`) || ''
  const waUrl = trainerPhone
    ? `https://wa.me/${trainerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, soy ${client.name}. Te escribo desde mi panel de PanelFit.`)}`
    : `https://wa.me/?text=${encodeURIComponent(`Hola, soy ${client.name}. Te escribo desde mi panel de PanelFit.`)}`

  return (
    <div className="px-4 py-6 space-y-4 max-w-xl mx-auto pb-24">
      <h3 className="font-serif font-bold text-xl">Más opciones</h3>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Tu entrenador</p>
        </div>
        <div className="p-4">
          <a href={waUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-3 px-4 py-3 bg-[#25D366]/10 border border-[#25D366]/20 rounded-xl"
            style={{ minHeight: '56px' }}>
            <MessageSquare className="w-5 h-5 text-[#25D366] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Contactar por WhatsApp</p>
              <p className="text-xs text-muted">Abre WhatsApp con mensaje preparado</p>
            </div>
          </a>
        </div>
      </div>

      {plan && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Tu programa</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Tipo</span>
              <span className="font-semibold capitalize">{plan.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Semanas</span>
              <span className="font-semibold">{plan.weeks?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Descanso principal</span>
              <span className="font-semibold">{plan.restMain}s</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Tu cuenta</p>
        <p className="text-sm"><span className="text-muted">Nombre:</span> <span className="font-semibold">{client.name} {client.surname}</span></p>
      </div>
    </div>
  )
}
