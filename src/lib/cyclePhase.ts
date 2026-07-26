import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { DEMO_CICLO_MAP } from './demo-data'

export interface CicloTracking {
  client_id: string
  trainer_id: string
  activo: boolean
  ultima_regla: string | null
  duracion_ciclo: number
  updated_at: number
}

export type CyclePhase = 'menstrual' | 'folicular' | 'ovulacion' | 'lutea'

export const PHASE_INFO: Record<CyclePhase, { label: string; guidance: string; color: string }> = {
  menstrual: { label: 'Menstrual', color: '#e07b54', guidance: 'Energía puede ser más baja. Buen momento para entrenos moderados o de técnica — escucha al cuerpo.' },
  folicular: { label: 'Folicular', color: '#4caf7d', guidance: 'Fase de mayor capacidad de esfuerzo. Buen momento para cargas altas y buscar marcas personales.' },
  ovulacion: { label: 'Ovulación', color: '#e0a854', guidance: 'Pico de fuerza, pero mayor riesgo de lesión articular — cuida la técnica en ejercicios explosivos o de impacto.' },
  lutea: { label: 'Lútea', color: '#8b5cf6', guidance: 'Energía en descenso progresivo. Prioriza volumen moderado, técnica y buena recuperación.' },
}

/** Día del ciclo (1-indexado) y fase actual, a partir de la fecha de última regla. */
export function getCyclePhase(ultimaRegla: string, duracionCiclo: number): { day: number; phase: CyclePhase } {
  const start = new Date(ultimaRegla + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000)
  const day = ((diffDays % duracionCiclo) + duracionCiclo) % duracionCiclo + 1

  const ovulationCenter = Math.floor(duracionCiclo / 2)
  let phase: CyclePhase
  if (day <= 5) phase = 'menstrual'
  else if (day < ovulationCenter - 1) phase = 'folicular'
  else if (day <= ovulationCenter + 1) phase = 'ovulacion'
  else phase = 'lutea'

  return { day, phase }
}

export function useCicloTracking(clientId?: string) {
  const [ciclo, setCiclo] = useState<CicloTracking | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!clientId) { setLoading(false); return }
    if (clientId.startsWith('demo-client-')) { setCiclo(DEMO_CICLO_MAP[clientId] || null); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('ciclo_tracking').select('*').eq('client_id', clientId).maybeSingle()
    setCiclo(data as CicloTracking | null)
    setLoading(false)
  }, [clientId])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (trainerId: string, updates: Partial<CicloTracking>) => {
    if (!clientId) return
    const row = { client_id: clientId, trainer_id: trainerId, activo: ciclo?.activo ?? false, ultima_regla: ciclo?.ultima_regla ?? null, duracion_ciclo: ciclo?.duracion_ciclo ?? 28, ...updates, updated_at: Date.now() }
    setCiclo(row as CicloTracking)
    if (clientId.startsWith('demo-client-')) return
    await supabase.from('ciclo_tracking').upsert(row, { onConflict: 'client_id' })
  }, [clientId, ciclo])

  return { ciclo, loading, save, reload: load }
}
