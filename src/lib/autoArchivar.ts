// Archivar solos a los clientes que terminan su plan (migración 20261114000001_archivar_terminados): el ajuste del
// entrenador (profile.autoArchivar) y los recién archivados así que la Bandeja le enseña para recuperarlos.

export interface AjusteAutoArchivar { activo: boolean; dias: number }
export const DIAS_AUTO_ARCHIVAR = [7, 14, 30, 60]
export const AUTO_ARCHIVAR_POR_DEFECTO: AjusteAutoArchivar = { activo: false, dias: 14 }

export function limpiarAutoArchivar(raw: unknown): AjusteAutoArchivar {
  const o = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const dias = typeof o.dias === 'number' && Number.isFinite(o.dias) ? Math.min(90, Math.max(1, Math.round(o.dias))) : 14
  return { activo: o.activo === true, dias }
}

/** Los archivados solos por plan terminado en los últimos `dias` días (los más recientes primero). */
export function archivadosSolos<C extends { archivedAt?: number; archivadoMotivo?: string }>(archivados: C[], ahora = Date.now(), dias = 14): C[] {
  return archivados
    .filter(c => c.archivadoMotivo === 'plan_terminado' && c.archivedAt && ahora - c.archivedAt <= dias * 86400000)
    .sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0))
}
