import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { DEFAULT_EXERCISE_LIBRARY } from './defaultExerciseLibrary'
import { DEMO_TRAINER_ID } from './demo-data'
import { fetchAllPages } from './fetchAllPages'

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
    let active = true
    // Sin paginar, PostgREST corta en silencio a las primeras 1000 filas por
    // nombre — con ~1500 ejercicios por cuenta faltaban todos los del final
    // del alfabeto en el buscador de sustitución y en las alternativas.
    fetchAllPages<LibraryExerciseName>((from, to) =>
      supabase.from('exercise_library').select('id, name, category')
        .eq('trainer_id', trainerId).is('deleted_at', null).order('name').range(from, to)
    ).then(({ rows, error }) => {
      if (!active) return
      setNames(error ? [] : rows)
      setLoading(false)
    })
    return () => { active = false }
  }, [trainerId])

  return { names, loading }
}
