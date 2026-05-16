// ── Sistema de planes y feature flags ─────────────────
// Fuente de verdad para qué puede hacer cada plan

export type PlanName = 'free' | 'starter' | 'trial' | 'pro' | 'studio'

export type Feature =
  | 'clients_unlimited'
  | 'pdf_report'
  | 'white_label'
  | 'surveys'
  | 'video_library'
  | 'business_dashboard'
  | 'public_page'
  | 'export_data'
  | 'custom_subdomain'
  | 'multi_trainer'

interface PlanConfig {
  name: string
  label: string
  clientLimit: number  // 9999 = ilimitado
  features: Feature[]
  color: string
}

export const PLANS: Record<PlanName, PlanConfig> = {
  free: {
    name: 'free',
    label: 'Free',
    clientLimit: 5,
    color: 'text-muted',
    features: ['video_library'],
  },
  starter: {
    name: 'starter',
    label: 'Starter',
    clientLimit: 15,
    color: 'text-accent',
    features: [
      'video_library',
      'surveys',
      'export_data',
    ],
  },
  trial: {
    name: 'trial',
    label: 'Demo 15d',
    clientLimit: 9999,
    color: 'text-warn',
    features: [
      'clients_unlimited',
      'pdf_report',
      'white_label',
      'surveys',
      'video_library',
      'business_dashboard',
      'public_page',
      'export_data',
    ],
  },
  pro: {
    name: 'pro',
    label: 'Pro',
    clientLimit: 9999,
    color: 'text-ok',
    features: [
      'clients_unlimited',
      'pdf_report',
      'white_label',
      'surveys',
      'video_library',
      'business_dashboard',
      'public_page',
      'export_data',
    ],
  },
  studio: {
    name: 'studio',
    label: 'Studio',
    clientLimit: 9999,
    color: 'text-purple-500',
    features: [
      'clients_unlimited',
      'pdf_report',
      'white_label',
      'surveys',
      'video_library',
      'business_dashboard',
      'public_page',
      'export_data',
      'custom_subdomain',
      'multi_trainer',
    ],
  },
}

export function canUse(feature: Feature, planName?: string | null): boolean {
  const plan = PLANS[(planName as PlanName) || 'free'] || PLANS.free
  return plan.features.includes(feature)
}

export function getPlan(planName?: string | null): PlanConfig {
  return PLANS[(planName as PlanName) || 'free'] || PLANS.free
}

export function getClientLimit(planName?: string | null): number {
  return getPlan(planName).clientLimit
}
