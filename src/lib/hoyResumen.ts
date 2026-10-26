// Textos y cuentas de la pantalla "Hoy" del cliente: lo que convierte números sueltos en una frase que se entiende en
// medio segundo ("has hecho 2 de 4", "Muy bien", "Subiendo"). Sin React ni fechas del sistema: se puede probar.
// El tono es de ánimo, nunca de reproche: lo que va mal se dice como "a mejorar" o "vamos a por ello".

import type { TrainingLogs, TrainingPlan } from '../types'

export type Tono = 'ok' | 'neutro' | 'atencion'

/** Sesiones previstas y sesiones cerradas de una semana del plan. Un día sin ejercicios no es una sesión prevista. */
export function semanaResumen(plan: Pick<TrainingPlan, 'weeks'>, logs: TrainingLogs, weekIdx: number): { hechas: number; previstas: number } {
  const days = plan.weeks?.[weekIdx]?.days ?? []
  let previstas = 0, hechas = 0
  days.forEach((d, di) => {
    const exs = d.exercises ?? []
    if (exs.length === 0) return
    previstas++
    const cerrada = !!logs[`finished_w${weekIdx}_d${di}`]?.sessionFinished
    if (cerrada || exs.every((_, ri) => logs[`ex_w${weekIdx}_d${di}_r${ri}`]?.done)) hechas++
  })
  return { hechas, previstas }
}

/** Frase de la semana para el cliente, o null si no hay sesiones previstas. */
export function fraseSemana(hechas: number, previstas: number): { texto: string; tono: Tono } | null {
  if (previstas <= 0) return null
  if (hechas >= previstas) return { texto: 'Semana completada. Buen trabajo.', tono: 'ok' }
  if (hechas === 0) return { texto: previstas === 1 ? 'Una sesión esta semana' : `${previstas} sesiones esta semana`, tono: 'neutro' }
  if (hechas === previstas - 1) return { texto: `Has hecho ${hechas} de ${previstas}. Te falta 1 para cerrar la semana.`, tono: 'neutro' }
  return { texto: `Has hecho ${hechas} de ${previstas} esta semana`, tono: 'neutro' }
}

export function fraseRacha(dias: number): { texto: string; tono: Tono } {
  if (dias <= 0) return { texto: 'Empieza hoy', tono: 'neutro' }
  if (dias === 1) return { texto: '1 día', tono: 'neutro' }
  return { texto: `${dias} días seguidos`, tono: dias >= 3 ? 'ok' : 'neutro' }
}

export function fraseAdherencia(pct: number | null): { texto: string; tono: Tono } {
  if (pct === null) return { texto: 'Aún sin datos', tono: 'neutro' }
  if (pct >= 85) return { texto: 'Muy bien', tono: 'ok' }
  if (pct >= 60) return { texto: 'Bien', tono: 'ok' }
  if (pct >= 30) return { texto: 'A mejorar', tono: 'atencion' }
  return { texto: 'Vamos a por ello', tono: 'atencion' }
}

export function tendenciaFuerza(pct: number | null): { flecha: '↑' | '↓' | '↔'; texto: string; tono: Tono } {
  if (pct === null) return { flecha: '↔', texto: 'Aún sin datos', tono: 'neutro' }
  if (Math.abs(pct) < 1) return { flecha: '↔', texto: 'Estable', tono: 'neutro' }
  return pct > 0 ? { flecha: '↑', texto: 'Subiendo', tono: 'ok' } : { flecha: '↓', texto: 'Bajando', tono: 'atencion' }
}

/** Nombre de pila de quien deja la nota ("Javier Quiñones" → "Javier"); vacío si no se conoce. */
export function nombreDePila(nombre?: string | null): string {
  return (nombre ?? '').trim().split(/\s+/)[0] ?? ''
}
