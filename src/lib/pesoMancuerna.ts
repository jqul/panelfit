import type { DayPlan, Exercise, TrainingPlan } from '../types'

// Cómo se apunta el peso con mancuernas (y en lo unilateral): el de UNA mancuerna / un lado, o el TOTAL. Si no está
// claro, cada cliente apunta una cosa distinta, el volumen sale mal y la progresión compara peras con manzanas.
//  - Cada ejercicio puede fijarlo (`Exercise.pesoPorLado`: true = por mancuerna/lado, false = total).
//  - Si no lo fija y es con mancuernas, manda lo que diga el plan (`TrainingPlan.pesoMancuernas`); por defecto, total
//    (es lo que la app daba por hecho antes: así lo ya apuntado sigue valiendo).
//  - Cada registro guarda `porLado` cuando es por lado; sin él, es total. Al comparar registros con distinta forma
//    (lib/historialEjercicio, y con él la progresión y los récords) se pasan a la del más reciente.

export type PesoMancuernas = 'total' | 'por_mancuerna'

const MANCUERNA = /mancuerna|kettlebell|pesa rusa|\bdb\b/i
export const esConMancuernas = (nombre?: string) => MANCUERNA.test(nombre || '')

/** ¿Este ejercicio se apunta por mancuerna / lado? */
export function porLadoDe(ex: Pick<Exercise, 'name' | 'pesoPorLado'>, plan?: Pick<TrainingPlan, 'pesoMancuernas'> | null): boolean {
  if (typeof ex.pesoPorLado === 'boolean') return ex.pesoPorLado
  return esConMancuernas(ex.name) && plan?.pesoMancuernas === 'por_mancuerna'
}

/** El día con la forma de apuntar ya resuelta en cada ejercicio (para que todo lo demás solo mire `pesoPorLado`). */
export function resolverPesoDia<D extends Pick<DayPlan, 'exercises'>>(day: D, plan?: Pick<TrainingPlan, 'pesoMancuernas'> | null): D {
  if (!day?.exercises?.length) return day
  return { ...day, exercises: day.exercises.map(ex => (ex.kind === 'run' || ex.kind === 'libre' ? ex : { ...ex, pesoPorLado: porLadoDe(ex, plan) })) }
}

/** Unidad corta para la columna del peso. */
export function unidadPeso(ex: Pick<Exercise, 'name' | 'pesoPorLado'>): { corta: string; larga: string } {
  const mancuerna = esConMancuernas(ex.name)
  if (ex.pesoPorLado) return mancuerna ? { corta: 'Kg/manc.', larga: 'kg por mancuerna' } : { corta: 'Kg/lado', larga: 'kg por lado' }
  return mancuerna ? { corta: 'Kg total', larga: 'kg en total' } : { corta: 'Kg', larga: 'kg' }
}

/** La aclaración para el cliente, con un ejemplo; nada si no hay duda posible (barra, máquina...). */
export function ayudaPeso(ex: Pick<Exercise, 'name' | 'pesoPorLado'>): string | null {
  const mancuerna = esConMancuernas(ex.name)
  if (ex.pesoPorLado) return mancuerna ? 'Apunta el peso de UNA mancuerna: si coges dos de 20 kg, pon 20' : 'Apunta el peso de un solo lado'
  return mancuerna ? 'Apunta el peso TOTAL: si coges dos de 20 kg, pon 40 (con una sola, su peso)' : null
}

/** Un peso apuntado de una forma, pasado a la otra (por lado → total ×2; total → por lado ÷2). */
export function convertirPeso(kg: number, desdePorLado: boolean, aPorLado: boolean): number {
  if (desdePorLado === aPorLado) return kg
  return desdePorLado ? kg * 2 : kg / 2
}

/** Para el editor: cuántos ejercicios con mancuernas tiene el plan sin forma propia (los que sigue el ajuste del plan). */
export function ejerciciosConMancuernas(plan?: Pick<TrainingPlan, 'weeks'> | null): number {
  const nombres = new Set<string>()
  for (const w of plan?.weeks || []) for (const d of w.days || []) for (const e of d.exercises || []) {
    if (esConMancuernas(e.name) && typeof e.pesoPorLado !== 'boolean') nombres.add(e.name.trim().toLowerCase())
  }
  return nombres.size
}

