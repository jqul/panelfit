// Qué le queda por hacer hoy a un cliente: la sesión del plan que cae hoy (si no está hecha) y las tareas sueltas que
// tocan hoy y no ha marcado. Lo usa la función `recordatorio-diario` para el aviso de las 18:00.
//
// Autocontenido a propósito (sin imports): Deno no resuelve los imports sin extensión de src/. Repite las reglas de
// src/lib/fechasPlan.ts (fecha de cada sesión) y src/lib/tareas.ts (qué día toca una tarea); src/lib/pendientesHoy.test.ts
// comprueba que dan lo mismo.
//
// Solo cuenta una sesión si el plan dice qué día cae (movida a mano, día en el título o días elegidos por el cliente):
// sin fecha no se sabe si hoy tocaba y es mejor no molestar.

export interface Plan {
  fechaInicio?: string
  diasElegidos?: number[]
  fechasSesion?: Record<string, string>
  weeks?: { days?: { title?: string; exercises?: unknown[] }[] }[]
}
export type Logs = Record<string, { done?: boolean; sessionFinished?: boolean } | undefined>
export interface TareaLite { id: string; titulo: string; fecha: string; repetir: 'una' | 'diaria' | 'semanal'; dias: number[]; hasta: string | null }
export interface Pendientes { sesion: string | null; tareas: string[] }

const NOMBRES_DIA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

function diaDelTitulo(titulo = ''): number | null {
  const norm = titulo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const i = NOMBRES_DIA.findIndex(n => norm.includes(n))
  return i === -1 ? null : i
}
function desdeFecha(f: string): Date { const [y, m, d] = f.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 12)) }
function aFecha(d: Date): string { return d.toISOString().slice(0, 10) }
export function sumarDias(f: string, n: number): string { const d = desdeFecha(f); d.setUTCDate(d.getUTCDate() + n); return aFecha(d) }
/** 0 = lunes … 6 = domingo. */
export function diaSemana(f: string): number { return (desdeFecha(f).getUTCDay() + 6) % 7 }
const lunesDe = (f: string) => sumarDias(f, -diaSemana(f))

/** Fecha de la sesión (w, d): movida a mano, o la que le toca por título o por días elegidos; null si no se sabe. */
export function fechaSesion(plan: Plan, w: number, d: number): string | null {
  const movida = plan.fechasSesion?.[`w${w}_d${d}`]
  if (movida) return movida
  const dia = plan.weeks?.[w]?.days?.[d]
  if (!plan.fechaInicio || !dia) return null
  const lunes = sumarDias(lunesDe(plan.fechaInicio), w * 7)
  const delTitulo = diaDelTitulo(dia.title)
  if (delTitulo !== null) return sumarDias(lunes, delTitulo)
  const elegidos = [...new Set(plan.diasElegidos || [])].filter(x => x >= 0 && x <= 6).sort((a, b) => a - b)
  return d < elegidos.length ? sumarDias(lunes, elegidos[d]) : null
}

export function tocaEl(t: Pick<TareaLite, 'fecha' | 'repetir' | 'dias' | 'hasta'>, fecha: string): boolean {
  if (fecha < t.fecha || (t.hasta && fecha > t.hasta)) return false
  if (t.repetir === 'una') return fecha === t.fecha
  if (t.repetir === 'diaria') return true
  return (t.dias || []).includes(diaSemana(fecha))
}

function sesionHecha(plan: Plan, logs: Logs, w: number, d: number): boolean {
  if (logs[`finished_w${w}_d${d}`]?.sessionFinished) return true
  const ejercicios = plan.weeks?.[w]?.days?.[d]?.exercises || []
  if (!ejercicios.length) return true // un día sin ejercicios no es algo que recordar
  return ejercicios.every((_, r) => logs[`ex_w${w}_d${d}_r${r}`]?.done)
}

export function pendientesDeHoy(plan: Plan | null, logs: Logs | null, tareas: TareaLite[], hechas: Set<string>, hoy: string): Pendientes {
  let sesion: string | null = null
  if (plan?.weeks?.length && !(plan.fechaInicio && plan.fechaInicio > hoy && !Object.values(plan.fechasSesion || {}).includes(hoy))) {
    outer: for (let w = 0; w < plan.weeks.length; w++) {
      const dias = plan.weeks[w]?.days || []
      for (let d = 0; d < dias.length; d++) {
        if (fechaSesion(plan, w, d) !== hoy) continue
        // Una sesión movida a otro día ya no es de hoy aunque su fecha prevista lo sea (fechaSesion ya lo tiene en cuenta).
        if (!sesionHecha(plan, logs || {}, w, d)) { sesion = (dias[d].title || 'Tu sesión').trim(); break outer }
      }
    }
  }
  const pendientes = tareas.filter(t => tocaEl(t, hoy) && !hechas.has(t.id)).map(t => t.titulo)
  return { sesion, tareas: pendientes }
}

/** Texto del aviso, o null si no hay nada pendiente. */
export function textoAviso(p: Pendientes): { title: string; body: string } | null {
  const n = p.tareas.length
  if (!p.sesion && !n) return null
  const tareas = n === 1 ? p.tareas[0] : `${n} tareas`
  if (p.sesion) return { title: 'Te queda el entreno de hoy', body: n ? `${p.sesion} · y ${tareas}` : p.sesion }
  return { title: n === 1 ? 'Te queda una tarea de hoy' : `Te quedan ${n} tareas de hoy`, body: n === 1 ? tareas : p.tareas.slice(0, 3).join(' · ') + (n > 3 ? '…' : '') }
}
