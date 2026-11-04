import { localDateKey } from './dates'
import { tareasDelDia } from './tareas'
import type { Tarea } from './tareas'

// «Tu semana» en Hoy del cliente: cuánto lleva hecho de lo que le toca esta semana (de lunes a hoy), por tipo —
// entrenos del plan, hábitos, tareas sueltas y check-in diario — y un porcentaje global (la media de los que tienen
// algo previsto). Lo que no tiene nada previsto no sale. Puro: recibe los datos ya leídos.

export interface ParteSemana { id: 'entrenos' | 'habitos' | 'tareas' | 'checkin'; label: string; hechas: number; previstas: number; pct: number }

/** Del lunes de esta semana a hoy, en fechas locales. */
export function diasDeLaSemana(hoy: Date = new Date()): string[] {
  const l = new Date(hoy); l.setHours(0, 0, 0, 0); l.setDate(l.getDate() - ((l.getDay() + 6) % 7))
  const out: string[] = []
  for (const d = new Date(l); localDateKey(d) <= localDateKey(hoy); d.setDate(d.getDate() + 1)) out.push(localDateKey(d))
  return out
}

export function resumenSemanal(o: {
  dias: string[]
  entrenos: { hechas: number; previstas: number }
  habitos?: { total: number; hechosPorDia: Record<string, number> }
  tareas?: { lista: Pick<Tarea, 'id' | 'fecha' | 'repetir' | 'dias' | 'hasta'>[]; hechas: { tarea_id: string; fecha: string }[] }
  checkins?: string[] // fechas con check-in
}): { partes: ParteSemana[]; pct: number | null } {
  const partes: ParteSemana[] = []
  const parte = (id: ParteSemana['id'], label: string, hechas: number, previstas: number) => {
    if (previstas > 0) partes.push({ id, label, hechas: Math.min(hechas, previstas), previstas, pct: Math.round((Math.min(hechas, previstas) / previstas) * 100) })
  }
  parte('entrenos', 'Entrenos', o.entrenos.hechas, o.entrenos.previstas)
  if (o.habitos && o.habitos.total > 0) {
    parte('habitos', 'Hábitos', o.dias.reduce((a, d) => a + Math.min(o.habitos!.hechosPorDia[d] || 0, o.habitos!.total), 0), o.habitos.total * o.dias.length)
  }
  if (o.tareas) {
    let previstas = 0, hechas = 0
    const hechasSet = new Set(o.tareas.hechas.map(h => `${h.tarea_id}|${h.fecha}`))
    for (const d of o.dias) for (const t of tareasDelDia(o.tareas.lista, d)) { previstas++; if (hechasSet.has(`${t.id}|${d}`)) hechas++ }
    parte('tareas', 'Tareas', hechas, previstas)
  }
  if (o.checkins) parte('checkin', 'Check-in', o.dias.filter(d => o.checkins!.includes(d)).length, o.dias.length)
  const pct = partes.length ? Math.round(partes.reduce((a, p) => a + p.pct, 0) / partes.length) : null
  return { partes, pct }
}
