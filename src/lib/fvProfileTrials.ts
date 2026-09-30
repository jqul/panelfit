import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { DEMO_FV_PROFILE_TRIALS_MAP } from './demo-data'

export interface FVProfileTrialRow {
  id: string
  trainer_id: string
  client_id: string
  date: string
  load_kg: number
  bodyweight_kg: number
  pushoff_distance_m: number
  jump_height_m: number
  notes: string | null
  created_at: number
}

export function useFVProfileTrials(clientId?: string) {
  const [trials, setTrials] = useState<FVProfileTrialRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!clientId) { setLoading(false); return }
    if (clientId.startsWith('demo-client-')) {
      setTrials(DEMO_FV_PROFILE_TRIALS_MAP[clientId] || [])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase.from('fv_profile_trials').select('*').eq('client_id', clientId).order('date', { ascending: false })
    setTrials((data || []) as FVProfileTrialRow[])
    setLoading(false)
  }, [clientId])

  useEffect(() => { load() }, [load])

  const addTrial = useCallback(async (trainerId: string, trial: Omit<FVProfileTrialRow, 'id' | 'trainer_id' | 'client_id' | 'created_at'>) => {
    if (!clientId) return
    const row: FVProfileTrialRow = {
      id: `fv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      trainer_id: trainerId, client_id: clientId, created_at: Date.now(),
      ...trial,
    }
    setTrials(prev => [row, ...prev])
    if (clientId.startsWith('demo-client-')) return
    await supabase.from('fv_profile_trials').insert(row)
  }, [clientId])

  const deleteTrial = useCallback(async (id: string) => {
    setTrials(prev => prev.filter(t => t.id !== id))
    if (clientId?.startsWith('demo-client-')) return
    await supabase.from('fv_profile_trials').delete().eq('id', id)
  }, [clientId])

  return { trials, loading, addTrial, deleteTrial, reload: load }
}
