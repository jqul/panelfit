// Cuánto dura una sesión y qué cabe si hay poco tiempo. Sin React ni fechas: se puede probar.
// Los descansos son los mismos que usa el entreno en vivo (ActiveWorkout): el del ejercicio, o el del plan según sea
// principal o accesorio.

import type { Exercise, TrainingPlan } from '../types'

const SEG_POR_SERIE = 40 // lo que se tarda en hacer una serie, sin contar el descanso

type Reglas = Pick<TrainingPlan, 'restMain' | 'restAcc'>

const numSeries = (ex: Pick<Exercise, 'sets'>) => {
  const m = ex.sets?.match(/(\d+)[×x](\d+)/)
  return m ? parseInt(m[1]) : 3
}

const descansoEntreSeries = (ex: Exercise, plan?: Partial<Reglas>) =>
  ex.restSets ?? (ex.isMain ? (plan?.restMain || 180) : (plan?.restAcc || 90))

/** Segundos de un ejercicio: series, descansos entre ellas y el de después (`restAfter`, o el mismo si no hay). */
export function segundosDeEjercicio(ex: Exercise, plan?: Partial<Reglas>, enSuperserie = false): number {
  const series = numSeries(ex)
  const trabajo = series * SEG_POR_SERIE
  if (enSuperserie) return trabajo // el descanso lo lleva el primero del grupo
  const descanso = descansoEntreSeries(ex, plan)
  return trabajo + Math.max(0, series - 1) * descanso + (ex.restAfter ?? descanso)
}

/** Segundos de cada ejercicio de la lista; en una superserie solo el primero lleva el descanso. */
function segundosPorEjercicio(exercises: Exercise[], plan?: Partial<Reglas>): number[] {
  const vistos = new Set<string>()
  return exercises.map(ex => {
    const enGrupo = !!ex.supersetId && vistos.has(ex.supersetId)
    if (ex.supersetId) vistos.add(ex.supersetId)
    return segundosDeEjercicio(ex, plan, enGrupo)
  })
}

const aMinutos = (seg: number) => Math.max(5, Math.round(seg / 60 / 5) * 5)

/** Minutos de la sesión, redondeados a 5: una cifra que no promete lo que no puede. */
export function estimarMinutos(exercises: Exercise[], plan?: Partial<Reglas>): number {
  if (exercises.length === 0) return 0
  return aMinutos(segundosPorEjercicio(exercises, plan).reduce((a, b) => a + b, 0))
}

export interface VersionCorta {
  /** Posiciones (en el plan) de lo que cabe, en orden. */
  hacer: number[]
  /** Posiciones de lo que se queda fuera: siempre el final de la sesión, salvo los principales. */
  omitir: number[]
  minutos: number
}

/** Qué hacer con `presupuestoMin` minutos: los principales siempre, y los demás en orden hasta donde llegue el tiempo. */
export function versionCorta(exercises: Exercise[], plan: Partial<Reglas> | undefined, presupuestoMin: number): VersionCorta {
  const seg = segundosPorEjercicio(exercises, plan)
  const presupuesto = presupuestoMin * 60
  const hacer = new Set<number>()
  let usado = 0
  exercises.forEach((ex, i) => { if (ex.isMain) { hacer.add(i); usado += seg[i] } })
  let cortado = false
  exercises.forEach((ex, i) => {
    if (ex.isMain || cortado) return
    if (usado + seg[i] <= presupuesto) { hacer.add(i); usado += seg[i] } else cortado = true // a partir de aquí, nada más
  })
  const lista = [...hacer].sort((a, b) => a - b)
  return { hacer: lista, omitir: exercises.map((_, i) => i).filter(i => !hacer.has(i)), minutos: aMinutos(usado) }
}

/** Presupuestos que se ofrecen: los que dejan fuera algo de verdad (si cabe entero, no hace falta). */
export function presupuestosUtiles(exercises: Exercise[], plan?: Partial<Reglas>): number[] {
  const total = estimarMinutos(exercises, plan)
  return [30, 45, 60].filter(p => p + 5 <= total)
}
