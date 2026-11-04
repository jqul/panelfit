// Check-in diario configurable: qué le pregunta cada entrenador a sus clientes. Se guarda en su perfil
// (`entrenadores.profile.checkin`, que el cliente ya lee para la marca): cuáles de las cuatro escalas de siempre y
// hasta tres preguntas propias de 1 a 5. Lo que no se pregunta queda vacío en readiness_checkins (null o sin clave en
// `extra`), nunca con un valor inventado (migración 20261104000005).

export type EscalaBase = 'motivation' | 'sleep' | 'soreness' | 'stress'

export interface Pregunta { emoji: string; label: string; bajo: string; alto: string }
export interface PreguntaExtra extends Pregunta { id: string }
export interface ConfigCheckin { escalas: EscalaBase[]; extra: PreguntaExtra[] }

// "Energía" usa la columna motivation (mismo concepto en la práctica). En todas, 5 es lo mejor.
export const ESCALAS_BASE: Record<EscalaBase, Pregunta> = {
  motivation: { emoji: '⚡', label: 'Energía', bajo: 'Agotado', alto: 'A tope' },
  sleep: { emoji: '😴', label: 'Sueño', bajo: 'Mal', alto: 'Genial' },
  soreness: { emoji: '💥', label: 'Agujetas', bajo: 'Mucho dolor', alto: 'Sin dolor' },
  stress: { emoji: '🧠', label: 'Estrés', bajo: 'Alto', alto: 'Bajo' },
}
export const ORDEN_BASE: EscalaBase[] = ['motivation', 'sleep', 'soreness', 'stress']
export const MAX_EXTRA = 3
export const MAX_LABEL = 40
export const CONFIG_POR_DEFECTO: ConfigCheckin = { escalas: [...ORDEN_BASE], extra: [] }

/** Ideas para empezar, por si el entrenador no sabe qué añadir. */
export const IDEAS_EXTRA: Pregunta[] = [
  { emoji: '💧', label: 'Hidratación', bajo: 'Poca agua', alto: 'Bien hidratado' },
  { emoji: '🍽️', label: 'Alimentación', bajo: 'He comido mal', alto: 'He comido bien' },
  { emoji: '🔥', label: 'Ganas de entrenar', bajo: 'Ninguna', alto: 'Muchas' },
  { emoji: '🙂', label: 'Ánimo', bajo: 'Bajo', alto: 'Muy bueno' },
]

const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Limpia lo que venga del perfil. Sin ninguna pregunta válida, la de siempre (el check-in nunca queda vacío). */
export function limpiarConfigCheckin(raw: unknown): ConfigCheckin {
  if (!raw || typeof raw !== 'object') return { escalas: [...ORDEN_BASE], extra: [] }
  const r = raw as Record<string, unknown>
  const escalas = Array.isArray(r.escalas) ? ORDEN_BASE.filter(k => (r.escalas as unknown[]).includes(k)) : [...ORDEN_BASE]
  const extra: PreguntaExtra[] = []
  const ids = new Set<string>()
  for (const x of Array.isArray(r.extra) ? r.extra : []) {
    if (!x || typeof x !== 'object') continue
    const o = x as Record<string, unknown>
    const label = texto(o.label, MAX_LABEL)
    if (!label) continue
    let id = texto(o.id, 20).replace(/[^a-z0-9_]/gi, '') || `x${extra.length + 1}`
    while (ids.has(id)) id += '_'
    ids.add(id)
    extra.push({ id, label, emoji: texto(o.emoji, 4) || '•', bajo: texto(o.bajo, 24) || 'Mal', alto: texto(o.alto, 24) || 'Muy bien' })
    if (extra.length >= MAX_EXTRA) break
  }
  if (!escalas.length && !extra.length) return { escalas: [...ORDEN_BASE], extra: [] }
  return { escalas, extra }
}

/** Una pregunta nueva con id único. */
export function nuevaPregunta(config: ConfigCheckin, base: Pregunta = { emoji: '•', label: '', bajo: 'Mal', alto: 'Muy bien' }): PreguntaExtra {
  let n = config.extra.length + 1
  while (config.extra.some(e => e.id === `x${n}`)) n++
  return { ...base, id: `x${n}` }
}

/** Lo que guarda el cliente: solo lo que se le ha preguntado; lo demás, vacío. */
export function filaCheckin(config: ConfigCheckin, valores: Record<string, number>) {
  const fila: Record<EscalaBase, number | null> & { extra: Record<string, number> } = { motivation: null, sleep: null, soreness: null, stress: null, extra: {} }
  for (const k of config.escalas) fila[k] = valores[k] ?? 3
  for (const e of config.extra) fila.extra[e.id] = valores[e.id] ?? 3
  return fila
}

/** Media de una escala ignorando los días que no se preguntó; null sin ningún dato. */
export function mediaEscala<T>(filas: T[], valor: (f: T) => number | null | undefined): number | null {
  const v = filas.map(valor).filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null
}

/** ¿Algún valor del check-in sale bajo (≤ 2)? Los vacíos no cuentan. */
export const algunaBaja = (...valores: (number | null | undefined)[]) => valores.some(v => typeof v === 'number' && v <= 2)
