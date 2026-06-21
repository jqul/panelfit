import { TrainingLogs } from '../types'

export interface TrainingSignal {
  avgRirThis: number | null
  avgRirLast: number | null
  volChangePct: number | null
  sesionesThisWeek: number
  hasData: boolean
}

export interface ReadinessSignal {
  avgSleep: number | null
  avgSoreness: number | null
  avgStress: number | null
  avgMotivation: number | null
  hasData: boolean
}

export type RiskLevel = 'bajo' | 'moderado' | 'alto'

export interface CombinedRisk {
  level: RiskLevel
  reasons: string[]
}

/** Señal de carga de entrenamiento: RIR semanal, cambio de volumen, sesiones. */
export function computeTrainingSignal(logs: TrainingLogs): TrainingSignal {
  const now = new Date()
  const hace7 = new Date(now); hace7.setDate(now.getDate() - 7)
  const hace14 = new Date(now); hace14.setDate(now.getDate() - 14)

  const rirsThisWeek: number[] = []
  const rirsLastWeek: number[] = []
  let volThisWeek = 0
  let volLastWeek = 0

  Object.values(logs).forEach(log => {
    if (!log.done || !log.dateDone) return
    const d = new Date(log.dateDone + 'T00:00:00')
    const setsArr = Object.values(log.sets || {})
    const vol = setsArr.reduce((a, s) => a + ((parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)), 0)
    const rirs = setsArr.filter(s => s.rir !== undefined).map(s => s.rir as number)

    if (d >= hace7) {
      rirsThisWeek.push(...rirs)
      volThisWeek += vol
    } else if (d >= hace14 && d < hace7) {
      rirsLastWeek.push(...rirs)
      volLastWeek += vol
    }
  })

  const datesThisWeek = new Set(Object.values(logs).filter(l => l.dateDone && new Date(l.dateDone + 'T00:00:00') >= hace7).map(l => l.dateDone))

  return {
    avgRirThis: rirsThisWeek.length ? rirsThisWeek.reduce((a, b) => a + b, 0) / rirsThisWeek.length : null,
    avgRirLast: rirsLastWeek.length ? rirsLastWeek.reduce((a, b) => a + b, 0) / rirsLastWeek.length : null,
    volChangePct: volLastWeek > 0 ? Math.round(((volThisWeek - volLastWeek) / volLastWeek) * 100) : null,
    sesionesThisWeek: datesThisWeek.size,
    hasData: rirsThisWeek.length > 0,
  }
}

/** Señal de bienestar a partir de los check-ins diarios de readiness (escala 1-5). */
export function computeReadinessSignal(rows: { sleep: number; soreness: number; stress: number; motivation: number }[]): ReadinessSignal {
  if (!rows.length) return { avgSleep: null, avgSoreness: null, avgStress: null, avgMotivation: null, hasData: false }
  const avg = (key: 'sleep' | 'soreness' | 'stress' | 'motivation') => Math.round((rows.reduce((a, r) => a + r[key], 0) / rows.length) * 10) / 10
  return { avgSleep: avg('sleep'), avgSoreness: avg('soreness'), avgStress: avg('stress'), avgMotivation: avg('motivation'), hasData: true }
}

/**
 * Combina ambas señales en un único semáforo de riesgo (estilo ACWR /
 * "training stress" de apps como TrainingPeaks o Whoop, simplificado).
 */
export function combineRisk(training: TrainingSignal, readiness: ReadinessSignal): CombinedRisk {
  let level: RiskLevel = 'bajo'
  const reasons: string[] = []
  const escalate = (next: RiskLevel) => { if (next === 'alto' || level === 'bajo') level = next }

  if (training.avgRirThis !== null && training.avgRirThis <= 1.5) {
    escalate('alto')
    reasons.push('RIR medio muy bajo esta semana (entrenando casi al fallo constantemente)')
  }
  if (training.avgRirThis !== null && training.avgRirLast !== null && training.avgRirThis < training.avgRirLast - 1) {
    escalate('moderado')
    reasons.push('El RIR ha bajado significativamente respecto a la semana anterior (más fatiga acumulada)')
  }
  if (training.volChangePct !== null && training.volChangePct > 30) {
    escalate('moderado')
    reasons.push(`El volumen ha subido un ${training.volChangePct}% respecto a la semana anterior`)
  }
  if (training.sesionesThisWeek >= 6) {
    escalate('moderado')
    reasons.push('6 o más sesiones esta semana sin días claros de descanso')
  }
  if (readiness.avgSleep !== null && readiness.avgSleep <= 2) {
    escalate('alto')
    reasons.push('Sueño deficiente en los últimos días')
  }
  if (readiness.avgSoreness !== null && readiness.avgSoreness <= 2) {
    escalate('moderado')
    reasons.push('Dolor muscular elevado en los check-ins recientes')
  }
  if (readiness.avgMotivation !== null && readiness.avgMotivation <= 2) {
    escalate('moderado')
    reasons.push('Motivación baja en los check-ins recientes')
  }

  return { level, reasons }
}
