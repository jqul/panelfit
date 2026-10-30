// Bonos de sesiones (tabla bonos_cliente): cuántas quedan y si sigue valiendo. Las citas se descuentan solas en la base
// de datos (trigger asignar_bono); aquí solo se cuenta. Todo puro, para probarlo.

export interface Bono { id: string; nombre: string; sesiones: number; caduca: string | null; created_at?: string }
export interface EstadoBono { usadas: number; quedan: number; estado: 'activo' | 'agotado' | 'caducado' }

/** `usadas`: citas no canceladas que descuentan de ese bono. `hoy`: 'YYYY-MM-DD'. */
export function estadoBono(b: Bono, usadas: number, hoy: string): EstadoBono {
  const quedan = Math.max(0, b.sesiones - usadas)
  const estado = b.caduca && b.caduca < hoy ? 'caducado' : quedan === 0 ? 'agotado' : 'activo'
  return { usadas, quedan, estado }
}

/** Citas no canceladas por bono. */
export function usadasPorBono(citas: { bono_id: string | null; status: string }[]): Record<string, number> {
  const n: Record<string, number> = {}
  for (const c of citas) if (c.bono_id && c.status !== 'cancelada') n[c.bono_id] = (n[c.bono_id] || 0) + 1
  return n
}

/** Los activos primero (el que caduca antes, como el trigger), luego los agotados y caducados. */
export function ordenarBonos<T extends Bono>(bonos: T[], usadas: Record<string, number>, hoy: string): T[] {
  const peso = (b: T) => ({ activo: 0, agotado: 1, caducado: 2 })[estadoBono(b, usadas[b.id] || 0, hoy).estado]
  return [...bonos].sort((a, b) => peso(a) - peso(b) || (a.caduca ?? '9999').localeCompare(b.caduca ?? '9999') || (a.created_at ?? '').localeCompare(b.created_at ?? ''))
}

export const fechaCorta = (f: string) => new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
