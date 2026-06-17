import { useState, useEffect, useCallback } from 'react'
import { Home, Dumbbell, BarChart2, Utensils, MoreHorizontal, MessageSquare, WifiOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { TrainingPlan, TrainingLogs, WeightEntry } from '../../types'
import { ClientDashboard, SelectorDias } from './ClientDashboard'
import { TrainingPlanView } from './TrainingPlanView'
import { ProgresoClienteTab } from './ProgresoClienteTab'
import { PWAInstallBanner } from './PWAInstallBanner'
import { DietEditor } from '../shared/DietEditor'
import { PlanRow, RegistroRow, ClienteRow } from '../../lib/supabase-types'
import { EncuestaClienteTab } from './EncuestaClienteTab'
import { logError } from '../../lib/errors'
import { NotFound } from '../shared/NotFound'
import { ClientRegister } from './ClientRegister'
import { DEFAULT_SERIES_TYPES, SeriesTypeDef } from '../trainer/TrainingPlanEditor'

interface ClientViewProps { token: string; showEncuesta?: boolean }
type Tab = 'hoy' | 'entreno' | 'progreso' | 'dieta' | 'mas' | 'encuesta'
type SyncState = 'idle' | 'saving' | 'saved' | 'error' | 'offline'
type AuthState = 'loading' | 'needs_register' | 'needs_login' | 'authenticated'

export function ClientView({ token, showEncuesta }: ClientViewProps) {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [client, setClient] = useState<ClienteRow | null>(null)
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [logs, setLogs] = useState<TrainingLogs>({})
  const [weightHistory] = useState<WeightEntry[]>([])
  const [activeTab, setActiveTab] = useState<Tab>(showEncuesta ? 'encuesta' : 'hoy')
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [trainerProfile, setTrainerProfile] = useState<Record<string, any>>({})
  const [seriesTypes, setSeriesTypes] = useState<SeriesTypeDef[]>(DEFAULT_SERIES_TYPES)

  useEffect(() => {
    const online = () => { setIsOnline(true); setSyncState('idle') }
    const offline = () => { setIsOnline(false); setSyncState('offline') }
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)

    // Escuchar cambios de auth — si el cliente inicia sesión, cargar datos
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && authState === 'needs_login') {
        loadData(session.user.id)
      }
    })

    checkAuth()

    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
      subscription.unsubscribe()
    }
  }, [token])

  const checkAuth = async () => {
    // 1. Cargar datos del cliente por token
    const { data: clientData, error: cErr } = await supabase
      .from('clientes').select('*').eq('token', token).maybeSingle()
    if (cErr) logError('ClientView:loadClient', cErr)
    if (!clientData) { setError('Enlace no válido o expirado.'); setLoading(false); return }
    setClient(clientData)

    // 2. ¿El cliente tiene cuenta creada?
    if (!clientData.auth_user_id) {
      // Primera vez — mostrar registro
      setAuthState('needs_register')
      setLoading(false)
      return
    }

    // 3. ¿Hay sesión activa?
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user && session.user.id === clientData.auth_user_id) {
      // Sesión activa y coincide — cargar datos
      await loadData(session.user.id, clientData)
    } else {
      // Tiene cuenta pero no sesión — mostrar login
      setAuthState('needs_login')
      setLoading(false)
    }
  }

  const loadData = async (userId?: string, preloadedClient?: ClienteRow) => {
    setLoading(true)
    const clientData = preloadedClient || client
    if (!clientData) { setLoading(false); return }

    // Cargar logs desde localStorage (offline-first)
    const localLogs = localStorage.getItem(`pf_logs_${clientData.id}`)
    if (localLogs) { try { setLogs(JSON.parse(localLogs)) } catch {} }

    // Plan
    const { data: planData } = await supabase
      .from('planes').select('plan').eq('clientId', clientData.id).maybeSingle()
    const planRow = planData as PlanRow | null
    if (planRow?.plan?.P) {
      const p = planRow.plan.P as TrainingPlan
      if (p.fechaInicio && p.weeks?.length) {
        const inicio = new Date(p.fechaInicio + 'T00:00:00')
        const dias = Math.max(0, Math.floor((new Date().getTime() - inicio.getTime()) / 86400000))
        const semActual = Math.min(Math.floor(dias / 7), p.weeks.length - 1)
        p.weeks = p.weeks.map((w, i) => ({ ...w, isCurrent: i === semActual }))
      }
      setPlan(p)
    }

    // Registros
    const { data: regData } = await supabase
      .from('registros').select('logs').eq('clientId', clientData.id).maybeSingle()
    const regRow = regData as RegistroRow | null
    if (regRow?.logs) setLogs(regRow.logs as TrainingLogs)

    // Perfil del entrenador
    if (clientData.trainerId) {
      const { data: trainerData } = await supabase
        .from('entrenadores').select('profile').eq('uid', clientData.trainerId).maybeSingle()
      if (trainerData?.profile && Object.keys(trainerData.profile).length > 0) {
        setTrainerProfile(trainerData.profile)
        localStorage.setItem(`pf_trainer_profile_${clientData.trainerId}`, JSON.stringify(trainerData.profile))
        if (trainerData.profile.seriesTypes?.length) setSeriesTypes(trainerData.profile.seriesTypes)
      } else {
        try {
          const local = JSON.parse(localStorage.getItem(`pf_trainer_profile_${clientData.trainerId}`) || '{}')
          setTrainerProfile(local)
          if (local.seriesTypes?.length) setSeriesTypes(local.seriesTypes)
        } catch {}
      }
    }

    setAuthState('authenticated')
    setLoading(false)
  }

  const handleRegistered = async () => {
    // Después del registro, refrescar sesión y cargar datos
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await loadData(session.user.id)
    }
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

  const handleDiasUpdate = useCallback(async (dias: number[]) => {
    if (!plan || !client?.id) return
    const newPlan = { ...plan, diasElegidos: dias }
    setPlan(newPlan)
    await supabase.from('planes').update({ plan: { P: newPlan }, updatedAt: Date.now() }).eq('clientId', client.id)
  }, [plan, client?.id])

  // ── Pantalla de carga inicial ──
  if (loading && authState === 'loading') return (
    <div className="min-h-[100dvh] bg-bg flex items-center justify-center">
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

  if (error) return <NotFound />

  // ── Registro / Login ──
  if (authState === 'needs_register' && client) {
    const trainerProf = (() => {
      try { return JSON.parse(localStorage.getItem(`pf_trainer_profile_${client.trainerId}`) || '{}') } catch { return {} }
    })()
    return (
      <ClientRegister
        token={token}
        clientName={`${client.name || ''} ${client.surname || ''}`.trim()}
        trainerName={trainerProf.brandName || trainerProf.displayName || 'Tu entrenador'}
        brandColor={trainerProf.brandColor}
        brandLogo={trainerProf.brandLogo}
        onComplete={handleRegistered}
      />
    )
  }

  if (authState === 'needs_login' && client) {
    const trainerProf = (() => {
      try { return JSON.parse(localStorage.getItem(`pf_trainer_profile_${client.trainerId}`) || '{}') } catch { return {} }
    })()
    return (
      <ClientRegister
        token={token}
        clientName={`${client.name || ''} ${client.surname || ''}`.trim()}
        trainerName={trainerProf.brandName || trainerProf.displayName || 'Tu entrenador'}
        brandColor={trainerProf.brandColor}
        brandLogo={trainerProf.brandLogo}
        onComplete={() => loadData()}
      />
    )
  }

  if (!client || authState !== 'authenticated') return null

  const clientName = `${client.name || ''} ${client.surname || ''}`.trim()
  const brandName = trainerProfile.brandName || 'PanelFit'
  const brandLogo = trainerProfile.brandLogo || null
  const brandColor = trainerProfile.brandColor || '#6e5438'
  const welcomeMsg = trainerProfile.welcomeMsg || ''
  const motivMsg = trainerProfile.motivMsg || ''
  const restDayMsg = trainerProfile.restDayMsg || ''
  const brandBg = trainerProfile.brandBg || ''

  const TABS = [
    { id: 'hoy' as Tab,      icon: Home,           label: 'Hoy' },
    { id: 'entreno' as Tab,  icon: Dumbbell,       label: 'Entreno' },
    { id: 'progreso' as Tab, icon: BarChart2,      label: 'Progreso' },
    { id: 'dieta' as Tab,    icon: Utensils,       label: 'Dieta' },
    { id: 'mas' as Tab,      icon: MoreHorizontal, label: 'Más' },
  ]

  const SyncIndicator = () => {
    if (syncState === 'idle') return null
    return (
      <div className={`fixed top-14 left-0 right-0 z-20 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold ${
        syncState === 'saving' ? 'bg-accent/10 text-accent' :
        syncState === 'saved' ? 'bg-ok/10 text-ok' : 'bg-warn/10 text-warn'
      }`}>
        {syncState === 'saving' && <><span className="w-2 h-2 bg-accent rounded-full animate-pulse" />Guardando...</>}
        {syncState === 'saved' && <><CheckCircle2 className="w-3.5 h-3.5" />Guardado</>}
        {syncState === 'offline' && <><WifiOff className="w-3.5 h-3.5" />Sin conexión — guardado localmente</>}
        {syncState === 'error' && <><AlertCircle className="w-3.5 h-3.5" />Error al guardar</>}
      </div>
    )
  }

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col"
      style={{ backgroundImage: brandBg ? `url(${brandBg})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'scroll', backgroundColor: '#f5f0ea' }}>

      <header className="bg-card/95 backdrop-blur-sm border-b border-border flex-shrink-0 z-20">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            {brandLogo
              ? <img src={brandLogo} className="w-8 h-8 rounded-full object-cover border border-border flex-shrink-0" alt={brandName} />
              : <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: brandColor }}>{brandName[0]}</div>
            }
            <span className="font-serif font-bold text-base">{brandName}</span>
          </div>
          <div className="flex items-center gap-2">
            {!isOnline && <WifiOff className="w-4 h-4 text-warn" />}
            <div className="text-right">
              <p className="text-xs font-semibold">{clientName}</p>
              {plan?.type && <p className="text-[10px] text-muted capitalize">{plan.type}</p>}
            </div>
          </div>
        </div>
      </header>

      <SyncIndicator />
      <PWAInstallBanner />

      <main className="flex-1 overflow-y-auto overscroll-contain max-w-2xl mx-auto w-full relative z-10"
        style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))', WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-card border border-border rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {activeTab === 'hoy' && (
              plan
                ? <>
                    <SelectorDias plan={plan} clientId={client.id} onUpdate={handleDiasUpdate} />
                    <ClientDashboard
                      plan={plan} logs={logs} onLogsChange={handleLogsChange}
                      weightHistory={weightHistory} clientName={clientName} clientId={client.id}
                      objetivo={client.objetivo} welcomeMsg={welcomeMsg} motivMsg={motivMsg}
                      restDayMsg={restDayMsg} brandBg={brandBg} brandColor={brandColor}
                      seriesTypes={seriesTypes}
                    />
                  </>
                : <NoPlanView />
            )}
            {activeTab === 'entreno' && (
              plan
                ? <TrainingPlanView plan={plan} logs={logs} onLogsChange={handleLogsChange} seriesTypes={seriesTypes} trainerId={client.trainerId} />
                : <NoPlanView />
            )}
            {activeTab === 'progreso' && <ProgresoClienteTab clientId={client.id} logs={logs} plan={plan} />}
            {activeTab === 'dieta' && <DietEditor clientId={client.id} isTrainer={false} />}
            {activeTab === 'encuesta' && <EncuestaClienteTab client={client} />}
            {activeTab === 'mas' && <MasTab client={client} plan={plan} onLogout={async () => {
              await supabase.auth.signOut()
              setAuthState('needs_login')
            }} />}
          </>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-20"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex max-w-2xl mx-auto">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
              style={{ minHeight: '56px' }}
              aria-label={label}>
              <Icon className={`w-5 h-5 transition-colors ${activeTab === id ? 'text-ink' : 'text-muted'}`} />
              <span className={`text-[10px] font-medium ${activeTab === id ? 'text-ink font-bold' : 'text-muted'}`}>{label}</span>
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

function MasTab({ client, plan, onLogout }: { client: ClienteRow; plan: TrainingPlan | null; onLogout: () => void }) {
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
        <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Tu programa</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">Tipo</span><span className="font-semibold capitalize">{plan.type}</span></div>
            <div className="flex justify-between"><span className="text-muted">Semanas</span><span className="font-semibold">{plan.weeks?.length || 0}</span></div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Tu cuenta</p>
        <p className="text-sm"><span className="text-muted">Nombre:</span> <span className="font-semibold">{client.name} {client.surname}</span></p>
      </div>

      {/* Cerrar sesión */}
      <button onClick={onLogout}
        className="w-full py-3 border border-border rounded-2xl text-sm font-medium text-muted hover:bg-bg-alt transition-colors">
        Cerrar sesión
      </button>
    </div>
  )
}
