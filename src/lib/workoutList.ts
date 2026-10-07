import { WeekPlan } from '../types'

// Datos de la lista de Workouts: resumen de cada plantilla, filtros por texto,
// tipo y etiqueta, y cuánto hace que se tocó. Todo puro, para poder probarlo.

interface TemplateLike {
  name: string
  type?: string
  weeks?: WeekPlan[]
  label_ids?: string[]
  updatedAt?: number
}

// Se resume la primera semana: es la que el entrenador reconoce como "el
// workout"; el resto son progresiones de la misma.
export function workoutStats(t: Pick<TemplateLike, 'weeks'>): { weeks: number; days: number; exercises: number } {
  const weeks = t.weeks || []
  const days = weeks[0]?.days || []
  return {
    weeks: weeks.length,
    days: days.length,
    exercises: days.reduce((n, d) => n + (d.exercises?.length || 0), 0),
  }
}

// Tipos presentes en la lista, del más usado al menos (y por nombre al empatar).
export function templateTypes(list: Pick<TemplateLike, 'type'>[]): string[] {
  const count = new Map<string, number>()
  list.forEach(t => { if (t.type) count.set(t.type, (count.get(t.type) || 0) + 1) })
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')).map(([k]) => k)
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Búsqueda por nombre sin tildes ni mayúsculas; una búsqueda vacía lo acepta todo.
export function matchesQuery(name: string, query: string): boolean {
  const q = norm(query.trim())
  return !q || norm(name).includes(q)
}

export function filterTemplates<T extends TemplateLike>(list: T[], f: { query?: string; type?: string | null; labelId?: string | null }): T[] {
  return list.filter(t =>
    matchesQuery(t.name, f.query || '') &&
    (!f.type || t.type === f.type) &&
    (!f.labelId || (t.label_ids || []).includes(f.labelId))
  )
}

export function updatedLabel(updatedAt: number | undefined, now: Date = new Date()): string | null {
  if (!updatedAt) return null
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const d = new Date(updatedAt)
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((start - dayStart) / 86400000)
  if (days <= 0) return 'actualizado hoy'
  if (days === 1) return 'actualizado ayer'
  if (days < 7) return `actualizado hace ${days} días`
  return `actualizado el ${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}
