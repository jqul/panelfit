// Ritmo de pérdida o ganancia de peso: medias semanales y % semanal sobre el peso, sin React ni red.
// Un pesaje aislado oscila varios cientos de gramos por agua, glucógeno y contenido intestinal, así que no se juzga un
// día: se usan MEDIAS de la semana (lunes a domingo) y se comparan entre semanas seguidas. En una definición, perder
// más de ~0,75 % del peso por semana durante varias semanas, sobre todo si baja el rendimiento, es motivo para revisar
// el déficit; en una ganancia, más de ~0,5 % por semana suele ser más grasa que músculo. Son REFERENCIAS habituales, no
// reglas: dependen del punto de partida, de cuánta grasa hay y del objetivo.

import { lunesDeISO, sumarDiasISO } from './exposicionCargas'

export interface Pesaje { date: string; weight: number }

export const UMBRAL_PERDIDA_PCT = 0.75   // % del peso por semana
export const UMBRAL_GANANCIA_PCT = 0.5
export const SEMANAS_PARA_AVISAR = 2
export const PESAJES_MINIMOS = 3          // por debajo, la media de la semana es poco fiable

export interface SemanaPeso {
  semana: string          // lunes, YYYY-MM-DD
  media: number
  pesajes: number
  /** Cambio frente a la semana anterior, en % del peso de esa semana anterior. null si no hay semana anterior seguida. */
  cambioPct: number | null
  cambioKg: number | null
  /** Pocos pesajes: la media no es fiable. */
  poco: boolean
}

/** Medias semanales (lunes a domingo) y cambio de cada semana frente a la inmediatamente anterior, de la más antigua a la más reciente. */
export function semanasDePeso(pesajes: Pesaje[]): SemanaPeso[] {
  const acum = new Map<string, { suma: number; n: number }>()
  for (const p of pesajes) {
    if (!p.date || !Number.isFinite(p.weight) || p.weight <= 0) continue
    const s = lunesDeISO(p.date)
    const a = acum.get(s) ?? { suma: 0, n: 0 }
    a.suma += p.weight; a.n++
    acum.set(s, a)
  }
  const orden = [...acum.keys()].sort()
  return orden.map(s => {
    const a = acum.get(s)!
    const media = a.suma / a.n
    const previa = acum.get(sumarDiasISO(s, -7))
    const mediaPrevia = previa ? previa.suma / previa.n : null
    return {
      semana: s, media, pesajes: a.n,
      cambioKg: mediaPrevia === null ? null : media - mediaPrevia,
      cambioPct: mediaPrevia === null ? null : ((media - mediaPrevia) / mediaPrevia) * 100,
      poco: a.n < PESAJES_MINIMOS,
    }
  })
}

export interface AvisoRitmo { tipo: 'perdida-rapida' | 'ganancia-rapida'; texto: string }

/**
 * Aviso si las últimas semanas SEGUIDAS superan el umbral y tienen suficientes pesajes. No concluye que algo esté mal:
 * dice que conviene mirarlo. `semanasDePeso` ya viene ordenado.
 */
export function avisoRitmo(semanas: SemanaPeso[]): AvisoRitmo | null {
  const ultimas = semanas.slice(-SEMANAS_PARA_AVISAR)
  if (ultimas.length < SEMANAS_PARA_AVISAR) return null
  // Las dos deben ser seguidas (cada una con cambio calculado frente a la anterior) y con pesajes suficientes
  if (ultimas.some(s => s.cambioPct === null || s.poco)) return null
  if (ultimas.every(s => (s.cambioPct as number) <= -UMBRAL_PERDIDA_PCT)) {
    return { tipo: 'perdida-rapida', texto: `Pierde más del ${String(UMBRAL_PERDIDA_PCT).replace('.', ',')} % de su peso por semana desde hace ${SEMANAS_PARA_AVISAR} semanas. Si además baja el rendimiento o duerme peor, conviene revisar el déficit y la recuperación.` }
  }
  if (ultimas.every(s => (s.cambioPct as number) >= UMBRAL_GANANCIA_PCT)) {
    return { tipo: 'ganancia-rapida', texto: `Gana más del ${String(UMBRAL_GANANCIA_PCT).replace('.', ',')} % de su peso por semana desde hace ${SEMANAS_PARA_AVISAR} semanas. Un superávit alto suele sumar más grasa que músculo: míralo junto a su objetivo.` }
  }
  return null
}

/** Media móvil de los últimos `dias` días (con la fecha del pesaje incluida), para trazarla sobre los puntos. null si hay menos de 2 pesajes en la ventana. */
export function mediaMovil(pesajes: Pesaje[], dias = 7): Map<string, number> {
  const ord = [...pesajes].filter(p => p.date && Number.isFinite(p.weight) && p.weight > 0).sort((a, b) => a.date.localeCompare(b.date))
  const out = new Map<string, number>()
  for (const p of ord) {
    const desde = sumarDiasISO(p.date, -(dias - 1))
    const ventana = ord.filter(q => q.date >= desde && q.date <= p.date)
    if (ventana.length >= 2) out.set(p.date, ventana.reduce((a, q) => a + q.weight, 0) / ventana.length)
  }
  return out
}
