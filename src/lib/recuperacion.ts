// Recuperación y actividad por semana: horas de sueño, pasos y cualquier otro hábito con número (lib/habitoNumerico), y
// el cardio de los entrenos del reloj (tabla `actividades`). Sin React ni red, para probarlo.
//
// Se enseña EN CRUDO y al lado de la carga de entrenamiento, sin concluir nada: que dormir poco coincida con un
// rendimiento peor puede tener muchas causas. Una media semanal solo vale si se apuntó en varios días: siempre se dice
// en cuántos.

import { lunesDeISO } from './exposicionCargas'
import type { Deporte } from './actividadReloj'

export interface HabitoConNumero { id: string; text: string; meta?: number | null; unidad?: string | null }
export interface RegistroDia { date: string; valores?: Record<string, number> | null }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

/** ¿Este hábito mide el sueño? Por la unidad (h, horas) o por el nombre (dormir, sueño). Solo si lleva meta numérica. */
export function esHabitoSueno(h: HabitoConNumero): boolean {
  if (!(typeof h.meta === 'number' && h.meta > 0)) return false
  const u = norm(h.unidad ?? '')
  return u === 'h' || u === 'hs' || u === 'hora' || u === 'horas' || /dorm|sueno/.test(norm(h.text))
}

export interface MediaSemana { media: number; dias: number; min: number; max: number }

/** Media por semana de un hábito numérico, sobre los días en que se apuntó (un 0 también es un dato). */
export function mediasSemanales(registros: RegistroDia[], habitoId: string): Record<string, MediaSemana> {
  const acum: Record<string, { suma: number; dias: number; min: number; max: number }> = {}
  for (const r of registros) {
    const v = r.valores?.[habitoId]
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) continue
    const a = (acum[lunesDeISO(r.date)] ??= { suma: 0, dias: 0, min: v, max: v })
    a.suma += v; a.dias++; a.min = Math.min(a.min, v); a.max = Math.max(a.max, v)
  }
  const out: Record<string, MediaSemana> = {}
  for (const [s, a] of Object.entries(acum)) out[s] = { media: a.suma / a.dias, dias: a.dias, min: a.min, max: a.max }
  return out
}

export interface ActividadResumen { fecha: string; deporte: Deporte; duracionS: number; distanciaM: number | null }
export interface CardioSemana { minutos: number; sesiones: number; distanciaKm: number; porDeporte: Partial<Record<Deporte, number>> }

/** Cardio por semana a partir de los entrenos del reloj. Los de «fuerza» no son cardio y se dejan fuera. */
export function cardioPorSemana(actividades: ActividadResumen[]): Record<string, CardioSemana> {
  const out: Record<string, CardioSemana> = {}
  for (const a of actividades) {
    if (a.deporte === 'fuerza' || !(a.duracionS > 0)) continue
    const s = (out[lunesDeISO(a.fecha)] ??= { minutos: 0, sesiones: 0, distanciaKm: 0, porDeporte: {} })
    const min = a.duracionS / 60
    s.minutos += min
    s.sesiones++
    if (a.distanciaM) s.distanciaKm += a.distanciaM / 1000
    s.porDeporte[a.deporte] = (s.porDeporte[a.deporte] ?? 0) + min
  }
  return out
}

/** Las últimas `n` semanas con algún dato en cualquiera de las fuentes, de la más antigua a la más reciente. */
export function ultimasSemanas(fuentes: Record<string, unknown>[], n: number): string[] {
  const todas = new Set<string>()
  for (const f of fuentes) for (const k of Object.keys(f)) todas.add(k)
  return [...todas].sort().slice(-n)
}
