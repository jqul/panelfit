import type { TrainingLogs, TrainingPlan } from '../types'
import { estimate1RM } from './strength'
import { cuentaEnProgreso } from './cuentaEnProgreso'

// Marca de referencia para programar por %1RM ("tomar marca"). El entrenador puede:
//   - poner un ejercicio del plan como test de RM (Exercise.testRM): ese día el cliente sube hasta su máximo y su mejor
//     serie (1RM estimado, Epley) pasa a ser la marca;
//   - escribir la marca a mano (TrainingPlan.marcas), por ejemplo la de una competición.
// Manda la más reciente de las dos. Sin ninguna, la de siempre: el mejor 1RM estimado de todo el historial.
// Las series que se marcaron "no contar" no cuentan (lib/cuentaEnProgreso).

export type OrigenMarca = 'test' | 'manual' | 'estimado'
export interface Marca { kg: number; fecha?: string; origen: OrigenMarca }

const clave = (nombre: string) => nombre.trim().toLowerCase()
const r1 = (n: number) => Math.round(n * 10) / 10

/** Mejor 1RM estimado de un registro (0 si no hay series válidas). */
function mejorDelLog(sets: Record<number, { weight?: string; reps?: string; tipo?: string }> | undefined): number {
  let best = 0
  for (const s of Object.values(sets || {})) {
    if (s?.tipo === 'calentamiento') continue
    const rm = estimate1RM(parseFloat(String(s?.weight ?? '').replace(',', '.')) || 0, parseFloat(String(s?.reps ?? '')) || 0)
    if (rm > best) best = rm
  }
  return best
}

/** Cada vez que se ha hecho este ejercicio en el plan: fecha, mejor 1RM estimado y si era un test de RM. */
function sesiones(nombre: string, plan: Pick<TrainingPlan, 'weeks'>, logs: TrainingLogs) {
  const out: { fecha: string; kg: number; test: boolean }[] = []
  plan.weeks?.forEach((w, wi) => w.days?.forEach((d, di) => d.exercises?.forEach((ex, ri) => {
    if (clave(ex.name) !== clave(nombre)) return
    const log = logs[`ex_w${wi}_d${di}_r${ri}`]
    if (!log?.dateDone || log.substituteName || !cuentaEnProgreso(log)) return
    const kg = mejorDelLog(log.sets)
    if (kg > 0) out.push({ fecha: log.dateDone, kg, test: !!ex.testRM })
  })))
  return out
}

/** La marca con la que se calculan los % de este ejercicio, o null si aún no hay nada. */
export function marcaDeReferencia(nombre: string, plan: Pick<TrainingPlan, 'weeks' | 'marcas'>, logs: TrainingLogs): Marca | null {
  const ses = sesiones(nombre, plan, logs)
  const candidatas: Marca[] = []
  // Del test: el mejor de su último día de test
  const tests = ses.filter(s => s.test)
  if (tests.length) {
    const ultima = tests.reduce((a, b) => (b.fecha > a.fecha ? b : a)).fecha
    candidatas.push({ kg: r1(Math.max(...tests.filter(t => t.fecha === ultima).map(t => t.kg))), fecha: ultima, origen: 'test' })
  }
  const manual = plan.marcas?.[clave(nombre)]
  if (manual && manual.kg > 0) candidatas.push({ kg: r1(manual.kg), fecha: manual.fecha, origen: 'manual' })
  if (candidatas.length) {
    // La más reciente; a igualdad de fecha, el test (es lo que de verdad ha movido)
    return candidatas.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (a.origen === 'test' ? -1 : 1))[0]
  }
  const mejor = ses.reduce((m, s) => Math.max(m, s.kg), 0)
  return mejor > 0 ? { kg: r1(mejor), origen: 'estimado' } : null
}

/** Para el texto junto al peso: "según tu marca del 3 nov" / "según tu 1RM estimado". */
export function textoOrigen(m: Marca): string {
  if (m.origen === 'estimado' || !m.fecha) return 'según tu 1RM estimado'
  const f = new Date(m.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  return m.origen === 'test' ? `según tu test del ${f}` : `según tu marca del ${f}`
}

/** Ejercicios del plan programados por % (o con test de RM): los que necesitan marca. Sin repetir, en orden. */
export function ejerciciosConMarca(plan: Pick<TrainingPlan, 'weeks'>): string[] {
  const vistos = new Map<string, string>()
  plan.weeks?.forEach(w => w.days?.forEach(d => d.exercises?.forEach(ex => {
    if (!ex.name?.trim()) return
    if (ex.testRM || /^\s*\d{1,3}(?:[.,]\d+)?\s*%\s*$/.test(ex.weight || '')) if (!vistos.has(clave(ex.name))) vistos.set(clave(ex.name), ex.name.trim())
  })))
  return [...vistos.values()]
}

/** Pone (o quita, con kg vacío) una marca a mano. Devuelve las marcas nuevas del plan. */
export function conMarca(marcas: TrainingPlan['marcas'], nombre: string, kg: number | null, fecha: string): NonNullable<TrainingPlan['marcas']> {
  const out = { ...(marcas || {}) }
  if (kg && kg > 0) out[clave(nombre)] = { kg: r1(kg), fecha }
  else delete out[clave(nombre)]
  return out
}
