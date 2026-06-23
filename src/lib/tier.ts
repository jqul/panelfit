import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type TrainerTier = 'basico' | 'alto_rendimiento'

// Secciones de ProgresoTab reservadas al plan Alto Rendimiento.
export const ADVANCED_SECTIONS = new Set(['fatiga', 'rm', 'estandares', 'pesos_sugeridos'])

export const TIER_LABEL: Record<TrainerTier, string> = {
  basico: 'Básico',
  alto_rendimiento: 'Alto Rendimiento',
}

export const TIER_FEATURES: Record<TrainerTier, string[]> = {
  basico: [
    'Gestión de clientes y comunicación',
    'Plan de entrenamiento por semanas/días',
    'Plan nutricional con macros',
    'Calendario de sesiones',
    'Etiquetas y plantillas',
    'Fotos y peso corporal',
  ],
  alto_rendimiento: [
    'Todo lo incluido en Básico',
    'Estimación de 1RM y programación por % de carga',
    'Periodización editable y ciclos Wendler 5/3/1',
    'Estándares de fuerza (sentadilla/banca/peso muerto)',
    'Semáforo de riesgo: carga de entreno + bienestar',
    'Check-in diario de bienestar y PAR-Q de alta',
    'Pesos sugeridos automáticos según RIR',
  ],
}

// Trainers existentes sin el campo `tier` se consideran Alto Rendimiento
// (no se les retira nada que ya tuvieran).
const DEFAULT_TIER: TrainerTier = 'alto_rendimiento'

export function useTrainerTier(trainerId?: string): TrainerTier {
  const [tier, setTier] = useState<TrainerTier>(DEFAULT_TIER)

  useEffect(() => {
    if (!trainerId) return
    supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle()
      .then(({ data }) => {
        const t = (data?.profile as { tier?: TrainerTier } | null)?.tier
        setTier(t === 'basico' ? 'basico' : DEFAULT_TIER)
      })
  }, [trainerId])

  return tier
}
