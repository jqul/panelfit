// Búsqueda global del panel del entrenador (Ctrl/⌘+K): un solo cuadro para llegar a un cliente, un ejercicio,
// una plantilla o un programa, o ejecutar una acción ("nuevo cliente", "ir a Bandeja"). La lógica de
// puntuación y agrupación es pura (sin React ni red) para poder probarla.

export type ResultKind = 'cliente' | 'accion' | 'plantilla' | 'programa' | 'ejercicio'

export interface Searchable {
  id: string
  kind: ResultKind
  title: string
  subtitle?: string
  /** Otras palabras por las que encontrarlo (teléfono, objetivo, sinónimos de una acción...). */
  keywords?: string
}

export interface SearchResult extends Searchable { score: number }

// Cuántos resultados de cada tipo se enseñan, y en qué orden salen los grupos.
export const GROUPS: { kind: ResultKind; titulo: string; max: number }[] = [
  { kind: 'cliente', titulo: 'Clientes', max: 6 },
  { kind: 'accion', titulo: 'Acciones', max: 5 },
  { kind: 'plantilla', titulo: 'Workouts', max: 4 },
  { kind: 'programa', titulo: 'Programas', max: 3 },
  { kind: 'ejercicio', titulo: 'Ejercicios', max: 5 },
]

export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

const words = (s: string) => s.split(/[\s(),/\-·]+/).filter(Boolean)

/** Puntuación de un elemento para lo escrito (menor = mejor), o null si no coincide. */
export function scoreItem(item: Searchable, query: string): number | null {
  const q = norm(query)
  if (!q) return null
  const tokens = q.split(' ')
  const title = norm(item.title)
  const haystack = `${title} ${norm(item.keywords ?? '')} ${norm(item.subtitle ?? '')}`
  // Todos los términos tienen que aparecer en alguna parte ("remo polea", "maria garcia")
  if (!tokens.every(t => haystack.includes(t))) return null
  if (title === q) return 0
  if (title.startsWith(q)) return 1
  if (tokens.every(t => words(title).some(w => w.startsWith(t)))) return 2
  if (tokens.every(t => title.includes(t))) return 3
  return 4 // solo en las palabras clave o el subtítulo
}

/** Resultados agrupados por tipo, ya recortados. Con la búsqueda vacía solo salen las acciones (como lanzador). */
export function searchAll(items: Searchable[], query: string): { kind: ResultKind; titulo: string; results: SearchResult[] }[] {
  const empty = !norm(query)
  const out: { kind: ResultKind; titulo: string; results: SearchResult[] }[] = []
  for (const g of GROUPS) {
    if (empty && g.kind !== 'accion') continue
    const found = items.filter(i => i.kind === g.kind)
      .map(i => ({ ...i, score: empty ? 0 : scoreItem(i, query) }))
      .filter((r): r is SearchResult => r.score !== null)
    // Sin texto, las acciones salen en el orden en que se dieron (lo más usado primero).
    if (!empty) found.sort((a, b) => a.score - b.score || a.title.length - b.title.length || a.title.localeCompare(b.title, 'es'))
    const results = found.slice(0, empty ? 7 : g.max)
    if (results.length) out.push({ kind: g.kind, titulo: g.titulo, results })
  }
  return out
}
