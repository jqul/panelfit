// Tipos de cita del entrenador ("Entreno personal", "Valoración", "Online"…), cada uno con su color y su duración.
// Se guardan en su perfil (entrenadores.profile.tiposCita) y cada cita apunta a su tipo (citas.tipo_id). Todo puro.

export interface TipoCita { id: string; nombre: string; color: string; duracion: number }

/** Colores para elegir: se ven en claro y en oscuro (solo se usan como franja o punto, no detrás de texto). */
export const COLORES_CITA = ['#2f6f4f', '#a0522d', '#3b5b92', '#8a4f9e', '#b8862b', '#c0504d'] as const

export const MAX_TIPOS = 8

export function limpiarTipos(raw: unknown): TipoCita[] {
  if (!Array.isArray(raw)) return []
  const vistos = new Set<string>()
  const out: TipoCita[] = []
  for (const t of raw) {
    if (!t || typeof t !== 'object') continue
    const { id, nombre, color, duracion } = t as Record<string, unknown>
    if (typeof id !== 'string' || !/^t_[a-z0-9]{1,20}$/.test(id) || vistos.has(id)) continue
    const n = typeof nombre === 'string' ? nombre.replace(/\s+/g, ' ').trim().slice(0, 40) : ''
    if (!n) continue
    vistos.add(id)
    out.push({
      id, nombre: n,
      color: typeof color === 'string' && (COLORES_CITA as readonly string[]).includes(color) ? color : COLORES_CITA[0],
      duracion: typeof duracion === 'number' && duracion >= 15 && duracion <= 240 ? Math.round(duracion / 5) * 5 : 60,
    })
    if (out.length === MAX_TIPOS) break
  }
  return out
}

export function nuevoTipo(nombre: string, color: string, duracion: number): TipoCita {
  return limpiarTipos([{ id: `t_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, nombre, color, duracion }])[0]
}
