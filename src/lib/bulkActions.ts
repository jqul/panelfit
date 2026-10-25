// Acciones masivas sobre clientes (seleccionar varios y aplicarles algo de una vez). Aquí vive la lógica
// sin red ni React para poder probarla; lo que escribe en Supabase está en bulkAssign.ts y en las hojas
// de components/trainer/bulk.
//
// Reglas que se mantienen en todas las acciones:
//  · la selección solo contiene clientes que se ven (si cambia el filtro o la búsqueda, se recorta);
//  · nada se hace "a medias en silencio": cada acción devuelve cuántos fueron bien, cuáles fallaron y
//    cuáles se omitieron a propósito, con el motivo de cada uno;
//  · un cliente con borrador sin publicar no se pisa (el borrador es trabajo del entrenador);
//  · los ejercicios nunca se reordenan: los registros se guardan por posición.

import type { TrainingPlan, WeekPlan } from '../types'
import { resolveMessage } from './messageText'

// ── Selección ──────────────────────────────────────────────

export const toggleId = (selected: ReadonlySet<string>, id: string): Set<string> => {
  const next = new Set(selected)
  next.has(id) ? next.delete(id) : next.add(id)
  return next
}

/** Selecciona todos los visibles, o los quita todos si ya estaban todos seleccionados. */
export function toggleAll(selected: ReadonlySet<string>, visibleIds: readonly string[]): Set<string> {
  const allSelected = visibleIds.length > 0 && visibleIds.every(id => selected.has(id))
  return allSelected ? new Set() : new Set(visibleIds)
}

/** Deja solo los seleccionados que siguen visibles: lo que se ve es lo que se afecta. */
export function pruneSelection(selected: ReadonlySet<string>, visibleIds: readonly string[]): Set<string> {
  const visible = new Set(visibleIds)
  const kept = [...selected].filter(id => visible.has(id))
  return kept.length === selected.size ? (selected as Set<string>) : new Set(kept)
}

// ── Resultado de una acción ────────────────────────────────

export interface BulkProblem { id: string; reason: string }
export interface BulkResult { ok: string[]; failed: BulkProblem[]; skipped: BulkProblem[] }

export const emptyResult = (): BulkResult => ({ ok: [], failed: [], skipped: [] })

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Frase de resumen y su tono: 'ok' solo si absolutamente todo salió bien. */
export function summarizeResult(r: BulkResult, verb: string): { tone: 'ok' | 'warn'; headline: string; detail: string[] } {
  const total = r.ok.length + r.failed.length + r.skipped.length
  const detail: string[] = []
  if (r.failed.length) detail.push(`${plural(r.failed.length, 'falló', 'fallaron')}`)
  if (r.skipped.length) detail.push(`${plural(r.skipped.length, 'omitido', 'omitidos')}`)
  return {
    tone: r.failed.length === 0 && r.skipped.length === 0 ? 'ok' : 'warn',
    headline: `${verb} en ${r.ok.length} de ${plural(total, 'cliente', 'clientes')}`,
    detail,
  }
}

// ── Borradores ─────────────────────────────────────────────

export interface PlanRowLite {
  clientId: string
  plan?: { P?: unknown } | null
  plan_borrador?: { P?: unknown } | null
  borrador_activo?: boolean | null
}

/** Igual que la ficha del cliente: hay borrador cuando está activo y tiene plan dentro. */
export const hasActiveDraft = (row: PlanRowLite | undefined): boolean => !!row?.borrador_activo && !!row.plan_borrador?.P

/** Separa a quién se puede asignar y a quién se omite por tener un borrador sin publicar. */
export function partitionByDraft(ids: readonly string[], rows: readonly PlanRowLite[]): { assignable: string[]; withDraft: string[] } {
  const byId = new Map(rows.map(r => [r.clientId, r]))
  const assignable: string[] = []
  const withDraft: string[] = []
  for (const id of ids) (hasActiveDraft(byId.get(id)) ? withDraft : assignable).push(id)
  return { assignable, withDraft }
}

export const DRAFT_SKIP_REASON = 'Tiene un borrador sin publicar'

// ── Plan a partir de un workout ────────────────────────────

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

/**
 * Plan que resulta de asignar un workout a un cliente. Sustituye el tipo, las semanas y la fecha de
 * inicio, y conserva el resto de lo que el entrenador ya había configurado en ese plan (notas, macros,
 * automatizaciones, mensajes personalizados...). Las semanas se copian tal cual: ni un ejercicio
 * cambia de sitio, porque los registros del cliente se guardan por posición.
 */
export function buildWorkoutPlan(
  clientId: string,
  workout: { type: string; weeks: WeekPlan[] },
  existing: TrainingPlan | null | undefined,
  fechaInicio: string,
): TrainingPlan {
  const base: TrainingPlan = existing
    ? { ...existing }
    : { clientId, type: workout.type, restMain: 180, restAcc: 90, restWarn: 30, weeks: [] }
  const weeks = clone(workout.weeks)
  weeks.forEach((w, i) => { w.isCurrent = i === 0 }) // empieza hoy: la primera semana es la actual
  const { programId: _programId, programName: _programName, ...rest } = base // ya no es de un programa
  return { ...rest, clientId, type: workout.type, weeks, fechaInicio }
}

// ── Etiquetas ──────────────────────────────────────────────

/** Etiquetas resultantes de quitar y añadir, sin duplicados y respetando el orden que ya tenía. */
export function applyLabelChange(current: readonly string[] | null | undefined, add: readonly string[], remove: readonly string[]): { next: string[]; changed: boolean } {
  const cur = current ?? []
  const removed = new Set(remove)
  const kept = cur.filter(id => !removed.has(id))
  const next = [...kept, ...add.filter(id => !kept.includes(id) && !removed.has(id))]
  const changed = next.length !== cur.length || next.some((id, i) => id !== cur[i])
  return { next, changed }
}

// ── Mensajes por WhatsApp ──────────────────────────────────

export interface MessageTarget { id: string; name: string; surname?: string; phone?: string; token: string }
export interface BuiltMessage { clientId: string; name: string; phone: string | null; text: string; url: string | null }

export const formatPhone = (phone: string) => phone.replace(/[\s()-]+/g, '').replace(/^\+/, '').replace(/^00/, '')

/** Enlace que abre WhatsApp con el mensaje ya escrito; null si el cliente no tiene teléfono. */
export function waUrl(phone: string | null | undefined, text: string): string | null {
  const p = phone ? formatPhone(phone) : ''
  return p ? `https://wa.me/${p}?text=${encodeURIComponent(text)}` : null
}

/** Un mensaje personalizado por cliente ({{cliente}} → su nombre), con su enlace si se pide. */
export function buildMessages(targets: readonly MessageTarget[], template: string, opts: { origin: string; includeLink: boolean }): BuiltMessage[] {
  return targets.map(c => {
    const base = resolveMessage(template, c.name).trim()
    const text = opts.includeLink ? `${base}\n\n${opts.origin}?c=${c.token}` : base
    return { clientId: c.id, name: `${c.name} ${c.surname || ''}`.trim(), phone: c.phone || null, text, url: waUrl(c.phone, text) }
  })
}

/** Mensaje con el enlace a una encuesta (el cliente la abre dentro de su panel). */
export function buildSurveyMessages(targets: readonly MessageTarget[], surveyName: string, origin: string): BuiltMessage[] {
  return targets.map(c => {
    const text = `Hola ${c.name} 👋\n\n📋 *${surveyName}*\n\nTe mando la encuesta. Solo te llevará 2 minutos:\n\n${origin}?c=${c.token}&encuesta=1\n\n¡Gracias! 🙏`
    return { clientId: c.id, name: `${c.name} ${c.surname || ''}`.trim(), phone: c.phone || null, text, url: waUrl(c.phone, text) }
  })
}
