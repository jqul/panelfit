import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { LibraryExercise, LibraryVideo } from '../types'
import { Especialidad } from '../lib/especialidades'

const LS_KEY       = (uid: string) => `pf_library_${uid}`
const LS_MIGRATED  = (uid: string) => `pf_library_migrated_${uid}`

export type { Especialidad }

function getYTId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

// ── Row shape from Supabase ────────────────────────────
interface DBExercise {
  id: string
  trainer_id: string
  name: string
  description: string
  category: string
  especialidades: string[]
  videos: LibraryVideo[]
  tags: string[]
  use_count: number
  video_use_count: number
  created_at: number
  updated_at: number
  deleted_at: number | null
}

function dbToLocal(row: DBExercise): LibraryExercise {
  return {
    id: row.id,
    trainerId: row.trainer_id,
    name: row.name,
    description: row.description,
    category: row.category,
    especialidades: (row.especialidades || []) as Especialidad[],
    videos: row.videos || [],
    tags: row.tags || [],
    createdAt: row.created_at,
  } as LibraryExercise & { tags: string[] }
}

function localToDB(ex: LibraryExercise, trainerId: string): Omit<DBExercise, 'use_count' | 'video_use_count' | 'deleted_at'> {
  return {
    id: ex.id,
    trainer_id: trainerId,
    name: ex.name,
    description: ex.description || '',
    category: ex.category || '',
    especialidades: (ex.especialidades || []) as string[],
    videos: ex.videos || [],
    tags: (ex as any).tags || [],
    created_at: ex.createdAt || Date.now(),
    updated_at: Date.now(),
  }
}

export function useExerciseLibrary(trainerId: string) {
  const [exercises, setExercises] = useState<LibraryExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  // ── Carga inicial ──────────────────────────────────
  useEffect(() => {
    if (!trainerId) return
    loadLibrary()
  }, [trainerId])

  const loadLibrary = async () => {
    setLoading(true)

    // 1. Cargar caché local inmediatamente (UX instantánea)
    const cached = localStorage.getItem(LS_KEY(trainerId))
    if (cached) {
      try { setExercises(JSON.parse(cached)) } catch {}
    }

    // 2. Migrar desde localStorage a Supabase si aún no se hizo
    const migrated = localStorage.getItem(LS_MIGRATED(trainerId))
    if (!migrated && cached) {
      await migrateToSupabase(JSON.parse(cached))
    }

    // 3. Cargar desde Supabase (fuente de verdad)
    await syncFromSupabase()
    setLoading(false)
  }

  const syncFromSupabase = async () => {
    setSyncing(true)
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .eq('trainer_id', trainerId)
      .is('deleted_at', null)
      .order('name')

    if (!error && data) {
      const local = data.map(dbToLocal)
      setExercises(local)
      localStorage.setItem(LS_KEY(trainerId), JSON.stringify(local))
    }
    setSyncing(false)
    return !error
  }

  // ── Migración one-time desde localStorage ──────────
  const migrateToSupabase = async (localExercises: LibraryExercise[]) => {
    if (!localExercises.length) {
      localStorage.setItem(LS_MIGRATED(trainerId), '1')
      return
    }
    console.log(`[PanelFit] Migrando ${localExercises.length} ejercicios a Supabase...`)

    const rows = localExercises.map(ex => localToDB(ex, trainerId))

    // Upsert para no duplicar si ya existen
    const { error } = await supabase
      .from('exercise_library')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: false })

    if (!error) {
      localStorage.setItem(LS_MIGRATED(trainerId), '1')
      console.log('[PanelFit] Migración completada ✓')
    } else {
      console.error('[PanelFit] Error en migración:', error)
    }
  }

  // ── Guardar en caché local + Supabase ──────────────
  const saveLocal = (updated: LibraryExercise[]) => {
    setExercises(updated)
    localStorage.setItem(LS_KEY(trainerId), JSON.stringify(updated))
  }

  // ── CRUD ───────────────────────────────────────────
  const addExercise = useCallback(async (
    name: string,
    description = '',
    category = '',
    videos: LibraryVideo[] = [],
    especialidades: Especialidad[] = [],
    tags: string[] = []
  ) => {
    const ex: LibraryExercise & { tags: string[] } = {
      id: `ex_${Date.now()}`,
      trainerId,
      name: name.trim(),
      description,
      category,
      especialidades,
      videos,
      tags,
      createdAt: Date.now(),
    }

    // Optimistic update
    const updated = [...exercises, ex].sort((a, b) => a.name.localeCompare(b.name))
    saveLocal(updated)

    // Persistir en Supabase
    const { error } = await supabase
      .from('exercise_library')
      .insert(localToDB(ex, trainerId))

    if (error) {
      console.error('[PanelFit] Error al guardar ejercicio:', error)
      // Revertir si falla
      saveLocal(exercises)
    }

    return ex
  }, [exercises, trainerId])

  const updateExercise = useCallback(async (id: string, updates: Partial<LibraryExercise>) => {
    const updated = exercises.map(e => e.id === id ? { ...e, ...updates } : e)
    saveLocal(updated)

    const ex = updated.find(e => e.id === id)
    if (!ex) return

    const { error } = await supabase
      .from('exercise_library')
      .update({ ...localToDB(ex, trainerId), updated_at: Date.now() })
      .eq('id', id)

    if (error) console.error('[PanelFit] Error al actualizar ejercicio:', error)
  }, [exercises, trainerId])

  const deleteExercise = useCallback(async (id: string) => {
    // Optimistic update
    const updated = exercises.filter(e => e.id !== id)
    saveLocal(updated)

    // Soft delete en Supabase
    const { error } = await supabase
      .from('exercise_library')
      .update({ deleted_at: Date.now() })
      .eq('id', id)

    if (error) console.error('[PanelFit] Error al eliminar ejercicio:', error)
  }, [exercises, trainerId])

  // ── Telemetría ─────────────────────────────────────
  const trackUsage = useCallback(async (
    exerciseId: string,
    exerciseName: string,
    eventType: 'selected' | 'video_played' | 'added_to_plan',
    clientId?: string,
    especialidad?: string
  ) => {
    // Fire and forget — no bloquea la UI
    supabase.from('exercise_usage_events').insert({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      trainer_id: trainerId,
      exercise_id: exerciseId,
      exercise_name: exerciseName,
      event_type: eventType,
      client_id: clientId || null,
      especialidad: especialidad || null,
      created_at: Date.now(),
    }).then(({ error }) => {
      if (error) console.warn('[PanelFit] Telemetría:', error.message)
    })

    // Incrementar contador en el ejercicio
    if (eventType === 'added_to_plan') {
      supabase.from('exercise_library')
        .update({ use_count: supabase.rpc('increment' as any, { x: 1 }) as any })
        .eq('id', exerciseId)
    }
  }, [trainerId])

  // ── Métricas de uso ────────────────────────────────
  const getUsageStats = useCallback(async () => {
    const { data } = await supabase
      .from('exercise_usage_events')
      .select('exercise_name, event_type, especialidad')
      .eq('trainer_id', trainerId)

    if (!data) return null

    const byExercise: Record<string, number> = {}
    const byEsp: Record<string, number> = {}
    let genericCount = 0
    let withEspCount = 0

    data.forEach(ev => {
      if (ev.event_type === 'added_to_plan') {
        byExercise[ev.exercise_name] = (byExercise[ev.exercise_name] || 0) + 1
      }
      if (ev.especialidad) {
        byEsp[ev.especialidad] = (byEsp[ev.especialidad] || 0) + 1
        withEspCount++
      } else {
        genericCount++
      }
    })

    const topExercises = Object.entries(byExercise)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    const total = data.length
    const genericRatio = total > 0 ? Math.round(genericCount / total * 100) : 0
    const videoPlays = data.filter(ev => ev.event_type === 'video_played').length
    const videoRatio = total > 0 ? Math.round(videoPlays / total * 100) : 0

    return { topExercises, byEsp, genericRatio, videoRatio, total }
  }, [trainerId])

  // ── Helpers ────────────────────────────────────────
  const findByName = useCallback((name: string) =>
    exercises.find(e => e.name.toLowerCase() === name.toLowerCase()),
  [exercises])

  // Priorización en 3 pasos
  const getVideosForClient = useCallback((
    exerciseName: string,
    clientEspecialidad?: Especialidad
  ): NonNullable<LibraryExercise['videos']> => {
    const ex = findByName(exerciseName)
    if (!ex?.videos?.length) return []
    if (!clientEspecialidad) return ex.videos

    const exact = ex.videos.filter(v =>
      v.especialidades?.length && v.especialidades.includes(clientEspecialidad)
    )
    if (exact.length) return exact

    const generic = ex.videos.filter(v => !v.especialidades?.length)
    if (generic.length) return generic

    return ex.videos
  }, [findByName])

  const videoCountByEsp = useCallback((): Record<string, number> => {
    const counts: Record<string, number> = { generico: 0 }
    exercises.forEach(ex => {
      ;(ex.videos || []).forEach(v => {
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
  }, [exercises])

  const validateAndClean = useCallback(() => {
    const VALID_ESPS = ['hipertrofia','fuerza','halterofilia','rehabilitacion','rendimiento','perdida_grasa']
    let changed = false
    const cleaned = exercises.map(ex => {
      let e = { ...ex }
      if (e.especialidades) {
        const valid = e.especialidades.filter(esp => VALID_ESPS.includes(esp))
        if (valid.length !== e.especialidades.length) { e.especialidades = valid as Especialidad[]; changed = true }
      }
      if (!e.createdAt) { e.createdAt = Date.now(); changed = true }
      return e
    })
    if (changed) saveLocal(cleaned)
    return changed
  }, [exercises])

  return {
    exercises, loading, syncing,
    addExercise, updateExercise, deleteExercise,
    findByName, getVideosForClient, getYTId,
    videoCountByEsp, trackUsage, getUsageStats,
    validateAndClean, syncFromSupabase,
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

// Hook de métricas — para usar en InsightsTab
export function useLibraryStats(trainerId: string) {
  const [stats, setStats] = useState<{
    topExercises: [string, number][]
    byEsp: Record<string, number>
    genericRatio: number
    videoRatio: number
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!trainerId) return
    supabase
      .from('exercise_usage_events')
      .select('exercise_name, event_type, especialidad')
      .eq('trainer_id', trainerId)
      .then(({ data }) => {
        if (!data) { setLoading(false); return }
        const byExercise: Record<string, number> = {}
        const byEsp: Record<string, number> = {}
        let genericCount = 0

        data.forEach(ev => {
          if (ev.event_type === 'added_to_plan') {
            byExercise[ev.exercise_name] = (byExercise[ev.exercise_name] || 0) + 1
          }
          if (ev.especialidad) byEsp[ev.especialidad] = (byEsp[ev.especialidad] || 0) + 1
          else genericCount++
        })

        const total = data.length
        const videoPlays = data.filter(ev => ev.event_type === 'video_played').length

        setStats({
          topExercises: Object.entries(byExercise).sort((a, b) => b[1] - a[1]).slice(0, 10),
          byEsp,
          genericRatio: total > 0 ? Math.round(genericCount / total * 100) : 0,
          videoRatio: total > 0 ? Math.round(videoPlays / total * 100) : 0,
          total,
        })
        setLoading(false)
      })
  }, [trainerId])

  return { stats, loading }
}
