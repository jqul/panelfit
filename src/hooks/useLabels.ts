import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { TrainerLabel } from '../components/trainer/labels'
import { DEMO_TRAINER_ID } from '../lib/demoIds'

export function useLabels(trainerId: string) {
  const [labels, setLabels] = useState<TrainerLabel[]>([])

  useEffect(() => {
    if (!trainerId) return
    // En la demo, sus etiquetas (se descargan solo en la demo)
    if (trainerId === DEMO_TRAINER_ID) { import('../lib/demo-data').then(m => setLabels(m.DEMO_LABELS)); return }
    supabase
      .from('labels')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('created_at')
      .then(({ data }) => { if (data) setLabels(data) })
  }, [trainerId])

  return { labels, setLabels }
}
