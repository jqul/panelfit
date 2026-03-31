import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { UserProfile, ClientData } from './types'
import { Auth } from './components/shared/Auth'
import { TrainerDashboard } from './components/trainer/TrainerDashboard'
import { ClientPanel } from './components/trainer/ClientPanel'
import { ClientView } from './components/client/ClientView'
import { useToast, ToastContainer } from './components/shared/Toast'

type AppView = 'loading' | 'auth' | 'trainer' | 'client-token'

const DEMO_PROFILE: UserProfile = {
  uid: 'demo-uid',
  email: 'demo@panelfit.app',
  displayName: 'Demo Entrenador',
  role: 'trainer',
  approved: true,
  createdAt: Date.now(),
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
    if (email === 'javi_ql@hotmail.com') {
      setUserProfile({ uid, email, displayName: 'Javi', role: 'super_admin', createdAt: Date.now() })
    } else {
      const { data } = await supabase.from('entrenadores').select('nombre,activo').eq('id', uid).single()
      if (!data || data.activo === false) { await supabase.auth.signOut(); setView('auth'); return }
      setUserProfile({ uid, email, displayName: data.nombre || email.split('@')[0], role: 'trainer', approved: true, createdAt: Date.now() })
    }
    setView('trainer')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setView('auth'); setUserProfile(null); setSelectedClient(null)
  }

  const handleDemo = () => {
    setUserProfile(DEMO_PROFILE)
    setView('trainer')
  }

  if (view === 'loading') return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <h1 className="text-3xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></h1>
    </div>
  )

  if (view === 'client-token' && clientToken) return (
    <><ClientView token={clientToken} /><ToastContainer toasts={toasts} /></>
  )

  if (view === 'auth') return (
    <><Auth onAuth={() => supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) loadProfile(data.session.user.id, data.session.user.email || '')
    })} onDemo={handleDemo} /><ToastContainer toasts={toasts} /></>
  )

  if (view === 'trainer' && userProfile) return (
    <>
      {selectedClient ? (
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
    </>
  )

  return null
}
