// Sustitución guiada de ejercicios. El cliente no "cambia un ejercicio": dice "no puedo hacerlo" y la app le
// propone lo que el entrenador dejó aprobado (su plan B) en vez de dejarle navegar toda la biblioteca.
//
//  · La receta del plan no se toca: lo que hizo el cliente va en el registro (ExerciseLog.sustitucion).
//  · Una alternativa del plan B queda aprobada por el entrenador; una que el cliente elige por su cuenta queda
//    pendiente de revisión, y el entrenador puede aceptarla como alternativa habitual (se añade al plan B).
//  · Con una molestia no se sustituye "a lo loco": con dolor fuerte se recomienda parar y avisar; si el entrenador
//    marcó el ejercicio como "no sustituir por dolor", solo se avisa.
// Esta parte es lo que usa el cliente (propuestas según el motivo); lo que usa el panel del entrenador está en
// sustitucionPlan.ts, que no arrastra la biblioteca. Todo es lógica pura (sin React ni red) para poder probarla.

import type { Exercise, Sustitucion, SustitucionMotivo } from '../types'
import { alternativasMismoGrupo, cargaZona, getSafeAlternatives, type AltCandidate } from './exerciseAlternatives'
import { normNombre, esAlternativaConocida } from './sustitucionPlan'

export * from './sustitucionPlan'

/** Cuántas alternativas se enseñan: pocas y buenas, no una lista. */
export const MAX_OPCIONES = 3
/** Desde esta intensidad (0-10) no se propone sustituir: se recomienda parar y avisar. */
export const INTENSIDAD_PARAR = 7

export type OrigenOpcion = 'plan-b' | 'sugerida' | 'libre'
export interface Opcion { name: string; exerciseId?: string; origen: OrigenOpcion }
export interface DecisionDolor { accion: 'parar' | 'avisar' | 'proponer'; opciones: Opcion[] }

const idEnBiblioteca = (name: string, library: AltCandidate[]) => library.find(l => normNombre(l.name) === normNombre(name))?.id

const delPlanB = (ex: Exercise, library: AltCandidate[], permitida: (name: string) => boolean = () => true): Opcion[] =>
  (ex.alternativas ?? [])
    .filter(a => normNombre(a.name) !== normNombre(ex.name) && permitida(a.name))
    .slice(0, MAX_OPCIONES)
    .map(a => ({ name: a.name, exerciseId: a.exerciseId ?? idEnBiblioteca(a.name, library), origen: 'plan-b' as const }))

/**
 * "Material ocupado": las alternativas que dejó el entrenador para ESTE ejercicio. Si no dejó ninguna, las más
 * parecidas de su biblioteca con el mismo grupo muscular (así la sustitución sigue contando bien en estadísticas).
 */
export function opcionesPorMaterial(ex: Exercise, library: AltCandidate[], libraryMap?: Map<string, string>): Opcion[] {
  const planB = delPlanB(ex, library)
  if (planB.length > 0) return planB
  return alternativasMismoGrupo(ex.name, library, libraryMap, MAX_OPCIONES)
    .map(c => ({ name: c.name, exerciseId: c.id, origen: 'sugerida' as const }))
}

/** "Me molesta": qué hacer según la intensidad, la regla del entrenador y lo que haya de seguro. */
export function decisionPorDolor(ex: Exercise, zona: string, intensidad: number, library: AltCandidate[], libraryMap?: Map<string, string>): DecisionDolor {
  if (intensidad >= INTENSIDAD_PARAR) return { accion: 'parar', opciones: [] }
  if (ex.dolorSinSustituir) return { accion: 'avisar', opciones: [] }
  const planB = delPlanB(ex, library, name => !cargaZona(zona, name))
  const opciones: Opcion[] = planB.length > 0
    ? planB
    : getSafeAlternatives(ex.name, zona, library, libraryMap).slice(0, MAX_OPCIONES).map(c => ({ name: c.name, exerciseId: c.id, origen: 'sugerida' as const }))
  return opciones.length > 0 ? { accion: 'proponer', opciones } : { accion: 'avisar', opciones: [] }
}

export function construirSustitucion(p: {
  ex: Exercise
  performedName: string
  performedExerciseId?: string
  reason: SustitucionMotivo
  origen: OrigenOpcion
  zona?: string
  intensidad?: number
  fecha: string
}): Sustitucion {
  const approvedBy: Sustitucion['approvedBy'] =
    p.origen === 'plan-b' || esAlternativaConocida(p.ex, p.performedName) ? 'entrenador'
    : p.origen === 'libre' ? 'pendiente'
    : 'automatico'
  return {
    performedName: p.performedName.trim(),
    ...(p.performedExerciseId ? { performedExerciseId: p.performedExerciseId } : {}),
    reason: p.reason,
    approvedBy,
    ...(p.zona ? { zona: p.zona } : {}),
    ...(p.intensidad !== undefined ? { intensidad: p.intensidad } : {}),
    fecha: p.fecha,
  }
}
