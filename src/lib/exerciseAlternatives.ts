import { getMuscleGroup } from '../components/trainer/progreso-tab/helpers'
import { GRUPO_A_ZONA } from './painWarning'

// Patrones de movimiento que cargan directamente cada zona — igual de
// aproximado y deliberadamente conservador que painWarning.ts: mejor
// descartar una alternativa de más que sugerir una que reproduzca la misma
// molestia articular.
// "press" a secas en Hombro/Cuello/Muñeca es intencional: cualquier press
// (militar, con mancuernas, en máquina, tras nuca...) carga el hombro en la
// misma posición de riesgo (abducción + rotación externa bajo carga), así
// que no basta con excluir "press militar" — hay que descartar el patrón de
// empuje vertical entero, no solo una variante concreta.
const ZONA_RIESGO: Record<string, string[]> = {
  'Rodilla':      ['squat', 'sentadilla', 'prensa', 'zancada', 'lunges', 'salto', 'step up', 'pistol'],
  'Hombro':       ['press', 'arnold', 'fondos', 'elevación frontal', 'elevacion frontal'],
  'Espalda baja': ['peso muerto', 'buenos días', 'buenos dias', 'remo pendlay', 'hip thrust', 'sentadilla', 'zancada'],
  'Cadera':       ['sentadilla', 'peso muerto', 'hip thrust', 'zancada', 'lunges'],
  'Codo':         ['curl', 'francés', 'frances', 'extensión', 'extension', 'fondos', 'press banca'],
  'Muñeca':       ['curl', 'press', 'flexiones', 'fondos'],
  'Cuello':       ['press', 'encogimientos'],
  'Tobillo':      ['salto', 'zancada', 'sentadilla', 'gemelo', 'pantorrilla'],
}

export interface AltCandidate { id: string; name: string; category?: string }

/** Zona probable si le duele algo mientras hace este ejercicio — solo para
 * preseleccionar el chip, el cliente puede elegir otra si no acierta. */
export function guessZonaForExercise(exName: string, libraryMap?: Map<string, string>): string | null {
  return GRUPO_A_ZONA[getMuscleGroup(exName, libraryMap)] || null
}

/**
 * Alternativas biomecánicamente equivalentes (mismo grupo muscular, así que
 * el estímulo de entrenamiento se mantiene) y más seguras para la zona con
 * molestia (se excluyen los patrones de movimiento que la cargan
 * directamente) — solo de la biblioteca real del entrenador, para que la
 * sustitución siga contando bien en las estadísticas (grupo muscular,
 * volumen...) en vez de ser texto libre.
 */
export function getSafeAlternatives(
  exName: string, zona: string, library: AltCandidate[], libraryMap?: Map<string, string>
): AltCandidate[] {
  const group = getMuscleGroup(exName, libraryMap)
  const riesgo = ZONA_RIESGO[zona] || []
  const lowerExName = exName.toLowerCase().trim()
  return library.filter(e => {
    const lower = e.name.toLowerCase().trim()
    if (lower === lowerExName) return false
    const eGroup = e.category || getMuscleGroup(e.name, libraryMap)
    if (eGroup !== group) return false
    return !riesgo.some(k => lower.includes(k))
  }).slice(0, 5)
}
