import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { Home, Dumbbell, BarChart2, Utensils, MoreHorizontal, WifiOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { TrainingPlan, TrainingLogs } from '../../types'
import { ClientDashboard, SelectorDias } from './ClientDashboard'
import { TrainingPlanView } from './TrainingPlanView'
// Carga perezosa: recharts es pesado (~500kb) y solo hace falta al entrar de
// verdad en la pestaña de progreso, no con solo abrir la app.
const ProgresoClienteTab = lazy(() => import('./ProgresoClienteTab').then(m => ({ default: m.ProgresoClienteTab })))
import { PWAInstallBanner } from './PWAInstallBanner'
import { DietEditor } from '../shared/DietEditor'
import { PlanRow, RegistroRow, ClienteRow } from '../../lib/supabase-types'
import { EncuestaClienteTab } from './EncuestaClienteTab'
import { logError } from '../../lib/errors'
import { weekIdxFromStart } from '../../lib/planWeek'
import { NotFound } from '../shared/NotFound'
import { pantallaDeEnlace } from '../../lib/enlaceCliente'
import { ClientRegister } from './ClientRegister'
import { HabitosWidget } from './HabitosWidget'
import { BadgesWidget } from './BadgesWidget'
import { ReadinessCheckin } from './ReadinessCheckin'
import { DEFAULT_SERIES_TYPES, SeriesTypeDef } from '../trainer/training-plan-editor/seriesTypes'
import { MessageTemplate, resolveMessage } from '../../lib/messageTemplates'
import { hydrateDemoStorage } from '../../lib/useAuthBootstrap'
import { CLIENT_CACHE_KEY, PLAN_CACHE_KEY } from './client-view/helpers'
import { cacheGet, cacheSet, hasPendingLogs, getPendingKeys, addPendingKeys, clearPendingKeys, deviceKeys, clearClientDeviceData, sweepExpiredCaches } from '../../lib/deviceStorage'
import { diffKeys, mergeLogs, adoptRemote, saveLogsMerged, savePlanDiasMerged } from '../../lib/serverSync'
import { ProximasSesiones } from './client-view/ProximasSesiones'
import { MasTab } from './client-view/MasTab'
import { NoPlanView, SyncIndicator } from './client-view/misc'
import { useConsent } from '../../lib/consent'
import { SyncStatusContext } from './client-view/SyncStatus'
import { ConsentGate } from './ConsentGate'

interface ClientViewProps { token: string; showEncuesta?: boolean }
type Tab = 'hoy' | 'entreno' | 'progreso' | 'dieta' | 'mas' | 'encuesta'
type SyncState = 'idle' | 'saving' | 'saved' | 'error' | 'offline'
type AuthState = 'loading' | 'needs_register' | 'needs_login' | 'authenticated'

export function ClientView({ token, showEncuesta }: ClientViewProps) {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [linkExpired, setLinkExpired] = useState(false)
  const [client, setClient] = useState<ClienteRow | null>(null)
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [logs, setLogs] = useState<TrainingLogs>({})
  const logsRef = useRef<TrainingLogs>({})
  logsRef.current = logs
  // Ejercicios cambiados en este dispositivo que aún no están en el servidor, y cuándo se
  // sincronizó por última vez: siempre visibles en la cabecera.
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const syncingRef = useRef(0) // subidas en curso
  const refreshPendingCount = useCallback((clientId: string) => {
    const p = getPendingKeys(clientId)
    setPendingCount(p === null ? 0 : p === 'all' ? Math.max(1, Object.keys(logsRef.current).length) : p.length)
  }, [])
  const [activeTab, setActiveTab] = useState<Tab>(showEncuesta ? 'encuesta' : 'hoy')
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [entrenoView, setEntrenoView] = useState<'semana' | 'calendario'>('semana')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [trainerProfile, setTrainerProfile] = useState<Record<string, any>>({})
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([])
  const [seriesTypes, setSeriesTypes] = useState<SeriesTypeDef[]>(DEFAULT_SERIES_TYPES)
  const loggingOutRef = useRef(false)
  const authStateRef = useRef(authState)
  authStateRef.current = authState
  const clientRef = useRef<ClienteRow | null>(null)
  clientRef.current = client
  const consent = useConsent(client?.id, authState === 'authenticated')

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
      // Sesión cerrada sin que el cliente lo pidiera (caducó, o se cerró en otra pestaña):
      // se borra la copia local de salud, salvo los entrenos que aún no se han subido.
      const c = clientRef.current
      if (event === 'SIGNED_OUT' && c && !c.id.startsWith('demo-client-')) {
        clearClientDeviceData(c.id, token, { keepPending: true })
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
    sweepExpiredCaches()
    // Enlace de uno de nuestros 3 clientes de demostración fijos — entra directo,
    // sin registro ni login, igual que el modo demo del entrenador. Importante:
    // solo si el token coincide EXACTO con uno de los 3 — un cliente real cuyo
    // token generado al azar empiece por "demo-" por pura coincidencia no debe
    // caer aquí, tiene que seguir el camino normal de abajo (get_client_by_token).
    // Los datos de ejemplo (~25 kB gzip) solo se descargan si el enlace es de demostración.
    const demo = token.startsWith('demo-')
      ? await Promise.all([import('../../lib/demo-data'), import('../../lib/demo-data-extra')]).then(([d, x]) => ({ ...d, ...x }))
      : null
    const demoClient = demo?.DEMO_CLIENTS.find(c => c.token === token)
    if (demo && demoClient) {
      // Enlace directo a un cliente demo sin haber pasado antes por el modo
      // demo del entrenador (?demo=1) — sin esto, el peso/dolor/etc. de este
      // cliente concreto nunca se sembraría en localStorage y sus pestañas
      // se verían vacías aunque el resto del demo sí tenga datos.
      await hydrateDemoStorage()
      setClient({
        id: demoClient.id, trainerId: demoClient.trainerId, name: demoClient.name, surname: demoClient.surname,
        weight: demoClient.weight, fatPercentage: demoClient.fatPercentage, muscleMass: demoClient.muscleMass,
        totalLifted: demoClient.totalLifted, planDescription: demoClient.planDescription,
        token: demoClient.token, objetivo: demoClient.objetivo, createdAt: demoClient.createdAt,
      } as ClienteRow)
      setPlan(demo.DEMO_PLAN_MAP[demoClient.id] || null)
      setLogs(demo.DEMO_LOGS_MAP[demoClient.id] || {})
      setTrainerProfile(demo.DEMO_TRAINER_PROFILE)
      setMessageTemplates(demo.buildDemoMessageTemplates() as MessageTemplate[])
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
      const cached = cacheGet<ClienteRow>(CLIENT_CACHE_KEY(token))
      if (cached) clientData = cached
    }
    if (!clientData) {
      // Sin cliente y sin fallo de red: o el enlace caducó o no existe. El servidor lo distingue sin
      // devolver ningún dato, para decirle al cliente qué hacer (pedir uno nuevo) en vez de "404".
      if (!cErr) {
        const { data: estado } = await supabase.rpc('get_client_link_status', { p_token: token })
        if (pantallaDeEnlace(estado) === 'caducado') setLinkExpired(true)
      }
      setError('Enlace no válido o expirado.'); setLoading(false); return
    }
    setClient(clientData)
    cacheSet(CLIENT_CACHE_KEY(token), clientData)

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
    const hasPendingLocal = hasPendingLogs(clientData.id)
    const localLogs = cacheGet<TrainingLogs>(deviceKeys.logs(clientData.id), { ignoreTtl: hasPendingLocal })
    if (localLogs) setLogs(localLogs)

    // Plan — se guarda una copia en local para poder seguir viendo el entreno de
    // hoy sin conexión (ej. sótano de gimnasio), en vez de quedarse sin plan.
    const { data: planData } = await supabase
      .from('planes').select('plan').eq('clientId', clientData.id).maybeSingle()
    const planRow = planData as PlanRow | null
    if (planRow?.plan?.P) {
      const p = planRow.plan.P as TrainingPlan
      if (p.fechaInicio && p.weeks?.length) {
        const semActual = weekIdxFromStart(p.fechaInicio, p.weeks.length)
        p.weeks = p.weeks.map((w, i) => ({ ...w, isCurrent: i === semActual }))
      }
      setPlan(p)
      cacheSet(PLAN_CACHE_KEY(clientData.id), p)
      // Deja constancia de que el cliente ha abierto el plan — así el
      // entrenador ve en el historial si ya vio la última versión publicada.
      // Fire-and-forget: no debe bloquear ni romper la carga si falla.
      supabase.rpc('mark_plan_opened', { p_token: token }).then(() => {}, () => {})
    } else {
      const cachedPlan = cacheGet<TrainingPlan>(PLAN_CACHE_KEY(clientData.id))
      if (cachedPlan) setPlan(cachedPlan)
    }

    // Registros — el servidor manda salvo en los ejercicios que se cambiaron aquí sin
    // conexión (siguen siendo los de este dispositivo hasta que se suban). El efecto de
    // trySyncPendingLogs se encarga de subirlos en cuanto haya conexión.
    const { data: regData } = await supabase
      .from('registros').select('logs').eq('clientId', clientData.id).maybeSingle()
    const regRow = regData as RegistroRow | null
    if (regRow?.logs) {
      const server = regRow.logs as TrainingLogs
      const pending = hasPendingLocal ? getPendingKeys(clientData.id) : null
      if (pending === null) setLogs(server)
      else if (pending === 'all') setLogs(localLogs ?? server) // formato antiguo: se desconoce qué cambió
      else setLogs(mergeLogs(server, localLogs ?? {}, pending))
      setLastSyncedAt(Date.now())
    }
    refreshPendingCount(clientData.id)

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

  // Sube los ejercicios `keys` de `local` al servidor fusionando con lo que haya (sin pisar lo que
  // otro dispositivo o el entrenador haya escrito en otros ejercicios) y deja en pantalla lo
  // que ya había allí en los ejercicios que no se han tocado entretanto.
  const syncKeys = useCallback(async (clientId: string, local: TrainingLogs, keys: string[]): Promise<boolean> => {
    const res = await saveLogsMerged(clientId, local, keys)
    if (!res.ok) return false
    clearPendingKeys(clientId, keys)
    refreshPendingCount(clientId)
    setLastSyncedAt(Date.now())
    setLogs(cur => {
      const next = adoptRemote(cur, local, res.merged)
      if (next !== cur) cacheSet(deviceKeys.logs(clientId), next)
      return next
    })
    return true
  }, [refreshPendingCount])

  const handleLogsChange = useCallback(async (newLogs: TrainingLogs) => {
    const prev = logsRef.current
    logsRef.current = newLogs
    setLogs(newLogs)
    if (client?.id.startsWith('demo-client-')) { setSyncState('saved'); setTimeout(() => setSyncState('idle'), 2000); return }
    if (!client?.id) return
    const changed = diffKeys(prev, newLogs)
    setSyncState('saving')
    // Si el cliente desactivó la copia local no queda nada en el dispositivo: sin
    // conexión (o si falla la subida) el entreno no se puede conservar.
    const guardadoLocal = cacheSet(deviceKeys.logs(client.id), newLogs)
    // Queda marcado como pendiente ANTES de subirlo: si se cierra la pestaña o se corta la
    // conexión a mitad, se reintenta solo en cuanto sea posible en vez de perderse.
    if (guardadoLocal) { addPendingKeys(client.id, changed); refreshPendingCount(client.id) }
    if (!navigator.onLine) { setSyncState(guardadoLocal ? 'offline' : 'error'); return }
    // Además de lo que acaba de cambiar, lo que ya estaba pendiente de antes.
    const pending = getPendingKeys(client.id)
    const keys = pending === 'all' ? Object.keys(newLogs) : [...new Set([...(pending ?? []), ...changed])]
    syncingRef.current++
    const ok = await syncKeys(client.id, newLogs, keys)
    syncingRef.current--
    if (!ok) { setSyncState('error'); return }
    setSyncState('saved')
    setTimeout(() => setSyncState('idle'), 2000)
  }, [client?.id, syncKeys, refreshPendingCount])

  // Reintenta subir logs que quedaron guardados solo en local (sin conexión, o un
  // fallo de red puntual) — al recuperar el cliente.id, cada vez que vuelve la conexión
  // y cuando el cliente pulsa "Reintentar".
  const trySyncPendingLogs = useCallback(async (clientId: string) => {
    if (!navigator.onLine || syncingRef.current > 0) return
    const pending = getPendingKeys(clientId)
    if (pending === null) return
    // Los entrenos pendientes nunca caducan: aún no están en el servidor.
    const pendingLogs = cacheGet<TrainingLogs>(deviceKeys.logs(clientId), { ignoreTtl: true })
    if (!pendingLogs) { clearPendingKeys(clientId); refreshPendingCount(clientId); return }
    setSyncState('saving')
    syncingRef.current++
    const ok = await syncKeys(clientId, pendingLogs, pending === 'all' ? Object.keys(pendingLogs) : pending)
    syncingRef.current--
    if (!ok) { setSyncState('error'); return }
    setSyncState('saved')
    setTimeout(() => setSyncState('idle'), 2000)
  }, [syncKeys, refreshPendingCount])

  // Al volver a la app (otra pestaña, otra app) se leen los entrenos del servidor por si el
  // entrenador o este mismo cliente en otro dispositivo han añadido algo. Solo si no hay nada
  // subiéndose ni pendiente, para no pisar cambios que aún no han llegado al servidor.
  useEffect(() => {
    if (!client?.id || client.id.startsWith('demo-client-') || authState !== 'authenticated') return
    const clientId = client.id
    const refresh = async () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine || syncingRef.current > 0 || hasPendingLogs(clientId)) return
      const { data } = await supabase.from('registros').select('logs').eq('clientId', clientId).maybeSingle()
      if (!data?.logs || syncingRef.current > 0 || hasPendingLogs(clientId)) return
      const server = data.logs as TrainingLogs
      if (diffKeys(logsRef.current, server).length === 0) return
      cacheSet(deviceKeys.logs(clientId), server)
      setLogs(server)
      setLastSyncedAt(Date.now())
    }
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [client?.id, authState])

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
    // Solo cambia diasElegidos sobre el plan que haya AHORA en el servidor: antes se escribía
    // el plan entero que el cliente tenía en pantalla y podía pisar lo que el entrenador
    // hubiera publicado desde que el cliente abrió la app.
    const res = await savePlanDiasMerged(client.id, dias)
    if (!res.ok) setSyncState('error')
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

  if (error) return <NotFound caducado={linkExpired} />

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

  const logoutClient = async () => {
    if (!client.id.startsWith('demo-client-')) {
      // Antes de borrar nada, sube lo pendiente; si no se puede, avisa: esos
      // entrenos solo existen en este dispositivo y se perderían.
      await trySyncPendingLogs(client.id)
      if (hasPendingLogs(client.id) && !window.confirm('Tienes entrenos que todavía no se han subido al servidor. Si cierras sesión ahora se perderán. ¿Cerrar sesión de todos modos?')) return
      clearClientDeviceData(client.id, token)
    }
    loggingOutRef.current = true
    setAuthState('needs_login')
    setTimeout(() => { loggingOutRef.current = false }, 5000)
    await supabase.auth.signOut()
  }

  // Sin consentimiento vigente para datos de salud no se enseña ni se guarda nada.
  if (consent.status === 'needed' || consent.status === 'withdrawn') {
    return (
      <ConsentGate withdrawn={consent.status === 'withdrawn'}
        trainerName={trainerProfile.brandName || trainerProfile.displayName || 'Tu entrenador'}
        brandColor={brandColor} onGrant={consent.grant} onLogout={logoutClient} />
    )
  }

  // Estado del guardado para la cabecera: lo pendiente de subir manda sobre la última hora de sincronización.
  const hora = (t: number) => new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const estadoGuardado = pendingCount > 0
    ? { text: `${pendingCount} sin subir`, warn: true }
    : lastSyncedAt ? { text: `Guardado ${hora(lastSyncedAt)}`, warn: false } : null

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
    <SyncStatusContext.Provider value={{ state: syncState, pendingCount, retry: () => { trySyncPendingLogs(client.id) } }}>
    <div className="h-[100dvh] overflow-hidden flex flex-col"
      style={{ backgroundImage: brandBg ? `url(${brandBg})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'scroll', backgroundColor: 'var(--color-bg)' }}>

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
              {plan?.type && <p className="text-[11px] text-muted capitalize">{plan.type}</p>}
              {estadoGuardado && <p className={`text-[11px] ${estadoGuardado.warn ? 'text-warn font-semibold' : 'text-muted'}`}>{estadoGuardado.text}</p>}
            </div>
          </div>
        </div>
      </header>

      <SyncIndicator syncState={syncState} pendingCount={pendingCount} onRetry={() => trySyncPendingLogs(client.id)} />
      <PWAInstallBanner />

      <main className="flex-1 overflow-y-auto overscroll-contain max-w-2xl mx-auto w-full relative z-10"
        style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))', WebkitOverflowScrolling: 'touch' }}>
        {loading || consent.status === 'loading' ? (
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
                      clientName={clientName} clientId={client.id} trainerId={client.trainerId}
                      objetivo={client.objetivo} welcomeMsg={welcomeMsg} motivMsg={motivMsg}
                      restDayMsg={restDayMsg} brandBg={brandBg} brandColor={brandColor}
                      seriesTypes={seriesTypes}
                    />
                    {/* Secundario: check-ins, próximas citas, logros y hábitos */}
                    <ReadinessCheckin clientId={client.id} trainerId={client.trainerId} />
                    <ProximasSesiones clientId={client.id} trainerId={client.trainerId} clientName={client.name} />
                    <BadgesWidget logs={logs} />
                    <HabitosWidget clientId={client.id} />
                    <SelectorDias plan={plan} clientId={client.id} onUpdate={handleDiasUpdate} />
                  </>
                : <NoPlanView />
            )}
            {activeTab === 'entreno' && (
              plan
                ? <TrainingPlanView plan={plan} logs={logs} onLogsChange={handleLogsChange} seriesTypes={seriesTypes} trainerId={client.trainerId}
                    view={entrenoView} onViewChange={setEntrenoView} />
                : <NoPlanView />
            )}
            {activeTab === 'progreso' && (
              <Suspense fallback={<div className="p-6 text-sm text-muted">Cargando progreso...</div>}>
                <ProgresoClienteTab clientId={client.id} trainerId={client.trainerId} logs={logs} plan={plan}
                  fotosConsent={consent.fotos} onGrantFotos={() => consent.grant(true, true)}
                  onOpenCalendar={() => { setEntrenoView('calendario'); setActiveTab('entreno') }} />
              </Suspense>
            )}
            {activeTab === 'dieta' && <DietEditor clientId={client.id} isTrainer={false} />}
            {activeTab === 'encuesta' && <EncuestaClienteTab client={client} />}
            {activeTab === 'mas' && <MasTab client={client} plan={plan} onLogout={logoutClient}
              fotosConsent={consent.fotos} onConsentChange={consent.grant} />}
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
              <span className={`text-[11px] font-medium ${activeTab === id ? 'text-ink font-bold' : 'text-muted'}`}>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
    </SyncStatusContext.Provider>
  )
}
