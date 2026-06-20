// Cálculos de fuerza: 1RM estimado y autoregulación por RIR
// (inspirado en el motor de autoregulación de JuggernautAI / RP Hypertrophy App)

/** 1RM estimado con la fórmula de Epley. Solo fiable hasta ~10 reps. */
export function estimate1RM(weight: number, reps: number): number {
  if (!weight || !reps || reps < 1) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

/** RPE objetivo (string '@7', '@8.5'...) a RIR objetivo equivalente (10 - RPE). */
export function rpeToTargetRIR(rpe?: string): number | null {
  if (!rpe) return null
  const m = rpe.match(/@?\s*(\d+(\.\d+)?)/)
  if (!m) return null
  const val = parseFloat(m[1])
  if (Number.isNaN(val) || val < 1 || val > 10) return null
  return Math.max(0, 10 - val)
}

export interface LoadSuggestion {
  direction: 'up' | 'down' | 'hold'
  deltaKg: number
  reason: string
}

/**
 * Sugerencia de carga para la próxima sesión comparando el RIR real
 * reportado contra el RIR objetivo de la semana (derivado del RPE planificado).
 * Mismo principio que la autoregulación de JuggernautAI: si sobró margen,
 * sube; si faltó margen (RIR real menor de lo esperado), baja o mantiene.
 */
export function suggestNextLoad(lastWeight: number, actualRIR: number, targetRIR: number): LoadSuggestion {
  const diff = actualRIR - targetRIR
  if (!lastWeight) return { direction: 'hold', deltaKg: 0, reason: 'Sin datos de peso previo' }
  if (diff >= 2) {
    return { direction: 'up', deltaKg: round(lastWeight * 0.05), reason: `Sobraron ${diff} reps de margen — sube la carga` }
  }
  if (diff <= -2) {
    return { direction: 'down', deltaKg: round(lastWeight * 0.05), reason: `Llegaste más cerca del fallo de lo previsto — baja la carga` }
  }
  if (diff === 1) {
    return { direction: 'up', deltaKg: round(lastWeight * 0.025), reason: 'Margen ligeramente por encima del objetivo' }
  }
  if (diff === -1) {
    return { direction: 'hold', deltaKg: 0, reason: 'Margen ligeramente por debajo del objetivo' }
  }
  return { direction: 'hold', deltaKg: 0, reason: 'En el objetivo de esfuerzo planificado' }
}

function round(n: number): number {
  return Math.round(n * 2) / 2 // redondea a 0.5kg
}

/**
 * Programación por %1RM (estilo JuggernautAI/RP): si el campo de peso del
 * ejercicio es un porcentaje ("75%"), calcula el peso objetivo real a
 * partir del mejor 1RM estimado histórico del cliente para ese ejercicio.
 */
export function parsePercentWeight(weightField: string): number | null {
  const m = weightField?.trim().match(/^(\d{1,3}(?:\.\d+)?)\s*%$/)
  if (!m) return null
  const pct = parseFloat(m[1])
  if (pct <= 0 || pct > 100) return null
  return pct
}

export function resolveWeightFromPercent(weightField: string, estimated1RM: number): number | null {
  const pct = parsePercentWeight(weightField)
  if (pct === null || !estimated1RM) return null
  return round(estimated1RM * (pct / 100))
}
