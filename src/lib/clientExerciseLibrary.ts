import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { DEFAULT_EXERCISE_LIBRARY } from './defaultExerciseLibrary'
import { DEMO_TRAINER_ID } from './demo-data'

// Lectura ligera (solo nombre + categoría) de la biblioteca del entrenador,
// para el lado del cliente — a diferencia de useExerciseLibrary.ts (que trae
// vídeos, especialidades, gestión de uso... todo pensado para el editor del
// entrenador), esto es solo lo mínimo para poder elegir un sustituto de
// ejercicio de una lista real en vez de escribir texto libre.
export interface LibraryExerciseName { id: string; name: string; category?: string }

export function useTrainerExerciseNames(trainerId?: string) {
  const [names, setNames] = useState<LibraryExerciseName[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!trainerId) { setNames([]); setLoading(false); return }
    if (trainerId === DEMO_TRAINER_ID) {
      setNames(DEFAULT_EXERCISE_LIBRARY.map((e, i) => ({ id: `ex_demo_${i}`, name: e.name, category: e.category })))
      setLoading(false)
      return
    }
    setLoading(true)
    supabase.from('exercise_library').select('id, name, category')
      .eq('trainer_id', trainerId).is('deleted_at', null).order('name')
      .then(({ data, error }) => {
        setNames(error || !data ? [] : (data as LibraryExerciseName[]))
        setLoading(false)
      })
  }, [trainerId])

  return { names, loading }
}
