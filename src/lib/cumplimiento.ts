import type { TrainingLogs, TrainingPlan } from '../types'
import { localDateKey } from './dates'

// Cumplimiento por día, como los colores de TrainingPeaks: cuánto de lo planificado se hizo.
// En PanelFit lo planificado de una sesión son sus ejercicios; lo hecho, los marcados como hechos.
export type NivelCumplimiento = 'completo' | 'parcial' | 'bajo' | 'fallado' | 'ausente' | 'libre'

/** Tramo en el que el cliente avisó de que no entrena (tabla `ausencias`); solo hacen falta las fechas. */
export type TramoAusencia = { desde: string; hasta: string }

export interface DiaCumplimiento {
  fecha: string
  nivel: NivelCumplimiento
  hechos: number
  previstos: number
}

export const ETIQUETA_NIVEL: Record<NivelCumplimiento, string> = {
  completo: 'Completo',
  parcial: 'A medias',
  bajo: 'Poco',
  fallado: 'No entrenó',
  ausente: 'Ausencia',
  libre: 'Sin entreno',
}

const CLAVE_EJERCICIO = /^ex_w(\d+)_d(\d+)_r(\d+)$/

/** Por fecha: ejercicios hechos y previstos de las sesiones de ese día (puede haber más de una). */
export function sesionesPorFecha(plan: Pick<TrainingPlan, 'weeks'> | null | undefined, logs: TrainingLogs): Record<string, { hechos: number; previstos: number }> {
  const porSesion: Record<string, { fecha: string; w: number; d: number; hechos: number }> = {}
  for (const [key, log] of Object.entries(logs)) {
    const m = key.match(CLAVE_EJERCICIO)
    if (!m || !log?.done || !log.dateDone) continue
    const id = `${log.dateDone}|${m[1]}|${m[2]}`
    ;(porSesion[id] ||= { fecha: log.dateDone, w: +m[1], d: +m[2], hechos: 0 }).hechos++
  }
  const porFecha: Record<string, { hechos: number; previstos: number }> = {}
  for (const s of Object.values(porSesion)) {
    // Sin plan (o un día que ya no existe en él) no se puede saber lo previsto: cuenta como completo.
    const previstos = plan?.weeks?.[s.w]?.days?.[s.d]?.exercises?.length || s.hechos
    const f = (porFecha[s.fecha] ||= { hechos: 0, previstos: 0 })
    f.hechos += s.hechos
    f.previstos += Math.max(previstos, s.hechos)
  }
  return porFecha
}

export function nivelPorPorcentaje(hechos: number, previstos: number): NivelCumplimiento {
  if (previstos <= 0 || hechos <= 0) return 'libre'
  const pct = hechos / previstos
  return pct >= 0.8 ? 'completo' : pct >= 0.5 ? 'parcial' : 'bajo'
}

/** 0 = lunes … 6 = domingo, como `diasElegidos`. */
export function diaSemana(fecha: string): number {
  const d = new Date(fecha + 'T12:00:00').getDay()
  return d === 0 ? 6 : d - 1
}

/**
 * Cumplimiento de un día. "Fallado" solo se dice cuando se sabe: era uno de los días de entreno que
 * eligió el cliente, ya ha pasado y no hay nada registrado. Sin días elegidos, un día vacío es "libre".
 * Un día vacío dentro de una ausencia avisada es "ausente", nunca "fallado": no entrenar estaba previsto.
 */
export function cumplimientoDia(
  fecha: string,
  porFecha: Record<string, { hechos: number; previstos: number }>,
  opts: { diasElegidos?: number[]; desde?: string; hoy?: string; ausencias?: TramoAusencia[] } = {},
): DiaCumplimiento {
  const s = porFecha[fecha]
  if (s && s.hechos > 0) return { fecha, nivel: nivelPorPorcentaje(s.hechos, s.previstos), ...s }
  if (opts.ausencias?.some(a => a.desde <= fecha && fecha <= a.hasta)) return { fecha, nivel: 'ausente', hechos: 0, previstos: 0 }
  const hoy = opts.hoy ?? localDateKey()
  const tocaba = !!opts.diasElegidos?.includes(diaSemana(fecha))
  const fallado = tocaba && fecha < hoy && (!opts.desde || fecha >= opts.desde)
  return { fecha, nivel: fallado ? 'fallado' : 'libre', hechos: 0, previstos: 0 }
}

/** Los últimos 7 días (de más antiguo a hoy), para los puntos de la lista de clientes. */
export function ultimos7Dias(
  plan: (Pick<TrainingPlan, 'weeks'> & { diasElegidos?: number[]; fechaInicio?: string }) | null | undefined,
  logs: TrainingLogs,
  hoy: Date = new Date(),
  ausencias: TramoAusencia[] = [],
): DiaCumplimiento[] {
  const porFecha = sesionesPorFecha(plan, logs)
  const hoyKey = localDateKey(hoy)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoy); d.setDate(hoy.getDate() - (6 - i))
    return cumplimientoDia(localDateKey(d), porFecha, { diasElegidos: plan?.diasElegidos, desde: plan?.fechaInicio, hoy: hoyKey, ausencias })
  })
}
