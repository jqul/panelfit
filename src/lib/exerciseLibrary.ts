// Lógica pura de la biblioteca de ejercicios del entrenador (sin React ni red): origen, material,
// calidad de la ficha, filtros por chip y nombre de una copia. La pantalla solo la pinta.

import { norm } from './globalSearch'

export interface LibEx {
  id: string
  name: string
  description?: string
  category?: string
  videos?: { url: string }[]
  material?: string
  useCount?: number
  archivedAt?: number | null
  alternativas?: string[]
}

// ── Origen ────────────────────────────────────────────────
// Los ejercicios sembrados al registrarse llevan el prefijo ex_default_ (ex_demo_ en la demo). No hay columna:
// el id ya lo dice, y los que el entrenador crea o importa tienen otro prefijo.
export type Origen = 'base' | 'personal'
export const exerciseOrigin = (ex: Pick<LibEx, 'id'>): Origen => /^ex_(default|demo)_/.test(ex.id) ? 'base' : 'personal'
export const ORIGEN_LABEL: Record<Origen, string> = { base: 'Base PanelFit', personal: 'Personal' }

// ── Material ──────────────────────────────────────────────
export const MATERIALES = ['Barra', 'Mancuerna', 'Máquina', 'Polea', 'Peso corporal', 'Banda', 'Kettlebell', 'Otro'] as const

const MATERIAL_PATRONES: [string, RegExp][] = [
  ['Kettlebell', /kettlebell|pesa rusa/],
  ['Banda', /\bbanda\b|\bgoma\b|miniband/],
  ['Polea', /polea|cable|jalon|crossover|pulldown|face pull/],
  ['Mancuerna', /mancuerna|dumbbell|goblet|arnold/],
  ['Barra', /barra|barbell|peso muerto|hip thrust|press militar|press banca|good morning|buenos dias|clean|snatch|jerk/],
  ['Máquina', /maquina|prensa|hack|smith|multipower|pec deck|peck deck|leg (press|extension|curl)|curl femoral|extension de cuadriceps/],
  ['Peso corporal', /flexion|dominada|fondos|plancha|burpee|zancada|sin peso|peso corporal|crunch|abdominal|mountain|puente|bird dog|dead bug/],
]

/** Material deducido del nombre cuando el entrenador no lo ha indicado (el catálogo base no lo trae). */
export function inferMaterial(name: string): string {
  const n = norm(name)
  return MATERIAL_PATRONES.find(([, re]) => re.test(n))?.[0] ?? ''
}
export const materialOf = (ex: Pick<LibEx, 'name' | 'material'>): string => ex.material?.trim() || inferMaterial(ex.name)

// ── Calidad de la ficha ───────────────────────────────────
export type Hueco = 'video' | 'indicaciones' | 'alternativa'
/** "Muy usado": se ha añadido a planes varias veces; ahí es donde un hueco duele de verdad. */
export const MUY_USADO = 3

export const tieneVideo = (ex: Pick<LibEx, 'videos'>) => (ex.videos?.length ?? 0) > 0
export const tieneIndicaciones = (ex: Pick<LibEx, 'description'>) => !!ex.description?.trim()
export const tieneAlternativa = (ex: Pick<LibEx, 'alternativas'>) => (ex.alternativas?.length ?? 0) > 0
export const esMuyUsado = (ex: Pick<LibEx, 'useCount'>) => (ex.useCount ?? 0) >= MUY_USADO

/**
 * Qué le falta a la ficha. La alternativa solo se reclama a los muy usados: pedírsela a las 1.800 fichas del
 * catálogo base sería ruido, y es en los ejercicios de siempre donde el cliente la necesita (gimnasio lleno).
 */
export function huecos(ex: LibEx): Hueco[] {
  const out: Hueco[] = []
  if (!tieneVideo(ex)) out.push('video')
  if (!tieneIndicaciones(ex)) out.push('indicaciones')
  if (esMuyUsado(ex) && !tieneAlternativa(ex)) out.push('alternativa')
  return out
}

export const HUECO_LABEL: Record<Hueco, string> = { video: 'Falta vídeo', indicaciones: 'Faltan indicaciones', alternativa: 'Sin alternativa' }

/** Estado de una frase para la tarjeta: el hueco más importante, o "Completo". */
export function estadoFicha(ex: LibEx): { completo: boolean; label: string; huecos: Hueco[] } {
  const h = huecos(ex)
  return { completo: h.length === 0, label: h.length ? HUECO_LABEL[h[0]] : 'Completo', huecos: h }
}

// ── Filtros ───────────────────────────────────────────────
export type Chip = 'todos' | 'usados' | 'sin-video' | 'favoritos' | 'pendientes' | 'archivados'

/** Pendientes: lo que el entrenador usa o ha marcado y aún tiene huecos. Un catálogo entero sin vídeo no es "pendiente". */
export const esPendiente = (ex: LibEx, favs: ReadonlySet<string>) => ((ex.useCount ?? 0) > 0 || favs.has(ex.id)) && huecos(ex).length > 0

export interface Filtros { query?: string; chip?: Chip; category?: string; material?: string; favs?: ReadonlySet<string> }

/** `all` incluye los archivados: aquí se separan según el chip. */
export function filtrar<T extends LibEx>(all: T[], f: Filtros): T[] {
  const favs = f.favs ?? new Set<string>()
  const tokens = norm(f.query ?? '').split(' ').filter(Boolean)
  const chip = f.chip ?? 'todos'
  return all.filter(ex => {
    const archivado = !!ex.archivedAt
    if (chip === 'archivados' ? !archivado : archivado) return false
    if (f.category && ex.category !== f.category) return false
    if (f.material && materialOf(ex) !== f.material) return false
    if (tokens.length) {
      const hay = norm(`${ex.name} ${ex.category ?? ''} ${materialOf(ex)}`)
      if (!tokens.every(t => hay.includes(t))) return false
    }
    if (chip === 'usados') return (ex.useCount ?? 0) > 0
    if (chip === 'sin-video') return !tieneVideo(ex)
    if (chip === 'favoritos') return favs.has(ex.id)
    if (chip === 'pendientes') return esPendiente(ex, favs)
    return true
  })
}

/** Más usados primero; a igualdad, favoritos y luego alfabético. */
export function porRelevancia<T extends LibEx>(list: T[], favs: ReadonlySet<string> = new Set()): T[] {
  return [...list].sort((a, b) =>
    (b.useCount ?? 0) - (a.useCount ?? 0) || (favs.has(b.id) ? 1 : 0) - (favs.has(a.id) ? 1 : 0) || a.name.localeCompare(b.name, 'es'))
}

/** Los que se enseñan arriba: usados (más veces primero) y, si aún no hay uso, los favoritos. */
export function recomendados<T extends LibEx>(active: T[], favs: ReadonlySet<string>, n = 4): T[] {
  const usados = porRelevancia(active.filter(e => (e.useCount ?? 0) > 0), favs)
  if (usados.length) return usados.slice(0, n)
  return porRelevancia(active.filter(e => favs.has(e.id)), favs).slice(0, n)
}

export interface Resumen { total: number; usados: number; sinVideo: number; favoritos: number; pendientes: number; archivados: number; muyUsadosSinVideo: number; muyUsadosSinAlternativa: number }
export function resumen(all: LibEx[], favs: ReadonlySet<string>): Resumen {
  const activos = all.filter(e => !e.archivedAt)
  const muy = activos.filter(esMuyUsado)
  return {
    total: activos.length,
    usados: activos.filter(e => (e.useCount ?? 0) > 0).length,
    sinVideo: activos.filter(e => !tieneVideo(e)).length,
    favoritos: activos.filter(e => favs.has(e.id)).length,
    pendientes: activos.filter(e => esPendiente(e, favs)).length,
    archivados: all.length - activos.length,
    muyUsadosSinVideo: muy.filter(e => !tieneVideo(e)).length,
    muyUsadosSinAlternativa: muy.filter(e => !tieneAlternativa(e)).length,
  }
}

/** Cuántos ejercicios activos hay de cada material (solo los que tienen alguno), de más a menos. */
export function materialCounts(active: LibEx[]): { material: string; n: number }[] {
  const c = new Map<string, number>()
  active.forEach(e => { const m = materialOf(e); if (m) c.set(m, (c.get(m) ?? 0) + 1) })
  return [...c.entries()].map(([material, n]) => ({ material, n })).sort((a, b) => b.n - a.n || a.material.localeCompare(b.material, 'es'))
}

// ── Duplicar ──────────────────────────────────────────────
/** "Press militar" → "Press militar (copia)", y si ya existe → "(copia 2)", "(copia 3)"... Sin distinguir tildes ni mayúsculas. */
export function nombreDeCopia(name: string, existing: Iterable<string>): string {
  const taken = new Set([...existing].map(norm))
  const base = name.replace(/\s*\(copia(?: \d+)?\)\s*$/i, '').trim()
  let candidate = `${base} (copia)`
  for (let i = 2; taken.has(norm(candidate)); i++) candidate = `${base} (copia ${i})`
  return candidate
}
