import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ChevronDown, Clock, Trophy, ChevronLeft,
  Plus, Dumbbell, Flame, Timer, Calculator, X, CheckCircle2, Zap, Repeat
} from 'lucide-react'
import { TrainingPlan, TrainingLogs } from '../../types'
import { CalculadoraDiscos } from './CalculadoraDiscos'
import { supabase } from '../../lib/supabase'
import { estimate1RM, parsePercentWeight, resolveWeightFromPercent, RIR_OPTIONS, estimateVelocityProfile, VelocityPoint, getVbtSuggestedWeightChange, getTargetRangeLabel } from '../../lib/strength'
import { sendPush } from '../../lib/usePushNotifications'
import { getYTId, parseSet, NextSetInfo } from './active-workout/utils'
import { RestTimer } from './active-workout/RestTimer'
import { VideoFeedbackButton } from './active-workout/VideoFeedbackButton'
import { SetRow } from './active-workout/SetRow'
import { PrAlert } from './active-workout/PrAlert'
import { DayTestsCard } from './active-workout/DayTestsCard'
import { useTestCatalog, useTestResultados } from '../../lib/testCatalog'

interface Props {
  plan: TrainingPlan
  weekIdx: number
  dayIdx: number
  logs: TrainingLogs
  onLogsChange: (logs: TrainingLogs) => void
  onFinish: () => void
  trainerId?: string
}

const REACTION_EMOJIS = ['🔥', '💪', '😅', '😩', '👍']

export function ActiveWorkout({ plan, weekIdx, dayIdx, logs, onLogsChange, onFinish, trainerId }: Props) {
  const day = plan.weeks[weekIdx]?.days[dayIdx]
  const dayKey = `w${weekIdx}_d${dayIdx}`
  const [reactionEmoji, setReactionEmoji] = useState<string | null>(null)
  const [reactionComment, setReactionComment] = useState('')
  const [showReactionComment, setShowReactionComment] = useState(false)

  // Pruebas físicas pedidas para este día del plan (Cooper, salto, etc.) — el
  // cliente mete su resultado aquí y va directo a Progreso > Pruebas del
  // entrenador, sin que haga falta decírselo aparte.
  const { tests: testCatalog } = useTestCatalog(trainerId)
  const { resultados: testResultados, addResultado: addTestResultado } = useTestResultados(plan.clientId)
  const dayTests = (day?.testIds || [])
    .map(id => testCatalog.find(t => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t)
  const todayDate = new Date().toISOString().split('T')[0]
  const testResultadosHoy = Object.fromEntries(
    testResultados.filter(r => r.fecha === todayDate).map(r => [r.test_id, r])
  )
  const submitTestResult = (testId: string, valor: number) => {
    if (!trainerId) return
    addTestResultado(trainerId, testId, valor, todayDate, '')
  }

  type SetState = { weight: string; reps: string; done: boolean; rir?: number; velocity?: number }
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
  const [calcWeight, setCalcWeight] = useState<number | null>(null)
  const [prAlert, setPrAlert] = useState<{ name: string; oneRM: number; weight: number; reps: number; deltaKg: number | null } | null>(null)
  const [sessionRpe, setSessionRpe] = useState<number | null>(null)
  const [sessionRpeHalf, setSessionRpeHalf] = useState(false)
  const startTime = useRef(Date.now())
  const setsRef = useRef(sets)
  useEffect(() => { setsRef.current = sets }, [sets])

  useEffect(() => {
    const t = setInterval(() => setElapsedSecs(Math.floor((Date.now() - startTime.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [])

  const formatElapsed = () => {
    const m = Math.floor(elapsedSecs / 60)
    const s = elapsedSecs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const commitSet = useCallback((ri: number, si: number, weight: string, reps: string) => {
    setSets(prev => ({ ...prev, [ri]: { ...prev[ri], [si]: { ...prev[ri][si], weight, reps } } }))
    const key = `ex_${dayKey}_r${ri}`
    const today = new Date().toISOString().split('T')[0]
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
        sets: { ...(currentLogs[key]?.sets || {}), [si]: { ...existingSet, ...(velocity !== undefined ? { velocity } : {}) } },
      }
    })
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
      const found = Object.entries(logsRef.current).find(([k, l]) => pattern.test(k) && k !== key && (l as any).dateDone)
      return (found?.[1] as any)?.sets || {}
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
        targetLabel: getTargetRangeLabel(prevWk?.weight, prevWk?.rir, plan.weeks?.[weekIdx]?.rpe),
      }
    }

    const { numSets: curNumSets } = parseSet(day.exercises[afterRi].sets)
    const totalCur = Math.max(curNumSets, Object.keys(updatedExSets).length)
    if (afterSi + 1 < totalCur) return buildInfo(afterRi, afterSi + 1, totalCur, updatedExSets[afterSi + 1])

    for (let nextRi = afterRi + 1; nextRi < day.exercises.length; nextRi++) {
      const { numSets: ns } = parseSet(day.exercises[nextRi].sets)
      const exSetsForRow = prevAll[nextRi] || {}
      const total = Math.max(ns, Object.keys(exSetsForRow).length)
      const firstUndone = Array.from({ length: total }, (_, i) => i).find(i => !exSetsForRow[i]?.done)
      if (firstUndone !== undefined) return buildInfo(nextRi, firstUndone, total, exSetsForRow[firstUndone])
    }
    return null
  }, [day, dayKey, dayIdx, plan, weekIdx])

  const toggleSet = useCallback((ri: number, si: number, weight: string, reps: string) => {
    const ex = day.exercises[ri]
    const { numSets } = parseSet(ex.sets)
    const today = new Date().toISOString().split('T')[0]
    const wasDone = setsRef.current[ri]?.[si]?.done

    setSets(prev => {
      const newDone = !prev[ri]?.[si]?.done
      const updated = { ...prev, [ri]: { ...prev[ri], [si]: { weight, reps, done: newDone, rir: prev[ri]?.[si]?.rir, velocity: prev[ri]?.[si]?.velocity } } }
      const totalSetsInEx = Math.max(numSets, Object.keys(updated[ri]).length); const allDone = Array.from({ length: totalSetsInEx }, (_, i) => updated[ri][i]?.done).every(Boolean)
      const key = `ex_${dayKey}_r${ri}`
      const setsData: Record<number, { weight: string; reps: string; rir?: number; velocity?: number }> = {}
      for (let i = 0; i < Math.max(numSets, Object.keys(updated[ri]).length); i++) {
        setsData[i] = { weight: updated[ri][i]?.weight || '', reps: updated[ri][i]?.reps || '', ...(updated[ri][i]?.rir !== undefined ? { rir: updated[ri][i].rir } : {}), ...(updated[ri][i]?.velocity !== undefined ? { velocity: updated[ri][i].velocity } : {}) }
      }
      onLogsChange({ ...logsRef.current, [key]: { ...logsRef.current[key], sets: setsData, done: allDone, dateDone: today } })

      // Iniciar timer de descanso solo si no tiene hideRest
      if (newDone && !ex.hideRest) {
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
    const prev = Object.entries(logs).find(([k, l]) => pattern.test(k) && k !== key && l.dateDone)
    return prev?.[1]?.sets || {}
  }

  // Mejor 1RM estimado histórico para un ejercicio (para programación por %1RM)
  const getBest1RM = (exName: string) => getBest1RMFromLogs(exName, logs)

  // Perfil carga-velocidad histórico para un ejercicio (VBT)
  const getVelocityProfile = (exName: string) => getVelocityProfileFromLogs(exName, logs)

  if (!day) return null

  const allComplete = pct === 100

  return (
    <div className="fixed inset-0 z-40 bg-bg flex flex-col overflow-hidden">
      {restTimer && <RestTimer seconds={restTimer.secs} next={restTimer.next} onDone={() => setRestTimer(null)} onSkip={() => setRestTimer(null)} />}
      {calcWeight !== null && <CalculadoraDiscos pesoObjetivo={calcWeight} onClose={() => setCalcWeight(null)} />}
      {prAlert && <PrAlert exerciseName={prAlert.name} oneRM={prAlert.oneRM} weight={prAlert.weight} reps={prAlert.reps} deltaKg={prAlert.deltaKg} />}

      {/* Header */}
      <div className="bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 px-4 py-3">
          <button onClick={() => setShowFinish(true)} className="p-2 rounded-xl hover:bg-bg-alt text-muted">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 font-semibold text-sm truncate">{day.title}</div>
          <div className="flex items-center gap-1 text-xs text-muted mr-2">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono font-semibold tabular-nums">{formatElapsed()}</span>
          </div>
          <button
            onClick={() => setShowFinish(true)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              allComplete
                ? 'bg-ok text-white shadow-md shadow-ok/30'
                : 'bg-accent text-white hover:opacity-90'
            }`}>
            {allComplete && <CheckCircle2 className="w-3.5 h-3.5" />}
            {allComplete ? '¡Terminar!' : 'Terminar'}
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center px-4 pb-3 gap-4 text-xs">
          <div><p className="text-muted">Duración</p><p className="font-bold text-accent tabular-nums">{formatElapsed()}</p></div>
          <div><p className="text-muted">Volumen</p><p className="font-bold">{totalVolume > 0 ? `${Math.round(totalVolume).toLocaleString()} kg` : '0 kg'}</p></div>
          <div><p className="text-muted">Series</p><p className="font-bold">{totalSetsDone}</p></div>
          {avgRir !== null && (
            <div><p className="text-muted">RIR medio</p><p className="font-bold" style={{ color: RIR_OPTIONS.find(o => Math.round(avgRir) === o.value)?.color || '#6e5438' }}>{avgRir}</p></div>
          )}
          <div className="flex-1 text-right">
            <p className="text-muted">{doneExs}/{totalExs} ejercicios</p>
            <div className="w-full h-1.5 bg-bg-alt rounded-full mt-1">
              <div className="h-full bg-ok rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Calentamiento si existe */}
      {(day.warmupExercises?.length || 0) > 0 && (
        <div className="bg-orange-50/60 border-b border-orange-100 px-4 py-3">
          <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" /> Calentamiento
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(day.warmupExercises || []).map((ex, i) => (
              <div key={i} className="flex-shrink-0 bg-white border border-orange-100 rounded-xl px-3 py-2 text-xs">
                <p className="font-semibold text-gray-700">{ex.name}</p>
                {ex.sets && <p className="text-orange-400">{ex.sets}{ex.weight ? ` · ${ex.weight}` : ''}</p>}
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
          const hideRest = ex.hideRest || false
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
          const velocityProfile = ex.isMain ? getVelocityProfile(ex.name) : null
          // Autorregulación VBT: 1RM por velocidad de HOY (con lo que ya lleva
          // hecho en esta sesión) frente al mejor 1RM por velocidad de sesiones
          // anteriores — si el SNC no responde igual hoy, sugiere ajustar el
          // peso de las series que quedan en vez de forzar la carga prescrita.
          const todayVelocityProfile = ex.isMain ? getVelocityProfileFromLogs(ex.name, logs, { only: todayDate }) : null
          const historicalVelocityProfile = ex.isMain ? getVelocityProfileFromLogs(ex.name, logs, { exclude: todayDate }) : null
          const vbtSuggestion = getVbtSuggestedWeightChange(
            todayVelocityProfile?.oneRM ?? null,
            historicalVelocityProfile?.oneRM ?? null,
            parseFloat(ex.weight) || undefined
          )

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
                  {ex.isMain && <span className="text-[9px] text-accent font-bold uppercase tracking-wider">Principal</span>}
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
                <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" />
              </div>

              {ex.comment && <p className="mx-4 mb-2 text-xs text-muted italic leading-relaxed">"{ex.comment}"</p>}

              {/* Sustituir ejercicio — ej. el material previsto está ocupado */}
              <div className="px-4 mb-3">
                {editingSubstitute === ri ? (
                  <div className="flex items-center gap-2">
                    <input autoFocus value={substituteDraft}
                      onChange={e => setSubstituteDraft(e.target.value)}
                      placeholder="¿Qué has hecho en su lugar?"
                      onKeyDown={e => {
                        if (e.key === 'Enter') { setSubstitute(ri, substituteDraft); setEditingSubstitute(null) }
                        if (e.key === 'Escape') setEditingSubstitute(null)
                      }}
                      className="flex-1 px-3 py-2 bg-white border border-warn/40 rounded-xl text-sm outline-none focus:ring-2 focus:ring-warn/20" />
                    <button onClick={() => { setSubstitute(ri, substituteDraft); setEditingSubstitute(null) }}
                      className="p-2 bg-warn text-white rounded-xl flex-shrink-0"><CheckCircle2 className="w-4 h-4" /></button>
                    <button onClick={() => setEditingSubstitute(null)}
                      className="p-2 border border-border rounded-xl text-muted flex-shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                ) : substitutions[ri] ? (
                  <button onClick={() => { setSubstituteDraft(substitutions[ri]); setEditingSubstitute(ri) }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-warn hover:underline">
                    <Repeat className="w-3.5 h-3.5" /> Cambiar sustitución
                  </button>
                ) : (
                  <button onClick={() => { setSubstituteDraft(''); setEditingSubstitute(ri) }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent">
                    <Repeat className="w-3.5 h-3.5" /> ¿Has hecho otro ejercicio? Sustitúyelo
                  </button>
                )}
              </div>

              {/* Vídeo-feedback asíncrono */}
              {trainerId && (
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

              {/* Cabecera tabla */}
              <div className="grid grid-cols-[32px_1fr_80px_72px_40px] gap-1 px-3 pb-1">
                <p className="text-[9px] uppercase text-muted font-bold text-center">N</p>
                <p className="text-[9px] uppercase text-muted font-bold text-center">Anterior</p>
                <p className="text-[9px] uppercase text-muted font-bold text-center flex items-center justify-center gap-1">
                  KG <Calculator className="w-2.5 h-2.5 opacity-50" />
                </p>
                <p className="text-[9px] uppercase text-muted font-bold text-center">Reps</p>
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

      {/* Modal confirmación terminar */}
      {showFinish && (
        <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm flex items-end">
          <div className="w-full bg-card rounded-t-3xl p-6 space-y-4">
            <div className="w-10 h-1 bg-border rounded-full mx-auto" />
            <h3 className="font-serif font-bold text-xl text-center">
              {allComplete ? '¡Sesión completada! 🏆' : '¿Terminar entrenamiento?'}
            </h3>
            {!allComplete && (
              <p className="text-sm text-muted text-center">
                Te quedan <span className="font-bold text-warn">{totalExs - doneExs} ejercicio{totalExs - doneExs !== 1 ? 's' : ''}</span> sin completar
              </p>
            )}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Clock className="w-4 h-4 text-accent" />, value: formatElapsed(), label: 'Duración' },
                { icon: <Dumbbell className="w-4 h-4 text-ok" />, value: `${doneExs}/${totalExs}`, label: 'Ejercicios' },
                { icon: <Flame className="w-4 h-4 text-warn" />, value: `${totalVolume > 0 ? Math.round(totalVolume).toLocaleString() : 0} kg`, label: 'Volumen' },
              ].map((s, i) => (
                <div key={i} className="bg-bg rounded-2xl p-3 text-center">
                  <div className="flex justify-center mb-1">{s.icon}</div>
                  <p className="font-serif font-bold text-base">{s.value}</p>
                  <p className="text-[10px] text-muted">{s.label}</p>
                </div>
              ))}
            </div>
            {newRecords.length > 0 && (
              <div className="bg-gradient-to-br from-warn/10 to-warn/5 border border-warn/20 rounded-2xl px-4 py-3 space-y-2">
                <p className="text-xs font-bold text-warn uppercase tracking-wider flex items-center gap-1.5">
                  🏆 {newRecords.length} récord{newRecords.length > 1 ? 's' : ''} batido{newRecords.length > 1 ? 's' : ''}
                </p>
                {newRecords.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5 text-warn flex-shrink-0" />
                    <p className="text-sm flex-1 truncate"><span className="font-semibold">{r.name}</span></p>
                    <p className="text-sm font-bold text-warn">{r.best}kg</p>
                  </div>
                ))}
              </div>
            )}
            {avgRir !== null && (
              <div className="flex items-center gap-2 bg-bg rounded-2xl px-4 py-3">
                <Zap className="w-4 h-4 text-accent flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted">RIR medio de la sesión</p>
                  <p className="text-sm font-bold">{avgRir} — {avgRir <= 1.5 ? 'Sesión muy intensa' : avgRir <= 3 ? 'Buena intensidad' : 'Margen de mejora'}</p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted text-center">¿Cómo de duro se sintió en general? (RPE)</p>
              <div className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setSessionRpe(n + (sessionRpeHalf && n < 10 ? 0.5 : 0))}
                    className={`py-2 rounded-xl text-sm font-bold transition-all ${
                      sessionRpe !== null && Math.floor(sessionRpe) === n ? 'bg-ink text-white' : 'bg-bg text-muted hover:bg-bg-alt'
                    }`}>
                    {sessionRpe !== null && Math.floor(sessionRpe) === n && sessionRpeHalf && n < 10 ? `${n}.5` : n}
                  </button>
                ))}
              </div>
              <button onClick={() => setSessionRpeHalf(h => !h)}
                className={`w-full py-1.5 rounded-xl text-xs font-semibold border transition-all ${sessionRpeHalf ? 'bg-accent/15 border-accent text-accent' : 'border-border text-muted'}`}>
                {sessionRpeHalf ? '✓ ' : ''}+0.5 (precisión powerlifting/halterofilia)
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted text-center">¿Cómo te ha sentado?</p>
              <div className="flex justify-center gap-2">
                {REACTION_EMOJIS.map(emoji => (
                  <button key={emoji} onClick={() => { setReactionEmoji(emoji); setShowReactionComment(true) }}
                    className={`w-11 h-11 rounded-2xl text-xl flex items-center justify-center transition-all ${reactionEmoji === emoji ? 'bg-accent/15 ring-2 ring-accent' : 'bg-bg hover:bg-bg-alt'}`}>
                    {emoji}
                  </button>
                ))}
              </div>
              {showReactionComment && (
                <textarea value={reactionComment} onChange={e => setReactionComment(e.target.value)} rows={2}
                  placeholder="¿Algo que comentar? (opcional)"
                  className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none resize-none" />
              )}
            </div>
            {allComplete && (
              <button onClick={() => {
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
                }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white hover:opacity-90 active:scale-[0.98] transition-all"
                style={{ backgroundColor: '#25D366' }}>
                📤 Compartir logro
              </button>
            )}
            <button onClick={async () => {
                if (allComplete && trainerId) sendPush({ trainerId }, 'Sesión completada 💪', `${day.title} terminado`)
                if (reactionEmoji) {
                  const today = new Date().toISOString().split('T')[0]
                  await supabase.from('session_reactions').insert({
                    clientId: plan.clientId, dayTitle: day.title, date: today,
                    emoji: reactionEmoji, comment: reactionComment.trim() || null,
                  })
                }
                // Carga interna (sRPE de Foster: minutos × RPE) — solo si el cliente
                // puso un RPE global. Alimenta el ACWR de carga interna, complementario
                // al de tonelaje (esencial para quien combina gimnasio con pista/campo).
                if (sessionRpe !== null && trainerId && !plan.clientId.startsWith('demo-client-')) {
                  const today = new Date().toISOString().split('T')[0]
                  const durationMin = Math.max(1, Math.round(elapsedSecs / 60))
                  await supabase.from('session_load').insert({
                    client_id: plan.clientId, trainer_id: trainerId, date: today,
                    duration_min: durationMin, rpe: sessionRpe, load_au: durationMin * sessionRpe,
                  })
                }
                if (!allComplete) {
                  // El cliente decidió parar aquí a propósito (se acabó el tiempo, el
                  // material estaba ocupado, etc.) — sin esto, el panel seguía
                  // ofreciendo "Continuar" como si la sesión siguiera a medias, aunque
                  // el cliente ya la había dado por terminada. done:false a propósito
                  // — ver comentario en el tipo ExerciseLog.
                  onLogsChange({ ...logsRef.current, [`finished_${dayKey}`]: { sets: {}, done: false, sessionFinished: true } })
                }
                onFinish()
              }}
              className={`w-full py-4 rounded-2xl font-bold text-base hover:opacity-90 active:scale-[0.98] transition-all ${
                allComplete ? 'bg-ok text-white' : 'bg-ink text-white'
              }`}>
              {allComplete ? '✓ Guardar y terminar' : 'Terminar igual'}
            </button>
            <button onClick={() => setShowFinish(false)}
              className="w-full py-3 border border-border rounded-2xl text-sm font-medium text-muted hover:bg-bg-alt transition-colors">
              Seguir entrenando
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
