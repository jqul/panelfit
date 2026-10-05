// Organización de las vistas de "Tu progreso" del cliente en pocos grupos. Las
// vistas (hojas) siguen siendo las mismas; solo cambia cómo se presentan: cinco
// conceptos arriba y, dentro del grupo que tiene varias, un segundo nivel.

export type ProgressGroupId = 'resumen' | 'entrenos' | 'fuerza' | 'cuerpo' | 'mas'

export interface ProgressLeaf { id: string; label: string }
export interface ProgressGroup { id: ProgressGroupId; label: string; leaves: ProgressLeaf[] }

const LAYOUT: { id: ProgressGroupId; label: string; leaves: ProgressLeaf[] }[] = [
  { id: 'resumen',  label: 'Resumen',  leaves: [{ id: 'resumen', label: 'Resumen' }] },
  { id: 'entrenos', label: 'Entrenos', leaves: [{ id: 'calendario', label: 'Calendario' }, { id: 'historial', label: 'Historial' }] },
  { id: 'fuerza',   label: 'Fuerza',   leaves: [{ id: 'records', label: 'Récords' }] },
  { id: 'cuerpo',   label: 'Cuerpo',   leaves: [{ id: 'peso', label: 'Peso' }, { id: 'fotos', label: 'Fotos' }] },
  { id: 'mas',      label: 'Más',      leaves: [{ id: 'dolor', label: 'Dolor' }, { id: 'feedback', label: 'Feedback' }, { id: 'metricas', label: 'Métricas' }] },
]

// Solo las vistas disponibles (el entrenador puede desactivar métricas y el
// dolor solo se ve si procede); un grupo sin vistas no aparece.
export function buildGroups(available: Iterable<string>): ProgressGroup[] {
  const set = new Set(available)
  return LAYOUT
    .map(g => ({ ...g, leaves: g.leaves.filter(l => set.has(l.id)) }))
    .filter(g => g.leaves.length > 0)
}

export function groupOf(groups: ProgressGroup[], leafId: string): ProgressGroup | undefined {
  return groups.find(g => g.leaves.some(l => l.id === leafId))
}

// Al pulsar un grupo se vuelve a la última vista que se usó en él, o a la primera.
export function leafForGroup(group: ProgressGroup, lastLeaf?: string): string {
  return group.leaves.find(l => l.id === lastLeaf)?.id ?? group.leaves[0].id
}
