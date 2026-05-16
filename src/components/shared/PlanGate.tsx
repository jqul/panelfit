// Componente que bloquea features según el plan
import { canUse, Feature, getPlan } from '../../lib/plans'
import { Lock } from 'lucide-react'

interface Props {
  feature: Feature
  planName?: string | null
  children: React.ReactNode
  fallback?: React.ReactNode  // si no se pasa, muestra banner de upgrade
}

const FEATURE_LABELS: Record<Feature, string> = {
  clients_unlimited: 'Clientes ilimitados',
  pdf_report: 'Informes PDF',
  white_label: 'Marca personalizada',
  surveys: 'Encuestas y check-ins',
  video_library: 'Biblioteca de vídeos',
  business_dashboard: 'Dashboard de negocio',
  public_page: 'Página pública',
  export_data: 'Exportar datos',
  custom_subdomain: 'Subdominio personalizado',
  multi_trainer: 'Multi-entrenador',
}

const FEATURE_PLAN: Record<Feature, string> = {
  clients_unlimited: 'Pro',
  pdf_report: 'Pro',
  white_label: 'Pro',
  surveys: 'Starter',
  video_library: 'Free',
  business_dashboard: 'Pro',
  public_page: 'Pro',
  export_data: 'Starter',
  custom_subdomain: 'Studio',
  multi_trainer: 'Studio',
}

export function PlanGate({ feature, planName, children, fallback }: Props) {
  if (canUse(feature, planName)) return <>{children}</>

  if (fallback) return <>{fallback}</>

  return (
    <div className="relative">
      {/* Contenido bloqueado con overlay */}
      <div className="pointer-events-none select-none opacity-30 blur-[2px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-bg/60 rounded-2xl backdrop-blur-[1px]">
        <div className="bg-card border border-border rounded-2xl px-6 py-5 shadow-xl text-center max-w-xs">
          <div className="w-10 h-10 bg-ink rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <p className="font-serif font-bold text-sm mb-1">{FEATURE_LABELS[feature]}</p>
          <p className="text-xs text-muted mb-3">
            Disponible en el plan <span className="font-bold text-ink">{FEATURE_PLAN[feature]}</span>
          </p>
          <a href="mailto:javier.quinones.lopez@gmail.com?subject=Quiero actualizar mi plan PanelFit"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink text-white rounded-xl text-xs font-semibold hover:opacity-90">
            Actualizar plan →
          </a>
        </div>
      </div>
    </div>
  )
}

// Badge de plan para mostrar en el dashboard
export function PlanBadge({ planName }: { planName?: string | null }) {
  const plan = getPlan(planName)
  const colors: Record<string, string> = {
    free: 'bg-bg-alt text-muted border-border',
    starter: 'bg-accent/10 text-accent border-accent/20',
    trial: 'bg-warn/10 text-warn border-warn/20',
    pro: 'bg-ok/10 text-ok border-ok/20',
    studio: 'bg-purple-50 text-purple-600 border-purple-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${colors[plan.name] || colors.free}`}>
      {plan.label}
    </span>
  )
}
