// Exposición a cargas altas: cuántas repeticiones se hacen por encima de un % del 1RM estimado (70, 80 y 90 %).
// Dos semanas con las mismas series pueden ser muy distintas si en una se levanta pesado y en la otra no: contar solo
// series no lo distingue (sobre todo en un taper, donde el volumen baja pero la intensidad se mantiene).
//
// El 1RM de referencia es el de CADA sesión, no el actual aplicado hacia atrás: así un entreno de hace tres meses se
// juzga con lo que el levantador era entonces. Se toma el mejor 1RM estimado de las series hechas en las 8 semanas
// anteriores a la sesión (sin contar la propia); si no hay ninguna, la propia sesión se compara consigo misma y se avisa.
// Para los levantamientos se usa el de competición y, si no hay, el de sus variantes. Es una estimación: Epley ajustado
// por el RIR apuntado, y solo fiable hasta ~10 repeticiones hasta el fallo.

export const UMBRALES = [70, 80, 90] as const
export type Umbral = typeof UMBRALES[number]
export const VENTANA_REFERENCIA_DIAS = 56
export const MAX_REPS_FIABLES = 10

export interface SerieHecha { weight: number; reps: number; rir?: number }
export interface SesionLevantamiento {
  fecha: string                          // YYYY-MM-DD
  papel: 'competicion' | 'variante'
  series: SerieHecha[]
}

/** 1RM estimado de una serie (Epley sobre las repeticiones hasta el fallo: reps + RIR). 0 si no es fiable. */
export function e1rmDeSerie(s: SerieHecha): number {
  if (!(s.weight > 0) || !(s.reps >= 1)) return 0
  const hastaFallo = s.reps + (typeof s.rir === 'number' && s.rir >= 0 ? s.rir : 0)
  if (hastaFallo > MAX_REPS_FIABLES) return 0
  return hastaFallo === 1 ? s.weight : s.weight * (1 + hastaFallo / 30)
}

const mejorE1rm = (series: SerieHecha[]) => series.reduce((m, s) => Math.max(m, e1rmDeSerie(s)), 0)

const dia = (iso: string) => Date.parse(iso + 'T00:00:00Z') / 86_400_000

export interface Referencia { kg: number; propia: boolean }

/**
 * 1RM de referencia para una sesión (`fecha`): mejor estimación de las sesiones de las 8 semanas anteriores, de
 * competición si las hay y, si no, de variantes. `propia` = no había nada antes y se usó la mejor serie de la propia sesión.
 */
export function referenciaE1RM(sesiones: SesionLevantamiento[], fecha: string): Referencia | null {
  const hoy = dia(fecha)
  const previas = sesiones.filter(s => dia(s.fecha) < hoy && hoy - dia(s.fecha) <= VENTANA_REFERENCIA_DIAS)
  for (const filtro of [(s: SesionLevantamiento) => s.papel === 'competicion', () => true]) {
    const kg = previas.filter(filtro).reduce((m, s) => Math.max(m, mejorE1rm(s.series)), 0)
    if (kg > 0) return { kg, propia: false }
  }
  const propia = sesiones.filter(s => s.fecha === fecha).reduce((m, s) => Math.max(m, mejorE1rm(s.series)), 0)
  return propia > 0 ? { kg: propia, propia: true } : null
}

export interface Exposicion { reps: number; porUmbral: Record<Umbral, number>; sinReferencia: number; conReferenciaPropia: number }
export const exposicionVacia = (): Exposicion => ({ reps: 0, porUmbral: { 70: 0, 80: 0, 90: 0 }, sinReferencia: 0, conReferenciaPropia: 0 })

/** Lunes (YYYY-MM-DD) de la semana de una fecha. */
export function lunesDeISO(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  // Sin toISOString(): el repositorio no calcula fechas de calendario con él (lib/dates.test.ts)
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`
}

/**
 * Repeticiones por semana y papel, con cuántas pasan de cada umbral respecto al 1RM de referencia de su sesión.
 * `sesiones` son las de UN levantamiento (sentadilla, banca o peso muerto), con competición y variantes.
 */
export function exposicionPorSemana(sesiones: SesionLevantamiento[]): Record<string, Record<'competicion' | 'variante', Exposicion>> {
  const out: Record<string, Record<'competicion' | 'variante', Exposicion>> = {}
  for (const ses of sesiones) {
    const semana = lunesDeISO(ses.fecha)
    const e = (out[semana] ??= { competicion: exposicionVacia(), variante: exposicionVacia() })[ses.papel]
    const ref = referenciaE1RM(sesiones, ses.fecha)
    for (const s of ses.series) {
      if (!(s.weight > 0) || !(s.reps >= 1)) continue
      e.reps += s.reps
      if (!ref) { e.sinReferencia += s.reps; continue }
      if (ref.propia) e.conReferenciaPropia += s.reps
      const pct = (s.weight / ref.kg) * 100
      for (const u of UMBRALES) if (pct >= u) e.porUmbral[u] += s.reps
    }
  }
  return out
}
