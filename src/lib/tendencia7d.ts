import { localDateKey } from './dates'

// "Esfuerzo y sensaciones": la media de los últimos 7 días frente a los 7 anteriores, para el esfuerzo percibido de
// las sesiones (RPE 1-10, session_load) y cada escala del check-in diario (1-5, readiness_checkins; en todas, más
// alto = mejor). Todo puro, para probarlo.

export type Tendencia = 'sube' | 'baja' | 'igual'
export interface Resumen7d { media: number | null; mediaAntes: number | null; n: number; tendencia: Tendencia | null }

const desde = (hoy: string, dias: number) => { const d = new Date(hoy + 'T12:00:00'); d.setDate(d.getDate() - dias); return localDateKey(d) }
const media = (v: number[]) => v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null

/**
 * Media de los 7 días que acaban hoy y de los 7 anteriores. La tendencia solo se da con datos en los dos tramos y si
 * la diferencia llega a `umbral` (por debajo, "igual": una décima arriba o abajo no es una tendencia).
 */
export function resumen7d(filas: { date: string; valor: number | null | undefined }[], hoy = localDateKey(), umbral = 0.3): Resumen7d {
  const ini = desde(hoy, 6), iniAntes = desde(hoy, 13)
  const ultimos: number[] = [], antes: number[] = []
  for (const f of filas) {
    if (typeof f.valor !== 'number' || !Number.isFinite(f.valor)) continue
    if (f.date >= ini && f.date <= hoy) ultimos.push(f.valor)
    else if (f.date >= iniAntes && f.date < ini) antes.push(f.valor)
  }
  const m = media(ultimos), ma = media(antes)
  const tendencia: Tendencia | null = m === null || ma === null ? null : Math.abs(m - ma) < umbral ? 'igual' : m > ma ? 'sube' : 'baja'
  return { media: m, mediaAntes: ma, n: ultimos.length, tendencia }
}

/** Una frase corta para el entrenador; `masEsMejor` dice si subir es buena noticia (sensaciones) o no (esfuerzo). */
export function fraseTendencia(t: Tendencia | null, masEsMejor: boolean): { texto: string; tono: 'ok' | 'warn' | 'neutro' } {
  if (!t) return { texto: 'Sin semana anterior para comparar', tono: 'neutro' }
  if (t === 'igual') return { texto: 'Igual que la semana anterior', tono: 'neutro' }
  const buena = (t === 'sube') === masEsMejor
  return { texto: t === 'sube' ? 'Sube respecto a la semana anterior' : 'Baja respecto a la semana anterior', tono: buena ? 'ok' : 'warn' }
}
