
 import { useState, useEffect, lazy, Suspense } from 'react'
 import { supabase } from './lib/supabase'
 import { UserProfile, ClientData } from './types'
 import { Auth } from './components/shared/Auth'
 import { DEMO_CLIENTS, DEMO_PLAN_MARIA, DEMO_LOGS_MARIA, DEMO_TRAINER_PROFILE, DEMO_TRAINER_ID, DEMO_PLAN_CARLOS, DEMO_PLAN_LAURA, DEMO_LOGS_CARLOS, DEMO_LOGS_LAURA, DEMO_WEIGHTS_MARIA, DEMO_WEIGHTS_CARLOS, DEMO_WEIGHTS_LAURA, DEMO_SURVEY_RESPONSES, DEMO_SURVEY_TEMPLATE } from './lib/demo-data'
 import { useToast, ToastContainer } from './components/shared/Toast'
 
 const TrainerDashboard = lazy(() => import('./components/trainer/TrainerDashboard').then(m => ({ default: m.TrainerDashboard })))
 const ClientPanel = lazy(() => import('./components/trainer/ClientPanel').then(m => ({ default: m.ClientPanel })))
 const ClientView = lazy(() => import('./components/client/ClientView').then(m => ({ default: m.ClientView })))
 const SuperAdminPanel = lazy(() => import('./components/trainer/SuperAdminPanel').then(m => ({ default: m.SuperAdminPanel })))
 

+type AppView = 'loading' | 'auth' | 'trainer' | 'client-token' | 'demo' | 'trial-expired'
 
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
 
+function TrialExpiredScreen({ onLogout }: { onLogout: () => void }) {
+  return (
+    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
+      <div className="max-w-lg w-full bg-card border border-border rounded-3xl p-8 text-center space-y-4">
+        <h1 className="text-2xl font-serif font-bold">Tu demo de 15 días terminó</h1>
+        <p className="text-sm text-muted">
+          Tu cuenta está pausada temporalmente hasta activar un plan.
+          <span className="font-semibold text-ink"> Tus clientes y datos siguen guardados</span> y se recuperan al instante al reactivar.
+        </p>
+        <p className="text-xs text-muted">
+          Contacta a soporte/comercial para activar tu plan y continuar donde lo dejaste.
+        </p>
+        <button onClick={onLogout} className="px-4 py-2.5 rounded-xl bg-ink text-white text-sm font-semibold hover:opacity-90">
+          Cerrar sesión
+        </button>
+      </div>
+    </div>
+  )
+}
+
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

+    const { data } = await supabase.from('entrenadores').select('"displayName", approved, rol, profile').eq('uid', uid).maybeSingle()
     if (!data || data.approved === false) { await supabase.auth.signOut(); setView('auth'); return }
+    const profile = (data.profile || {}) as { planName?: 'free' | 'trial' | 'pro' | 'studio'; clientLimit?: number; trialEndsAt?: number }
+    const trialExpired = !!(profile.planName === 'trial' && profile.trialEndsAt && Date.now() > profile.trialEndsAt)
+    if (trialExpired) {
+      setUserProfile({
+        uid, email,
+        displayName: data.displayName || email.split('@')[0],
+        role: data.rol === 'super_admin' ? 'super_admin' : 'trainer',
+        approved: true, createdAt: Date.now(),
+        planName: profile.planName || 'trial',
+        clientLimit: profile.clientLimit ?? 5,
+        trialEndsAt: profile.trialEndsAt
+      })
+      setView('trial-expired')
+      return
+    }
     setUserProfile({
       uid, email,
       displayName: data.displayName || email.split('@')[0],
       role: data.rol === 'super_admin' ? 'super_admin' : 'trainer',

+      approved: true, createdAt: Date.now(),
+      planName: profile.planName || 'free',
+      clientLimit: profile.clientLimit ?? 5,
+      trialEndsAt: profile.trialEndsAt
     })
     setView('trainer')
   }
 
   const handleLogout = async () => {
     await supabase.auth.signOut()
     setView('auth'); setUserProfile(null); setSelectedClient(null)
   }
 
   // Pre-cargar datos demo en localStorage
   if (view === 'demo') {
     localStorage.setItem(`pf_trainer_profile_${DEMO_TRAINER_ID}`, JSON.stringify(DEMO_TRAINER_PROFILE))
     localStorage.setItem(`pf_trainer_phone_${DEMO_TRAINER_ID}`, DEMO_TRAINER_PROFILE.phone)
     // Pesos corporales
     localStorage.setItem(`pf_weight_demo-client-001`, JSON.stringify(DEMO_WEIGHTS_MARIA))
     localStorage.setItem(`pf_weight_demo-client-002`, JSON.stringify(DEMO_WEIGHTS_CARLOS))
     localStorage.setItem(`pf_weight_demo-client-003`, JSON.stringify(DEMO_WEIGHTS_LAURA))
     // Encuestas demo
     localStorage.setItem(`pf_demo_survey_template`, JSON.stringify(DEMO_SURVEY_TEMPLATE))
     localStorage.setItem(`pf_demo_survey_responses`, JSON.stringify(DEMO_SURVEY_RESPONSES))
   }
 
   if (view === 'loading') return <LoadingScreen />
 
   const encuestaParam = new URLSearchParams(window.location.search).get('encuesta') === '1'

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
 
+  if (view === 'trial-expired' && userProfile?.role === 'trainer') return (
+    <>
+      <TrialExpiredScreen onLogout={handleLogout} />
+      <ToastContainer toasts={toasts} />
+    </>
+  )
+
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
           demoLogs={selectedClient.id === 'demo-client-001' ? DEMO_LOGS_MARIA : selectedClient.id === 'demo-client-002' ? DEMO_LOGS_CARLOS : DEMO_LOGS_LAURA}
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
 
EOF
)
