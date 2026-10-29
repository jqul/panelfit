import type { DayPlan, TrainingLogs, TrainingPlan, WeekPlan } from '../types'
import { fechaSesion, lunesDeSemana, sumarDias } from './fechasPlan'

// Editar un programa y que el cambio llegue a los clientes que ya lo tienen. Al asignarlo, cada cliente se queda
// con una copia (plan.programId dice de qué programa viene); al guardar el programa, el entrenador elige a quién
// se la actualiza.
//
// Lo que nunca cambia en el cliente:
//   - un día con algo registrado (series, sesión cerrada): sus registros van por posición (`ex_w1_d2_r0`) y
//     cambiar los ejercicios los mezclaría con otros;
//   - un día cuya fecha ya ha pasado, aunque no lo entrenase (es su historial).
// El resto (lo que está por venir) se sustituye por lo que dice el programa ahora. Si el programa tiene más
// semanas, se añaden; si tiene menos, las que sobran se quitan salvo que tengan días que no se tocan.

/** El cliente ya ha registrado algo en ese día. */
export function diaRegistrado(logs: TrainingLogs | null | undefined, w: number, d: number): boolean {
  if (!logs) return false
  if (logs[`finished_w${w}_d${d}`]) return true
  const prefijo = `ex_w${w}_d${d}_`
  return Object.keys(logs).some(k => k.startsWith(prefijo))
}

/** El día ya ha pasado: su fecha (o, si no tiene, el domingo de su semana) es anterior a hoy. */
export function diaPasado(plan: TrainingPlan, w: number, d: number, hoy: string): boolean {
  const fecha = fechaSesion(plan, w, d)
  if (fecha) return fecha < hoy
  const lunes = lunesDeSemana(plan, w)
  return !!lunes && sumarDias(lunes, 6) < hoy
}

const congelado = (plan: TrainingPlan, logs: TrainingLogs | null | undefined, w: number, d: number, hoy: string) =>
  diaRegistrado(logs, w, d) || diaPasado(plan, w, d, hoy)

/** Lo que importa de un día para saber si el entrenador lo cambió a mano. */
const huella = (d: DayPlan | undefined) => d ? JSON.stringify([d.title, d.focus, d.exercises, d.warmup || '', d.warmupExercises || []]) : ''

/**
 * El cliente tiene cambios propios en lo que está por venir: algún día sin congelar que no coincide con lo que
 * daba el programa antes de esta edición. Esos clientes se proponen sin marcar.
 */
export function tieneCambiosPropios(plan: TrainingPlan, logs: TrainingLogs | null | undefined, antes: WeekPlan[], hoy: string): boolean {
  return plan.weeks.some((wk, w) => wk.days.some((dia, d) => !congelado(plan, logs, w, d, hoy) && huella(dia) !== huella(antes[w]?.days?.[d])))
}

export interface Mezcla { plan: TrainingPlan; cambiados: number }

/** Plan del cliente con lo que está por venir sustituido por las semanas nuevas del programa. */
export function mezclarPrograma(plan: TrainingPlan, nuevas: WeekPlan[], logs: TrainingLogs | null | undefined, hoy: string, programName?: string): Mezcla {
  const copia = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
  let cambiados = 0
  // Hasta dónde hay que conservar semanas del cliente: la última con algún día congelado.
  let ultimaCongelada = -1
  plan.weeks.forEach((wk, w) => { if (wk.days.some((_, d) => congelado(plan, logs, w, d, hoy))) ultimaCongelada = w })

  const total = Math.max(nuevas.length, ultimaCongelada + 1)
  const weeks: WeekPlan[] = []
  for (let w = 0; w < total; w++) {
    const actual = plan.weeks[w]
    const nueva = nuevas[w]
    if (!nueva) { weeks.push(actual); continue } // el programa es más corto, pero esta semana tiene días congelados
    if (!actual) { weeks.push(copia(nueva)); cambiados += nueva.days.length; continue }
    // Los días van por posición: si el programa tiene menos días esa semana, solo se quitan los del final que no
    // se han tocado; uno congelado más adelante obliga a conservar los de antes para que no cambie su número.
    let ultimoCongelado = -1
    actual.days.forEach((_, d) => { if (congelado(plan, logs, w, d, hoy)) ultimoCongelado = d })
    const n = Math.max(nueva.days.length, ultimoCongelado + 1)
    const days: DayPlan[] = []
    for (let d = 0; d < n; d++) {
      if (d <= ultimoCongelado && (d >= nueva.days.length || congelado(plan, logs, w, d, hoy))) { days.push(actual.days[d]); continue }
      if (huella(actual.days[d]) !== huella(nueva.days[d])) cambiados++
      days.push(copia(nueva.days[d]))
    }
    cambiados += Math.max(0, actual.days.length - n)
    const week: WeekPlan = { ...actual, label: nueva.label, rpe: nueva.rpe, days }
    if (nueva.isDeload) week.isDeload = true; else delete week.isDeload
    weeks.push(week)
  }
  // Días que se han quitado del final del plan también cuentan como cambio.
  for (let w = total; w < plan.weeks.length; w++) cambiados += plan.weeks[w].days.length

  const out: TrainingPlan = { ...plan, weeks }
  if (programName) out.programName = programName
  // Las sesiones movidas a mano que ya no existen se olvidan.
  if (out.fechasSesion) {
    const vivas = Object.fromEntries(Object.entries(out.fechasSesion).filter(([k]) => {
      const m = k.match(/^w(\d+)_d(\d+)$/)
      return !!m && !!weeks[+m[1]]?.days?.[+m[2]]
    }))
    out.fechasSesion = vivas
  }
  return { plan: out, cambiados }
}
