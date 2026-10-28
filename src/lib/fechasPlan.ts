import type { TrainingPlan } from '../types'

// Cada sesión del plan en una fecha del calendario. Sin tocar la estructura del plan (semanas × días) ni las claves
// de los registros (`ex_w1_d2_r0`): la fecha se deduce y, si el entrenador mueve una sesión, se guarda solo esa
// excepción en `plan.fechasSesion` ("w1_d2" → "2026-11-05").
//
// Fecha de una sesión, por orden:
//   1. la que le haya puesto el entrenador al moverla;
//   2. el día de la semana de su título ("LUNES — EMPUJE"), dentro de su semana del plan;
//   3. el día que toca según los días que eligió el cliente (la 1.ª sesión el 1.er día elegido…);
//   4. ninguna: el plan no dice cuándo (se puede mover a mano igualmente).
// Las semanas del plan van de lunes a domingo desde la de `fechaInicio`, como en planWeek.ts.

const NOMBRES_DIA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

/** 0 = lunes … 6 = domingo si el título nombra un día ("Miércoles — tirón"); si no, null. */
export function diaDelTitulo(titulo: string): number | null {
  const norm = (titulo || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const i = NOMBRES_DIA.findIndex(n => norm.includes(n))
  return i === -1 ? null : i
}

export const claveSesion = (w: number, d: number) => `w${w}_d${d}`

function aFecha(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function desdeFecha(f: string): Date {
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}
export function sumarDias(f: string, n: number): string {
  const d = desdeFecha(f); d.setDate(d.getDate() + n); return aFecha(d)
}
/** Lunes de la semana de esa fecha. */
export function lunesDe(f: string): string {
  const d = desdeFecha(f)
  return sumarDias(f, -((d.getDay() + 6) % 7))
}

/** Lunes de la semana `w` del plan (null sin fecha de inicio). */
export function lunesDeSemana(plan: Pick<TrainingPlan, 'fechaInicio'>, w: number): string | null {
  return plan.fechaInicio ? sumarDias(lunesDe(plan.fechaInicio), w * 7) : null
}

/** La fecha que le tocaría a la sesión sin mover nada (reglas 2 y 3). */
export function fechaPrevista(plan: Pick<TrainingPlan, 'fechaInicio' | 'diasElegidos' | 'weeks'>, w: number, d: number): string | null {
  const lunes = lunesDeSemana(plan, w)
  const dia = plan.weeks?.[w]?.days?.[d]
  if (!lunes || !dia) return null
  const delTitulo = diaDelTitulo(dia.title)
  if (delTitulo !== null) return sumarDias(lunes, delTitulo)
  const elegidos = [...new Set(plan.diasElegidos || [])].filter(x => x >= 0 && x <= 6).sort((a, b) => a - b)
  return d < elegidos.length ? sumarDias(lunes, elegidos[d]) : null
}

/** Fecha de la sesión (movida o prevista), o null si el plan no dice cuándo. */
export function fechaSesion(plan: Pick<TrainingPlan, 'fechaInicio' | 'diasElegidos' | 'weeks' | 'fechasSesion'>, w: number, d: number): string | null {
  return plan.fechasSesion?.[claveSesion(w, d)] ?? fechaPrevista(plan, w, d)
}
