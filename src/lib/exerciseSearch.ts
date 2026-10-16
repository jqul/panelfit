import { GYM_BASICS } from './defaultExerciseLibrary'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const BASIC_RANK = new Map(GYM_BASICS.map((n, i) => [norm(n), i]))

// Ordena una lista de ejercicios por relevancia para lo que se escribe: sin
// tildes, todos los términos a la vez ("remo polea"), y primero la
// coincidencia exacta, luego los que empiezan por lo escrito, luego palabra
// suelta, luego el resto. A igualdad ganan los básicos de gimnasio
// ("Sentadilla") antes que la variante específica ("Sentadilla búlgara con
// banda y pausa"), después el nombre más corto y después el alfabético.
// Sin texto, salen primero los básicos y luego el resto por orden alfabético.
export function rankByQuery<T extends { name: string }>(list: T[], query: string): T[] {
  const q = norm(query).trim()
  const tokens = q.split(/\s+/).filter(Boolean)
  const scored: { item: T; score: number; basic: number; n: string }[] = []
  for (const item of list) {
    const n = norm(item.name)
    let score = 4
    if (tokens.length) {
      if (!tokens.every(t => n.includes(t))) continue
      if (n === q) score = 0
      else if (n.startsWith(q)) score = 1
      else if (tokens.every(t => n.split(/[\s(),/-]+/).some(w => w.startsWith(t)))) score = 2
      else score = 3
    }
    scored.push({ item, score, basic: BASIC_RANK.get(n) ?? Infinity, n })
  }
  const byLength = tokens.length > 0
  scored.sort((a, b) =>
    a.score - b.score
    || (a.basic === b.basic ? 0 : a.basic < b.basic ? -1 : 1)
    || (byLength ? a.n.length - b.n.length : 0)
    || a.n.localeCompare(b.n))
  return scored.map(s => s.item)
}
