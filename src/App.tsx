import { useState, lazy, Suspense } from 'react'
import { track } from './lib/analytics'
import { supabase } from './lib/supabase'
import { ClientData } from './types'
import { Auth } from './components/shared/Auth'
import { ResetPassword } from './components/shared/ResetPassword'
import { useToast, ToastContainer } from './components/shared/Toast'
import { useAuthBootstrap, hydrateDemoStorage } from './lib/useAuthBootstrap'

const DemoView         = lazy(() => import('./DemoView').then(m => ({ default: m.DemoView })))
const TrainerDashboard = lazy(() => import('./components/trainer/TrainerDashboard').then(m => ({ default: m.TrainerDashboard })))
const ClientPanel      = lazy(() => import('./components/trainer/ClientPanel').then(m => ({ default: m.ClientPanel })))
const ClientView       = lazy(() => import('./components/client/ClientView').then(m => ({ default: m.ClientView })))
const SuperAdminPanel  = lazy(() => import('./components/trainer/SuperAdminPanel').then(m => ({ default: m.SuperAdminPanel })))
const PublicTrainerPage = lazy(() => import('./components/trainer/PublicTrainerPage').then(m => ({ default: m.PublicTrainerPage })))
const LandingAppEntrenadores    = lazy(() => import('./components/LandingAppEntrenadores').then(m => ({ default: m.LandingAppEntrenadores })))
const LandingSoftwareEntrenador = lazy(() => import('./components/LandingSoftwareEntrenador').then(m => ({ default: m.LandingSoftwareEntrenador })))
const LandingPrecios            = lazy(() => import('./components/LandingPrecios').then(m => ({ default: m.LandingPrecios })))
const LandingAlternativaHarbiz    = lazy(() => import('./components/LandingAlternativaHarbiz').then(m => ({ default: m.LandingAlternativaHarbiz })))
const LandingAlternativaTrainerize  = lazy(() => import('./components/LandingAlternativaTrainerize').then(m => ({ default: m.LandingAlternativaTrainerize })))
const LandingAlternativaMyPTHub     = lazy(() => import('./components/LandingAlternativaMyPTHub').then(m => ({ default: m.LandingAlternativaMyPTHub })))
const LandingAlternativaTrueCoach   = lazy(() => import('./components/LandingAlternativaTrueCoach').then(m => ({ default: m.LandingAlternativaTrueCoach })))
const LandingAlternativaPTDistinction = lazy(() => import('./components/LandingAlternativaPTDistinction').then(m => ({ default: m.LandingAlternativaPTDistinction })))
const CalculadoraRM                 = lazy(() => import('./components/CalculadoraRM').then(m => ({ default: m.CalculadoraRM })))
const BlogIndex                    = lazy(() => import('./components/BlogIndex').then(m => ({ default: m.BlogIndex })))
const BlogOrganizarClientes        = lazy(() => import('./components/BlogOrganizarClientes').then(m => ({ default: m.BlogOrganizarClientes })))
const BlogMejorSoftware            = lazy(() => import('./components/BlogMejorSoftware').then(m => ({ default: m.BlogMejorSoftware })))
const BlogSeguimientoClientes      = lazy(() => import('./components/BlogSeguimientoClientes').then(m => ({ default: m.BlogSeguimientoClientes })))
const BlogGestionPagos             = lazy(() => import('./components/BlogGestionPagos').then(m => ({ default: m.BlogGestionPagos })))
const BlogPlantillasEntrenamiento  = lazy(() => import('./components/BlogPlantillasEntrenamiento').then(m => ({ default: m.BlogPlantillasEntrenamiento })))
const BlogConseguirClientes        = lazy(() => import('./components/BlogConseguirClientes').then(m => ({ default: m.BlogConseguirClientes })))
const BlogAppEnviarPlanes          = lazy(() => import('./components/BlogAppEnviarPlanes').then(m => ({ default: m.BlogAppEnviarPlanes })))

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

// ── App ───────────────────────────────────────────────────
export default function App() {
  const { view, userProfile, pendingUser, clientToken, publicSlug, logout, setView } = useAuthBootstrap()
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null)
  const [allClients, setAllClients] = useState<ClientData[]>([])
  const [teamContext, setTeamContext] = useState<{ uid: string; displayName: string } | null>(null)
  const { toasts, dismiss } = useToast()

  // Si estamos viendo la cuenta de un compañero de equipo, usamos su uid en vez del nuestro
  // para clientes/plantillas/biblioteca, pero conservamos nuestro email/rol reales.
  const scopedProfile = teamContext && userProfile ? { ...userProfile, uid: teamContext.uid, displayName: teamContext.displayName } : userProfile

  const encuestaParam = new URLSearchParams(window.location.search).get('encuesta') === '1'

  // Entrar en modo demo desde cualquier landing/blog — hydrateDemoStorage()
  // siembra localStorage (peso, dolor, perfil del entrenador...) igual que ya
  // hace la entrada por ?demo=1; sin esto, un visitante que solo pulsa "Ver
  // demo en vivo" desde una de estas páginas veía el peso/dolor vacíos aunque
  // el resto de la demo (datos importados directamente, no vía localStorage)
  // sí funcionara.
  const goDemo = (source: string) => {
    track('demo_clicked', { source })
    window.history.pushState({}, '', '/')
    hydrateDemoStorage().then(() => setView('demo'))
  }

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
          onDemo={() => goDemo('app_entrenadores')}
          onRegister={() => { track('register_intent', { source: 'app_entrenadores' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}
      {view === 'landing-software-entrenador' && (
        <LandingSoftwareEntrenador
          onDemo={() => goDemo('software_entrenador')}
          onRegister={() => { track('register_intent', { source: 'software_entrenador' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}
      {view === 'landing-precios' && (
        <LandingPrecios
          onDemo={() => goDemo('precios')}
          onRegister={() => { track('register_intent', { source: 'precios' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}
      {view === 'landing-alternativa-harbiz' && (
        <LandingAlternativaHarbiz
          onDemo={() => goDemo('alternativa_harbiz')}
          onRegister={() => { track('register_intent', { source: 'alternativa_harbiz' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}
      {view === 'landing-alternativa-trainerize' && (
        <LandingAlternativaTrainerize
          onDemo={() => goDemo('alternativa_trainerize')}
          onRegister={() => { track('register_intent', { source: 'alternativa_trainerize' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}

      {/* Calculadora */}
      {view === 'calculadora-rm' && (
        <CalculadoraRM
          onDemo={() => goDemo('calculadora_rm')}
          onRegister={() => { track('register_intent', { source: 'calculadora_rm' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}

      {/* Alternativas adicionales */}
      {view === 'landing-alternativa-mypthub' && (
        <LandingAlternativaMyPTHub
          onDemo={() => goDemo('alt_mypthub')}
          onRegister={() => { track('register_intent', { source: 'alt_mypthub' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}
      {view === 'landing-alternativa-truecoach' && (
        <LandingAlternativaTrueCoach
          onDemo={() => goDemo('alt_truecoach')}
          onRegister={() => { track('register_intent', { source: 'alt_truecoach' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}
      {view === 'landing-alternativa-ptdistinction' && (
        <LandingAlternativaPTDistinction
          onDemo={() => goDemo('alt_ptdistinction')}
          onRegister={() => { track('register_intent', { source: 'alt_ptdistinction' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}

      {/* Blog */}
      {view === 'blog-index' && (
        <BlogIndex
          onDemo={() => goDemo('blog_index')}
          onRegister={() => { track('register_intent', { source: 'blog_index' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}
      {view === 'blog-organizar-clientes' && (
        <BlogOrganizarClientes
          onDemo={() => goDemo('blog_organizar')}
          onRegister={() => { track('register_intent', { source: 'blog_organizar' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}

      {view === 'blog-pagos' && (
        <BlogGestionPagos
          onDemo={() => goDemo('blog_pagos')}
          onRegister={() => { track('register_intent', { source: 'blog_pagos' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}
      {view === 'blog-plantillas' && (
        <BlogPlantillasEntrenamiento
          onDemo={() => goDemo('blog_plantillas')}
          onRegister={() => { track('register_intent', { source: 'blog_plantillas' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}
      {view === 'blog-conseguir-clientes' && (
        <BlogConseguirClientes
          onDemo={() => goDemo('blog_conseguir')}
          onRegister={() => { track('register_intent', { source: 'blog_conseguir' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}
      {view === 'blog-app-planes' && (
        <BlogAppEnviarPlanes
          onDemo={() => goDemo('blog_app_planes')}
          onRegister={() => { track('register_intent', { source: 'blog_app_planes' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}
      {view === 'blog-mejor-software' && (
        <BlogMejorSoftware
          onDemo={() => goDemo('blog_software')}
          onRegister={() => { track('register_intent', { source: 'blog_software' }); window.history.pushState({}, '', '/'); setView('auth') }}
          onLogin={() => { window.history.pushState({}, '', '/'); setView('auth') }}
        />
      )}
      {view === 'blog-seguimiento-clientes' && (
        <BlogSeguimientoClientes
          onDemo={() => goDemo('blog_seguimiento')}
          onRegister={() => { track('register_intent', { source: 'blog_seguimiento' }); window.history.pushState({}, '', '/'); setView('auth') }}
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
          onDemo={() => goDemo('home')}
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

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </Suspense>
  )
}
