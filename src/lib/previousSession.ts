import { TrainingLogs, ExerciseLog } from '../types'

/**
 * La sesión anterior MÁS RECIENTE del mismo hueco del plan (mismo día de la
 * semana y misma posición, otra semana). Antes se cogía la primera que saliera
 * al recorrer las claves, que es la más antigua: el "anterior" y las
 * recomendaciones por RIR se calculaban con una sesión de hace semanas.
 */
export function latestPreviousLog(logs: TrainingLogs, pattern: RegExp, excludeKey: string): ExerciseLog | null {
  let best: ExerciseLog | null = null
  for (const [k, l] of Object.entries(logs)) {
    if (k === excludeKey || !pattern.test(k) || !l.dateDone) continue
    if (!best || l.dateDone > best.dateDone!) best = l
  }
  return best
}
