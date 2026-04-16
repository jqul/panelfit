import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { LibraryExercise, LibraryVideo } from '../types'
import { Especialidad } from '../lib/especialidades'

const LS_KEY = (uid: string) => `pf_library_${uid}`

function getYTId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

export type { Especialidad }

export function useExerciseLibrary(trainerId: string) {
  const [exercises, setExercises] = useState<LibraryExercise[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!trainerId) return
    const cached = localStorage.getItem(LS_KEY(trainerId))
    if (cached) {
      try { setExercises(JSON.parse(cached)) } catch {}
    }
    setLoading(false)
  }, [trainerId])

  const save = (updated: LibraryExercise[]) => {
    setExercises(updated)
    localStorage.setItem(LS_KEY(trainerId), JSON.stringify(updated))
  }

  const addExercise = (
    name: string,
    description = '',
    category = '',
    videos: NonNullable<LibraryExercise['videos']> = [],
    especialidades: Especialidad[] = []
  ) => {
    const ex: LibraryExercise = {
      id: `ex_${Date.now()}`,
      trainerId,
      name: name.trim(),
      description,
      category,
      especialidades,
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

  const findByName = (name: string): LibraryExercise | undefined =>
    exercises.find(e => e.name.toLowerCase() === name.toLowerCase())

  // Mejora 2: priorización en 3 pasos
  const getVideosForClient = (
    exerciseName: string,
    clientEspecialidad?: Especialidad
  ): NonNullable<LibraryExercise['videos']> => {
    const ex = findByName(exerciseName)
    if (!ex?.videos?.length) return []
    if (!clientEspecialidad) return ex.videos

    // Paso 1: vídeos con tag exacto del cliente
    const exact = ex.videos.filter(v =>
      v.especialidades?.length && v.especialidades.includes(clientEspecialidad)
    )
    if (exact.length) return exact

    // Paso 2: vídeos genéricos (sin tag)
    const generic = ex.videos.filter(v => !v.especialidades?.length)
    if (generic.length) return generic

    // Paso 3: todos
    return ex.videos
  }

  // Contador de vídeos por especialidad en toda la biblioteca
  const videoCountByEsp = (): Record<string, number> => {
    const counts: Record<string, number> = { generico: 0 }
    exercises.forEach(ex => {
      (ex.videos || []).forEach(v => {
        if (!v.especialidades?.length) {
          counts['generico'] = (counts['generico'] || 0) + 1
        } else {
          v.especialidades.forEach(esp => {
            counts[esp] = (counts[esp] || 0) + 1
          })
        }
      })
    })
    return counts
  }

  return {
    exercises, loading,
    addExercise, updateExercise, deleteExercise,
    findByName, getVideosForClient, getYTId,
    videoCountByEsp,
  }
}

export async function uploadVideoToStorage(trainerId: string, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `videos/${trainerId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true })
  if (error) { console.error('Upload error:', error); return null }
  const { data } = supabase.storage.from('media').getPublicUrl(path)
  return data.publicUrl
}
