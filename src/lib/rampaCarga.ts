import { FITNESS_DIAS, type LoadTrendPoint } from './loadRisk'

// Ritmo de subida de la carga (el "ramp rate" de TrainingPeaks): cuánto sube la forma física (la carga crónica de 42
// días) de una semana a la siguiente, en %. Subir la carga demasiado deprisa es de lo que más lesiona. Como la carga no
// tiene unidades fijas (tonelaje o minutos × RPE), los cortes van en %. Va aparte de estadoForma porque la lista de
// clientes lo necesita al cargar el panel y estadoForma solo hace falta al abrir Progreso.

/** Por encima de esto (% por semana) la carga sube demasiado deprisa. */
export const RAMPA_ALTA = 10
/** Semanas con carga antes de fiarse del ritmo (la media de 42 días tiene que asentarse). */
export const SEMANAS_MIN_RAMPA = Math.ceil(FITNESS_DIAS / 7)

/** % de cambio de la forma física en cada semana respecto a la anterior (la primera semana no tiene). */
export function rampasSemanales(trend: LoadTrendPoint[]): number[] {
  const out: number[] = []
  for (let i = 1; i < trend.length; i++) {
    const a = trend[i - 1].fitness, b = trend[i].fitness
    if (a > 0) out.push(Math.round(((b - a) / a) * 100))
  }
  return out
}

/** La rampa de la última semana, si hay datos para fiarse; si no, null. */
export function rampaActual(trend: LoadTrendPoint[]): number | null {
  if (trend.length < SEMANAS_MIN_RAMPA) return null
  const r = rampasSemanales(trend)
  return r.length ? r[r.length - 1] : null
}

/** Semanas seguidas, hasta la última, subiendo por encima de RAMPA_ALTA. */
export function semanasRapidas(trend: LoadTrendPoint[]): number {
  if (trend.length < SEMANAS_MIN_RAMPA) return 0
  const r = rampasSemanales(trend)
  let n = 0
  for (let i = r.length - 1; i >= 0 && r[i] > RAMPA_ALTA; i--) n++
  return n
}

export type NivelRampa = 'baja' | 'estable' | 'suave' | 'firme' | 'rapida'

export function valorarRampa(pct: number, seguidas = 0): { nivel: NivelRampa; etiqueta: string; frase: string; tono: 'ok' | 'neutro' | 'aviso' } {
  if (pct > RAMPA_ALTA) return { nivel: 'rapida', etiqueta: 'Sube demasiado deprisa', tono: 'aviso',
    frase: `${seguidas > 1 ? `${seguidas} semanas seguidas` : 'Esta semana'} por encima del ${RAMPA_ALTA} %: es el ritmo con más riesgo de lesión. Mejor estabilizar la carga.` }
  if (pct > 5) return { nivel: 'firme', etiqueta: 'Subida firme', tono: 'neutro', frase: `Sube a buen ritmo; vigila no pasar del ${RAMPA_ALTA} % por semana.` }
  if (pct > 1) return { nivel: 'suave', etiqueta: 'Subida suave', tono: 'ok', frase: 'La carga sube de forma progresiva y segura.' }
  if (pct >= -1) return { nivel: 'estable', etiqueta: 'Estable', tono: 'neutro', frase: 'La carga se mantiene.' }
  return { nivel: 'baja', etiqueta: 'Bajando', tono: 'neutro', frase: 'La carga baja: normal en una descarga o si ha entrenado menos.' }
}
