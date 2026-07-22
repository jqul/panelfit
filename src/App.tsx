import { useState, lazy, Suspense } from 'react'
import { track } from '@vercel/analytics'
import { supabase } from './lib/supabase'
import { ClientData } from './types'
import { Auth } from './components/shared/Auth'
import { ResetPassword } from './components/shared/ResetPassword'
import { DEMO_CLIENTS, DEMO_PLAN_MARIA, DEMO_LOGS_MARIA, DEMO_TRAINER_ID,
  DEMO_PLAN_CARLOS, DEMO_PLAN_LAURA, DEMO_LOGS_CARLOS, DEMO_LOGS_LAURA,
  DEMO_LOGS_MAP } from './lib/demo-data'
import { useToast, ToastContainer } from './components/shared/Toast'
import { useAuthBootstrap } from './lib/useAuthBootstrap'
import { Rocket, Mail } from 'lucide-react'
import { UserProfile } from './types'

const TrainerDashboard = lazy(() => import('./components/trainer/TrainerDashboard').then(m => ({ default: m.TrainerDashboard })))
const ClientPanel      = lazy(() => import('./components/trainer/ClientPanel').then(m => ({ default: m.ClientPanel })))
const ClientView       = lazy(() => import('./components/client/ClientView').then(m => ({ default: m.ClientView })))
const SuperAdminPanel  = lazy(() => import('./components/trainer/SuperAdminPanel').then(m => ({ default: m.SuperAdminPanel })))
const PublicTrainerPage = lazy(() => import('./components/trainer/PublicTrainerPage').then(m => ({ default: m.PublicTrainerPage })))
const LandingAppEntrenadores    = lazy(() => import('./components/LandingAppEntrenadores').then(m => ({ default: m.LandingAppEntrenadores })))
const LandingSoftwareEntrenador = lazy(() => import('./components/LandingSoftwareEntrenador').then(m => ({ default: m.LandingSoftwareEntrenador })))
const LandingPrecios            = lazy(() => import('./components/LandingPrecios').then(m => ({ default: m.LandingPrecios })))
const LandingAlternativaHarbiz    = lazy(() => import('./components/LandingAlternativaHarbiz').then(m => ({ default: m.LandingAlternativaHarbiz })))
const LandingAlternativaTrainerize = lazy(() => import('./components/LandingAlternativaTrainerize').then(m => ({ default: m.LandingAlternativaTrainerize })))
const BlogOrganizarClientes        = lazy(() => import('./components/BlogOrganizarClientes').then(m => ({ default: m.BlogOrganizarClientes })))

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
        <a href={`mailto:javier.quinones.lopez@gmail.com?subject=Activar cuenta PanelFit&body=Hola, soy ${displayName} (${email})`}
          className="ml-2 underline underline-offset-2 flex items-center gap-1 hover:opacity-80">
          <Mail className="w-3.5 h-3.5" /> Contactar
        </a>
      </div>
      <button onClick={() => setVisible(false)} className="text-white/70 hover:text-white text-lg ml-4">×</button>
    </div>
  )
}

// ── CTA flotante para demo público ───────────────────────
function DemoCTA({ onRegister, onLogin }: { onRegister: () => void; onLogin: () => void }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-bg border-t border-border shadow-lg px-4 py-3 flex items-center justify-between gap-3">
      <p className="text-sm text-text-secondary hidden sm:block">
        Estás viendo la demo — los datos son ficticios.
      </p>
      <p className="text-sm font-medium sm:hidden">¿Te convence PanelFit?</p>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onLogin}
          className="text-sm text-text-secondary hover:text-text px-3 py-1.5 rounded-lg hover:bg-surface transition-colors"
        >
          Entrar
        </button>
        <button
          onClick={onRegister}
          className="text-sm font-semibold bg-accent text-white px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
        >
          Solicitar acceso gratis →
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-text-secondary/50 hover:text-text-secondary ml-1 text-lg leading-none"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>
    </div>
  )
}

// ── Vista demo compartida (pending-demo y demo público) ───
function DemoView({ showBanner, pendingUser, selectedClient, setSelectedClient, onRegister, onLogin }: {
  showBanner: boolean
  pendingUser: { displayName: string; email: string } | null
  selectedClient: ClientData | null
  setSelectedClient: (c: ClientData | null) => void
  onRegister?: () => void
  onLogin?: () => void
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
      {!showBanner && onRegister && onLogin && (
        <DemoCTA onRegister={onRegister} onLogin={onLogin} />
      )}
      <div className={showBanner ? 'pt-11' : 'pb-16'}>
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
            demoLogsMap={DEMO_LOGS_MAP}
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
  const [teamContext, setTeamContext] = useState<{ uid: string; displayName: string } | null>(null)
  const { toasts } = useToast()

  // Si estamos viendo la cuenta de un compañero de equipo, usamos su uid en vez del nuestro
  // para clientes/plantillas/biblioteca, pero conservamos nuestro email/rol reales.
  const scopedProfile = teamContext && userProfile ? { ...userProfile, uid: teamContext.uid, displayName: teamContext.displayName } : userProfile

  const encuestaParam = new URLSearchParams(window.location.search).get('encuesta') === '1'

  if (view === 'loading') return <LoadingScreen />

  return (
    <Suspense fallback={<LoadingScreen />}>
      {/* Vista cliente por token */}
      {view === 'client-token' && clientToken && (
        <ClientView token={clientToken} showEncuesta={encuestaParam} />
      )}

      {/* Páginas SEO públicas */}
      {view === 'landing-app-entrenadores' && (
        <LandingAppEntrenadores
          onDemo={() => { track('demo_clicked', { source: 'app_entrenadores' }); window.history.pushState({}, '', '/'); setView('demo') }}
          onRegister={() => { track('register_intent', { source: 'app_entrenadores' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}
      {view === 'landing-software-entrenador' && (
        <LandingSoftwareEntrenador
          onDemo={() => { track('demo_clicked', { source: 'software_entrenador' }); window.history.pushState({}, '', '/'); setView('demo') }}
          onRegister={() => { track('register_intent', { source: 'software_entrenador' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}
      {view === 'landing-precios' && (
        <LandingPrecios
          onDemo={() => { track('demo_clicked', { source: 'precios' }); window.history.pushState({}, '', '/'); setView('demo') }}
          onRegister={() => { track('register_intent', { source: 'precios' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}
      {view === 'landing-alternativa-harbiz' && (
        <LandingAlternativaHarbiz
          onDemo={() => { track('demo_clicked', { source: 'alternativa_harbiz' }); window.history.pushState({}, '', '/'); setView('demo') }}
          onRegister={() => { track('register_intent', { source: 'alternativa_harbiz' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}
      {view === 'landing-alternativa-trainerize' && (
        <LandingAlternativaTrainerize
          onDemo={() => { track('demo_clicked', { source: 'alternativa_trainerize' }); window.history.pushState({}, '', '/'); setView('demo') }}
          onRegister={() => { track('register_intent', { source: 'alternativa_trainerize' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}

      {/* Blog */}
      {view === 'blog-organizar-clientes' && (
        <BlogOrganizarClientes
          onDemo={() => { track('demo_clicked', { source: 'blog_organizar' }); window.history.pushState({}, '', '/'); setView('demo') }}
          onRegister={() => { track('register_intent', { source: 'blog_organizar' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
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
            userProfile={scopedProfile!}
            allClients={allClients}
            onClose={() => setSelectedClient(null)}
          />
        ) : (
          <TrainerDashboard
            userProfile={scopedProfile!}
            realUserProfile={userProfile}
            teamContext={teamContext}
            onSwitchTeam={setTeamContext}
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
          onRegister={() => { track('register_intent', { source: 'demo_cta' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}

      <ToastContainer toasts={toasts} />
    </Suspense>
  )
}
