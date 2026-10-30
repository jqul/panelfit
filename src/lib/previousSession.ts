import { TrainingLogs, ExerciseLog, WeekPlan } from '../types'

/**
 * La sesión anterior MÁS RECIENTE del mismo hueco del plan (mismo día de la
 * semana y misma posición, otra semana). Antes se cogía la primera que saliera
 * al recorrer las claves, que es la más antigua: el "anterior" y las
 * recomendaciones por RIR se calculaban con una sesión de hace semanas.
 */
export function latestPreviousLog(logs: TrainingLogs, pattern: { test(key: string): boolean }, excludeKey: string): ExerciseLog | null {
  let best: ExerciseLog | null = null
  for (const [k, l] of Object.entries(logs)) {
    if (k === excludeKey || !pattern.test(k) || !l.dateDone) continue
    if (!best || l.dateDone > best.dateDone!) best = l
  }
  return best
}

const norm = (s?: string) => (s || '').trim().toLowerCase()

/**
 * Qué registros son «este mismo ejercicio» en otras semanas: el mismo día de la semana y el MISMO NOMBRE en el plan.
 * Los registros se indexan por posición (ex_w{semana}_d{día}_r{posición}), y la posición solo sirve de referencia
 * mientras la estructura no cambia entre semanas: si una semana lleva filas nuevas (p. ej. «Sentadilla pesada ·
 * series de bajada» detrás del top set), la posición 1 pasa a ser otro ejercicio y la «última vez», los récords y la
 * recomendación por RIR se calcularían con las series de otro. Un ejercicio sin historial con su nombre simplemente
 * no tiene «última vez». Si el plan no trae ese ejercicio (datos incompletos), se vuelve a la posición de siempre.
 */
export function mismoEjercicioEnOtrasSemanas(weeks: WeekPlan[] | undefined, weekIdx: number, dayIdx: number, ri: number): { test(key: string): boolean } {
  const nombre = norm(weeks?.[weekIdx]?.days?.[dayIdx]?.exercises?.[ri]?.name)
  if (!nombre) return new RegExp(`^ex_w\\d+_d${dayIdx}_r${ri}$`)
  return {
    test(key: string) {
      const m = /^ex_w(\d+)_d(\d+)_r(\d+)$/.exec(key)
      if (!m || Number(m[2]) !== dayIdx) return false
      return norm(weeks?.[Number(m[1])]?.days?.[dayIdx]?.exercises?.[Number(m[3])]?.name) === nombre
    },
  }
}
