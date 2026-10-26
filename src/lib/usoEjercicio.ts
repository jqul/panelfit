// Uso real de un ejercicio de la biblioteca: a qué clientes se lo has puesto ahora mismo. "Usado N veces" cuenta las
// veces que se añadió a un plan alguna vez; esto responde a otra pregunta, la que se hace el entrenador antes de
// cambiarlo o archivarlo: "¿a quién le afecta?".

import { norm } from './globalSearch'
import type { TrainingPlan } from '../types'

export interface FilaPlan { clientId: string; plan: { P?: Pick<TrainingPlan, 'weeks'> } | null }
export interface ClienteLite { id: string; name: string; surname?: string }

const nombreCompleto = (c: ClienteLite) => [c.name, c.surname].filter(Boolean).join(' ').trim()

/** Nombres (ordenados) de los clientes cuyo plan lleva el ejercicio, en cualquier semana. Compara sin mayúsculas ni tildes. */
export function clientesConEjercicio(nombre: string, filas: FilaPlan[], clientes: ClienteLite[]): string[] {
  const buscado = norm(nombre)
  if (!buscado) return []
  const nombres = new Map(clientes.map(c => [c.id, nombreCompleto(c)]))
  const out = new Set<string>()
  for (const f of filas) {
    const quien = nombres.get(f.clientId)
    if (!quien) continue
    const loLleva = (f.plan?.P?.weeks ?? []).some(w => (w.days ?? []).some(d => (d.exercises ?? []).some(e => norm(e.name) === buscado)))
    if (loLleva) out.add(quien)
  }
  return [...out].sort((a, b) => a.localeCompare(b, 'es'))
}

/** "En el plan de 3 clientes: Ana, Luis y María" (con más de cinco, los cinco primeros y "y N más"). */
export function fraseUso(quienes: string[]): string {
  if (quienes.length === 0) return 'Ningún cliente lo lleva ahora en su plan'
  const cabeza = quienes.slice(0, 5)
  const resto = quienes.length - cabeza.length
  const lista = resto > 0
    ? `${cabeza.join(', ')} y ${resto} más`
    : cabeza.length > 1 ? `${cabeza.slice(0, -1).join(', ')} y ${cabeza[cabeza.length - 1]}` : cabeza[0]
  return `En el plan de ${quienes.length} ${quienes.length === 1 ? 'cliente' : 'clientes'}: ${lista}`
}
