// Esfuerzo (RPE) de las series según el papel del ejercicio (competición, variante, accesorio). Un RPE medio de toda la
// semana mezcla un single pesado con series de hipertrofia y no dice nada, así que se separa por papel y se enseña la
// distribución además de la media. El esfuerzo se guarda como RIR (RPE = 10 − RIR, lib/escalaEsfuerzo).
//
// Si el ejercicio tenía un RIR objetivo en el plan (lib/rirTarget), también se mide cuánto se desvió el esfuerzo real del
// previsto: lo que importa para decidir no es «RPE 9», sino «RPE 9 cuando tocaba 7». Se compara con el centro del rango.

import type { TipoSerie } from './tipoSerie'
import type { RirTarget } from './rirTarget'

export interface SerieEsfuerzo { rir?: number; tipo?: TipoSerie; objetivo?: RirTarget | null }

export const CUBOS_RPE = ['hasta6', '7', '8', '9', '10'] as const
export type CuboRpe = typeof CUBOS_RPE[number]
export const ETIQUETA_CUBO: Record<CuboRpe, string> = { hasta6: '≤ 6', '7': '7', '8': '8', '9': '9', '10': '10' }

export interface ResumenEsfuerzo {
  /** Series hechas con datos de esfuerzo (con RIR apuntado, o marcadas «al fallo»). */
  conEsfuerzo: number
  rpeMedio: number | null
  rpeMax: number | null
  distribucion: Record<CuboRpe, number>
  /** Series con RIR objetivo en el plan, y cuánto se desvió de él por término medio (RPE real − RPE previsto). */
  conObjetivo: number
  desvioMedio: number | null
}

export const resumenVacio = (): ResumenEsfuerzo => ({ conEsfuerzo: 0, rpeMedio: null, rpeMax: null, distribucion: { hasta6: 0, '7': 0, '8': 0, '9': 0, '10': 0 }, conObjetivo: 0, desvioMedio: null })

/** RPE de una serie, o null si no hay dato: RIR apuntado, o «al fallo» sin RIR (RPE 10). Calentamiento nunca. */
export function rpeDeSerie(s: SerieEsfuerzo): number | null {
  if (s.tipo === 'calentamiento') return null
  if (typeof s.rir === 'number' && Number.isFinite(s.rir) && s.rir >= 0) return Math.min(10, Math.max(1, 10 - s.rir))
  return s.tipo === 'fallo' ? 10 : null
}

export function cuboDe(rpe: number): CuboRpe {
  const r = Math.round(rpe)
  return r <= 6 ? 'hasta6' : r >= 10 ? '10' : (String(r) as CuboRpe)
}

/** Resume el esfuerzo de un conjunto de series (de una semana y un papel, por ejemplo). */
export function resumirEsfuerzo(series: SerieEsfuerzo[]): ResumenEsfuerzo {
  const r = resumenVacio()
  let suma = 0, sumaDesvio = 0
  for (const s of series) {
    const rpe = rpeDeSerie(s)
    if (rpe === null) continue
    r.conEsfuerzo++
    suma += rpe
    r.rpeMax = r.rpeMax === null ? rpe : Math.max(r.rpeMax, rpe)
    r.distribucion[cuboDe(rpe)]++
    if (s.objetivo) {
      // RIR objetivo 2-3 ⇒ RPE previsto 7-8: se compara con el centro (7,5)
      const previsto = 10 - (s.objetivo.min + s.objetivo.max) / 2
      r.conObjetivo++
      sumaDesvio += rpe - previsto
    }
  }
  if (r.conEsfuerzo) r.rpeMedio = suma / r.conEsfuerzo
  if (r.conObjetivo) r.desvioMedio = sumaDesvio / r.conObjetivo
  return r
}

/** Suma varios resúmenes (para juntar semanas en un bloque). La media se pondera por el número de series. */
export function juntarResumenes(rs: ResumenEsfuerzo[]): ResumenEsfuerzo {
  const out = resumenVacio()
  let suma = 0, sumaDesvio = 0
  for (const r of rs) {
    out.conEsfuerzo += r.conEsfuerzo
    out.conObjetivo += r.conObjetivo
    if (r.rpeMedio !== null) suma += r.rpeMedio * r.conEsfuerzo
    if (r.desvioMedio !== null) sumaDesvio += r.desvioMedio * r.conObjetivo
    if (r.rpeMax !== null) out.rpeMax = out.rpeMax === null ? r.rpeMax : Math.max(out.rpeMax, r.rpeMax)
    for (const c of CUBOS_RPE) out.distribucion[c] += r.distribucion[c]
  }
  if (out.conEsfuerzo) out.rpeMedio = suma / out.conEsfuerzo
  if (out.conObjetivo) out.desvioMedio = sumaDesvio / out.conObjetivo
  return out
}

/** Diferencia de RPE medio entre dos bloques (actual − anterior), o null si a alguno le falta el dato. */
export const cambioRpe = (actual: ResumenEsfuerzo, anterior: ResumenEsfuerzo): number | null =>
  actual.rpeMedio !== null && anterior.rpeMedio !== null ? actual.rpeMedio - anterior.rpeMedio : null
