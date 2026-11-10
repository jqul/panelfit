import type { TrainingLogs, TrainingPlan } from '../types'
import { sesionesPorFecha, nivelPorPorcentaje } from './cumplimiento'

// Calidad del servicio de un mes, para Negocio: cuántas sesiones hicieron los clientes, cuántas completas (lo previsto
// hecho en un 80 % o más, como en lib/cumplimiento), cómo las valoraron (la reacción al terminar: session_reactions) y
// el esfuerzo medio que marcaron (RPE de la sesión: session_load). Puro, para probarlo.

export interface ClienteServicio { id: string; plan?: Pick<TrainingPlan, 'weeks'> | null; logs: TrainingLogs }
export interface ReaccionServicio { clientId: string; date: string; emoji: string }
export interface CargaServicio { client_id: string; date: string; rpe: number }

export const POSITIVAS = ['🔥', '💪', '👍']
export const DURAS = ['😅', '😩']
export const MOLESTIA = '🤕'

export interface CifrasServicio {
  sesiones: number
  clientes: number           // clientes que entrenaron ese mes
  completas: number
  pctCompletas: number | null
  reacciones: { total: number; positivas: number; duras: number; molestias: number; pctPositivas: number | null; porEmoji: Record<string, number> }
  rpe: { media: number | null; n: number }
}

const delMes = (fecha: string, mes: string) => fecha.slice(0, 7) === mes
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null)

/** `mes` en formato 'YYYY-MM'. */
export function cifrasServicio(clientes: ClienteServicio[], reacciones: ReaccionServicio[], cargas: CargaServicio[], mes: string): CifrasServicio {
  const ids = new Set(clientes.map(c => c.id))
  let sesiones = 0, completas = 0, conEntreno = 0
  for (const c of clientes) {
    const dias = Object.entries(sesionesPorFecha(c.plan, c.logs || {})).filter(([f]) => delMes(f, mes))
    if (dias.length) conEntreno++
    sesiones += dias.length
    completas += dias.filter(([, s]) => nivelPorPorcentaje(s.hechos, s.previstos) === 'completo').length
  }

  const rs = reacciones.filter(r => ids.has(r.clientId) && delMes(r.date, mes))
  const porEmoji: Record<string, number> = {}
  for (const r of rs) porEmoji[r.emoji] = (porEmoji[r.emoji] || 0) + 1
  const positivas = rs.filter(r => POSITIVAS.includes(r.emoji)).length

  const cs = cargas.filter(c => ids.has(c.client_id) && delMes(c.date, mes) && Number(c.rpe) > 0)
  const media = cs.length ? Math.round((cs.reduce((s, c) => s + Number(c.rpe), 0) / cs.length) * 10) / 10 : null

  return {
    sesiones, clientes: conEntreno, completas, pctCompletas: pct(completas, sesiones),
    reacciones: {
      total: rs.length, positivas,
      duras: rs.filter(r => DURAS.includes(r.emoji)).length,
      molestias: rs.filter(r => r.emoji === MOLESTIA).length,
      pctPositivas: pct(positivas, rs.length), porEmoji,
    },
    rpe: { media, n: cs.length },
  }
}

/** 'YYYY-MM' del mes que está `n` meses antes o después. */
export function moverMes(mes: string, n: number): string {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(a, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
