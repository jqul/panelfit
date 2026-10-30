// Hábitos con meta numérica (10.000 pasos, 7 horas de sueño, 155 g de proteína): sin React ni red, para probarlos.
// Un hábito sin meta sigue siendo una casilla sí/no. Con meta, el cliente escribe el valor del día y el hábito se
// marca solo al llegar a ella (se añade su id a completedHabitIds, así que lo que ya leía esa lista no cambia).

export interface HabitoNum { id: string; meta?: number | null; unidad?: string | null }

export const esNumerico = (h: HabitoNum): boolean => typeof h.meta === 'number' && h.meta > 0

/**
 * Lee un número escrito a la española: "10.000" y "10,000" son diez mil (separador de miles), "7,5" y "7.5" son siete
 * y medio. Devuelve null si no es un número válido o es negativo o desmesurado.
 */
export function parseValor(texto: string): number | null {
  const t = texto.trim().replace(/\s/g, '')
  if (!t) return null
  let s = t
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) s = t.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(,\d{3})+$/.test(t)) s = t.replace(/,/g, '')
  else s = t.replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) && n <= 1_000_000 ? n : null
}

/** ¿Llega a la meta? Sin valor o sin meta, no. */
export function cumple(valor: number | null | undefined, h: HabitoNum): boolean {
  return esNumerico(h) && typeof valor === 'number' && valor >= (h.meta as number)
}

/** Porcentaje de la meta, de 0 a 100 (más allá de la meta se queda en 100). */
export function progresoPct(valor: number | null | undefined, h: HabitoNum): number {
  if (!esNumerico(h) || typeof valor !== 'number' || valor <= 0) return 0
  return Math.min(100, Math.round((valor / (h.meta as number)) * 100))
}

/**
 * Lista de hábitos completados tras cambiar los valores: los numéricos están completos si cumplen su meta (marcan y
 * desmarcan solos) y los de casilla conservan lo que el cliente tuviera marcado. No devuelve ids que ya no existan.
 */
export function completadosTras(habitos: HabitoNum[], marcados: string[], valores: Record<string, number>): string[] {
  const vivos = new Set(habitos.map(h => h.id))
  const out = new Set<string>()
  for (const h of habitos) {
    if (esNumerico(h)) { if (cumple(valores[h.id], h)) out.add(h.id) }
    else if (marcados.includes(h.id)) out.add(h.id)
  }
  return [...out].filter(id => vivos.has(id))
}

/** "10.000 pasos", "7,5 h": valor con separador de miles a la española y la unidad si la hay. */
export function formatoValor(valor: number, unidad?: string | null): string {
  const n = valor.toLocaleString('es-ES', { maximumFractionDigits: 1, useGrouping: valor >= 10000 })
  return unidad ? `${n} ${unidad}` : n
}
