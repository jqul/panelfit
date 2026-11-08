import type { TrainingLogs, TrainingPlan } from '../types'
import { historialPorEjercicio } from './historialEjercicio'
import { volumenLog } from './volumen'
import { localDateKey } from './dates'

// Hitos del cliente (además de las insignias de racha y de sesiones de lib/badges): primer entreno, récords, toneladas
// movidas, semanas completas del plan, test de RM y competición terminada. Todo sale de lo que ya registra; nada se
// guarda aparte. Puro, para probarlo.

export interface Hito { id: string; emoji: string; label: string; detalle: string }

const fmtT = (kg: number) => (kg / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })

/** Récords: sesiones en las que el 1RM estimado de un ejercicio superó a todas las anteriores (la primera no cuenta). */
export function contarRecords(logs: TrainingLogs, plan?: TrainingPlan | null): number {
  let n = 0
  for (const h of historialPorEjercicio(logs, plan)) {
    let mejor = 0
    for (const s of [...h.sesiones].reverse()) { // de la más antigua a la más reciente
      if (mejor > 0 && s.e1rm > mejor) n++
      mejor = Math.max(mejor, s.e1rm)
    }
  }
  return n
}

/** Semanas del plan con todas sus sesiones hechas (al menos un ejercicio hecho en cada día con ejercicios). */
export function semanasCompletas(logs: TrainingLogs, plan?: TrainingPlan | null): number {
  if (!plan?.weeks?.length) return 0
  return plan.weeks.filter((w, wi) => {
    const dias = (w.days || []).map((d, di) => ({ d, di })).filter(({ d }) => d.exercises?.length)
    return dias.length > 0 && dias.every(({ d, di }) => d.exercises.some((_, ri) => logs[`ex_w${wi}_d${di}_r${ri}`]?.done))
  }).length
}

/** Los hitos conseguidos, en el orden en que se suelen conseguir. */
export function hitosConseguidos(logs: TrainingLogs, plan?: TrainingPlan | null, hoy: string = localDateKey()): Hito[] {
  const hechos = Object.values(logs || {}).filter(l => l?.done && l.dateDone)
  const out: Hito[] = []
  if (hechos.length) out.push({ id: 'primer_entreno', emoji: '🌱', label: 'Primer entreno', detalle: 'El primero de muchos' })

  const records = contarRecords(logs, plan)
  if (records >= 1) out.push({ id: 'primer_record', emoji: '🥇', label: 'Primer récord', detalle: 'Superaste tu mejor marca en un ejercicio' })
  if (records >= 10) out.push({ id: 'records_10', emoji: '🏋️', label: '10 récords', detalle: `${records} récords en total` })

  const toneladas = Object.values(logs || {}).reduce((s, l) => s + volumenLog(l), 0)
  if (toneladas >= 10_000) out.push({ id: 'toneladas_10', emoji: '🦾', label: '10 toneladas', detalle: `${fmtT(toneladas)} t movidas en total` })
  if (toneladas >= 100_000) out.push({ id: 'toneladas_100', emoji: '🚀', label: '100 toneladas', detalle: `${fmtT(toneladas)} t movidas en total` })

  const semanas = semanasCompletas(logs, plan)
  if (semanas >= 1) out.push({ id: 'semana_completa', emoji: '✅', label: 'Semana completa', detalle: 'Todas las sesiones de una semana del plan' })
  if (semanas >= 4) out.push({ id: 'semanas_4', emoji: '📅', label: '4 semanas completas', detalle: `${semanas} semanas sin saltarte ninguna sesión` })

  const testHecho = plan?.weeks?.some((w, wi) => w.days?.some((d, di) => d.exercises?.some((e, ri) => e.testRM && logs[`ex_w${wi}_d${di}_r${ri}`]?.done)))
  if (testHecho) out.push({ id: 'test_rm', emoji: '🎯', label: 'Test de RM hecho', detalle: 'Tu marca de referencia ya está al día' })

  const comp = plan?.competicion
  if (comp?.fecha && comp.fecha < hoy) out.push({ id: 'competicion', emoji: '🏆', label: 'Competición terminada', detalle: comp.nombre || 'A por la siguiente' })
  return out
}
