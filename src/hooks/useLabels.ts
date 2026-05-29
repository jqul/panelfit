import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { TrainerLabel } from '../components/trainer/labels'

export function useLabels(trainerId: string) {
  const [labels, setLabels] = useState<TrainerLabel[]>([])

  useEffect(() => {
    if (!trainerId) return
    supabase
      .from('labels')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('created_at')
      .then(({ data }) => { if (data) setLabels(data) })
  }, [trainerId])

  return { labels, setLabels }
}
