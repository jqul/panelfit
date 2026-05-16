import { useState, useEffect, lazy, Suspense } from 'react'
import { supabase } from './lib/supabase'
import { UserProfile, ClientData } from './types'
import { Auth } from './components/shared/Auth'
import { DEMO_CLIENTS, DEMO_PLAN_MARIA, DEMO_LOGS_MARIA, DEMO_TRAINER_PROFILE, DEMO_TRAINER_ID, DEMO_PLAN_CARLOS, DEMO_PLAN_LAURA, DEMO_LOGS_CARLOS, DEMO_LOGS_LAURA, DEMO_WEIGHTS_MARIA, DEMO_WEIGHTS_CARLOS, DEMO_WEIGHTS_LAURA, DEMO_SURVEY_RESPONSES, DEMO_SURVEY_TEMPLATE } from './lib/demo-data'
import { useToast, ToastContainer } from './components/shared/Toast'
import { Rocket, Mail } from 'lucide-react'

const TrainerDashboard = lazy(() => import('./components/trainer/TrainerDashboard').then(m => ({ default: m.TrainerDashboard })))
const ClientPanel = lazy(() => import('./components/trainer/ClientPanel').then(m => ({ default: m.ClientPanel })))
const ClientView = lazy(() => import('./components/client/ClientView').then(m => ({ default: m.ClientView })))
const SuperAdminPanel = lazy(() => import('./components/trainer/SuperAdminPanel').then(m => ({ default: m.SuperAdminPanel })))

type AppView = 'loading' | 'auth' | 'trainer' | 'client-token' | 'demo' | 'pending-demo'

const DEMO_PROFILE_TRAINER: UserProfile = {
  uid: DEMO_TRAINER_ID, email: 'demo@panelfit.app', displayName: 'Alex Trainer',
  role: 'trainer', approved: true, createdAt: Date.now(),
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></h1>
        <div className="flex gap-1 justify-center">
          {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
        </div>
      </div>
    </div>
  )
}

/** Banner que aparece encima del modo demo cuando el entrenador está pendiente */
function PendingBanner({ displayName, email }: { displayName: string; email: string }) {
  const [visible, setVisible] = useState(true)
  if (!visible) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Rocket className="w-4 h-4 flex-shrink-0" />
        <span>
          Hola <strong>{displayName}</strong> — Estás explorando el modo demo.
          Revisaremos tu cuenta y te activaremos en breve.
        </span>
        <a
          href={`mailto:javi_ql@hotmail.com?subject=Activar cuenta PanelFit&body=Hola, soy ${displayName} (${email}) y quiero activar mi cuenta.`}
          className="ml-2 underline underline-offset-2 flex items-center gap-1 hover:opacity-80 transition-opacity"
        >
          <Mail className="w-3.5 h-3.5" /> Contactar
        </a>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="text-white/70 hover:text-white text-lg leading-none ml-4"
        aria-label="Cerrar"
      >×</button>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState<AppView>('loading')
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [pendingUser, setPendingUser] = useState<{ uid: string; email: string; displayName: string } | null>(null)
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null)
  const [allClients, setAllClients] = useState<ClientData[]>([])
  const [clientToken, setClientToken] = useState<string | null>(null)
  const { toasts } = useToast()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('c')
    if (token) { setClientToken(token); setView('client-token'); return }
    if (params.get('demo') === '1') { setView('demo'); return }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) loadProfile(data.session.user.id, data.session.user.email || '')
      else setView('auth')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) loadProfile(session.user.id, session.user.email || '')
      else { setView('auth'); setUserProfile(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (uid: string, email: string) => {
    const { data } = await supabase.from('entrenadores').select('"displayName", approved, rol, profile').eq('uid', uid).maybeSingle()
    if (!data) { await supabase.auth.signOut(); setView('auth'); return }

    // Entrenador pendiente de aprobación → modo demo con banner
    if (data.approved === false) {
      const displayName = data.displayName || email.split('@')[0]
      setPendingUser({ uid, email, displayName })
      // Cargar datos demo en localStorage igual que el modo demo normal
      localStorage.setItem(`pf_trainer_profile_${DEMO_TRAINER_ID}`, JSON.stringify(DEMO_TRAINER_PROFILE))
      localStorage.setItem(`pf_trainer_phone_${DEMO_TRAINER_ID}`, DEMO_TRAINER_PROFILE.phone)
      localStorage.setItem(`pf_weight_demo-client-001`, JSON.stringify(DEMO_WEIGHTS_MARIA))
      localStorage.setItem(`pf_weight_demo-client-002`, JSON.stringify(DEMO_WEIGHTS_CARLOS))
      localStorage.setItem(`pf_weight_demo-client-003`, JSON.stringify(DEMO_WEIGHTS_LAURA))
      localStorage.setItem(`pf_demo_survey_template`, JSON.stringify(DEMO_SURVEY_TEMPLATE))
      localStorage.setItem(`pf_demo_survey_responses`, JSON.stringify(DEMO_SURVEY_RESPONSES))
      setView('pending-demo')
      return
    }

    const profile = data.profile || {}
    const up = {
      uid, email,
      displayName: data.displayName || email.split('@')[0],
      role: data.rol === 'super_admin' ? 'super_admin' : 'trainer',
      approved: true, createdAt: Date.now(),
      clientLimit: profile.clientLimit,
      planName: profile.planName,
    }
    setUserProfile(up as any)
    setView('trainer')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setView('auth'); setUserProfile(null); setSelectedClient(null); setPendingUser(null)
  }

  // Pre-cargar datos demo en localStorage (modo demo público ?demo=1)
  if (view === 'demo') {
    localStorage.setItem(`pf_trainer_profile_${DEMO_TRAINER_ID}`, JSON.stringify(DEMO_TRAINER_PROFILE))
    localStorage.setItem(`pf_trainer_phone_${DEMO_TRAINER_ID}`, DEMO_TRAINER_PROFILE.phone)
    localStorage.setItem(`pf_weight_demo-client-001`, JSON.stringify(DEMO_WEIGHTS_MARIA))
    localStorage.setItem(`pf_weight_demo-client-002`, JSON.stringify(DEMO_WEIGHTS_CARLOS))
    localStorage.setItem(`pf_weight_demo-client-003`, JSON.stringify(DEMO_WEIGHTS_LAURA))
    localStorage.setItem(`pf_demo_survey_template`, JSON.stringify(DEMO_SURVEY_TEMPLATE))
    localStorage.setItem(`pf_demo_survey_responses`, JSON.stringify(DEMO_SURVEY_RESPONSES))
  }

  if (view === 'loading') return <LoadingScreen />

  const encuestaParam = new URLSearchParams(window.location.search).get('encuesta') === '1'

  if (view === 'client-token' && clientToken) return (
    <Suspense fallback={<LoadingScreen />}>
      <ClientView token={clientToken} showEncuesta={encuestaParam} />
      <ToastContainer toasts={toasts} />
    </Suspense>
  )

  if (view === 'auth') return (
    <>
      <Auth onAuth={() => supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) loadProfile(data.session.user.id, data.session.user.email || '')
      })} onDemo={() => setView('demo')} />
      <ToastContainer toasts={toasts} />
    </>
  )

  if (view === 'trainer' && userProfile) return (
    <Suspense fallback={<LoadingScreen />}>
      {userProfile.role === 'super_admin' ? (
        <><SuperAdminPanel onLogout={handleLogout} /><ToastContainer toasts={toasts} /></>
      ) : selectedClient ? (
        <ClientPanel client={selectedClient} userProfile={userProfile}
          allClients={allClients} onClose={() => setSelectedClient(null)} />
      ) : (
        <TrainerDashboard userProfile={userProfile} onLogout={handleLogout}
          onSelectClient={(client: ClientData) => {
            setSelectedClient(client)
            setAllClients(prev => prev.find(c => c.id === client.id) ? prev : [...prev, client])
          }} />
      )}
      <ToastContainer toasts={toasts} />
    </Suspense>
  )

  // Modo demo para entrenadores pendientes de aprobación
  if (view === 'pending-demo') return (
    <Suspense fallback={<LoadingScreen />}>
      {pendingUser && (
        <PendingBanner displayName={pendingUser.displayName} email={pendingUser.email} />
      )}
      <div className={pendingUser ? 'pt-11' : ''}>
        {selectedClient ? (
          <ClientPanel
            client={selectedClient}
            userProfile={DEMO_PROFILE_TRAINER}
            allClients={DEMO_CLIENTS as any}
            onClose={() => setSelectedClient(null)}
            demoPlan={
              selectedClient.id === 'demo-client-001' ? DEMO_PLAN_MARIA :
              selectedClient.id === 'demo-client-002' ? DEMO_PLAN_CARLOS :
              DEMO_PLAN_LAURA
            }
            demoLogs={
              selectedClient.id === 'demo-client-001' ? DEMO_LOGS_MARIA :
              selectedClient.id === 'demo-client-002' ? DEMO_LOGS_CARLOS :
              DEMO_LOGS_LAURA
            }
          />
        ) : (
          <TrainerDashboard
            userProfile={DEMO_PROFILE_TRAINER}
            onLogout={handleLogout}
            demoClients={DEMO_CLIENTS as any}
            onSelectClient={(client: ClientData) => {
              setSelectedClient(client)
              setAllClients(DEMO_CLIENTS as any)
            }}
          />
        )}
      </div>
      <ToastContainer toasts={toasts} />
    </Suspense>
  )

  // Modo demo público
  if (view === 'demo') return (
    <Suspense fallback={<LoadingScreen />}>
      {selectedClient ? (
        <ClientPanel
          client={selectedClient}
          userProfile={DEMO_PROFILE_TRAINER}
          allClients={DEMO_CLIENTS as any}
          onClose={() => setSelectedClient(null)}
          demoPlan={
            selectedClient.id === 'demo-client-001' ? DEMO_PLAN_MARIA :
            selectedClient.id === 'demo-client-002' ? DEMO_PLAN_CARLOS :
            DEMO_PLAN_LAURA
          }
          demoLogs={
            selectedClient.id === 'demo-client-001' ? DEMO_LOGS_MARIA :
            selectedClient.id === 'demo-client-002' ? DEMO_LOGS_CARLOS :
            DEMO_LOGS_LAURA
          }
        />
      ) : (
        <TrainerDashboard
          userProfile={DEMO_PROFILE_TRAINER}
          onLogout={() => { window.location.href = '/' }}
          demoClients={DEMO_CLIENTS as any}
          onSelectClient={(client: ClientData) => {
            setSelectedClient(client)
            setAllClients(DEMO_CLIENTS as any)
          }}
        />
      )}
      <ToastContainer toasts={toasts} />
    </Suspense>
  )

  return null
}
