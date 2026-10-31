import { TrainingLogs, TrainingPlan } from '../types'
import { estimate1RM } from './strength'

// Historial de cada ejercicio para el cliente: qué hizo cada día que lo entrenó (series, mejor serie, 1RM estimado y
// volumen). Lo usan la vista «Por ejercicio» de Progreso y la ficha del ejercicio dentro del entreno. Puro: recibe
// logs y plan. Si en una sesión lo cambió por otro, cuenta para el que hizo de verdad.

export interface SerieHecha { weight: number; reps: number }
export interface SesionEjercicio {
  date: string
  series: SerieHecha[]
  mejor: SerieHecha | null   // la de más peso (a igual peso, más reps)
  e1rm: number               // mejor 1RM estimado del día (Epley, series de hasta 10 reps)
  volumen: number
}
export interface HistorialDeEjercicio { name: string; sesiones: SesionEjercicio[] /* más reciente primero */ }

const KEY_RE = /^ex_w(\d+)_d(\d+)_r(\d+)$/
const r1 = (n: number) => Math.round(n * 10) / 10

export function historialPorEjercicio(logs: TrainingLogs, plan?: TrainingPlan | null): HistorialDeEjercicio[] {
  const porNombre = new Map<string, { name: string; dias: Map<string, SerieHecha[]> }>()
  for (const [key, log] of Object.entries(logs || {})) {
    if (!log?.done || !log.dateDone) continue
    const m = key.match(KEY_RE)
    const name = (log.substituteName || (m && plan?.weeks?.[+m[1]]?.days?.[+m[2]]?.exercises?.[+m[3]]?.name) || '').trim()
    if (!name) continue
    const series = Object.values(log.sets || {})
      .map(s => ({ weight: parseFloat(String(s?.weight ?? '').replace(',', '.')) || 0, reps: parseInt(String(s?.reps ?? '')) || 0 }))
      .filter(s => s.reps > 0)
    if (!series.length) continue
    const clave = name.toLowerCase()
    const e = porNombre.get(clave) ?? { name, dias: new Map() }
    e.dias.set(log.dateDone, [...(e.dias.get(log.dateDone) || []), ...series])
    porNombre.set(clave, e)
  }
  const lista: HistorialDeEjercicio[] = []
  for (const { name, dias } of porNombre.values()) {
    const sesiones = [...dias.entries()].map(([date, series]): SesionEjercicio => {
      let mejor: SerieHecha | null = null, e1rm = 0, volumen = 0
      for (const s of series) {
        if (s.weight > 0 && (!mejor || s.weight > mejor.weight || (s.weight === mejor.weight && s.reps > mejor.reps))) mejor = s
        if (s.weight > 0 && s.reps <= 10) e1rm = Math.max(e1rm, estimate1RM(s.weight, s.reps))
        volumen += s.weight * s.reps
      }
      return { date, series, mejor, e1rm: r1(e1rm), volumen: r1(volumen) }
    }).sort((a, b) => b.date.localeCompare(a.date))
    lista.push({ name, sesiones })
  }
  // Primero lo entrenado más recientemente; a igual fecha, por nombre
  return lista.sort((a, b) => b.sesiones[0].date.localeCompare(a.sesiones[0].date) || a.name.localeCompare(b.name, 'es'))
}

/** Cambio del 1RM estimado entre la primera y la última sesión con peso (null si hay menos de dos). */
export function cambioE1rm(sesiones: SesionEjercicio[]): number | null {
  const conPeso = sesiones.filter(s => s.e1rm > 0)
  if (conPeso.length < 2) return null
  return r1(conPeso[0].e1rm - conPeso[conPeso.length - 1].e1rm)
}
