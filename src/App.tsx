import { useState, lazy, Suspense } from 'react'
import { supabase } from './lib/supabase'
import { ClientData } from './types'
import { Auth } from './components/shared/Auth'
import { ResetPassword } from './components/shared/ResetPassword'
import { DEMO_CLIENTS, DEMO_PLAN_MARIA, DEMO_LOGS_MARIA, DEMO_TRAINER_ID,
  DEMO_PLAN_CARLOS, DEMO_PLAN_LAURA, DEMO_LOGS_CARLOS, DEMO_LOGS_LAURA } from './lib/demo-data'
import { useToast, ToastContainer } from './components/shared/Toast'
import { useAuthBootstrap } from './lib/useAuthBootstrap'
import { Rocket, Mail } from 'lucide-react'
import { UserProfile } from './types'

const TrainerDashboard = lazy(() => import('./components/trainer/TrainerDashboard').then(m => ({ default: m.TrainerDashboard })))
const ClientPanel      = lazy(() => import('./components/trainer/ClientPanel').then(m => ({ default: m.ClientPanel })))
const ClientView       = lazy(() => import('./components/client/ClientView').then(m => ({ default: m.ClientView })))
const SuperAdminPanel  = lazy(() => import('./components/trainer/SuperAdminPanel').then(m => ({ default: m.SuperAdminPanel })))
const PublicTrainerPage = lazy(() => import('./components/trainer/PublicTrainerPage').then(m => ({ default: m.PublicTrainerPage })))

// ── Perfil demo constante ─────────────────────────────────
const DEMO_PROFILE: UserProfile = {
  uid: DEMO_TRAINER_ID, email: 'demo@panelfit.app', displayName: 'Alex Trainer',
  role: 'trainer', approved: true, createdAt: Date.now(),
}

// ── Componentes pequeños ──────────────────────────────────
function LoadingScreen() {
  return (
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
}

function PendingBanner({ displayName, email }: { displayName: string; email: string }) {
  const [visible, setVisible] = useState(true)
  if (!visible) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Rocket className="w-4 h-4 flex-shrink-0" />
        <span>Hola <strong>{displayName}</strong> — Estás explorando el modo demo. Te activaremos en breve.</span>
        <a href={`mailto:javi_ql@hotmail.com?subject=Activar cuenta PanelFit&body=Hola, soy ${displayName} (${email})`}
          className="ml-2 underline underline-offset-2 flex items-center gap-1 hover:opacity-80">
          <Mail className="w-3.5 h-3.5" /> Contactar
        </a>
      </div>
      <button onClick={() => setVisible(false)} className="text-white/70 hover:text-white text-lg ml-4">×</button>
    </div>
  )
}

// ── Vista demo compartida (pending-demo y demo público) ───
function DemoView({ showBanner, pendingUser, selectedClient, setSelectedClient }: {
  showBanner: boolean
  pendingUser: { displayName: string; email: string } | null
  selectedClient: ClientData | null
  setSelectedClient: (c: ClientData | null) => void
}) {
  const demoPlan = (id: string) =>
    id === 'demo-client-001' ? DEMO_PLAN_MARIA :
    id === 'demo-client-002' ? DEMO_PLAN_CARLOS : DEMO_PLAN_LAURA

  const demoLogs = (id: string) =>
    id === 'demo-client-001' ? DEMO_LOGS_MARIA :
    id === 'demo-client-002' ? DEMO_LOGS_CARLOS : DEMO_LOGS_LAURA

  return (
    <>
      {showBanner && pendingUser && (
        <PendingBanner displayName={pendingUser.displayName} email={pendingUser.email} />
      )}
      <div className={showBanner ? 'pt-11' : ''}>
        {selectedClient ? (
          <ClientPanel
            client={selectedClient}
            userProfile={DEMO_PROFILE}
            allClients={DEMO_CLIENTS}
            onClose={() => setSelectedClient(null)}
            demoPlan={demoPlan(selectedClient.id)}
            demoLogs={demoLogs(selectedClient.id)}
          />
        ) : (
          <TrainerDashboard
            userProfile={DEMO_PROFILE}
            onLogout={() => { window.location.href = '/' }}
            demoClients={DEMO_CLIENTS}
            onSelectClient={(c: ClientData) => setSelectedClient(c)}
          />
        )}
      </div>
    </>
  )
}

// ── App ───────────────────────────────────────────────────
export default function App() {
  const { view, userProfile, pendingUser, clientToken, publicSlug, logout, setView } = useAuthBootstrap()
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null)
  const [allClients, setAllClients] = useState<ClientData[]>([])
  const { toasts } = useToast()

  const encuestaParam = new URLSearchParams(window.location.search).get('encuesta') === '1'

  if (view === 'loading') return <LoadingScreen />

  return (
    <Suspense fallback={<LoadingScreen />}>
      {/* Vista cliente por token */}
      {view === 'client-token' && clientToken && (
        <ClientView token={clientToken} showEncuesta={encuestaParam} />
      )}

      {/* Página pública del entrenador */}
      {view === 'public-page' && publicSlug && (
        <PublicTrainerPage slug={publicSlug} />
      )}

      {/* Establecer nueva contraseña (enlace de recuperación) */}
      {view === 'reset-password' && (
        <ResetPassword onDone={() => setView('auth')} />
      )}

      {/* Auth */}
      {view === 'auth' && (
        <Auth
          onAuth={() => supabase.auth.getSession().then(({ data }) => {
            if (data.session?.user) {
              // onAuthStateChange lo manejará — solo forzamos si no dispara
            }
          })}
          onDemo={() => setView('demo')}
        />
      )}

      {/* Panel entrenador real */}
      {view === 'trainer' && userProfile && (
        userProfile.role === 'super_admin' ? (
          <SuperAdminPanel onLogout={logout} />
        ) : selectedClient ? (
          <ClientPanel
            client={selectedClient}
            userProfile={userProfile}
            allClients={allClients}
            onClose={() => setSelectedClient(null)}
          />
        ) : (
          <TrainerDashboard
            userProfile={userProfile}
            onLogout={logout}
            onSelectClient={(client: ClientData) => {
              setSelectedClient(client)
              setAllClients(prev => prev.find(c => c.id === client.id) ? prev : [...prev, client])
            }}
          />
        )
      )}

      {/* Demo para entrenadores pendientes */}
      {view === 'pending-demo' && (
        <DemoView
          showBanner={true}
          pendingUser={pendingUser}
          selectedClient={selectedClient}
          setSelectedClient={setSelectedClient}
        />
      )}

      {/* Demo público */}
      {view === 'demo' && (
        <DemoView
          showBanner={false}
          pendingUser={null}
          selectedClient={selectedClient}
          setSelectedClient={setSelectedClient}
        />
      )}

      <ToastContainer toasts={toasts} />
    </Suspense>
  )
}
