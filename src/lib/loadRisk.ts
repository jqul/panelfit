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

export interface ACWRSignal {
  acute: number      // tonelaje medio diario, últimos 7 días (incluyendo días de descanso)
  chronic: number     // tonelaje medio diario, últimos 28 días
  ratio: number | null
  hasData: boolean
}

/**
 * Ratio de carga aguda:crónica (ACWR), modelo de Gabbett (2016) sobre el
 * tonelaje (peso × reps) diario. Promedia sobre TODOS los días de la
 * ventana, incluyendo descansos, tal como exige el método original —
 * a diferencia del resto de señales de este fichero, esto no es una
 * heurística: es el cálculo real agudo(7d)/crónico(28d).
 * Zonas: <0.8 desentrenamiento, 0.8–1.3 óptima, 1.3–1.5 moderado, >1.5 alto.
 */
export function computeACWR(logs: TrainingLogs, today: Date = new Date()): ACWRSignal {
  const dayTonnage: Record<string, number> = {}
  Object.values(logs).forEach(log => {
    if (!log.done || !log.dateDone) return
    const vol = Object.values(log.sets || {}).reduce((a, s) => a + ((parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)), 0)
    dayTonnage[log.dateDone] = (dayTonnage[log.dateDone] || 0) + vol
  })

  const avgWindow = (days: number) => {
    let sum = 0
    for (let i = 0; i < days; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i)
      sum += dayTonnage[d.toISOString().slice(0, 10)] || 0
    }
    return sum / days
  }

  const acute = avgWindow(7)
  const chronic = avgWindow(28)
  return {
    acute: Math.round(acute),
    chronic: Math.round(chronic),
    ratio: chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : null,
    hasData: Object.keys(dayTonnage).length > 0,
  }
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
 * Combina la señal de ACWR real, una heurística de RIR/volumen/frecuencia
 * y el bienestar autoinformado en un único semáforo de riesgo.
 */
export function combineRisk(training: TrainingSignal, readiness: ReadinessSignal, acwr?: ACWRSignal): CombinedRisk {
  let level: RiskLevel = 'bajo'
  const reasons: string[] = []
  const escalate = (next: RiskLevel) => { if (next === 'alto' || level === 'bajo') level = next }

  if (acwr?.ratio !== null && acwr?.ratio !== undefined) {
    if (acwr.ratio > 1.5) {
      escalate('alto')
      reasons.push(`Ratio carga aguda:crónica de ${acwr.ratio} (>1.5) — riesgo de lesión elevado según el modelo de Gabbett`)
    } else if (acwr.ratio >= 1.3) {
      escalate('moderado')
      reasons.push(`Ratio carga aguda:crónica de ${acwr.ratio} (1.3–1.5) — zona de precaución`)
    } else if (acwr.ratio < 0.8 && acwr.chronic > 0) {
      escalate('moderado')
      reasons.push(`Ratio carga aguda:crónica de ${acwr.ratio} (<0.8) — desentrenamiento, una vuelta brusca a la carga habitual también eleva el riesgo`)
    }
  }

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
