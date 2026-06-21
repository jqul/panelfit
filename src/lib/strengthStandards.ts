// Estándares de fuerza aproximados (ratio levantamiento/peso corporal) para
// los "big 3". Son aproximaciones orientativas inspiradas en tablas públicas
// de la comunidad de fuerza, no una referencia médica o de competición.
export type LiftKey = 'squat' | 'bench' | 'deadlift'
export type StrengthLevel = 'principiante' | 'novato' | 'intermedio' | 'avanzado' | 'elite'

const LEVELS: StrengthLevel[] = ['principiante', 'novato', 'intermedio', 'avanzado', 'elite']

// Ratio mínimo (1RM / peso corporal) para alcanzar cada nivel
const RATIOS: Record<LiftKey, Record<'m' | 'f', number[]>> = {
  squat:    { m: [0.5, 1.0, 1.5, 2.0, 2.5], f: [0.4, 0.75, 1.1, 1.5, 1.9] },
  bench:    { m: [0.5, 0.75, 1.0, 1.5, 1.75], f: [0.3, 0.5, 0.65, 1.0, 1.25] },
  deadlift: { m: [0.75, 1.25, 1.75, 2.25, 2.75], f: [0.5, 1.0, 1.4, 1.8, 2.2] },
}

const LIFT_KEYWORDS: Record<LiftKey, string[]> = {
  squat: ['sentadilla', 'squat'],
  bench: ['press banca', 'bench', 'press de banca'],
  deadlift: ['peso muerto', 'deadlift'],
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
}
