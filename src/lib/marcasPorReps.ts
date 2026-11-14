import type { SesionEjercicio } from './historialEjercicio'

// Mejores marcas por número de repeticiones (de 1 a 12, como en las apps de fuerza): para cada N, lo más pesado que ha
// movido en una serie de N repeticiones o más, con su fecha. Sale del historial de un ejercicio (lib/historialEjercicio).
// Puro, para probarlo.

export interface MarcaReps { reps: number; kg: number; fecha: string }

export function marcasPorReps(sesiones: SesionEjercicio[], max = 12, desde?: string): MarcaReps[] {
  const out: MarcaReps[] = []
  for (let n = 1; n <= max; n++) {
    let mejor: MarcaReps | null = null
    for (const s of sesiones) {
      if (desde && s.date < desde) continue
      for (const x of s.series) {
        if (x.weight > 0 && x.reps >= n && (!mejor || x.weight > mejor.kg || (x.weight === mejor.kg && s.date < mejor.fecha))) mejor = { reps: n, kg: x.weight, fecha: s.date }
      }
    }
    if (mejor) out.push(mejor)
  }
  return out
}
