import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { LibraryExercise, LibraryVideo } from '../types'

const LS_KEY = (uid: string) => `pf_library_${uid}`

function getYTId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

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
    videos: LibraryVideo[] = [],
    especialidades: string[] = []
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

  const findByName = (name: string): LibraryExercise | undefined => {
    return exercises.find(e => e.name.toLowerCase() === name.toLowerCase())
  }

  // Devuelve vídeos filtrados por especialidad, priorizando los que coinciden
  const getVideosForClient = (
    exerciseName: string,
    clientEspecialidad?: string
  ): LibraryVideo[] => {
    const ex = findByName(exerciseName)
    if (!ex?.videos?.length) return []
    if (!clientEspecialidad) return ex.videos

    const matching = ex.videos.filter(v =>
      !v.especialidades?.length || v.especialidades.includes(clientEspecialidad)
    )
    const rest = ex.videos.filter(v =>
      v.especialidades?.length && !v.especialidades.includes(clientEspecialidad)
    )
    return [...matching, ...rest]
  }

  return { exercises, loading, addExercise, updateExercise, deleteExercise, findByName, getVideosForClient, getYTId }
}

export async function uploadVideoToStorage(
  trainerId: string,
  file: File,
): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `videos/${trainerId}/${Date.now()}.${ext}`
  const { data, error } = await supabase.storage
    .from('media')
    .upload(path, file, { upsert: true })
  if (error) { console.error('Upload error:', error); return null }
  const { data: urlData } = supabase.storage.from('media').getPublicUrl(path)
  return urlData.publicUrl
}
