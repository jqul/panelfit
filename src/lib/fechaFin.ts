import { localDateKey } from './dates'

// Plan con fecha de fin: para llegar a una competición o un evento, se dice cuándo tiene que acabar y se calcula cuándo
// empieza. Las semanas del plan van de lunes a domingo (planWeek), así que el inicio es el lunes que deja la última
// semana del plan en la semana de la fecha de fin.

const lunesDe = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }

/** Fecha de inicio (lunes) para que un plan de `semanas` semanas termine la semana de `fin`. */
export function inicioParaTerminar(fin: string, semanas: number): string {
  const ini = lunesDe(parse(fin))
  ini.setDate(ini.getDate() - 7 * Math.max(0, semanas - 1))
  return localDateKey(ini)
}

/** Domingo en que acaba un plan de `semanas` semanas que empieza `inicio`. */
export function finDePlan(inicio: string, semanas: number): string {
  const f = lunesDe(parse(inicio))
  f.setDate(f.getDate() + 7 * Math.max(1, semanas) - 1)
  return localDateKey(f)
}

/** Si el inicio calculado ya pasó, en qué semana del plan entra hoy (1 = la primera); null si aún no ha empezado. */
export function semanaQueEntra(inicio: string, semanas: number, hoy: Date = new Date()): number | null {
  const n = Math.round((lunesDe(hoy).getTime() - lunesDe(parse(inicio)).getTime()) / (7 * 86400000))
  if (n <= 0) return null
  return Math.min(n + 1, semanas)
}
