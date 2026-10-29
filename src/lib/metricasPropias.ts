// Métricas propias del entrenador ("FC en reposo · lpm", "Perímetro de cuello · cm"…): se definen una vez (en su perfil,
// entrenadores.profile.metricasPropias) y salen en cada valoración junto a las fijas; los valores van en
// valoraciones.extra ({ idMetrica: número }). Todo puro, para probarlo.

export interface MetricaPropia { id: string; nombre: string; unidad: string }

export const MAX_METRICAS = 12

/** Lo guardado en el perfil puede venir de cualquier versión: se queda solo lo válido, sin repetir y como mucho 12. */
export function limpiarMetricas(raw: unknown): MetricaPropia[] {
  if (!Array.isArray(raw)) return []
  const vistas = new Set<string>()
  const out: MetricaPropia[] = []
  for (const m of raw) {
    if (!m || typeof m !== 'object') continue
    const { id, nombre, unidad } = m as Record<string, unknown>
    if (typeof id !== 'string' || !/^m_[a-z0-9]{1,20}$/.test(id) || vistas.has(id)) continue
    const n = typeof nombre === 'string' ? nombre.replace(/\s+/g, ' ').trim().slice(0, 40) : ''
    if (!n) continue
    vistas.add(id)
    out.push({ id, nombre: n, unidad: typeof unidad === 'string' ? unidad.trim().slice(0, 10) : '' })
    if (out.length === MAX_METRICAS) break
  }
  return out
}

export function nuevaMetrica(nombre: string, unidad: string): MetricaPropia {
  return { id: `m_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, nombre: nombre.replace(/\s+/g, ' ').trim().slice(0, 40), unidad: unidad.trim().slice(0, 10) }
}

/** Solo números finitos y de métricas que existen (lo que se guarda en valoraciones.extra). */
export function limpiarValores(extra: Record<string, unknown> | null | undefined, metricas: MetricaPropia[]): Record<string, number> {
  const ids = new Set(metricas.map(m => m.id))
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(extra || {})) if (ids.has(k) && typeof v === 'number' && Number.isFinite(v)) out[k] = v
  return out
}

/** Primera y última medida de una métrica (por fecha) y la diferencia; null con menos de dos. */
export function evolucionMetrica(valoraciones: { fecha: string; extra?: Record<string, unknown> | null }[], id: string) {
  const conValor = valoraciones
    .filter(v => typeof v.extra?.[id] === 'number')
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
  if (conValor.length < 2) return null
  const primera = conValor[0].extra![id] as number, ultima = conValor[conValor.length - 1].extra![id] as number
  return { primera, ultima, diferencia: Math.round((ultima - primera) * 10) / 10, desde: conValor[0].fecha }
}
