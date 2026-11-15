import type { TrainingLogs, TrainingPlan } from '../types'
import { historialPorEjercicio } from './historialEjercicio'
import { estaEstancado } from './revisionBloque'

// Dos avisos tempranos para la Bandeja, antes de que el problema sea grande:
//  - Estancamiento: ejercicios cuyo 1RM estimado lleva 3 sesiones sin superar lo de antes (lib/revisionBloque), entre
//    los entrenados en las últimas 3 semanas. Toca cambiar la variante o meter una descarga.
//  - Abandono por tendencia: entrena cada semana menos durante 3 semanas seguidas (p. ej. 3 → 2 → 1). Llega antes que
//    el aviso de "días sin entrenar", que solo salta cuando ya lo ha dejado. Puro, para probarlo.

/** Ejercicios estancados entre los entrenados desde `desde` ('YYYY-MM-DD'). */
export function ejerciciosEstancados(logs: TrainingLogs, plan: TrainingPlan | null | undefined, desde: string): string[] {
  return historialPorEjercicio(logs, plan)
    .filter(h => h.sesiones[0]?.date >= desde && estaEstancado(h.sesiones))
    .map(h => h.name)
}

/** Días entrenados en cada una de las últimas `n` semanas (de lunes a domingo), de la más antigua a la actual. */
export function diasPorSemana(fechas: string[], hoy: string, n = 4): number[] {
  const d = new Date(hoy + 'T12:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // lunes de esta semana
  const lunes: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d); x.setDate(d.getDate() - 7 * i)
    lunes.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`)
  }
  const dias = new Set(fechas)
  return lunes.map((l, i) => [...dias].filter(f => f >= l && (i === lunes.length - 1 ? f <= hoy : f < lunes[i + 1])).length)
}

/** Cada semana menos durante 3 semanas COMPLETAS seguidas (sin contar la actual, que aún no ha acabado), y al menos la
 * mitad que al principio. Devuelve la serie (p. ej. [3, 2, 1]) o null. */
export function tendenciaAbandono(fechas: string[], hoy: string): number[] | null {
  const s = diasPorSemana(fechas, hoy, 4).slice(0, 3) // las tres semanas completas anteriores
  if (s[0] < 2) return null
  const baja = s[1] < s[0] && s[2] < s[1]
  return baja && s[2] <= s[0] / 2 ? s : null
}
