import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { LibraryExercise, LibraryVideo } from '../types'
import { DEFAULT_EXERCISES } from '../lib/constants'

// Clave de localStorage para persistir sin Supabase
const LS_KEY = (uid: string) => `pf_library_${uid}`

function getYTId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

export function useExerciseLibrary(trainerId: string) {
  const [exercises, setExercises] = useState<LibraryExercise[]>([])
  const [loading, setLoading] = useState(true)

  // Cargar desde localStorage (fallback rápido)
  useEffect(() => {
    if (!trainerId) return
    const cached = localStorage.getItem(LS_KEY(trainerId))
    if (cached) {
      try { setExercises(JSON.parse(cached)) } catch {}
    } else {
      // Primera vez: seed con ejercicios por defecto
      const defaults: LibraryExercise[] = DEFAULT_EXERCISES.map((name, i) => ({
        id: `default_${i}`,
        trainerId,
        name,
        description: '',
        category: detectCategory(name),
        videos: [],
        createdAt: Date.now(),
      }))
      setExercises(defaults)
      localStorage.setItem(LS_KEY(trainerId), JSON.stringify(defaults))
    }
    setLoading(false)
  }, [trainerId])

  const save = (updated: LibraryExercise[]) => {
    setExercises(updated)
    localStorage.setItem(LS_KEY(trainerId), JSON.stringify(updated))
  }

  const addExercise = (name: string, description = '', category = '', videos: LibraryVideo[] = []) => {
    const ex: LibraryExercise = {
      id: `ex_${Date.now()}`,
      trainerId,
      name: name.trim(),
      description,
      category,
      videos,
      createdAt: Date.now(),
    }
    save([...exercises, ex].sort((a, b) => a.name.localeCompare(b.name)))
    return ex
  }

  const updateExercise = (id: string, updates: Partial<LibraryExercise>) => {
    save(exercises.map(e => e.id === id ? { ...e, ...updates } : e))
  }

  const deleteExercise = (id: string) => {
    save(exercises.filter(e => e.id !== id))
  }

  const findByName = (name: string): LibraryExercise | undefined => {
    return exercises.find(e => e.name.toLowerCase() === name.toLowerCase())
  }

  return { exercises, loading, addExercise, updateExercise, deleteExercise, findByName, getYTId }
}

function detectCategory(name: string): string {
  const n = name.toLowerCase()
  if (/sentadilla|prensa|leg|zancada|hip|glute|femoral|cuádricep/.test(n)) return 'Piernas'
  if (/press banca|peck|apertura|apert/.test(n)) return 'Pecho'
  if (/jalón|dominada|remo|pull/.test(n)) return 'Espalda'
  if (/peso muerto/.test(n)) return 'Espalda'
  if (/press militar|arnold|elevacion|lateral|pájaro|deltoid/.test(n)) return 'Hombros'
  if (/curl|bícep/.test(n)) return 'Bíceps'
  if (/trícep|fondos|press franc|extensión/.test(n)) return 'Tríceps'
  if (/plancha|crunch|abdom|russian|rueda/.test(n)) return 'Core'
  if (/cardio|cinta|bicicleta|elíp|hiit/.test(n)) return 'Cardio'
  return 'General'
}
