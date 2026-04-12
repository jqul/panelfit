import { useState, useEffect, lazy, Suspense } from 'react'
import { supabase } from './lib/supabase'
import { UserProfile, ClientData } from './types'
import { Auth } from './components/shared/Auth'
import { DEMO_CLIENTS, DEMO_PLAN_MARIA, DEMO_LOGS_MARIA, DEMO_TRAINER_PROFILE, DEMO_TRAINER_ID, DEMO_PLAN_CARLOS, DEMO_PLAN_LAURA } from './lib/demo-data'
import { useToast, ToastContainer } from './components/shared/Toast'

const TrainerDashboard = lazy(() => import('./components/trainer/TrainerDashboard').then(m => ({ default: m.TrainerDashboard })))
const ClientPanel = lazy(() => import('./components/trainer/ClientPanel').then(m => ({ default: m.ClientPanel })))
const ClientView = lazy(() => import('./components/client/ClientView').then(m => ({ default: m.ClientView })))
const SuperAdminPanel = lazy(() => import('./components/trainer/SuperAdminPanel').then(m => ({ default: m.SuperAdminPanel })))

type AppView = 'loading' | 'auth' | 'trainer' | 'client-token' | 'demo'

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

export default function App() {
  const [view, setView] = useState<AppView>('loading')
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
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
    const { data } = await supabase.from('entrenadores').select('"displayName", approved, rol').eq('uid', uid).maybeSingle()
    if (!data || data.approved === false) { await supabase.auth.signOut(); setView('auth'); return }
    setUserProfile({
      uid, email,
      displayName: data.displayName || email.split('@')[0],
      role: data.rol === 'super_admin' ? 'super_admin' : 'trainer',
      approved: true, createdAt: Date.now()
    })
    setView('trainer')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setView('auth'); setUserProfile(null); setSelectedClient(null)
  }

  // Pre-cargar datos demo
  if (view === 'demo') {
    localStorage.setItem(`pf_trainer_profile_${DEMO_TRAINER_ID}`, JSON.stringify(DEMO_TRAINER_PROFILE))
    localStorage.setItem(`pf_trainer_phone_${DEMO_TRAINER_ID}`, DEMO_TRAINER_PROFILE.phone)
    localStorage.setItem(`pf_weight_demo-client-001`, JSON.stringify([
      { date: new Date().toISOString().split('T')[0], weight: 62.0 },
      { date: new Date(Date.now() - 7*86400000).toISOString().split('T')[0], weight: 62.8 },
      { date: new Date(Date.now() - 14*86400000).toISOString().split('T')[0], weight: 63.5 },
    ]))
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
          onSelectClient={(client) => {
            setSelectedClient(client)
            setAllClients(prev => prev.find(c => c.id === client.id) ? prev : [...prev, client])
          }} />
      )}
      <ToastContainer toasts={toasts} />
    </Suspense>
  )

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
          demoLogs={selectedClient.id === 'demo-client-001' ? DEMO_LOGS_MARIA : undefined}
        />
      ) : (
        <TrainerDashboard
          userProfile={DEMO_PROFILE_TRAINER}
          onLogout={() => { window.location.href = '/' }}
          demoClients={DEMO_CLIENTS as any}
          onSelectClient={(client) => {
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
