// Por qué se va un cliente: al archivarlo, el entrenador puede marcar el motivo (clientes.archivado_motivo, la misma
// columna donde el archivado automático pone 'plan_terminado'). En Negocio se ve el reparto, para saber qué falla.
// Puro, para probarlo.

export const MOTIVOS_BAJA = [
  { id: 'precio', label: '💶 Precio' },
  { id: 'tiempo', label: '⏰ Falta de tiempo' },
  { id: 'lesion', label: '🩹 Lesión o salud' },
  { id: 'resultados', label: '📉 No veía resultados' },
  { id: 'cambio', label: '🏠 Mudanza o cambio de centro' },
  { id: 'otro', label: '✳️ Otro' },
] as const

export type MotivoBaja = typeof MOTIVOS_BAJA[number]['id']
const ETIQUETA: Record<string, string> = { ...Object.fromEntries(MOTIVOS_BAJA.map(m => [m.id, m.label])), plan_terminado: '🏁 Terminó su plan' }

export const etiquetaMotivo = (id?: string | null) => (id && ETIQUETA[id]) || 'Sin motivo'

/** Reparto de motivos de los archivados desde `desde` (ms), de más a menos. */
export function contarMotivos(archivados: { archivedAt?: number; archivadoMotivo?: string }[], desde: number): { id: string; label: string; n: number; pct: number }[] {
  const lista = archivados.filter(c => (c.archivedAt ?? 0) >= desde)
  const n: Record<string, number> = {}
  for (const c of lista) { const k = c.archivadoMotivo && ETIQUETA[c.archivadoMotivo] ? c.archivadoMotivo : 'sin'; n[k] = (n[k] || 0) + 1 }
  return Object.entries(n)
    .map(([id, v]) => ({ id, label: id === 'sin' ? 'Sin motivo' : ETIQUETA[id], n: v, pct: Math.round((v / lista.length) * 100) }))
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, 'es'))
}
