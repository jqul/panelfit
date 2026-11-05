// Top set + back-off (lo de siempre en powerlifting): la primera serie del ejercicio es la pesada del día y las demás
// son bajadas a un % del peso que de verdad se ha movido en ella, con sus propias reps. En el plan sigue siendo un
// ejercicio con `sets` "4x3": 1 top set + 3 back-off, así que el recuento de series, el volumen y el progreso no
// cambian. `backoff` dice el % y, si son otras, las reps de las bajadas.

export interface Backoff { pct: number; reps?: string }

export const PCT_MIN = 50
export const PCT_MAX = 98

/** Lo que guarda el editor: % entre 50 y 98 y reps cortas; si no vale, sin back-off. */
export function limpiarBackoff(raw: unknown): Backoff | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const { pct, reps } = raw as Record<string, unknown>
  const p = typeof pct === 'number' ? pct : parseFloat(String(pct ?? ''))
  if (!Number.isFinite(p) || p < PCT_MIN || p > PCT_MAX) return undefined
  const r = typeof reps === 'string' ? reps.trim().slice(0, 12) : ''
  return r ? { pct: Math.round(p), reps: r } : { pct: Math.round(p) }
}

/** Peso de las bajadas: el % del top set, redondeado al disco más cercano (2,5 kg; 1 kg si el top set es ligero). */
export function pesoBackoff(topSet: string | number | undefined, pct: number): string {
  const w = typeof topSet === 'number' ? topSet : parseFloat(String(topSet ?? '').replace(',', '.'))
  if (!Number.isFinite(w) || w <= 0) return ''
  const paso = w < 40 ? 1 : 2.5
  const v = Math.round((w * pct) / 100 / paso) * paso
  return String(Math.round(v * 10) / 10)
}

/** Primer número de unas reps ("5", "6-8" → 6) para precargar la serie; null si no hay. */
export const repsIniciales = (reps?: string): string | null => reps?.match(/\d+/)?.[0] ?? null

/** Lo que pone la columna Plan de cada serie: "Top 3 @1" y luego "5 · 85%". */
export function etiquetaSerie(si: number, backoff: Backoff | undefined, repsPlan: string, rir?: string): string {
  const conRir = (r: string) => `${r}${rir ? ` @${rir}` : ''}`
  if (!backoff) return conRir(repsPlan)
  if (si === 0) return `Top ${conRir(repsPlan)}`
  return `${backoff.reps || repsPlan} · ${backoff.pct}%`
}

/**
 * Al hacer el top set, precarga las bajadas que aún no se han hecho ni tocado: su peso (el % del top set) y sus reps.
 * Devuelve las series nuevas; las hechas o con un peso que ya puso el cliente se respetan.
 */
export function precargarBackoff<S extends { weight: string; reps: string; done: boolean }>(
  series: Record<number, S | undefined>, total: number, backoff: Backoff, repsPlan: string, pesoAuto: Record<number, string> = {},
): Record<number, S> {
  const peso = pesoBackoff(series[0]?.weight, backoff.pct)
  const out = { ...series } as Record<number, S>
  if (!peso) return out
  const reps = repsIniciales(backoff.reps) ?? repsIniciales(repsPlan) ?? ''
  for (let i = 1; i < total; i++) {
    const s = out[i]
    if (s?.done) continue
    // Solo se pisa un peso vacío o el que pusimos nosotros antes (si el top set cambia, la bajada se recalcula)
    if (s?.weight && s.weight !== pesoAuto[i]) continue
    out[i] = { ...(s ?? { done: false }), weight: peso, reps: s?.reps && s.weight ? s.reps : (reps || s?.reps || '') } as S
  }
  return out
}

/** Para leer el plan: "Top set de 3 + 3 bajadas de 5 al 85 %". Sin back-off, las series tal cual. */
export function resumenSeries(ex: { sets: string; backoff?: Backoff }): string {
  if (!ex.backoff) return ex.sets
  const m = String(ex.sets || '').match(/(\d+)\s*[x×]\s*([^\s@]+)/i)
  if (!m) return ex.sets
  const bajadas = Math.max(0, parseInt(m[1]) - 1)
  if (!bajadas) return ex.sets
  return `Top set de ${m[2]} + ${bajadas} bajada${bajadas === 1 ? '' : 's'} de ${ex.backoff.reps || m[2]} al ${ex.backoff.pct} %`
}
