import { getMuscleGroup } from '../components/trainer/progreso-tab/helpers'
import { useRecentPainZonas } from './clientPain'

// Puente entre el grupo muscular (helpers.tsx, ya usado para el volumen
// semanal) y la zona de dolor (clientPain.ts) — aproximado a propósito: mejor
// un aviso de más que uno de menos en algo tan sensible como una lesión.
const GRUPO_A_ZONA: Record<string, string> = {
  'Piernas': 'Rodilla', 'Hombros': 'Hombro', 'Espalda': 'Espalda baja', 'Glúteos': 'Cadera',
  'Bíceps': 'Codo', 'Tríceps': 'Codo',
}

/**
 * Molestia articular activa (últimos 7 días) del cliente que trabaje la misma
 * zona que un ejercicio dado — usado tanto en TrainingPlanEditor (ejercicios
 * ya en el plan) como en ExercisePicker (antes de añadir uno nuevo).
 */
export function usePainWarning(clientId?: string, libraryMap?: Map<string, string>) {
  const zonasConDolor = useRecentPainZonas(clientId)
  return (exName: string): string | null => {
    if (zonasConDolor.size === 0) return null
    const zona = GRUPO_A_ZONA[getMuscleGroup(exName, libraryMap)]
    return zona && zonasConDolor.has(zona) ? zona : null
  }
}
