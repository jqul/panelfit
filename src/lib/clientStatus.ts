// Estado de un cliente de un vistazo para la lista de Clientes: un nivel, una
// etiqueta y los motivos concretos, para que el entrenador sepa quién necesita
// atención sin abrir cada ficha.

export type StatusLevel = 'risk' | 'review' | 'no-plan' | 'ok'

export interface StatusInput {
  hasPlan?: boolean
  doneToday?: boolean
  lastActive?: string
  atRisk?: boolean
  highAcwr?: boolean
  acwrRatio?: number | null
  highJumpDrop?: boolean
  jumpDropPct?: number | null
  planEndingSoon?: boolean
}

export interface ClientStatus {
  level: StatusLevel
  label: string
  reasons: string[]
}

const DAY = 86400000

// Días naturales desde `date` (YYYY-MM-DD) hasta `now`; null si nunca ha entrenado.
export function daysSince(date: string | undefined, now: Date): number | null {
  if (!date) return null
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const d = new Date(date + 'T00:00:00').getTime()
  if (isNaN(d)) return null
  return Math.max(0, Math.round((start - d) / DAY))
}

const fmt = (n: number) => String(n).replace('.', ',')

export function clientStatus(c: StatusInput, now: Date = new Date()): ClientStatus {
  const days = daysSince(c.lastActive, now)
  const reasons: string[] = []

  if (!c.hasPlan) return { level: 'no-plan', label: 'Sin plan', reasons: ['Sin plan asignado'] }

  if (days === null) reasons.push('Aún no ha entrenado')
  else if (!c.doneToday && days >= 4) reasons.push(`${days} días sin entrenar`)
  if (c.highAcwr) reasons.push(c.acwrRatio ? `Carga alta (ACWR ${fmt(c.acwrRatio)})` : 'Carga alta')
  if (c.highJumpDrop) reasons.push(c.jumpDropPct ? `Caída de salto ${fmt(Math.abs(c.jumpDropPct))}%` : 'Caída de salto')
  if (c.planEndingSoon) reasons.push('El plan termina pronto')

  if (c.atRisk || days === null || days >= 14) return { level: 'risk', label: 'En riesgo', reasons }
  if (reasons.length > 0) return { level: 'review', label: 'Revisar', reasons }
  return { level: 'ok', label: c.doneToday ? 'Entrenó hoy' : 'Al día', reasons }
}

const SEVERITY: Record<StatusLevel, number> = { risk: 0, review: 1, 'no-plan': 2, ok: 3 }

export type ClientSort = 'attention' | 'name' | 'last' | 'adherence'

interface Sortable extends StatusInput { name: string; surname?: string; weeklyDays?: number }

// Orden estable; los empates se resuelven por nombre.
export function sortClients<T extends Sortable>(list: T[], by: ClientSort, now: Date = new Date()): T[] {
  const name = (c: T) => `${c.name} ${c.surname || ''}`.trim().toLowerCase()
  const byName = (a: T, b: T) => name(a).localeCompare(name(b), 'es')
  const copy = [...list]
  if (by === 'name') return copy.sort(byName)
  if (by === 'attention') {
    return copy.sort((a, b) => SEVERITY[clientStatus(a, now).level] - SEVERITY[clientStatus(b, now).level] || byName(a, b))
  }
  if (by === 'last') {
    // Quien lleva más tiempo sin entrenar, primero; "nunca" es lo más antiguo.
    const age = (c: T) => daysSince(c.lastActive, now) ?? Infinity
    return copy.sort((a, b) => (age(b) === age(a) ? byName(a, b) : age(b) - age(a)))
  }
  // adherence: la más baja primero (quien más ayuda necesita); sin plan al final.
  const adh = (c: T) => (c.hasPlan ? Math.min(100, Math.round(((c.weeklyDays || 0) / 4) * 100)) : Infinity)
  return copy.sort((a, b) => (adh(a) === adh(b) ? byName(a, b) : adh(a) - adh(b)))
}
