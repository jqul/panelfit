// Diario de decisiones del entrenador: cuando un ejercicio no sube, anotar la HIPÓTESIS (lo que se cree que pasa), la decisión
// (subir, bajar, redistribuir, sustituir, mantener o no intervenir) y cuándo se vuelve a mirar; al revisarla, qué ocurrió. Así
// se separa el dato de la hipótesis y de la decisión, y el criterio se contrasta con lo ocurrido. «No intervenir» es una decisión
// tan válida como las demás. Sin React ni red (lo que habla con Supabase está en decisionesEntrenador.ts).

import { sumarDiasISO } from './exposicionCargas'

export type TipoDecision = 'mantener' | 'subir' | 'bajar' | 'redistribuir' | 'sustituir' | 'no-intervenir'

export const TIPOS_DECISION: { id: TipoDecision; label: string }[] = [
  { id: 'no-intervenir', label: 'No intervenir todavía' },
  { id: 'mantener', label: 'Mantener' },
  { id: 'subir', label: 'Subir (carga o volumen)' },
  { id: 'bajar', label: 'Bajar (carga o volumen)' },
  { id: 'redistribuir', label: 'Redistribuir' },
  { id: 'sustituir', label: 'Sustituir el ejercicio' },
]

export interface Decision {
  id: string
  fecha: string
  ejercicio: string | null
  hipotesis: string
  tipo: TipoDecision
  intervencion: string
  revisar_el: string | null
  revisada_el: string | null
  resultado: string | null
}

export interface BorradorDecision { ejercicio?: string; hipotesis: string; tipo: TipoDecision | ''; intervencion: string; semanasRevision: number | null }

export const MAX_TEXTO = 1000
export const SEMANAS_REVISION = [2, 3, 4, 6, 8]

/** Fecha en la que revisar la decisión: `hoy` + N semanas. */
export function fechaRevision(hoy: string, semanas: number): string {
  return sumarDiasISO(hoy, 7 * semanas)
}

/** Una decisión sin revisar cuyo plazo ya llegó. Sin plazo no hay «por revisar»: el criterio no lleva fechas rígidas. */
export function estaPorRevisar(d: Pick<Decision, 'revisada_el' | 'revisar_el'>, hoy: string): boolean {
  return !d.revisada_el && !!d.revisar_el && d.revisar_el <= hoy
}

/** Primero las que toca revisar (la más atrasada arriba), luego el resto de la más reciente a la más antigua. */
export function ordenarDecisiones(ds: Decision[], hoy: string): Decision[] {
  const porRevisar = ds.filter(d => estaPorRevisar(d, hoy)).sort((a, b) => (a.revisar_el as string).localeCompare(b.revisar_el as string))
  const resto = ds.filter(d => !estaPorRevisar(d, hoy)).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
  return [...porRevisar, ...resto]
}

/** Lo mínimo para que valga la pena anotarla: qué se cree que pasa (la hipótesis) y qué se decide. Si decide tocar algo, qué. */
export function validarBorrador(b: BorradorDecision): string | null {
  if (!b.tipo) return 'Elige qué decides'
  if (b.hipotesis.trim().length < 3) return 'Escribe qué crees que pasa (la hipótesis), aunque sea una frase'
  if (['subir', 'bajar', 'redistribuir', 'sustituir'].includes(b.tipo) && !b.intervencion.trim()) return 'Describe qué vas a cambiar (una sola cosa pequeña)'
  if (b.hipotesis.length > MAX_TEXTO || b.intervencion.length > MAX_TEXTO) return `Máximo ${MAX_TEXTO} caracteres por campo`
  return null
}

/** Datos listos para guardar a partir del borrador del formulario. */
export function decisionDesdeBorrador(b: BorradorDecision, hoy: string): Omit<Decision, 'id'> {
  return {
    fecha: hoy,
    ejercicio: b.ejercicio?.trim() || null,
    hipotesis: b.hipotesis.trim(),
    tipo: b.tipo as TipoDecision,
    intervencion: b.intervencion.trim(),
    revisar_el: b.semanasRevision ? fechaRevision(hoy, b.semanasRevision) : null,
    revisada_el: null,
    resultado: null,
  }
}

export const etiquetaTipo = (t: TipoDecision) => TIPOS_DECISION.find(x => x.id === t)?.label ?? t
