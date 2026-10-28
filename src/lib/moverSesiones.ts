import type { TrainingLogs, TrainingPlan } from '../types'
import { claveSesion, fechaPrevista, fechaSesion, lunesDeSemana, sumarDias } from './fechasPlan'

// Lo que solo usa el calendario del plan del entrenador (listar y mover sesiones). Aparte de ./fechasPlan para que
// la app del cliente, que solo necesita saber la fecha de cada sesión, no lo descargue.

// Reparto habitual cuando el plan no dice qué día va cada sesión (ni título con día ni días elegidos por el
// cliente): 3 sesiones → lunes, miércoles y viernes; 4 → lunes, martes, jueves y viernes… Solo es una propuesta
// para verlas en el calendario; al cliente no se le enseña como fecha hasta que el entrenador la fija.
const REPARTO: Record<number, number[]> = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] }

export interface SesionFechada {
  w: number; d: number; clave: string; titulo: string
  /** Dónde se pinta: el día en que la hizo si ya la empezó; si no, su fecha (movida, prevista o propuesta). */
  fecha: string | null
  movida: boolean
  /** La fecha es solo la propuesta del reparto habitual: el plan no la fija. */
  propuesta: boolean
  /** Día en que la hizo (el último ejercicio marcado), si ya la empezó. */
  hechaEl: string | null
}

function ultimoDiaHecho(logs: TrainingLogs, clave: string): string | null {
  let ultimo: string | null = null
  for (const [k, l] of Object.entries(logs)) {
    if (l?.done && l.dateDone && k.startsWith(`ex_${clave}_r`) && (!ultimo || l.dateDone > ultimo)) ultimo = l.dateDone
  }
  return ultimo
}

/** Todas las sesiones del plan con su fecha, en orden de semana y día. */
export function sesionesDelPlan(plan: TrainingPlan, logs: TrainingLogs = {}): SesionFechada[] {
  return (plan.weeks || []).flatMap((semana, w) => (semana.days || []).map((dia, d) => {
    const clave = claveSesion(w, d)
    const hechaEl = ultimoDiaHecho(logs, clave)
    const delPlan = fechaSesion(plan, w, d)
    const lunes = lunesDeSemana(plan, w)
    const reparto = REPARTO[semana.days.length]
    const propuesta = !delPlan && lunes && reparto ? sumarDias(lunes, reparto[d]) : null
    return {
      w, d, clave, titulo: dia.title || `Día ${d + 1}`,
      fecha: hechaEl ?? delPlan ?? propuesta,
      movida: !!plan.fechasSesion?.[clave],
      propuesta: !hechaEl && !delPlan && !!propuesta,
      hechaEl,
    }
  }))
}

/**
 * Mueve una sesión a otra fecha (o la devuelve a la suya con `null`). Si la fecha nueva es justo la prevista, no
 * guarda excepción: así "volver a su día" y "mover a su día" dejan el plan igual que estaba.
 */
export function moverSesion<P extends TrainingPlan>(plan: P, w: number, d: number, fecha: string | null): P {
  const clave = claveSesion(w, d)
  const resto = { ...(plan.fechasSesion || {}) }
  delete resto[clave]
  if (fecha && fecha !== fechaPrevista(plan, w, d)) resto[clave] = fecha
  const { fechasSesion: _, ...sinFechas } = plan
  return (Object.keys(resto).length ? { ...sinFechas, fechasSesion: resto } : sinFechas) as P
}
