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

// ── VBT (Velocity Based Training) ─────────────────────────
// Umbral de velocidad mínima (MVT) al que se llega al fallo/1RM en press de
// banca, sentadilla o peso muerto con barra — valor orientativo consensuado
// en la literatura de VBT (González-Badillo, Jovanović & Flanagan), no una
// medición individual. Se usa como ancla para extrapolar el 1RM a partir del
// perfil carga-velocidad REAL del cliente, no de una curva poblacional genérica.
export const DEFAULT_MVT = 0.2 // m/s

export interface VelocityPoint { weight: number; velocity: number }

export interface VelocityProfile {
  oneRM: number | null       // 1RM estimado extrapolando la recta hasta el MVT
  slope: number | null       // kg por cada m/s de velocidad — cuanto más pronunciado, más "explosivo" el perfil
  points: number             // nº de cargas distintas usadas para el ajuste
}

/**
 * Ajusta una recta peso = a + b·velocidad por mínimos cuadrados sobre el
 * historial REAL de (peso, velocidad) del cliente para un ejercicio, y
 * extrapola el 1RM del día como el peso correspondiente al MVT. Requiere al
 * menos 2 cargas distintas — con una sola serie no hay recta que ajustar, y
 * es preferible no estimar nada a inventar un número con un solo punto.
 */
export function estimateVelocityProfile(rawPoints: VelocityPoint[], mvt = DEFAULT_MVT): VelocityProfile {
  // Si hay varias series a la misma carga, nos quedamos con la velocidad
  // media de esa carga — cada carga cuenta una vez en el ajuste, no una vez
  // por serie repetida.
  const byWeight = new Map<number, number[]>()
  rawPoints.forEach(p => {
    if (!p.weight || !p.velocity || p.velocity <= 0) return
    const arr = byWeight.get(p.weight) || []
    arr.push(p.velocity)
    byWeight.set(p.weight, arr)
  })
  const points = [...byWeight.entries()].map(([weight, vs]) => ({
    weight, velocity: vs.reduce((a, b) => a + b, 0) / vs.length,
  }))

  if (points.length < 2) return { oneRM: null, slope: null, points: points.length }

  const n = points.length
  const sumV = points.reduce((a, p) => a + p.velocity, 0)
  const sumW = points.reduce((a, p) => a + p.weight, 0)
  const sumVV = points.reduce((a, p) => a + p.velocity * p.velocity, 0)
  const sumVW = points.reduce((a, p) => a + p.velocity * p.weight, 0)
  const denom = n * sumVV - sumV * sumV
  if (denom === 0) return { oneRM: null, slope: null, points: n }

  const b = (n * sumVW - sumV * sumW) / denom // pendiente (kg por m/s)
  const a = (sumW - b * sumV) / n             // intersección (peso a velocidad 0)
  const oneRM = a + b * mvt

  return { oneRM: oneRM > 0 ? round(oneRM) : null, slope: Math.round(b * 10) / 10, points: n }
}

/** % de caída de velocidad de una serie frente a la primera de ese ejercicio
 * en la sesión — para cortar la serie por fatiga neuromuscular (VBT). */
export function velocityLossPct(currentVelocity: number, firstVelocity: number): number | null {
  if (!firstVelocity || firstVelocity <= 0 || !currentVelocity) return null
  return Math.round((1 - currentVelocity / firstVelocity) * 1000) / 10
}

/**
 * Autorregulación por velocidad: compara el 1RM estimado por velocidad DE HOY
 * (con las series que ya lleva hechas en esta sesión) contra su mejor 1RM por
 * velocidad de sesiones anteriores. Si hoy sale claramente por debajo, el
 * sistema nervioso no está respondiendo igual que otros días — mejor bajar el
 * peso de las series que quedan que forzar la carga prescrita a una velocidad
 * que no le corresponde hoy. Si sale por encima, hay margen para apretar más.
 * Umbral del 10%: por debajo de eso es ruido de medición normal, no fatiga
 * real (el propio error de estimar 1RM por regresión ya anda por ese orden).
 * Mismo formato de salida que getSuggestedWeightChange para reusar el mismo
 * badge en la UI.
 */
export function getVbtSuggestedWeightChange(
  todayOneRM: number | null,
  historicalBestOneRM: number | null,
  nextWeight?: number
): { pct: number; label: string; color: string; direction: 'up' | 'down' | 'hold'; deltaKg: number } | null {
  if (!todayOneRM || !historicalBestOneRM) return null
  const diffPct = Math.round(((todayOneRM - historicalBestOneRM) / historicalBestOneRM) * 100)
  const weight = nextWeight || 0
  if (Math.abs(diffPct) < 10) {
    return { pct: 0, label: 'Velocidad normal para ti — mantener', color: '#6366f1', direction: 'hold', deltaKg: 0 }
  }
  const direction = diffPct < 0 ? 'down' : 'up'
  const deltaKg = weight ? Math.round(Math.abs(weight * (diffPct / 100)) * 2) / 2 : 0
  const label = direction === 'down'
    ? `SNC fatigado hoy (${diffPct}%) — bajar${deltaKg ? ` ${deltaKg}kg` : ' peso'}`
    : `Vas rápido hoy (+${diffPct}%) — puedes subir${deltaKg ? ` ${deltaKg}kg` : ''}`
  const color = direction === 'down' ? '#ef4444' : '#22c55e'
  return { pct: diffPct, label, color, direction, deltaKg }
}
