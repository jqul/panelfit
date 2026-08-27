import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { TrainerLabel } from '../components/trainer/labels'
import { DEMO_TRAINER_ID, DEMO_LABELS } from '../lib/demo-data'

export function useLabels(trainerId: string) {
  const [labels, setLabels] = useState<TrainerLabel[]>([])

  useEffect(() => {
    if (!trainerId) return
    if (trainerId === DEMO_TRAINER_ID) { setLabels(DEMO_LABELS); return }
    supabase
      .from('labels')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('created_at')
      .then(({ data }) => { if (data) setLabels(data) })
  }, [trainerId])

  return { labels, setLabels }
}
