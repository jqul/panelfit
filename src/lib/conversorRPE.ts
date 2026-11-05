// Conversor RPE ↔ RIR ↔ %1RM (página pública /calculadora-rpe-rir). RPE y RIR son la misma escala al revés
// (RPE 8 = 2 repeticiones en reserva). El %1RM se estima con las repeticiones que podrías hacer al fallo
// (las hechas + las de reserva) y la fórmula de Epley ajustada para que 1 repetición al fallo sea el 100 %:
// %1RM = 100 / (1 + (reps + RIR − 1) / 30). Es una estimación: cada persona y cada ejercicio varían algo.

export const RPE_MIN = 5
export const RPE_MAX = 10
export const REPS_MAX = 15

const r1 = (n: number) => Math.round(n * 10) / 10

/** RIR de un RPE (de 5 a 10, de medio en medio). */
export const rirDeRpe = (rpe: number) => r1(Math.min(RPE_MAX, Math.max(RPE_MIN, rpe)) * -1 + 10)
/** RPE de un RIR (de 0 a 5). */
export const rpeDeRir = (rir: number) => r1(10 - Math.min(5, Math.max(0, rir)))

/** % del 1RM con el que harías `reps` dejando `rir` en reserva. */
export function pct1RM(reps: number, rir: number): number | null {
  if (!(reps >= 1 && reps <= REPS_MAX) || !(rir >= 0 && rir <= 5)) return null
  return r1(100 / (1 + (reps + rir - 1) / 30))
}

/** Kilos para esas reps y ese RIR con un 1RM dado, redondeados a 2,5 kg (lo que se puede cargar). */
export function pesoPara(unoRM: number, reps: number, rir: number): number | null {
  const p = pct1RM(reps, rir)
  if (p === null || !(unoRM > 0)) return null
  return Math.round((unoRM * p) / 100 / 2.5) * 2.5
}

/** 1RM estimado a partir de un peso hecho con esas reps y ese RIR. */
export function unoRMDesde(peso: number, reps: number, rir: number): number | null {
  const p = pct1RM(reps, rir)
  if (p === null || !(peso > 0)) return null
  return r1((peso * 100) / p)
}

/** Tabla de %1RM: filas de reps (1..maxReps) y columnas de RPE (10 a 6 de uno en uno). */
export function tablaRPE(maxReps = 10): { reps: number; pcts: { rpe: number; pct: number }[] }[] {
  const rpes = [10, 9, 8, 7, 6]
  return Array.from({ length: maxReps }, (_, i) => ({
    reps: i + 1,
    pcts: rpes.map(rpe => ({ rpe, pct: pct1RM(i + 1, rirDeRpe(rpe))! })),
  }))
}
