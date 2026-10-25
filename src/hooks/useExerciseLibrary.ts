import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { LibraryExercise, LibraryVideo } from '../types'
import { Especialidad } from '../lib/especialidades'
import { DEFAULT_EXERCISE_LIBRARY, DefaultExercise } from '../lib/defaultExerciseLibrary'
import { DEMO_TRAINER_ID } from '../lib/demoIds'
import { buildDemoLibraryEnrichment } from '../lib/demo-data-extra'
import { loadExerciseDescriptions } from '../lib/exerciseDescriptions'
import { fetchAllPages } from '../lib/fetchAllPages'

const LS_KEY       = (uid: string) => `pf_library_${uid}`
const LS_MIGRATED  = (uid: string) => `pf_library_migrated_${uid}`
const LS_DEFAULT_SEEDED = (uid: string) => `pf_library_default_seeded_${uid}`
// Versión de la biblioteca de serie. Subir este número cuando se añadan
// ejercicios nuevos a DEFAULT_EXERCISE_LIBRARY para que las cuentas que ya
// fueron sembradas reciban solo los que les faltan (sin duplicar).
const DEFAULT_LIBRARY_VERSION = 8
const LS_DEFAULT_TOPUP = (uid: string) => `pf_library_default_topup_${uid}`

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
  // Migración 20261025000001: pueden no existir todavía en una base sin actualizar.
  material?: string | null
  archived_at?: number | null
  alternativas?: string[] | null
}

function dbToLocal(row: DBExercise): LibraryExercise {
  return {
    id: row.id,
    trainerId: row.trainer_id,
    name: row.name,
    description: row.description,
    category: row.category,
    especialidades: row.especialidades || [],
    videos: row.videos || [],
    tags: row.tags || [],
    createdAt: row.created_at,
    material: row.material || '',
    useCount: row.use_count || 0,
    archivedAt: row.archived_at ?? null,
    alternativas: row.alternativas || [],
  }
}

const EXTENDED_COLUMNS = ['material', 'archived_at', 'alternativas'] as const

function localToDB(ex: LibraryExercise, trainerId: string): Omit<DBExercise, 'use_count' | 'video_use_count' | 'deleted_at'> {
  return {
    id: ex.id,
    trainer_id: trainerId,
    name: ex.name,
    description: ex.description || '',
    category: ex.category || '',
    especialidades: ex.especialidades || [],
    videos: ex.videos || [],
    tags: ex.tags || [],
    created_at: ex.createdAt || Date.now(),
    updated_at: Date.now(),
    material: ex.material || '',
    archived_at: ex.archivedAt ?? null,
    alternativas: ex.alternativas || [],
  }
}

// Una base sin la migración de la biblioteca rechaza las columnas nuevas: se reintenta sin ellas (el ejercicio se
// guarda igual; lo que dependa de ellas, como archivar, no persiste hasta que se aplique) y se recuerda para no
// volver a probar en cada guardado.
let extendedColumnsAvailable = true
const isMissingColumn = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === 'PGRST204' || e.code === '42703' || /column .* does not exist|Could not find the .* column/i.test(e.message || ''))
function withoutExtended<T extends object>(row: T): T {
  const strip = (r: object) => { const copy = { ...r } as Record<string, unknown>; EXTENDED_COLUMNS.forEach(c => delete copy[c]); return copy }
  return (Array.isArray(row) ? row.map(strip) : strip(row)) as T
}
/** Ejecuta una escritura (una fila o varias) con las columnas nuevas y, si la base aún no las tiene, la repite sin ellas. */
async function writeTolerant<T extends object>(row: T, run: (r: T) => PromiseLike<{ error: { code?: string; message?: string } | null }>) {
  if (extendedColumnsAvailable) {
    const res = await run(row)
    if (!isMissingColumn(res.error)) return res
    extendedColumnsAvailable = false
  }
  return run(withoutExtended(row))
}

export interface NewExercise {
  name: string; description?: string; category?: string; videos?: LibraryVideo[]
  especialidades?: string[]; tags?: string[]; material?: string; alternativas?: string[]
}

export function useExerciseLibrary(trainerId: string) {
  // `allExercises` incluye los archivados; `exercises` (lo que ven los selectores y el editor de planes) no.
  const [allExercises, setExercises] = useState<LibraryExercise[]>([])
  const exercises = useMemo(() => allExercises.filter(e => !e.archivedAt), [allExercises])
  const archivedExercises = useMemo(() => allExercises.filter(e => !!e.archivedAt), [allExercises])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  // ── Carga inicial ──────────────────────────────────
  useEffect(() => {
    if (!trainerId) return
    loadLibrary()
  }, [trainerId])

  const loadLibrary = async () => {
    setLoading(true)

    // Modo demo: biblioteca de serie directamente en memoria, sin tocar
    // Supabase (el trainer_id falso no es un UUID real).
    if (trainerId === DEMO_TRAINER_ID) {
      const enrich = buildDemoLibraryEnrichment()
      const demo: LibraryExercise[] = DEFAULT_EXERCISE_LIBRARY.map((e, i) => ({
        id: `ex_demo_${i}`, trainerId, name: e.name, description: '', category: e.category,
        especialidades: enrich[e.name]?.especialidades || [], videos: enrich[e.name]?.videos || [], tags: enrich[e.name]?.tags || [], createdAt: Date.now(),
      }))
      setExercises(demo)
      setLoading(false)
      // "Más usados" en la demo: las veces que cada ejercicio aparece en las plantillas de ejemplo.
      import('../lib/demo-data').then(({ DEMO_PLAN_TEMPLATES }) => {
        const uses = new Map<string, number>()
        DEMO_PLAN_TEMPLATES.forEach(t => t.weeks.forEach(w => w.days.forEach(d => d.exercises.forEach(e => uses.set(e.name, (uses.get(e.name) || 0) + 1)))))
        if (uses.size) setExercises(prev => prev.map(ex => uses.has(ex.name) ? { ...ex, useCount: uses.get(ex.name) } : ex))
      })
      // Las descripciones se cargan aparte (no van en el bundle) y se
      // rellenan en cuanto llegan, sin bloquear el primer render de la lista.
      loadExerciseDescriptions().then(descriptions => {
        if (!Object.keys(descriptions).length) return
        setExercises(prev => prev.map(ex => descriptions[ex.name] ? { ...ex, description: descriptions[ex.name] } : ex))
      })
      return
    }

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
    const hadData = await syncFromSupabase()

    // 4. Sin ningún ejercicio real en Supabase (ni propio ni migrado) -> sembrar
    //    la biblioteca de serie, para que todas las cuentas arranquen con algo.
    //    Nota: no miramos la caché local — una caché vacía ("[]") de una sesión
    //    anterior no debe bloquear esto, lo único que importa es lo que hay en BD.
    //    (Solo para cuentas reales — el modo demo antiguo usa un id falso, no UUID.)
    const isRealUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trainerId)
    const alreadySeeded = localStorage.getItem(LS_DEFAULT_SEEDED(trainerId))
    if (isRealUuid && !hadData && !alreadySeeded) {
      // Marcar el flag ANTES de insertar para que un segundo montaje casi
      // simultáneo (p.ej. doble efecto de StrictMode en desarrollo) no duplique la siembra.
      localStorage.setItem(LS_DEFAULT_SEEDED(trainerId), '1')
      localStorage.setItem(LS_DEFAULT_TOPUP(trainerId), String(DEFAULT_LIBRARY_VERSION))
      await seedDefaultLibrary(DEFAULT_EXERCISE_LIBRARY)
      await syncFromSupabase()
    } else if (isRealUuid && hadData) {
      // 5. La cuenta ya tenía ejercicios (sembrados antes, o los suyos propios) ->
      //    añadir solo los de serie que le falten, sin duplicar. Se comprueba
      //    `hadData` (verdad de Supabase), NO el flag `alreadySeeded` de
      //    localStorage — ese flag es por navegador/dispositivo, así que un
      //    entrenador que abre PanelFit desde un móvil nuevo o tras borrar datos
      //    del navegador nunca lo tendría puesto y se quedaría sin el top-up
      //    para siempre aunque su cuenta sí necesite los ejercicios nuevos.
      const topupVersion = Number(localStorage.getItem(LS_DEFAULT_TOPUP(trainerId)) || '1')
      if (topupVersion < DEFAULT_LIBRARY_VERSION) {
        // Sin paginar, esta consulta se quedaba truncada a las primeras ~1000
        // filas (tope de PostgREST) en cuentas que ya superaban ese número —
        // "existingNames" salía incompleto, así que exercises que YA existían
        // (pero caían después de la fila 1000) se creían "missing" y se
        // volvían a sembrar, duplicándolos.
        const { rows: existing } = await fetchAllPages<{ name: string }>((from, to) =>
          supabase
            .from('exercise_library')
            .select('name')
            .eq('trainer_id', trainerId)
            .range(from, to)
        )
        const existingNames = new Set(existing.map(r => r.name.toLowerCase()))
        const missing = DEFAULT_EXERCISE_LIBRARY.filter(e => !existingNames.has(e.name.toLowerCase()))
        localStorage.setItem(LS_DEFAULT_TOPUP(trainerId), String(DEFAULT_LIBRARY_VERSION))
        if (missing.length) {
          await seedDefaultLibrary(missing)
          await syncFromSupabase()
        }
      }
    }

    setLoading(false)
  }

  const seedDefaultLibrary = async (list: DefaultExercise[]) => {
    // Recurso aparte (no va en el bundle) — si falla la carga, se siembra
    // igualmente sin descripción, no bloquea el alta del entrenador.
    const descriptions = await loadExerciseDescriptions()
    const rows = list.map((e, i) => ({
      id: `ex_default_${Date.now()}_${i}`, trainer_id: trainerId, name: e.name, description: descriptions[e.name] || '', category: e.category,
      especialidades: [], videos: [], tags: [], use_count: 0, video_use_count: 0, created_at: Date.now(), updated_at: Date.now(),
    }))
    const { error } = await supabase.from('exercise_library').insert(rows)
    if (error) console.error('[PanelFit] Error al sembrar biblioteca por defecto:', error)
  }

  const syncFromSupabase = async () => {
    setSyncing(true)
    const { rows, error } = await fetchAllPages<DBExercise>((from, to) =>
      supabase
        .from('exercise_library')
        .select('*')
        .eq('trainer_id', trainerId)
        .is('deleted_at', null)
        .order('name')
        .range(from, to)
    )

    if (!error) {
      console.log(`[PanelFit] syncFromSupabase: ${rows.length} ejercicios recibidos`)
      const local = rows.map(dbToLocal)
      setExercises(local)
      localStorage.setItem(LS_KEY(trainerId), JSON.stringify(local))
    } else {
      console.error('[PanelFit] syncFromSupabase error:', error)
    }
    setSyncing(false)
    return rows.length > 0
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
    especialidades: string[] = [],
    tags: string[] = [],
    extra: { material?: string; alternativas?: string[] } = {}
  ) => {
    const ex: LibraryExercise = {
      id: `ex_${Date.now()}`,
      trainerId,
      name: name.trim(),
      description,
      category,
      especialidades,
      videos,
      tags,
      material: extra.material || '',
      alternativas: extra.alternativas || [],
      useCount: 0,
      archivedAt: null,
      createdAt: Date.now(),
    }

    // Optimistic update
    const updated = [...allExercises, ex].sort((a, b) => a.name.localeCompare(b.name))
    if (trainerId === DEMO_TRAINER_ID) { setExercises(updated); return ex }
    saveLocal(updated)

    // Persistir en Supabase
    const { error } = await writeTolerant(localToDB(ex, trainerId), row => supabase.from('exercise_library').insert(row))

    if (error) {
      console.error('[PanelFit] Error al guardar ejercicio:', error)
      // Revertir si falla
      saveLocal(allExercises)
    }

    return ex
  }, [allExercises, trainerId])

  /** Alta de varios de una vez (importar): una sola actualización de pantalla y la inserción por tandas. */
  const addExercises = useCallback(async (list: NewExercise[]) => {
    const now = Date.now()
    const created: LibraryExercise[] = list.map((n, i) => ({
      id: `ex_import_${now}_${i}`, trainerId, name: n.name.trim(), description: n.description || '', category: n.category || '',
      especialidades: n.especialidades || [], videos: n.videos || [], tags: n.tags || [], material: n.material || '', alternativas: n.alternativas || [],
      createdAt: now, useCount: 0, archivedAt: null,
    }))
    if (!created.length) return 0
    const updated = [...allExercises, ...created].sort((a, b) => a.name.localeCompare(b.name, 'es'))
    if (trainerId === DEMO_TRAINER_ID) { setExercises(updated); return created.length }
    saveLocal(updated)
    // Por tandas: un CSV de varios cientos de filas no cabe cómodo en una sola petición.
    for (let i = 0; i < created.length; i += 200) {
      const rows = created.slice(i, i + 200).map(ex => ({ ...localToDB(ex, trainerId), use_count: 0, video_use_count: 0 }))
      const { error } = await writeTolerant(rows, r => supabase.from('exercise_library').insert(r))
      if (error) { console.error('[PanelFit] Error al importar ejercicios:', error); saveLocal(allExercises); return 0 }
    }
    return created.length
  }, [allExercises, trainerId])

  const updateExercise = useCallback(async (id: string, updates: Partial<LibraryExercise>) => {
    const updated = allExercises.map(e => e.id === id ? { ...e, ...updates } : e)
    if (trainerId === DEMO_TRAINER_ID) { setExercises(updated); return }
    saveLocal(updated)

    const ex = updated.find(e => e.id === id)
    if (!ex) return

    const { error } = await writeTolerant({ ...localToDB(ex, trainerId), updated_at: Date.now() }, row => supabase.from('exercise_library').update(row).eq('id', id))

    if (error) console.error('[PanelFit] Error al actualizar ejercicio:', error)
  }, [allExercises, trainerId])

  /** Archivar no borra nada: sale de los selectores, pero los planes y registros viejos (que van por nombre) siguen igual. */
  const archiveExercise = useCallback((id: string) => updateExercise(id, { archivedAt: Date.now() }), [updateExercise])
  const restoreExercise = useCallback((id: string) => updateExercise(id, { archivedAt: null }), [updateExercise])

  const deleteExercise = useCallback(async (id: string) => {
    // Optimistic update
    const updated = allExercises.filter(e => e.id !== id)
    if (trainerId === DEMO_TRAINER_ID) { setExercises(updated); return }
    saveLocal(updated)

    // Soft delete en Supabase
    const { error } = await supabase
      .from('exercise_library')
      .update({ deleted_at: Date.now() })
      .eq('id', id)

    if (error) console.error('[PanelFit] Error al eliminar ejercicio:', error)
  }, [allExercises, trainerId])

  // ── Telemetría ─────────────────────────────────────
  const trackUsage = useCallback(async (
    exerciseId: string,
    exerciseName: string,
    eventType: 'selected' | 'video_played' | 'added_to_plan',
    clientId?: string,
    especialidad?: string
  ) => {
    if (trainerId === DEMO_TRAINER_ID) return
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
      supabase.from('exercise_library').select('use_count').eq('id', exerciseId).maybeSingle()
        .then(({ data }) => {
          supabase.from('exercise_library')
            .update({ use_count: (data?.use_count || 0) + 1 })
            .eq('id', exerciseId)
        })
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
  // También entre los archivados: un plan viejo que nombra un ejercicio archivado sigue necesitando su vídeo.
  const findByName = useCallback((name: string) =>
    allExercises.find(e => e.name.toLowerCase() === name.toLowerCase()),
  [allExercises])

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
    const cleaned = allExercises.map(ex => {
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
  }, [allExercises])

  return {
    exercises, archivedExercises, loading, syncing,
    addExercise, addExercises, updateExercise, deleteExercise, archiveExercise, restoreExercise,
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
  // El bucket media es privado: se devuelve la ruta, no una URL pública (se firma al reproducir).
  return path
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
