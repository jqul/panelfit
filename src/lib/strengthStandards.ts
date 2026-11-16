// Estándares de fuerza aproximados (ratio levantamiento/peso corporal) para
// los "big 3". Son aproximaciones orientativas inspiradas en tablas públicas
// de la comunidad de fuerza, no una referencia médica o de competición.
export type LiftKey = 'squat' | 'bench' | 'deadlift' | 'press'
export type StrengthLevel = 'principiante' | 'novato' | 'intermedio' | 'avanzado' | 'elite'

const LEVELS: StrengthLevel[] = ['principiante', 'novato', 'intermedio', 'avanzado', 'elite']

// Ratio mínimo (1RM / peso corporal) para alcanzar cada nivel
const RATIOS: Record<LiftKey, Record<'m' | 'f', number[]>> = {
  squat:    { m: [0.5, 1.0, 1.5, 2.0, 2.5], f: [0.4, 0.75, 1.1, 1.5, 1.9] },
  bench:    { m: [0.5, 0.75, 1.0, 1.5, 1.75], f: [0.3, 0.5, 0.65, 1.0, 1.25] },
  deadlift: { m: [0.75, 1.25, 1.75, 2.25, 2.75], f: [0.5, 1.0, 1.4, 1.8, 2.2] },
  press:    { m: [0.35, 0.55, 0.75, 1.0, 1.25], f: [0.2, 0.35, 0.5, 0.7, 0.85] },
}

const LIFT_KEYWORDS: Record<LiftKey, string[]> = {
  squat: ['sentadilla', 'squat'],
  bench: ['press banca', 'bench', 'press de banca'],
  deadlift: ['peso muerto', 'deadlift'],
  press: ['press militar', 'press de hombro', 'press hombro', 'overhead press', 'ohp'],
}

export function matchLiftKey(exerciseName: string): LiftKey | null {
  const lower = exerciseName.toLowerCase()
  for (const [key, kws] of Object.entries(LIFT_KEYWORDS)) {
    if (kws.some(k => lower.includes(k))) return key as LiftKey
  }
  return null
}

export interface StrengthStandardResult {
  level: StrengthLevel
  ratio: number
  nextLevel: StrengthLevel | null
  progressToNext: number // 0-1
  kgToNext: number | null
}

export function getStrengthStandard(lift: LiftKey, oneRM: number, bodyweightKg: number, sex: 'm' | 'f'): StrengthStandardResult | null {
  if (!oneRM || !bodyweightKg) return null
  const thresholds = RATIOS[lift][sex]
  const ratio = oneRM / bodyweightKg

  // thresholds[i] = ratio mínimo para alcanzar LEVELS[i]. Buscamos el nivel
  // más alto ya alcanzado; por debajo del primer umbral se sigue mostrando
  // como "principiante" (nivel base) con progreso hacia "novato".
  let levelIdx = -1
  for (let i = 0; i < thresholds.length; i++) {
    if (ratio >= thresholds[i]) levelIdx = i
  }
  const level = LEVELS[Math.max(levelIdx, 0)]
  const nextLevel = levelIdx < LEVELS.length - 1 ? LEVELS[levelIdx + 1] : null
  const prevThreshold = levelIdx >= 0 ? thresholds[levelIdx] : 0
  const nextThreshold = nextLevel ? thresholds[levelIdx + 1] : thresholds[thresholds.length - 1]
  const progressToNext = nextLevel ? Math.max(0, Math.min(1, (ratio - prevThreshold) / (nextThreshold - prevThreshold))) : 1
  const kgToNext = nextLevel ? Math.max(0, Math.round((nextThreshold * bodyweightKg - oneRM) * 10) / 10) : null

  return { level, ratio: Math.round(ratio * 100) / 100, nextLevel, progressToNext, kgToNext }
}

export const LEVEL_LABELS: Record<StrengthLevel, { emoji: string; color: string }> = {
  principiante: { emoji: '🌱', color: '#94a3b8' },
  novato: { emoji: '🔵', color: '#3b82f6' },
  intermedio: { emoji: '🟢', color: '#22c55e' },
  avanzado: { emoji: '🟠', color: '#f59e0b' },
  elite: { emoji: '🏆', color: '#ef4444' },
}

export const LIFT_LABELS: Record<LiftKey, string> = {
  squat: 'Sentadilla',
  bench: 'Press banca',
  deadlift: 'Peso muerto',
  press: 'Press militar',
}

/** Los kilos de 1RM que marcan cada nivel para un peso corporal: la escala completa, para la calculadora pública. */
export function umbralesKg(lift: LiftKey, bodyweightKg: number, sex: 'm' | 'f'): { level: StrengthLevel; kg: number }[] {
  if (!bodyweightKg) return []
  return RATIOS[lift][sex].map((r, i) => ({ level: LEVELS[i], kg: Math.round(r * bodyweightKg * 2) / 2 }))
}

/** Nota de fuerza de 0 a 100 de un levantamiento: cada nivel son 20 puntos y dentro de él se reparte según el ratio
 * (0 = nada, 20 = principiante, 40 = novato, 60 = intermedio, 80 = avanzado, 100 = élite). */
export function puntuacionFuerza(lift: LiftKey, oneRM: number, bodyweightKg: number, sex: 'm' | 'f'): number | null {
  if (!oneRM || !bodyweightKg) return null
  const t = RATIOS[lift][sex]
  const ratio = oneRM / bodyweightKg
  const puntos = [0, ...t]
  for (let i = 1; i < puntos.length; i++) {
    if (ratio < puntos[i]) return Math.round(20 * (i - 1) + 20 * (ratio - puntos[i - 1]) / (puntos[i] - puntos[i - 1]))
  }
  return 100
}

/** Nota global (media de los levantamientos con dato) y si hay uno muy por detrás del mejor (20 puntos o más). */
export function equilibrioFuerza(notas: Partial<Record<LiftKey, number>>): { global: number; flojo: LiftKey | null; fuerte: LiftKey | null; diferencia: number } | null {
  const e = (Object.entries(notas) as [LiftKey, number][]).filter(([, v]) => typeof v === 'number')
  if (!e.length) return null
  const global = Math.round(e.reduce((s, [, v]) => s + v, 0) / e.length)
  const orden = [...e].sort((a, b) => a[1] - b[1])
  const diferencia = orden[orden.length - 1][1] - orden[0][1]
  return e.length >= 2 && diferencia >= 20
    ? { global, flojo: orden[0][0], fuerte: orden[orden.length - 1][0], diferencia }
    : { global, flojo: null, fuerte: null, diferencia }
}
