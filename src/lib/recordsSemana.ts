import type { TrainingLogs, TrainingPlan } from '../types'
import { historialPorEjercicio } from './historialEjercicio'

// Récords de la semana de todos los clientes: a quién felicitar y qué contar. Un récord es una sesión de esta semana
// (desde el lunes) cuyo 1RM estimado de un ejercicio supera al mejor de antes (la primera vez no cuenta). Puro.

export interface RecordSemana { clientId: string; nombre: string; ejercicio: string; fecha: string; antes: number; ahora: number }

const r1 = (n: number) => Math.round(n * 10) / 10

/** Lunes de la semana de `hoy` ('YYYY-MM-DD'). */
export function lunesDe(hoy: string): string {
  const d = new Date(hoy + 'T12:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function recordsDeLaSemana(
  clientes: { id: string; name: string; surname?: string }[],
  logsMap: Record<string, TrainingLogs | undefined>,
  planes: Record<string, TrainingPlan | null | undefined>,
  hoy: string,
): RecordSemana[] {
  const desde = lunesDe(hoy)
  const out: RecordSemana[] = []
  for (const c of clientes) {
    for (const h of historialPorEjercicio(logsMap[c.id] || {}, planes[c.id])) {
      const antes = Math.max(0, ...h.sesiones.filter(s => s.date < desde).map(s => s.e1rm))
      if (antes <= 0) continue
      const semana = h.sesiones.filter(s => s.date >= desde && s.date <= hoy && s.e1rm > antes)
      if (!semana.length) continue
      const mejor = semana.reduce((a, b) => (b.e1rm > a.e1rm ? b : a))
      out.push({ clientId: c.id, nombre: `${c.name} ${c.surname || ''}`.trim(), ejercicio: h.name, fecha: mejor.date, antes: r1(antes), ahora: r1(mejor.e1rm) })
    }
  }
  return out.sort((a, b) => (b.ahora - b.antes) / b.antes - (a.ahora - a.antes) / a.antes)
}
