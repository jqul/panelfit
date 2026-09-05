import { useState, useEffect, useCallback, useRef } from 'react'
import { Home, Dumbbell, BarChart2, Utensils, MoreHorizontal, WifiOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { TrainingPlan, TrainingLogs } from '../../types'
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
import { HabitosWidget } from './HabitosWidget'
import { BadgesWidget } from './BadgesWidget'
import { ReadinessCheckin } from './ReadinessCheckin'
import { DEFAULT_SERIES_TYPES, SeriesTypeDef } from '../trainer/TrainingPlanEditor'
import { MessageTemplate, resolveMessage } from '../../lib/messageTemplates'
import { DEMO_CLIENTS, DEMO_PLAN_MAP, DEMO_LOGS_MAP, DEMO_TRAINER_PROFILE } from '../../lib/demo-data'
import { PENDING_LOGS_KEY, CLIENT_CACHE_KEY, PLAN_CACHE_KEY, pushLogsToServer } from './client-view/helpers'
import { ProximasSesiones } from './client-view/ProximasSesiones'
import { MasTab } from './client-view/MasTab'
import { NoPlanView, SyncIndicator } from './client-view/misc'

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
  const [activeTab, setActiveTab] = useState<Tab>(showEncuesta ? 'encuesta' : 'hoy')
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [trainerProfile, setTrainerProfile] = useState<Record<string, any>>({})
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([])
  const [seriesTypes, setSeriesTypes] = useState<SeriesTypeDef[]>(DEFAULT_SERIES_TYPES)
  const loggingOutRef = useRef(false)
  const authStateRef = useRef(authState)
  authStateRef.current = authState

  useEffect(() => {
    const online = () => { setIsOnline(true); setSyncState('idle') }
    const offline = () => { setIsOnline(false); setSyncState('offline') }
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)

    // Escuchar cambios de auth — si el cliente inicia sesión, cargar datos
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (loggingOutRef.current) {
        if (event === 'SIGNED_OUT') loggingOutRef.current = false
        return
      }
      if (session?.user && authStateRef.current === 'needs_login') {
        loadData()
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
    // Enlace de uno de nuestros 3 clientes de demostración fijos — entra directo,
    // sin registro ni login, igual que el modo demo del entrenador. Importante:
    // solo si el token coincide EXACTO con uno de los 3 — un cliente real cuyo
    // token generado al azar empiece por "demo-" por pura coincidencia no debe
    // caer aquí, tiene que seguir el camino normal de abajo (get_client_by_token).
    const demoClient = DEMO_CLIENTS.find(c => c.token === token)
    if (demoClient) {
      setClient({
        id: demoClient.id, trainerId: demoClient.trainerId, name: demoClient.name, surname: demoClient.surname,
        weight: demoClient.weight, fatPercentage: demoClient.fatPercentage, muscleMass: demoClient.muscleMass,
        totalLifted: demoClient.totalLifted, planDescription: demoClient.planDescription,
        token: demoClient.token, objetivo: demoClient.objetivo, createdAt: demoClient.createdAt,
      } as ClienteRow)
      setPlan(DEMO_PLAN_MAP[demoClient.id] || null)
      setLogs(DEMO_LOGS_MAP[demoClient.id] || {})
      setTrainerProfile(DEMO_TRAINER_PROFILE)
      setAuthState('authenticated')
      setLoading(false)
      return
    }

    // 1. Cargar datos del cliente por token (vía RPC: no se puede listar la tabla directamente)
    const { data: rows, error: cErr } = await supabase.rpc('get_client_by_token', { p_token: token })
    if (cErr) logError('ClientView:loadClient', cErr)
    let clientData = rows?.[0] || null
    if (!clientData && cErr) {
      // Probable fallo de red (sin conexión) en vez de token inválido — si ya se
      // entró antes con este enlace, sigue con la última copia local en vez de
      // mostrar "enlace no válido" a un cliente legítimo sin cobertura.
      try {
        const cached = JSON.parse(localStorage.getItem(CLIENT_CACHE_KEY(token)) || 'null')
        if (cached) clientData = cached
      } catch {}
    }
    if (!clientData) { setError('Enlace no válido o expirado.'); setLoading(false); return }
    setClient(clientData)
    try { localStorage.setItem(CLIENT_CACHE_KEY(token), JSON.stringify(clientData)) } catch {}

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
      await loadData(clientData)
    } else {
      // Tiene cuenta pero no sesión — mostrar login
      setAuthState('needs_login')
      setLoading(false)
    }
  }

  const loadData = async (preloadedClient?: ClienteRow) => {
    setLoading(true)
    const clientData = preloadedClient || client
    if (!clientData) { setLoading(false); return }

    // Cargar logs desde localStorage (offline-first)
    const localLogs = localStorage.getItem(`pf_logs_${clientData.id}`)
    const hasPendingLocal = !!localStorage.getItem(PENDING_LOGS_KEY(clientData.id))
    if (localLogs) { try { setLogs(JSON.parse(localLogs)) } catch {} }

    // Plan — se guarda una copia en local para poder seguir viendo el entreno de
    // hoy sin conexión (ej. sótano de gimnasio), en vez de quedarse sin plan.
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
      try { localStorage.setItem(PLAN_CACHE_KEY(clientData.id), JSON.stringify(p)) } catch {}
    } else {
      try {
        const cachedPlan = localStorage.getItem(PLAN_CACHE_KEY(clientData.id))
        if (cachedPlan) setPlan(JSON.parse(cachedPlan))
      } catch {}
    }

    // Registros — si hay cambios locales aún sin sincronizar, no los pisamos con
    // la versión (más vieja) del servidor. El efecto de trySyncPendingLogs se
    // encarga de subirlos en cuanto haya conexión.
    const { data: regData } = await supabase
      .from('registros').select('logs').eq('clientId', clientData.id).maybeSingle()
    const regRow = regData as RegistroRow | null
    if (regRow?.logs && !hasPendingLocal) setLogs(regRow.logs as TrainingLogs)

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
      const { data: tmplData } = await supabase
        .from('plantillas_mensajes').select('*').eq('trainerId', clientData.trainerId)
      if (tmplData) setMessageTemplates(tmplData as MessageTemplate[])
    }

    setAuthState('authenticated')
    setLoading(false)
  }

  const handleRegistered = async () => {
    // Después del registro, refrescar sesión y cargar datos
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await loadData()
    }
  }

  const handleLogsChange = useCallback(async (newLogs: TrainingLogs) => {
    setLogs(newLogs)
    if (client?.id.startsWith('demo-client-')) { setSyncState('saved'); setTimeout(() => setSyncState('idle'), 2000); return }
    if (!client?.id) return
    setSyncState('saving')
    localStorage.setItem(`pf_logs_${client.id}`, JSON.stringify(newLogs))
    if (!navigator.onLine) {
      // Queda marcado como pendiente — se reintenta solo en cuanto vuelva la conexión,
      // en vez de perderse si el cliente cierra la pestaña o limpia la caché antes.
      localStorage.setItem(PENDING_LOGS_KEY(client.id), '1')
      setSyncState('offline')
      return
    }
    const ok = await pushLogsToServer(client.id, newLogs)
    if (!ok) { localStorage.setItem(PENDING_LOGS_KEY(client.id), '1'); setSyncState('error'); return }
    localStorage.removeItem(PENDING_LOGS_KEY(client.id))
    setSyncState('saved')
    setTimeout(() => setSyncState('idle'), 2000)
  }, [client?.id])

  // Reintenta subir logs que quedaron guardados solo en local (sin conexión, o un
  // fallo de red puntual) — al recuperar el cliente.id y cada vez que vuelve la conexión.
  const trySyncPendingLogs = useCallback(async (clientId: string) => {
    if (!navigator.onLine || !localStorage.getItem(PENDING_LOGS_KEY(clientId))) return
    const raw = localStorage.getItem(`pf_logs_${clientId}`)
    if (!raw) { localStorage.removeItem(PENDING_LOGS_KEY(clientId)); return }
    let pendingLogs: TrainingLogs
    try { pendingLogs = JSON.parse(raw) } catch { localStorage.removeItem(PENDING_LOGS_KEY(clientId)); return }
    setSyncState('saving')
    const ok = await pushLogsToServer(clientId, pendingLogs)
    if (!ok) { setSyncState('error'); return }
    localStorage.removeItem(PENDING_LOGS_KEY(clientId))
    setSyncState('saved')
    setTimeout(() => setSyncState('idle'), 2000)
  }, [])

  useEffect(() => {
    if (!client?.id || client.id.startsWith('demo-client-')) return
    trySyncPendingLogs(client.id)
    const handler = () => trySyncPendingLogs(client.id)
    window.addEventListener('online', handler)
    return () => window.removeEventListener('online', handler)
  }, [client?.id, trySyncPendingLogs])

  const handleDiasUpdate = useCallback(async (dias: number[]) => {
    if (!plan || !client?.id) return
    const newPlan = { ...plan, diasElegidos: dias }
    setPlan(newPlan)
    if (client.id.startsWith('demo-client-')) return
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
        clientId={client.id}
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
        clientId={client.id}
        clientName={`${client.name || ''} ${client.surname || ''}`.trim()}
        trainerName={trainerProf.brandName || trainerProf.displayName || 'Tu entrenador'}
        brandColor={trainerProf.brandColor}
        brandLogo={trainerProf.brandLogo}
        initialStep="login"
        onComplete={() => loadData()}
      />
    )
  }

  if (!client || authState !== 'authenticated') return null

  const clientName = `${client.name || ''} ${client.surname || ''}`.trim()
  const brandName = trainerProfile.brandName || 'PanelFit'
  const brandLogo = trainerProfile.brandLogo || null
  const brandColor = trainerProfile.brandColor || '#6e5438'
  const brandBg = trainerProfile.brandBg || ''

  // Series de hoy guardadas en local — para el aviso de "sin conexión" del
  // indicador de sincronización (cuánto hay pendiente de subir, no solo que hay algo).
  const todayKey = new Date().toISOString().split('T')[0]
  const pendingSetsCount = Object.values(logs).reduce((acc, log: any) => {
    if (log?.dateDone !== todayKey) return acc
    return acc + Object.values(log.sets || {}).filter((s: any) => s?.weight).length
  }, 0)

  const resolveTemplate = (tipo: 'nueva_rutina' | 'descanso' | 'racha') => {
    const tmpl = messageTemplates.find(t => t.tipo === tipo)
    if (!tmpl) return ''
    const override = plan?.customMessages?.[tmpl.id]
    return resolveMessage(override ?? tmpl.texto, clientName)
  }
  const welcomeMsg = resolveTemplate('nueva_rutina')
  const motivMsg = resolveTemplate('descanso')
  const restDayMsg = resolveTemplate('racha')

  const TABS = [
    { id: 'hoy' as Tab,      icon: Home,           label: 'Hoy' },
    { id: 'entreno' as Tab,  icon: Dumbbell,       label: 'Entreno' },
    { id: 'progreso' as Tab, icon: BarChart2,      label: 'Progreso' },
    { id: 'dieta' as Tab,    icon: Utensils,       label: 'Dieta' },
    { id: 'mas' as Tab,      icon: MoreHorizontal, label: 'Más' },
  ]

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

      <SyncIndicator syncState={syncState} pendingCount={pendingSetsCount} />
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
                    {/* Lo más importante primero: el entreno de hoy */}
                    <ClientDashboard
                      plan={plan} logs={logs} onLogsChange={handleLogsChange}
                      clientName={clientName} clientId={client.id}
                      objetivo={client.objetivo} welcomeMsg={welcomeMsg} motivMsg={motivMsg}
                      restDayMsg={restDayMsg} brandBg={brandBg} brandColor={brandColor}
                      seriesTypes={seriesTypes}
                    />
                    {/* Secundario: check-ins, próximas citas, logros y hábitos */}
                    <ReadinessCheckin clientId={client.id} />
                    <ProximasSesiones clientId={client.id} trainerId={client.trainerId} clientName={client.name} />
                    <BadgesWidget logs={logs} />
                    <HabitosWidget clientId={client.id} />
                    <SelectorDias plan={plan} clientId={client.id} onUpdate={handleDiasUpdate} />
                  </>
                : <NoPlanView />
            )}
            {activeTab === 'entreno' && (
              plan
                ? <TrainingPlanView plan={plan} logs={logs} onLogsChange={handleLogsChange} seriesTypes={seriesTypes} trainerId={client.trainerId} />
                : <NoPlanView />
            )}
            {activeTab === 'progreso' && <ProgresoClienteTab clientId={client.id} trainerId={client.trainerId} logs={logs} plan={plan} />}
            {activeTab === 'dieta' && <DietEditor clientId={client.id} isTrainer={false} />}
            {activeTab === 'encuesta' && <EncuestaClienteTab client={client} />}
            {activeTab === 'mas' && <MasTab client={client} plan={plan} onLogout={async () => {
              loggingOutRef.current = true
              setAuthState('needs_login')
              setTimeout(() => { loggingOutRef.current = false }, 5000)
              await supabase.auth.signOut()
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
