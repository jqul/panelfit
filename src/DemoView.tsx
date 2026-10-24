import { useState } from 'react'
import { Rocket, Mail } from 'lucide-react'
import { ClientData, UserProfile } from './types'
import { DEMO_CLIENTS, DEMO_TRAINER_ID, DEMO_LOGS_MAP, DEMO_PLAN_MAP } from './lib/demo-data'
import { TrainerDashboard } from './components/trainer/TrainerDashboard'
import { ClientPanel } from './components/trainer/ClientPanel'

// Modo demo (y vista previa de entrenadores pendientes de aprobación). Vive en su propio trozo para que
// los datos de ejemplo (~17 kB gzip) no se descarguen en el resto de páginas: landing, blog, login, clientes.

// ── Perfil demo constante ─────────────────────────────────
// planName: 'studio' — el modo demo debe enseñar TODO lo que la app es capaz de
// hacer, incluidas las funciones de pago más altas (encuestas, dashboard de
// negocio, marca blanca...), no quedarse bloqueado tras el paywall del plan Free.
const DEMO_PROFILE: UserProfile = {
  uid: DEMO_TRAINER_ID, email: 'demo@panelfit.app', displayName: 'Alex Trainer',
  role: 'trainer', approved: true, createdAt: Date.now(), planName: 'studio',
}

// ── Banner de entrenador pendiente ───────────────────────
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
export function DemoView({ showBanner, pendingUser, selectedClient, setSelectedClient, onRegister, onLogin }: {
  showBanner: boolean
  pendingUser: { displayName: string; email: string } | null
  selectedClient: ClientData | null
  setSelectedClient: (c: ClientData | null) => void
  onRegister?: () => void
  onLogin?: () => void
}) {
  const demoPlan = (id: string) => DEMO_PLAN_MAP[id] || undefined
  const demoLogs = (id: string) => DEMO_LOGS_MAP[id] || {}

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

