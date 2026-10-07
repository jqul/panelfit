import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ChevronDown, Trophy,
  Plus, Dumbbell, Flame, Timer, Calculator, X, CheckCircle2, Repeat
} from 'lucide-react'
import { DayPlan, TrainingPlan, TrainingLogs, LogSet } from '../../types'
import { CalculadoraDiscos } from './CalculadoraDiscos'
import { supabase } from '../../lib/supabase'
import { estimate1RM, parsePercentWeight, resolveWeightFromPercent, estimateVelocityProfile, VelocityPoint, getVbtSuggestedWeightChange, getTargetRangeLabel, tracksVelocity } from '../../lib/strength'
import { sendPush } from '../../lib/usePushNotifications'
import { compressVideo } from '../../lib/videoCompress'
import { getYTId, parseSet, NextSetInfo, MOLESTIA_EMOJI } from './active-workout/utils'
import { RestTimer } from './active-workout/RestTimer'
import { VideoFeedbackButton } from './active-workout/VideoFeedbackButton'
import { TempoWidget } from './active-workout/TempoWidget'
import { SetRow } from './active-workout/SetRow'
import { RunSets } from './active-workout/RunSets'
import { PrAlert } from './active-workout/PrAlert'
import { DayTestsCard } from './active-workout/DayTestsCard'
import { WorkoutHeader } from './active-workout/WorkoutHeader'
import { FinishWorkoutModal } from './active-workout/FinishWorkoutModal'
import { ExerciseEvaTracker } from './active-workout/ExerciseEvaTracker'
import { RequiredVideoUpload } from './active-workout/RequiredVideoUpload'
import { ExerciseSubstitution } from './active-workout/ExerciseSubstitution'
import { useTestCatalog, useTestResultados } from '../../lib/testCatalog'
import { useClientPain } from '../../lib/clientPain'
import { localDateKey } from '../../lib/dates'
import { useTrainerExerciseNames } from '../../lib/clientExerciseLibrary'
import { useTrainerMetricSettings } from '../../lib/progresoSections'
import { getSafeAlternatives, guessZonaForExercise } from '../../lib/exerciseAlternatives'
import { useLibraryMuscleMap } from '../trainer/progreso-tab/helpers'
import { rankByQuery } from '../../lib/exerciseSearch'
import { streakDays } from '../../lib/progressSummary'
import { latestPreviousLog } from '../../lib/previousSession'
import { FinishedScreen } from './active-workout/FinishedScreen'
import { FocusWorkout } from './active-workout/FocusWorkout'

interface Props {
  day: DayPlan
  dayKey: string
  plan: TrainingPlan
  logs: TrainingLogs
  onLogsChange: (logs: TrainingLogs) => void
  onFinish: () => void
  // Sin onBack, el botón de "atrás" abre el mismo modal de terminar que el
  // resto de salidas (comportamiento por defecto de esta pantalla). Con
  // onBack, quien la usa decide qué significa "atrás" — minimizar a una
  // píldora flotante (cliente en Hoy) o cerrar sin más (entrenador en vivo).
  onBack?: () => void
  trainerId?: string
  clientName?: string   // solo para mostrar de quién es la sesión en modo entrenador
  trainerMode?: boolean // el entrenador está registrando la sesión desde su propio dispositivo
}

export function ActiveWorkout({ day, dayKey, plan, logs, onLogsChange, onFinish, onBack, trainerId, clientName, trainerMode }: Props) {
  const dayKeyMatch = dayKey.match(/^w(\d+)_d(\d+)$/)
  const weekIdx = dayKeyMatch ? parseInt(dayKeyMatch[1]) : 0
  const dayIdx = dayKeyMatch ? parseInt(dayKeyMatch[2]) : 0
  const [reactionEmoji, setReactionEmoji] = useState<string | null>(null)
  const [reactionComment, setReactionComment] = useState('')
  const [showReactionComment, setShowReactionComment] = useState(false)
  // 🤕 "Con molestias" al terminar la sesión — igual que el clasificador del
  // check-in diario, pero sin ambigüedad: si eliges este emoji ya nos dices
  // que es una molestia, así que vamos directos a pedir la zona.
  const [molestiaZona, setMolestiaZona] = useState<string | null>(null)
  const { addEntry: addPainEntry } = useClientPain(plan.clientId, trainerId)

  // "Pesos sugeridos" en vivo (objetivo de hoy + sugerencia VBT) — el
  // entrenador que prefiere ajustar el peso él mismo en vez de que el
  // cliente vea un algoritmo durante la serie puede desactivarlo en
  // Ajustes > Métricas activas, mismo interruptor que ya usa el análisis
  // de Progreso (lib/progresoSections.ts) — activo por defecto.
  const metricasActivas = useTrainerMetricSettings(trainerId)
  const showPesosSugeridos = !metricasActivas || metricasActivas.has('pesos_sugeridos')

  // Pruebas físicas pedidas para este día del plan (Cooper, salto, etc.) — el
  // cliente mete su resultado aquí y va directo a Progreso > Pruebas del
  // entrenador, sin que haga falta decírselo aparte.
  const { tests: testCatalog } = useTestCatalog(trainerId)
  const { resultados: testResultados, addResultado: addTestResultado } = useTestResultados(plan.clientId)
  const dayTests = (day?.testIds || [])
    .map(id => testCatalog.find(t => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t)
  const todayDate = localDateKey()
  const testResultadosHoy = Object.fromEntries(
    testResultados.filter(r => r.fecha === todayDate).map(r => [r.test_id, r])
  )
  const submitTestResult = (testId: string, valor: number) => {
    if (!trainerId) return
    addTestResultado(trainerId, testId, valor, todayDate, '')
  }

  type SetState = { weight: string; reps: string; done: boolean; rir?: number; velocity?: number; timeSec?: number; distanceM?: number; isTest?: boolean }
  const [sets, setSets] = useState<Record<number, Record<number, SetState>>>(() => {
    const initial: Record<number, Record<number, SetState>> = {}
    day?.exercises.forEach((ex, ri) => {
      const key = `ex_${dayKey}_r${ri}`
      const log = logs[key]
      const { numSets, numReps } = parseSet(ex.sets)
      const totalSaved = Math.max(numSets, Object.keys(log?.sets || {}).length)
      initial[ri] = {}
      for (let si = 0; si < totalSaved; si++) {
        initial[ri][si] = {
          weight: log?.sets?.[si]?.weight || '',
          reps: log?.sets?.[si]?.reps || String(numReps),
          done: log?.done || false,
          rir: log?.sets?.[si]?.rir,
          velocity: log?.sets?.[si]?.velocity,
          timeSec: log?.sets?.[si]?.timeSec,
          distanceM: log?.sets?.[si]?.distanceM,
          isTest: log?.sets?.[si]?.isTest,
        }
      }
    })
    return initial
  })

  const logsRef = useRef(logs)
  useEffect(() => { logsRef.current = logs }, [logs])

  // Sustitución de ejercicio (ej. las mancuernas están cogidas y hace la
  // variante con barra) — se guarda en el log de esa sesión, no cambia el
  // plan prescrito, así que el entrenador ve tanto lo previsto como lo que
  // realmente se hizo.
  const [substitutions, setSubstitutions] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {}
    day?.exercises.forEach((_, ri) => {
      const name = logs[`ex_${dayKey}_r${ri}`]?.substituteName
      if (name) initial[ri] = name
    })
    return initial
  })
  const [editingSubstitute, setEditingSubstitute] = useState<number | null>(null)
  const [substituteDraft, setSubstituteDraft] = useState('')
  // Sustituir por texto libre rompía las estadísticas del entrenador (grupo
  // muscular, récords...) al no coincidir con ningún nombre conocido — ahora
  // se elige de la biblioteca real del entrenador; el texto libre queda como
  // último recurso si de verdad no está en la lista.
  const { names: libraryNames } = useTrainerExerciseNames(trainerId)
  const substituteSuggestions = substituteDraft.trim().length >= 2
    ? rankByQuery(libraryNames, substituteDraft).slice(0, 8)
    : []
  const libraryMuscleMap = useLibraryMuscleMap(libraryNames)

  // Sustitución inteligente por molestia — a diferencia de "Sustitúyelo" (que
  // es libre, por disponibilidad de material), aquí el cliente dice qué zona
  // le duele AHORA MISMO y se le proponen ejercicios del mismo grupo muscular
  // que no cargan esa zona, para no parar del todo la sesión ni forzar la
  // molestia.
  const [molestiaPickerRi, setMolestiaPickerRi] = useState<number | null>(null)
  const [molestiaPickerZona, setMolestiaPickerZona] = useState<string | null>(null)
  const openMolestiaPicker = (ri: number, exName: string) => {
    setEditingSubstitute(null)
    setMolestiaPickerRi(ri)
    setMolestiaPickerZona(guessZonaForExercise(exName, libraryMuscleMap))
  }
  const closeMolestiaPicker = () => { setMolestiaPickerRi(null); setMolestiaPickerZona(null) }
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null)
  const [uploadingVideoRi, setUploadingVideoRi] = useState<number | null>(null)

  // Vídeo de ejecución que el entrenador pide para un ejercicio concreto
  // (ex.requiresVideo) — a diferencia del vídeo-feedback asíncrono de abajo,
  // este se sube y queda adjunto al propio registro (videoEjecucion), visible
  // de inmediato, sin pasar por un ciclo de petición/respuesta.
  const uploadExerciseVideo = useCallback(async (ri: number, rawFile: File) => {
    if (rawFile.size > 100 * 1024 * 1024) { alert('Máximo 100MB'); return }
    setUploadingVideoRi(ri)
    const file = await compressVideo(rawFile) // solo revisión visual de técnica, sí se puede comprimir
    const ext = file.name.split('.').pop()
    // El id del cliente va primero en la ruta para que la política de Storage
    // pueda comprobar quién es el dueño (antes la ruta no llevaba ningún id y
    // cualquier usuario autenticado podía leer/subir aquí sin restricción).
    const path = `${plan.clientId}/${dayKey}/r${ri}_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('exercise-videos').upload(path, file, { upsert: true })
    if (error) { alert('Error al subir vídeo'); setUploadingVideoRi(null); return }
    const { data } = supabase.storage.from('exercise-videos').getPublicUrl(path)
    const key = `ex_${dayKey}_r${ri}`
    onLogsChange({ ...logsRef.current, [key]: { ...logsRef.current[key], videoEjecucion: data.publicUrl } })
    setUploadingVideoRi(null)
  }, [dayKey, onLogsChange])

  const setSubstitute = useCallback((ri: number, name: string) => {
    const trimmed = name.trim()
    setSubstitutions(prev => {
      const updated = { ...prev }
      if (trimmed) updated[ri] = trimmed; else delete updated[ri]
      return updated
    })
    const key = `ex_${dayKey}_r${ri}`
    const currentLogs = logsRef.current
    const { substituteName: _drop, ...rest } = currentLogs[key] || { sets: {}, done: false }
    onLogsChange({
      ...currentLogs,
      [key]: { ...rest, ...(trimmed ? { substituteName: trimmed } : {}) },
    })
  }, [dayKey, onLogsChange])

  const [restTimer, setRestTimer] = useState<{ secs: number; next: NextSetInfo | null } | null>(null)
  const [elapsedSecs, setElapsedSecs] = useState(0)
  const [showFinish, setShowFinish] = useState(false)
  const [saving, setSaving] = useState(false)    // guardando al terminar: evita el doble toque
  const [finished, setFinished] = useState(false) // sesión ya guardada: se enseña la pantalla de cierre
  // Vista Foco (una serie a la vez) o Lista (todos los ejercicios) — se recuerda la elección.
  const [view, setView] = useState<'foco' | 'lista'>(() => {
    try { return localStorage.getItem('pf_workout_view') === 'lista' ? 'lista' : 'foco' } catch { return 'foco' }
  })
  const [focusOverride, setFocusOverride] = useState<{ ri: number; si: number } | null>(null)
  const toggleView = () => {
    const next = view === 'foco' ? 'lista' : 'foco'
    setView(next); setFocusOverride(null)
    try { localStorage.setItem('pf_workout_view', next) } catch { /* sin almacenamiento: no se recuerda */ }
  }
  const [calcWeight, setCalcWeight] = useState<number | null>(null)
  const [prAlert, setPrAlert] = useState<{ name: string; oneRM: number; weight: number; reps: number; deltaKg: number | null } | null>(null)
  const [sessionRpe, setSessionRpe] = useState<number | null>(null)
  const [sessionRpeHalf, setSessionRpeHalf] = useState(false)
  const startTime = useRef(Date.now())
  const setsRef = useRef(sets)
  useEffect(() => { setsRef.current = sets }, [sets])

  useEffect(() => {
    if (finished) return // la duración se congela al guardar la sesión
    const t = setInterval(() => setElapsedSecs(Math.floor((Date.now() - startTime.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [finished])

  const formatElapsed = () => {
    const m = Math.floor(elapsedSecs / 60)
    const s = elapsedSecs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const commitSet = useCallback((ri: number, si: number, weight: string, reps: string) => {
    setSets(prev => ({ ...prev, [ri]: { ...prev[ri], [si]: { ...prev[ri][si], weight, reps } } }))
    const key = `ex_${dayKey}_r${ri}`
    const today = localDateKey()
    const currentLogs = logsRef.current
    const prevRir = currentLogs[key]?.sets?.[si]?.rir
    const prevVelocity = currentLogs[key]?.sets?.[si]?.velocity
    onLogsChange({
      ...currentLogs,
      [key]: {
        ...currentLogs[key],
        sets: { ...(currentLogs[key]?.sets || {}), [si]: { weight, reps, ...(prevRir !== undefined ? { rir: prevRir } : {}), ...(prevVelocity !== undefined ? { velocity: prevVelocity } : {}) } },
        done: currentLogs[key]?.done || false,
        dateDone: today,
      }
    })
  }, [dayKey, onLogsChange])

  const setRir = useCallback((ri: number, si: number, rir: number) => {
    setSets(prev => ({ ...prev, [ri]: { ...prev[ri], [si]: { ...prev[ri][si], rir } } }))
    const key = `ex_${dayKey}_r${ri}`
    const currentLogs = logsRef.current
    const existingSet = currentLogs[key]?.sets?.[si] || { weight: '', reps: '' }
    onLogsChange({
      ...currentLogs,
      [key]: {
        ...currentLogs[key],
        sets: { ...(currentLogs[key]?.sets || {}), [si]: { ...existingSet, rir } },
      }
    })
  }, [dayKey, onLogsChange])

  const setVelocity = useCallback((ri: number, si: number, velocity: number | undefined) => {
    setSets(prev => ({ ...prev, [ri]: { ...prev[ri], [si]: { ...prev[ri][si], velocity } } }))
    const key = `ex_${dayKey}_r${ri}`
    const currentLogs = logsRef.current
    const existingSet = currentLogs[key]?.sets?.[si] || { weight: '', reps: '' }
    onLogsChange({
      ...currentLogs,
      [key]: {
        ...currentLogs[key],
        sets: { ...(currentLogs[key]?.sets || {}), [si]: velocity !== undefined ? { ...existingSet, velocity } : (({ velocity: _v, ...rest }) => rest)(existingSet) },
      }
    })
  }, [dayKey, onLogsChange])

  // Tiempo / distancia de una tirada de carrera — mismo patrón que RIR y
  // velocidad: se guarda al momento, sin esperar a marcar la serie como hecha.
  const setRunData = useCallback((ri: number, si: number, patch: { timeSec?: number; distanceM?: number; isTest?: boolean }) => {
    setSets(prev => ({ ...prev, [ri]: { ...prev[ri], [si]: { ...(prev[ri]?.[si] ?? { weight: '', reps: '1', done: false }), ...patch } } }))
    const key = `ex_${dayKey}_r${ri}`
    const currentLogs = logsRef.current
    const existingSet = currentLogs[key]?.sets?.[si] || { weight: '', reps: '1' }
    onLogsChange({
      ...currentLogs,
      [key]: {
        ...(currentLogs[key] || { done: false }),
        sets: { ...(currentLogs[key]?.sets || {}), [si]: { ...existingSet, ...patch } },
      }
    })
  }, [dayKey, onLogsChange])

  // Dolor EVA 0-10 percibido durante un ejercicio "en readaptación" — a nivel
  // de ejercicio, no de serie: lo que importa aquí es si la carga de HOY se
  // mantuvo en la ventana terapéutica, no el detalle serie a serie.
  const setExerciseEva = useCallback((ri: number, dolorEva: number) => {
    const key = `ex_${dayKey}_r${ri}`
    const currentLogs = logsRef.current
    onLogsChange({ ...currentLogs, [key]: { ...(currentLogs[key] || { sets: {}, done: false }), dolorEva } })
  }, [dayKey, onLogsChange])

  // Mejor 1RM estimado histórico para un ejercicio, a partir de un snapshot de logs
  // concreto (no del closure) — así sirve tanto para el render como para la
  // detección de récord en caliente dentro de toggleSet, con datos siempre frescos.
  const getBest1RMFromLogs = useCallback((exName: string, logsData: TrainingLogs) => {
    let best = 0
    plan.weeks.forEach((week, wi) => {
      week.days.forEach((d, di) => {
        d.exercises.forEach((planEx, ei) => {
          if (planEx.name.toLowerCase() !== exName.toLowerCase()) return
          const log = logsData[`ex_w${wi}_d${di}_r${ei}`]
          if (!log?.dateDone) return
          Object.values(log.sets || {}).forEach(s => {
            const rm = estimate1RM(parseFloat(s.weight) || 0, parseFloat(s.reps) || 0)
            if (rm > best) best = rm
          })
        })
      })
    })
    return best
  }, [plan])

  // Historial comparativo instantáneo: últimas sesiones de este ejercicio (por
  // nombre, en cualquier semana/día del plan, no solo el mismo slot) para
  // verlas sin salir de la sesión activa — un desplegable en el propio
  // ejercicio en vez de tener que ir a Progreso. Se excluye la fecha de hoy:
  // esto es "lo que ya hiciste antes", no lo que estás metiendo ahora mismo.
  const getExerciseHistory = useCallback((exName: string, limit = 4) => {
    const today = localDateKey()
    const entries: { date: string; weight: number; reps: number }[] = []
    plan.weeks.forEach((week, wi) => {
      week.days.forEach((d, di) => {
        d.exercises.forEach((planEx, ei) => {
          if (planEx.name.toLowerCase() !== exName.toLowerCase()) return
          const log = logs[`ex_w${wi}_d${di}_r${ei}`]
          if (!log?.dateDone || log.dateDone === today) return
          let bestWeight = 0, bestReps = 0
          Object.values(log.sets || {}).forEach(s => {
            const w = parseFloat(s.weight) || 0
            if (w > bestWeight) { bestWeight = w; bestReps = parseInt(s.reps) || 0 }
          })
          if (bestWeight > 0) entries.push({ date: log.dateDone, weight: bestWeight, reps: bestReps })
        })
      })
    })
    return entries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit)
  }, [plan, logs])

  // Perfil carga-velocidad de un ejercicio (VBT): recopila las parejas (peso,
  // velocidad) registradas para ese ejercicio y ajusta la recta que estima el
  // 1RM por velocidad — mismo patrón que getBest1RMFromLogs. `dateFilter`
  // permite pedir solo las de hoy (autorregulación dentro de la sesión) o solo
  // las de antes de hoy (referencia histórica) en vez de todo el historial.
  const getVelocityProfileFromLogs = useCallback((
    exName: string, logsData: TrainingLogs, dateFilter?: { only?: string; exclude?: string }
  ) => {
    const points: VelocityPoint[] = []
    plan.weeks.forEach((week, wi) => {
      week.days.forEach((d, di) => {
        d.exercises.forEach((planEx, ei) => {
          if (planEx.name.toLowerCase() !== exName.toLowerCase()) return
          const log = logsData[`ex_w${wi}_d${di}_r${ei}`]
          if (!log?.dateDone) return
          if (dateFilter?.only && log.dateDone !== dateFilter.only) return
          if (dateFilter?.exclude && log.dateDone === dateFilter.exclude) return
          Object.values(log.sets || {}).forEach(s => {
            const w = parseFloat(s.weight) || 0
            if (w > 0 && s.velocity) points.push({ weight: w, velocity: s.velocity })
          })
        })
      })
    })
    return estimateVelocityProfile(points)
  }, [plan])

  // Qué serie viene después de la que se acaba de marcar — para el HUD de
  // descanso ("modo tarima"): misma serie siguiente del mismo ejercicio si
  // queda alguna, si no la primera serie sin hacer del siguiente ejercicio
  // que tenga alguna pendiente. `prevAll` es el estado de sets ANTERIOR a
  // este toggle (para los ejercicios que no son `afterRi`, que no cambian
  // en este update); `updatedExSets` es el estado YA actualizado de `afterRi`.
  const getNextSetInfo = useCallback((
    afterRi: number, afterSi: number,
    updatedExSets: Record<number, { weight: string; reps: string; done: boolean; rir?: number }>,
    prevAll: Record<number, Record<number, { weight: string; reps: string; done: boolean; rir?: number }>>,
  ): NextSetInfo | null => {
    const prevSetsFor = (rowIdx: number): Record<number, { weight?: string; reps?: string; rir?: number }> => {
      const key = `ex_${dayKey}_r${rowIdx}`
      const pattern = new RegExp(`^ex_w\\d+_d${dayIdx}_r${rowIdx}$`)
      return latestPreviousLog(logsRef.current, pattern, key)?.sets || {}
    }
    const buildInfo = (rowIdx: number, setIdx: number, totalForRow: number, existing?: { weight?: string; reps?: string }): NextSetInfo => {
      const rowEx = day.exercises[rowIdx]
      const { numReps } = parseSet(rowEx.sets)
      const prevWk = prevSetsFor(rowIdx)[setIdx]
      return {
        exerciseName: rowEx.name,
        setNum: setIdx + 1,
        totalSets: totalForRow,
        weight: existing?.weight || prevWk?.weight || '',
        reps: existing?.reps || prevWk?.reps || String(numReps),
        targetLabel: showPesosSugeridos ? getTargetRangeLabel(prevWk?.weight, prevWk?.rir, plan.weeks?.[weekIdx]?.rpe) : null,
      }
    }

    const { numSets: curNumSets } = parseSet(day.exercises[afterRi].sets)
    const totalCur = Math.max(curNumSets, Object.keys(updatedExSets).length)
    if (afterSi + 1 < totalCur) {
      // La serie siguiente sin peso parte del de la que se acaba de hacer (es lo
      // normal y lo que precarga la vista de foco), no del de la última sesión.
      const next = updatedExSets[afterSi + 1]
      const carried = next?.weight || updatedExSets[afterSi]?.weight
      return buildInfo(afterRi, afterSi + 1, totalCur, { ...next, weight: carried })
    }

    for (let nextRi = afterRi + 1; nextRi < day.exercises.length; nextRi++) {
      const { numSets: ns } = parseSet(day.exercises[nextRi].sets)
      const exSetsForRow = prevAll[nextRi] || {}
      const total = Math.max(ns, Object.keys(exSetsForRow).length)
      const firstUndone = Array.from({ length: total }, (_, i) => i).find(i => !exSetsForRow[i]?.done)
      if (firstUndone !== undefined) return buildInfo(nextRi, firstUndone, total, exSetsForRow[firstUndone])
    }
    return null
  }, [day, dayKey, dayIdx, plan, weekIdx, showPesosSugeridos])

  const toggleSet = useCallback((ri: number, si: number, weight: string, reps: string) => {
    const ex = day.exercises[ri]
    const { numSets } = parseSet(ex.sets)
    const today = localDateKey()
    const wasDone = setsRef.current[ri]?.[si]?.done

    setSets(prev => {
      const newDone = !prev[ri]?.[si]?.done
      // En carrera por tiradas, la distancia de la tirada es la prescrita; en
      // un test de tiempo fijo la escribe el cliente (setRunData).
      const runDistance = ex.kind === 'run' && ex.run && !ex.run.durationSec ? ex.run.distanceM : undefined
      const prevSet = prev[ri]?.[si]
      const updated = { ...prev, [ri]: { ...prev[ri], [si]: { ...prevSet, weight, reps, done: newDone, distanceM: runDistance ?? prevSet?.distanceM } } }
      const totalSetsInEx = Math.max(numSets, Object.keys(updated[ri]).length); const allDone = Array.from({ length: totalSetsInEx }, (_, i) => updated[ri][i]?.done).every(Boolean)
      const key = `ex_${dayKey}_r${ri}`
      const setsData: Record<number, LogSet> = {}
      for (let i = 0; i < Math.max(numSets, Object.keys(updated[ri]).length); i++) {
        const st = updated[ri][i]
        setsData[i] = {
          weight: st?.weight || '', reps: st?.reps || '',
          ...(st?.rir !== undefined ? { rir: st.rir } : {}), ...(st?.velocity !== undefined ? { velocity: st.velocity } : {}),
          ...(st?.timeSec !== undefined ? { timeSec: st.timeSec } : {}), ...(st?.distanceM !== undefined ? { distanceM: st.distanceM } : {}),
          ...(st?.isTest ? { isTest: true } : {}),
        }
      }
      onLogsChange({ ...logsRef.current, [key]: { ...logsRef.current[key], sets: setsData, done: allDone, dateDone: today } })

      // Iniciar timer de descanso solo si no tiene hideRest (en carrera la
      // recuperación es andando una distancia, no una cuenta atrás)
      if (newDone && !ex.hideRest && ex.kind !== 'run') {
        const restSecs = ex.restSets ?? (ex.isMain ? (plan.restMain || 180) : (plan.restAcc || 90))
        setRestTimer({ secs: restSecs, next: getNextSetInfo(ri, si, updated[ri], prev) })
      }

      return updated
    })

    // Detección de récord en tiempo real (1RM estimado) — solo al marcar
    // la serie como hecha, no al desmarcarla.
    if (!wasDone) {
      const rm = estimate1RM(parseFloat(weight) || 0, parseInt(reps) || 0)
      const prevBest = getBest1RMFromLogs(ex.name, logsRef.current)
      if (rm > 0 && rm > prevBest) {
        setPrAlert({
          name: ex.name,
          oneRM: Math.round(rm * 10) / 10,
          weight: parseFloat(weight) || 0,
          reps: parseInt(reps) || 0,
          deltaKg: prevBest > 0 ? Math.round((rm - prevBest) * 10) / 10 : null,
        })
        setTimeout(() => setPrAlert(null), 3800)
      }
    }
  }, [day, dayKey, onLogsChange, plan, getBest1RMFromLogs, getNextSetInfo])

  const addSet = (ri: number) => {
    const { numReps } = parseSet(day.exercises[ri].sets)
    setSets(prev => {
      const exSets = prev[ri] || {}
      const nextIdx = Object.keys(exSets).length
      const last = exSets[nextIdx - 1]
      return { ...prev, [ri]: { ...exSets, [nextIdx]: { weight: last?.weight || '', reps: last?.reps || String(numReps), done: false } } }
    })
  }

  const totalExs = day?.exercises.length || 0
  const doneExs = day?.exercises.filter((ex, ri) => {
    const { numSets } = parseSet(ex.sets)
    return Array.from({ length: numSets }, (_, si) => sets[ri]?.[si]?.done).every(Boolean)
  }).length || 0
  const pct = totalExs ? Math.round((doneExs / totalExs) * 100) : 0
  const totalVolume = Object.values(sets).reduce((acc, exSets) =>
    acc + Object.values(exSets).reduce((a, s) => a + (s.done ? (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0) : 0), 0), 0)
  const totalSetsDone = Object.values(sets).reduce((acc, exSets) => acc + Object.values(exSets).filter(s => s.done).length, 0)

  // Promedio de RIR de la sesión — útil como indicador de fatiga
  const allRirs = Object.values(sets).flatMap(exSets => Object.values(exSets).filter(s => s.done && s.rir !== undefined).map(s => s.rir as number))
  const avgRir = allRirs.length ? Math.round((allRirs.reduce((a, b) => a + b, 0) / allRirs.length) * 10) / 10 : null

  // Mismo ejercicio en semanas anteriores = mismo día de la semana (dayIdx) y misma
  // posición (ri), solo cambia la semana. `.includes('_r{ri}')` hacía falsos positivos:
  // "_r1" también casaba con "_r10", "_r11"... y con el mismo ri en OTRO día del plan.
  const samePlaceInPlan = (ri: number) => new RegExp(`^ex_w\\d+_d${dayIdx}_r${ri}$`)

  const isNewRecord = (ri: number) => {
    const currentBest = Math.max(0, ...Object.values(sets[ri] || {}).map(s => parseFloat(s.weight || '0')))
    const key = `ex_${dayKey}_r${ri}`
    const pattern = samePlaceInPlan(ri)
    // Excluye la entrada de la sesión actual: se va escribiendo en vivo en `logs`
    // a medida que se marcan series, y si no se excluye, el propio peso recién
    // metido "compite contra sí mismo" e impide que se detecte el récord.
    const allPrevBest = Object.entries(logs)
      .filter(([k]) => pattern.test(k) && k !== key)
      .flatMap(([, log]) => Object.values(log.sets || {}).map((s: any) => parseFloat(s.weight || '0')))
    return currentBest > 0 && currentBest > Math.max(0, ...allPrevBest)
  }

  // Récords batidos en esta sesión — para el resumen de fin de entreno
  const newRecords = (day?.exercises || [])
    .map((ex, ri) => ({
      name: ex.name,
      best: Math.max(0, ...Object.values(sets[ri] || {}).map(s => parseFloat(s.weight || '0'))),
      isRecord: isNewRecord(ri),
    }))
    .filter(r => r.isRecord)

  const getPrevSets = (ri: number) => {
    const key = `ex_${dayKey}_r${ri}`
    const pattern = samePlaceInPlan(ri)
    return latestPreviousLog(logs, pattern, key)?.sets || {}
  }

  // Densidad de la sesión: kg/min en vivo, más el tonelaje frente a la sesión
  // equivalente de la semana pasada cuando hay con qué compararlo — ver subir
  // el número set a set (0t → 12.4t) es el mismo refuerzo psicológico que un
  // contador de tonelaje en vivo en TrainHeroic/Whoop, pero con una
  // referencia real detrás en vez de una barra que sube porque sí.
  const prevSessionVolume = (day?.exercises || []).reduce((acc, _, ri) => {
    const prevSets = getPrevSets(ri)
    return acc + Object.values(prevSets).reduce((a, s: any) => a + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0)
  }, 0)
  const densityRate = elapsedSecs >= 30 && totalVolume > 0 ? Math.round(totalVolume / (elapsedSecs / 60)) : 0
  const densityPct = prevSessionVolume > 0 ? Math.min(100, Math.round((totalVolume / prevSessionVolume) * 100)) : null

  // Mejor 1RM estimado histórico para un ejercicio (para programación por %1RM)
  const getBest1RM = (exName: string) => getBest1RMFromLogs(exName, logs)

  // Perfil carga-velocidad histórico para un ejercicio (VBT)
  const getVelocityProfile = (exName: string) => getVelocityProfileFromLogs(exName, logs)

  if (!day) return null

  const allComplete = pct === 100

  const streak = streakDays(logs, new Date(), true)

  const incompleteExercises = day.exercises.map((ex, ri) => {
    const { numSets } = parseSet(ex.sets)
    const done = Array.from({ length: numSets }, (_, si) => sets[ri]?.[si]?.done).filter(Boolean).length
    return { name: ex.name, done, total: numSets }
  }).filter(e => e.done < e.total)

  const onPickReaction = (emoji: string) => {
    setReactionEmoji(emoji)
    setShowReactionComment(true)
    // Con 🤕 vamos directos a la zona — el emoji ya nos dice que es molestia,
    // no agujetas normales, así que no hace falta el clasificador que sí usa
    // el check-in diario (ahí "agujetas" es ambiguo)
    if (emoji !== MOLESTIA_EMOJI) setMolestiaZona(null)
  }

  const shareAchievement = () => {
    const lines = [
      `💪 ¡Entreno completado! — ${day.title}`,
      '',
      `⏱️ ${formatElapsed()}`,
      `🏋️ ${totalVolume > 0 ? Math.round(totalVolume).toLocaleString() : 0} kg movidos`,
      newRecords.length > 0 ? `🏆 ${newRecords.length} récord${newRecords.length > 1 ? 's' : ''} batido${newRecords.length > 1 ? 's' : ''}: ${newRecords.map(r => `${r.name} (${r.best}kg)`).join(', ')}` : null,
      sessionRpe !== null ? `🎯 RPE ${sessionRpe}/10` : null,
      '',
      'Hecho con PanelFit',
    ].filter(Boolean).join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, '_blank')
  }

  const confirmFinish = async () => {
    if (saving) return
    setSaving(true)
    try {
    if (allComplete && trainerId) sendPush({ trainerId }, 'Sesión completada 💪', `${day.title} terminado`)
    if (reactionEmoji) {
      const today = localDateKey()
      await supabase.from('session_reactions').insert({
        clientId: plan.clientId, dayTitle: day.title, date: today,
        emoji: reactionEmoji, comment: reactionComment.trim() || null,
      })
    }
    // 🤕 con zona elegida -> queda como registro real de dolor, no solo como
    // reacción de la sesión — para que salga en Progreso > Dolor y en la
    // Bandeja igual que el del check-in diario.
    if (reactionEmoji === MOLESTIA_EMOJI && molestiaZona) {
      await addPainEntry(molestiaZona, 6, reactionComment.trim() || undefined, undefined, 'articular')
    }
    // Carga interna (sRPE de Foster: minutos × RPE) — solo si el cliente puso
    // un RPE global. Alimenta el ACWR de carga interna, complementario al de
    // tonelaje (esencial para quien combina gimnasio con pista/campo).
    if (sessionRpe !== null && trainerId && !plan.clientId.startsWith('demo-client-')) {
      const today = localDateKey()
      const durationMin = Math.max(1, Math.round(elapsedSecs / 60))
      await supabase.from('session_load').insert({
        client_id: plan.clientId, trainer_id: trainerId, date: today,
        duration_min: durationMin, rpe: sessionRpe, load_au: durationMin * sessionRpe,
      })
    }
    if (!allComplete) {
      // El cliente decidió parar aquí a propósito (se acabó el tiempo, el
      // material estaba ocupado, etc.) — sin esto, el panel seguía
      // ofreciendo "Continuar" como si la sesión siguiera a medias, aunque el
      // cliente ya la había dado por terminada. done:false a propósito — ver
      // comentario en el tipo ExerciseLog.
      onLogsChange({ ...logsRef.current, [`finished_${dayKey}`]: { sets: {}, done: false, sessionFinished: true } })
    }
    setShowFinish(false)
    setFinished(true)
    } finally {
      setSaving(false)
    }
  }

  if (finished) {
    return (
      <FinishedScreen title={day.title} trainerMode={trainerMode} clientName={clientName} elapsedLabel={formatElapsed()}
        totalVolume={totalVolume} newRecords={newRecords} streak={streak} onContinue={onFinish} />
    )
  }

  // Sustituir / molestia: lo comparten la vista de lista y la de foco.
  const renderSubstitution = (ri: number, ex: DayPlan['exercises'][number]) => (
    <ExerciseSubstitution
        substitutionName={substitutions[ri]}
        isEditing={editingSubstitute === ri}
        draft={substituteDraft}
        onDraftChange={setSubstituteDraft}
        suggestions={substituteSuggestions}
        onStartEdit={() => { closeMolestiaPicker(); setSubstituteDraft(substitutions[ri] || ''); setEditingSubstitute(ri) }}
        onConfirmEdit={(name) => { setSubstitute(ri, name); setEditingSubstitute(null) }}
        onCancelEdit={() => setEditingSubstitute(null)}
        isMolestiaOpen={molestiaPickerRi === ri}
        onOpenMolestia={() => openMolestiaPicker(ri, ex.name)}
        onCloseMolestia={closeMolestiaPicker}
        molestiaZona={molestiaPickerZona}
        onSetMolestiaZona={setMolestiaPickerZona}
        alternatives={molestiaPickerRi === ri && molestiaPickerZona
          ? getSafeAlternatives(ex.name, molestiaPickerZona, libraryNames, libraryMuscleMap)
          : []}
        onPickAlternative={(altName) => {
          setSubstitute(ri, altName)
          addPainEntry(molestiaPickerZona!, 5, `Sustituido "${ex.name}" por molestia en la sesión`, undefined, 'articular')
          closeMolestiaPicker()
        }}
        onJustNotify={() => {
          addPainEntry(molestiaPickerZona!, 5, `Molestia en "${ex.name}" durante la sesión`, undefined, 'articular')
          closeMolestiaPicker()
        }}
    />
  )

  // Serie que toca ahora: la primera sin hacer; si está todo hecho, la última.
  const autoPos = (() => {
    for (let ri = 0; ri < day.exercises.length; ri++) {
      const exSets = sets[ri] || {}
      const total = Math.max(parseSet(day.exercises[ri].sets).numSets, Object.keys(exSets).length)
      for (let si = 0; si < total; si++) if (!exSets[si]?.done) return { ri, si }
    }
    const last = day.exercises.length - 1
    const total = Math.max(parseSet(day.exercises[last].sets).numSets, Object.keys(sets[last] || {}).length)
    return { ri: last, si: Math.max(0, total - 1) }
  })()
  const pos = focusOverride && day.exercises[focusOverride.ri] ? focusOverride : autoPos

  const renderRun = (ri: number) => {
    const ex = day.exercises[ri]
    const exSets = sets[ri] || {}
    return ex.run ? (
      <RunSets run={ex.run} totalSets={Math.max(parseSet(ex.sets).numSets, Object.keys(exSets).length)} sets={exSets}
        prevSets={getPrevSets(ri)} onSetData={(si, patch) => setRunData(ri, si, patch)} onToggle={si => toggleSet(ri, si, '', '1')} />
    ) : null
  }

  // Lo avanzado de un ejercicio, para el "Más" de la vista de foco.
  const renderMore = (ri: number) => {
    const ex = day.exercises[ri]
    const history = getExerciseHistory(ex.name)
    const restSecs = ex.restSets ?? (ex.isMain ? (plan.restMain || 180) : (plan.restAcc || 90))
    const pctTarget = parsePercentWeight(ex.weight) !== null ? resolveWeightFromPercent(ex.weight, getBest1RM(ex.name)) : null
    const vProfile = tracksVelocity(ex) ? getVelocityProfile(ex.name) : null
    return (
      <div className="space-y-3">
        <div className="mx-4 bg-bg-alt/50 border border-border rounded-xl p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2">Últimas sesiones</p>
          {history.length === 0 ? <p className="text-xs text-muted">Sin historial previo para este ejercicio</p> : (
            <div className="space-y-1.5">
              {history.map((h, i) => {
                const older = history[i + 1]
                const delta = older ? Math.round((h.weight - older.weight) * 10) / 10 : null
                return (
                  <div key={h.date} className="flex items-center gap-2 text-xs">
                    <span className="text-muted w-14 flex-shrink-0">{new Date(h.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                    <span className="font-semibold flex-1">{h.weight}kg × {h.reps}</span>
                    {delta !== null && delta !== 0 && <span className={`font-bold ${delta > 0 ? 'text-ok' : 'text-warn'}`}>{delta > 0 ? '▲' : '▼'} {Math.abs(delta)}kg</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {(pctTarget || vProfile?.oneRM || !(ex.hideRest || ex.kind === 'run')) && (
          <div className="mx-4 text-xs text-muted space-y-1">
            {pctTarget && <p className="text-accent font-semibold">{ex.weight} ≈ {pctTarget}kg (según tu 1RM estimado)</p>}
            {vProfile?.oneRM && <p style={{ color: '#6366f1' }} className="font-semibold">⚡ 1RM real de hoy (por velocidad): ~{vProfile.oneRM}kg</p>}
            {!(ex.hideRest || ex.kind === 'run') && <p>Descanso: {Math.floor(restSecs / 60) > 0 ? `${Math.floor(restSecs / 60)}min ` : ''}{restSecs % 60 > 0 ? `${restSecs % 60}s` : ''}</p>}
          </div>
        )}
        {renderSubstitution(ri, ex)}
        {ex.enReadaptacion && <ExerciseEvaTracker eva={logs[`ex_${dayKey}_r${ri}`]?.dolorEva} onSetEva={(v) => setExerciseEva(ri, v)} />}
        {ex.requiresVideo && (
          <RequiredVideoUpload trainerMode={trainerMode} videoUploaded={logs[`ex_${dayKey}_r${ri}`]?.videoEjecucion}
            uploading={uploadingVideoRi === ri} onUpload={(f) => uploadExerciseVideo(ri, f)} />
        )}
        {trainerId && !trainerMode && <div className="px-4"><VideoFeedbackButton exerciseName={ex.name} clientId={plan.clientId} trainerId={trainerId} /></div>}
        {ex.tempo && <TempoWidget tempo={ex.tempo} />}
      </div>
    )
  }

  const warmupBlock = (day.warmupExercises?.length || 0) > 0 ? (
    <div className="bg-accent/5 border-b border-accent/20 px-4 py-3">
      <p className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Calentamiento</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(day.warmupExercises || []).map((w, i) => (
          <div key={i} className="flex-shrink-0 bg-card border border-accent/20 rounded-xl px-3 py-2 text-xs">
            <p className="font-semibold text-gray-700">{w.name}</p>
            {w.sets && <p className="text-muted">{w.sets}{w.weight ? ` · ${w.weight}` : ''}</p>}
          </div>
        ))}
      </div>
    </div>
  ) : null
  const topExtras = warmupBlock || dayTests.length > 0 ? (
    <div>{warmupBlock}<DayTestsCard tests={dayTests} resultadosHoy={testResultadosHoy} onSubmit={submitTestResult} /></div>
  ) : undefined

  return (
    <div className="fixed inset-0 z-40 bg-bg flex flex-col overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {restTimer && <RestTimer seconds={restTimer.secs} next={restTimer.next} onDone={() => setRestTimer(null)} onSkip={() => setRestTimer(null)} />}
      {calcWeight !== null && <CalculadoraDiscos pesoObjetivo={calcWeight} onClose={() => setCalcWeight(null)} />}
      {prAlert && <PrAlert exerciseName={prAlert.name} oneRM={prAlert.oneRM} weight={prAlert.weight} reps={prAlert.reps} deltaKg={prAlert.deltaKg} />}

      {view === 'foco' ? (
        <FocusWorkout
          title={day.title} clientName={clientName} elapsedLabel={formatElapsed()} pct={pct}
          exercises={day.exercises} sets={sets} prevSets={getPrevSets} weekRpe={plan.weeks?.[weekIdx]?.rpe} showTarget={showPesosSugeridos}
          ri={pos.ri} si={pos.si} allComplete={allComplete}
          substitutionName={(ri) => substitutions[ri]} isRecord={isNewRecord}
          onSelect={(ri, si) => setFocusOverride({ ri, si })}
          onBack={() => onBack ? onBack() : setShowFinish(true)} onFinishClick={() => setShowFinish(true)} onToggleView={toggleView}
          onCommit={commitSet}
          onToggle={(ri, si, w, r) => { toggleSet(ri, si, w, r); setFocusOverride(null) }}
          onSetRir={setRir} onSetVelocity={setVelocity} onAddSet={addSet} onOpenCalc={(w) => setCalcWeight(parseFloat(w) || 0)}
          renderMore={renderMore} renderRun={renderRun} topExtras={topExtras}
        />
      ) : (
      <>
      <WorkoutHeader
        title={day.title}
        clientName={clientName}
        onBack={() => onBack ? onBack() : setShowFinish(true)}
        onFinishClick={() => setShowFinish(true)}
        elapsedLabel={formatElapsed()}
        allComplete={allComplete}
        totalVolume={totalVolume}
        totalSetsDone={totalSetsDone}
        avgRir={avgRir}
        doneExs={doneExs}
        totalExs={totalExs}
        pct={pct}
        densityRate={densityRate}
        densityPct={densityPct}
        prevSessionVolume={prevSessionVolume}
        onToggleView={toggleView}
      />

      {/* Calentamiento si existe */}
      {(day.warmupExercises?.length || 0) > 0 && (
        <div className="bg-accent/5 border-b border-accent/20 px-4 py-3">
          <p className="text-xs font-bold text-accent uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" /> Calentamiento
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(day.warmupExercises || []).map((ex, i) => (
              <div key={i} className="flex-shrink-0 bg-card border border-accent/20 rounded-xl px-3 py-2 text-xs">
                <p className="font-semibold text-gray-700">{ex.name}</p>
                {ex.sets && <p className="text-muted">{ex.sets}{ex.weight ? ` · ${ex.weight}` : ''}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <DayTestsCard tests={dayTests} resultadosHoy={testResultadosHoy} onSubmit={submitTestResult} />

      {/* Ejercicios */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
        {day.exercises.map((ex, ri) => {
          const { numSets, numReps } = parseSet(ex.sets)
          const exSets = sets[ri] || {}
          const totalExSets = Math.max(numSets, Object.keys(exSets).length)
          const allDone = Array.from({ length: totalExSets }, (_, si) => exSets[si]?.done).every(Boolean)
          const record = isNewRecord(ri)
          const prevSets = getPrevSets(ri)
          const ytId = ex.videoUrl ? getYTId(ex.videoUrl) : null
          const restSecs = ex.restSets ?? (ex.isMain ? (plan.restMain || 180) : (plan.restAcc || 90))
          const hideRest = ex.hideRest || ex.kind === 'run'
          const restMin = Math.floor(restSecs / 60)
          const restSecR = restSecs % 60

          // Primera serie A LA MISMA CARGA con velocidad registrada hoy — referencia
          // para el % de pérdida de velocidad (autorregulación VBT). Se compara
          // contra el mismo peso, no contra la primera serie de la sesión sin más:
          // en un esquema de rampa (series de aproximación a menor peso) la
          // velocidad cae al subir de carga, y eso no es fatiga — mezclarlo daría
          // un % de "pérdida" que en realidad es solo el efecto de mover más peso.
          const firstVelocityAtWeight = (weight: string) => {
            const si0 = Object.keys(exSets).map(Number).sort((a, b) => a - b)
              .find(si => exSets[si]?.done && exSets[si]?.velocity !== undefined && exSets[si]?.weight === weight)
            return si0 !== undefined ? exSets[si0].velocity : undefined
          }
          const velocityProfile = tracksVelocity(ex) ? getVelocityProfile(ex.name) : null
          // Autorregulación VBT: 1RM por velocidad de HOY (con lo que ya lleva
          // hecho en esta sesión) frente al mejor 1RM por velocidad de sesiones
          // anteriores — si el SNC no responde igual hoy, sugiere ajustar el
          // peso de las series que quedan en vez de forzar la carga prescrita.
          const todayVelocityProfile = tracksVelocity(ex) ? getVelocityProfileFromLogs(ex.name, logs, { only: todayDate }) : null
          const historicalVelocityProfile = tracksVelocity(ex) ? getVelocityProfileFromLogs(ex.name, logs, { exclude: todayDate }) : null
          const vbtSuggestion = showPesosSugeridos ? getVbtSuggestedWeightChange(
            todayVelocityProfile?.oneRM ?? null,
            historicalVelocityProfile?.oneRM ?? null,
            parseFloat(ex.weight) || undefined
          ) : null

          return (
            <div key={ri} className="border-b border-border">
              <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                {ytId ? (
                  <a href={ex.videoUrl} target="_blank" rel="noreferrer"
                    className="w-10 h-10 rounded-xl overflow-hidden border border-border flex-shrink-0">
                    <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`} className="w-full h-full object-cover" alt="" />
                  </a>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-bg-alt flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-5 h-5 text-muted" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold text-base ${substitutions[ri] ? 'line-through text-muted' : allDone ? 'text-ok' : 'text-accent'}`}>{ex.name}</p>
                    {record && <Trophy className="w-4 h-4 text-warn flex-shrink-0" />}
                  </div>
                  {substitutions[ri] && (
                    <p className="text-sm font-bold text-warn flex items-center gap-1 mt-0.5">
                      <Repeat className="w-3.5 h-3.5 flex-shrink-0" /> {substitutions[ri]}
                    </p>
                  )}
                  {ex.isMain && <span className="text-[10px] text-accent font-bold uppercase tracking-wider">Principal</span>}
                  {parsePercentWeight(ex.weight) !== null && (() => {
                    const best1RM = getBest1RM(ex.name)
                    const target = resolveWeightFromPercent(ex.weight, best1RM)
                    return target ? (
                      <p className="text-[10px] text-accent font-semibold mt-0.5">{ex.weight} ≈ {target}kg (según tu 1RM estimado)</p>
                    ) : (
                      <p className="text-[10px] text-muted mt-0.5">{ex.weight} — registra más series para calcular el peso</p>
                    )
                  })()}
                  {velocityProfile?.oneRM && (
                    <p className="text-[10px] font-semibold mt-0.5" style={{ color: '#6366f1' }}>
                      ⚡ 1RM real de hoy (por velocidad): ~{velocityProfile.oneRM}kg
                    </p>
                  )}
                  {vbtSuggestion && (
                    <p className="text-[10px] font-bold mt-0.5" style={{ color: vbtSuggestion.color }} title="Compara el 1RM por velocidad de hoy con tu mejor referencia en sesiones anteriores">
                      🎯 {vbtSuggestion.label}
                    </p>
                  )}
                </div>
                <button onClick={() => setExpandedHistory(expandedHistory === ri ? null : ri)}
                  className="p-2 -m-2 flex-shrink-0 text-muted hover:text-accent transition-colors" aria-label="Ver historial">
                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedHistory === ri ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Historial comparativo instantáneo — últimas sesiones de este
                  ejercicio, sin salir de la sesión activa */}
              {expandedHistory === ri && (() => {
                const history = getExerciseHistory(ex.name)
                return (
                  <div className="mx-4 mb-3 bg-bg-alt/50 border border-border rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Últimas sesiones</p>
                    {history.length === 0 ? (
                      <p className="text-xs text-muted">Sin historial previo para este ejercicio</p>
                    ) : (
                      <div className="space-y-1.5">
                        {history.map((h, i) => {
                          const older = history[i + 1]
                          const delta = older ? Math.round((h.weight - older.weight) * 10) / 10 : null
                          return (
                            <div key={h.date} className="flex items-center gap-2 text-xs">
                              <span className="text-muted w-14 flex-shrink-0">
                                {new Date(h.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                              </span>
                              <span className="font-semibold flex-1">{h.weight}kg × {h.reps}</span>
                              {delta !== null && delta !== 0 && (
                                <span className={`font-bold ${delta > 0 ? 'text-ok' : 'text-warn'}`}>
                                  {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}kg
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })()}

              {ex.comment && <p className="mx-4 mb-2 text-xs text-muted italic leading-relaxed">"{ex.comment}"</p>}

              {/* Sustituir ejercicio — ej. el material previsto está ocupado */}
              {renderSubstitution(ri, ex)}

              {/* Dolor EVA 0-10 en ejercicios terapéuticos/de readaptación — en
                  fisioterapia deportiva moderna no se busca "cero dolor" sino
                  dolor tolerable (≤3-4/10) que no empeore a las 24h, así que
                  el color no penaliza cualquier dolor, solo el que se sale de
                  esa ventana. */}
              {ex.enReadaptacion && (
                <ExerciseEvaTracker eva={logs[`ex_${dayKey}_r${ri}`]?.dolorEva} onSetEva={(v) => setExerciseEva(ri, v)} />
              )}

              {/* Vídeo de ejecución requerido por el entrenador para este ejercicio —
                  se sube y queda adjunto de inmediato al registro, sin pasar por
                  el ciclo de petición/respuesta del feedback asíncrono de abajo */}
              {ex.requiresVideo && (
                <RequiredVideoUpload
                  trainerMode={trainerMode}
                  videoUploaded={logs[`ex_${dayKey}_r${ri}`]?.videoEjecucion}
                  uploading={uploadingVideoRi === ri}
                  onUpload={(f) => uploadExerciseVideo(ri, f)}
                />
              )}

              {/* Vídeo-feedback asíncrono — pedirle al entrenador que revise una
                  ejecución; no aplica cuando es el propio entrenador quien graba */}
              {trainerId && !trainerMode && (
                <div className="px-4 mb-3">
                  <VideoFeedbackButton exerciseName={ex.name} clientId={plan.clientId} trainerId={trainerId} />
                </div>
              )}

              {/* Descanso — solo si no está oculto */}
              {!hideRest && (
                <div className="flex items-center gap-1.5 px-4 mb-3">
                  <Timer className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs text-accent font-semibold">
                    Descanso: {restMin > 0 ? `${restMin}min ` : ''}{restSecR > 0 ? `${restSecR}s` : ''}
                  </span>
                </div>
              )}

              {/* Marcador de tempo/cadencia — solo si el entrenador lo fijó */}
              {ex.tempo && <TempoWidget tempo={ex.tempo} />}

              {ex.kind === 'run' && ex.run ? (
                <RunSets
                  run={ex.run}
                  totalSets={totalExSets}
                  sets={exSets}
                  prevSets={prevSets}
                  onSetData={(si, patch) => setRunData(ri, si, patch)}
                  onToggle={si => toggleSet(ri, si, '', '1')}
                />
              ) : (<>
              {/* Cabecera tabla */}
              <div className="grid grid-cols-[28px_1fr_100px_60px_36px] gap-1 px-3 pb-1">
                <p className="text-[10px] uppercase text-muted font-bold text-center">N</p>
                <p className="text-[10px] uppercase text-muted font-bold text-center">Anterior</p>
                <p className="text-[10px] uppercase text-muted font-bold text-center flex items-center justify-center gap-1">
                  KG <Calculator className="w-2.5 h-2.5 opacity-50" />
                </p>
                <p className="text-[10px] uppercase text-muted font-bold text-center">Reps</p>
                <div />
              </div>

              {Array.from({ length: totalExSets }, (_, si) => {
                const s = exSets[si] || { weight: '', reps: String(numReps), done: false }
                const prev = prevSets[si]
                return (
                  <SetRow
                    key={`${ri}-${si}`}
                    setNum={si + 1}
                    initWeight={s.weight}
                    initReps={s.reps}
                    done={s.done}
                    rir={s.rir}
                    velocity={s.velocity}
                    firstVelocity={firstVelocityAtWeight(s.weight)}
                    prevWeight={prev?.weight}
                    prevReps={prev?.reps}
                    prevRir={prev?.rir}
                    weekRpe={plan.weeks?.[weekIdx]?.rpe}
                    isMain={ex.isMain}
                    showVelocity={tracksVelocity(ex)}
                    showTarget={showPesosSugeridos}
                    onCommit={(w, r) => commitSet(ri, si, w, r)}
                    onToggle={(w, r) => toggleSet(ri, si, w, r)}
                    onOpenCalc={(w) => setCalcWeight(parseFloat(w) || 0)}
                    onSetRir={(rir) => setRir(ri, si, rir)}
                    onSetVelocity={(v) => setVelocity(ri, si, v)}
                  />
                )
              })}

              <button onClick={() => addSet(ri)}
                className="w-full flex items-center justify-center gap-2 py-3 text-muted hover:bg-bg-alt transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" /> Agregar Serie
              </button>
              </>)}
            </div>
          )
        })}

        {/* Botón finalizar flotante al fondo — siempre visible */}
        <div className="px-4 py-6">
          <button
            onClick={() => setShowFinish(true)}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition-all ${
              allComplete
                ? 'bg-ok text-white shadow-lg shadow-ok/20'
                : 'bg-ink text-white hover:opacity-90'
            }`}
            style={{ minHeight: '56px' }}>
            {allComplete
              ? <><CheckCircle2 className="w-5 h-5" /> ¡Sesión completada! Terminar</>
              : <><X className="w-4 h-4" /> Terminar entrenamiento</>
            }
          </button>
        </div>

        <div className="h-8" />
      </div>

      </>
      )}

      {/* Modal confirmación terminar */}
      {showFinish && (
        <FinishWorkoutModal
          dayTitle={day.title}
          totalSetsDone={totalSetsDone}
          streak={streak}
          saving={saving}
          allComplete={allComplete}
          totalExs={totalExs}
          doneExs={doneExs}
          incompleteExercises={incompleteExercises}
          elapsedLabel={formatElapsed()}
          totalVolume={totalVolume}
          newRecords={newRecords}
          avgRir={avgRir}
          sessionRpe={sessionRpe}
          sessionRpeHalf={sessionRpeHalf}
          onSetSessionRpe={setSessionRpe}
          onToggleSessionRpeHalf={() => setSessionRpeHalf(h => !h)}
          reactionEmoji={reactionEmoji}
          onPickReaction={onPickReaction}
          showReactionComment={showReactionComment}
          reactionComment={reactionComment}
          onSetReactionComment={setReactionComment}
          molestiaZona={molestiaZona}
          onSetMolestiaZona={setMolestiaZona}
          onShare={shareAchievement}
          onConfirm={confirmFinish}
          onClose={() => setShowFinish(false)}
        />
      )}
    </div>
  )
}
