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

// ── RIR (Repeticiones en Reserva) ─────────────────────────
// 0 = al fallo, 1-2 = casi al fallo, 3-4 = moderado, 5+ = fácil
export const RIR_OPTIONS = [
  { value: 0, label: '0', desc: 'Al fallo', color: '#ef4444' },
  { value: 1, label: '1', desc: 'Casi al fallo', color: '#f97316' },
  { value: 2, label: '2', desc: 'Muy duro', color: '#f59e0b' },
  { value: 3, label: '3', desc: 'Duro', color: '#eab308' },
  { value: 4, label: '4', desc: 'Moderado', color: '#84cc16' },
  { value: 5, label: '5+', desc: 'Fácil', color: '#22c55e' },
]

/**
 * Sugerencia de peso para un set concreto, comparando el RIR real reportado
 * la última vez que se hizo este mismo ejercicio/serie contra el RIR
 * objetivo de la semana (derivado del RPE planificado). Mismo principio de
 * autoregulación que JuggernautAI: si sobró margen, sube; si faltó margen,
 * baja o mantiene. Se muestra junto al peso, antes de hacer la serie.
 */
export function getSuggestedWeightChange(rir: number | undefined, prevWeight?: string, weekRpe?: string): { pct: number; label: string; color: string; direction: 'up' | 'down' | 'hold'; deltaKg: number } | null {
  if (rir === undefined || rir === null) return null

  const targetRIR = rpeToTargetRIR(weekRpe)
  const weight = parseFloat(prevWeight || '')
  if (targetRIR !== null && weight) {
    const s = suggestNextLoad(weight, rir, targetRIR)
    const color = s.direction === 'up' ? '#22c55e' : s.direction === 'down' ? '#ef4444' : '#f59e0b'
    const label = s.direction === 'up' ? `Subir +${s.deltaKg}kg` : s.direction === 'down' ? `Bajar -${s.deltaKg}kg` : 'Mantener peso'
    return { pct: s.direction === 'up' ? 5 : s.direction === 'down' ? -5 : 0, label, color, direction: s.direction, deltaKg: s.deltaKg }
  }

  if (rir <= 1) return { pct: -5, label: 'Bajar peso la próxima', color: '#ef4444', direction: 'down', deltaKg: weight ? Math.round(weight * 0.05 * 2) / 2 : 0 }
  if (rir <= 2) return { pct: 0, label: 'Mantener peso', color: '#f59e0b', direction: 'hold', deltaKg: 0 }
  if (rir <= 3) return { pct: 2.5, label: 'Subir ligero', color: '#84cc16', direction: 'up', deltaKg: weight ? Math.round(weight * 0.025 * 2) / 2 : 0 }
  return { pct: 5, label: 'Subir peso', color: '#22c55e', direction: 'up', deltaKg: weight ? Math.round(weight * 0.05 * 2) / 2 : 0 }
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
