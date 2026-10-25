// Parte ligera de la sustitución guiada: lo que necesita el panel del entrenador (cola, plan B, historial) sin arrastrar
// la biblioteca ni las reglas de dolor. Las propuestas que ve el cliente están en sustitucion.ts.
// Todo es lógica pura (sin React ni red) para poder probarla.

import type { Exercise, ExerciseAlternative, ExerciseLog, Sustitucion, SustitucionAprobacion, SustitucionMotivo, TrainingLogs, TrainingPlan, WeekPlan } from '../types'

export const normNombre = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

/** ¿Ya está entre las alternativas aprobadas de ese ejercicio? */
export const esAlternativaConocida = (ex: Pick<Exercise, 'alternativas'> | undefined, name: string) =>
  !!ex?.alternativas?.some(a => normNombre(a.name) === normNombre(name))

export const ETIQUETA_MOTIVO: Record<SustitucionMotivo, string> = {
  material: 'material ocupado', dolor: 'molestia', preferencia: 'preferencia', tecnico: 'no lo entendía',
}
export const ETIQUETA_APROBACION: Record<SustitucionAprobacion, string> = {
  entrenador: 'alternativa aprobada', automatico: 'propuesta por la app', pendiente: 'pendiente de revisar',
}

// ── Cambios en el plan (plan B) ──────────────────────────────────────────────
// Un ejercicio se repite cada semana con el mismo nombre; el plan B se aplica a todas las apariciones para que
// "alternativa habitual" lo sea de verdad y no solo en la semana en que ocurrió.

/** Aplica `fn` a cada ejercicio con ese nombre en todas las semanas. `changed` dice si algo cambió. */
export function aplicarAEjercicio(weeks: WeekPlan[], exName: string, fn: (ex: Exercise) => Exercise): { weeks: WeekPlan[]; changed: boolean } {
  const objetivo = normNombre(exName)
  let changed = false
  const out = (weeks || []).map(w => ({
    ...w,
    days: (w.days || []).map(d => ({
      ...d,
      exercises: (d.exercises || []).map(ex => {
        if (normNombre(ex.name) !== objetivo) return ex
        const next = fn(ex)
        if (next !== ex) changed = true
        return next
      }),
    })),
  }))
  return { weeks: changed ? out : weeks, changed }
}

/** Añade una alternativa al plan B de ese ejercicio (en todas sus apariciones). Sin duplicados. */
export function conAlternativa(weeks: WeekPlan[], exName: string, alt: ExerciseAlternative): { weeks: WeekPlan[]; changed: boolean } {
  if (!alt.name.trim() || normNombre(alt.name) === normNombre(exName)) return { weeks, changed: false }
  return aplicarAEjercicio(weeks, exName, ex =>
    esAlternativaConocida(ex, alt.name) ? ex : { ...ex, alternativas: [...(ex.alternativas ?? []), { name: alt.name.trim(), ...(alt.exerciseId ? { exerciseId: alt.exerciseId } : {}) }] })
}

/** Fija el plan B y la regla de dolor de ese ejercicio (en todas sus apariciones). */
export function conPlanB(weeks: WeekPlan[], exName: string, patch: { alternativas?: ExerciseAlternative[]; dolorSinSustituir?: boolean }): { weeks: WeekPlan[]; changed: boolean } {
  return aplicarAEjercicio(weeks, exName, ex => {
    const next: Exercise = { ...ex }
    if ('alternativas' in patch) { if (patch.alternativas?.length) next.alternativas = patch.alternativas; else delete next.alternativas }
    if ('dolorSinSustituir' in patch) { if (patch.dolorSinSustituir) next.dolorSinSustituir = true; else delete next.dolorSinSustituir }
    return JSON.stringify(next) === JSON.stringify(ex) ? ex : next
  })
}

// ── Lo que ve el entrenador ──────────────────────────────────────────────────

/** "3×10 con 20 kg" a partir de las series registradas (vacío si no hay ninguna). */
export function resumenSeries(log: Pick<ExerciseLog, 'sets'> | undefined): string {
  const sets = Object.values(log?.sets ?? {}).filter(s => s && (s.weight || s.reps))
  if (sets.length === 0) return ''
  const pesos = sets.map(s => parseFloat(String(s.weight).replace(',', '.'))).filter(n => Number.isFinite(n) && n > 0)
  const reps = sets.find(s => s.reps)?.reps
  const peso = pesos.length ? Math.max(...pesos) : 0
  return `${sets.length}${reps ? `×${reps}` : ' series'}${peso ? ` con ${String(peso).replace('.', ',')} kg` : ''}`
}

export interface SustitucionAviso {
  key: string                       // clave del registro: ex_w{w}_d{d}_r{r}
  prescrita: string
  hecha: string
  exerciseId?: string
  reason: SustitucionMotivo
  /** Ya está en el plan B (lo aprobó el entrenador, o lo añadió después): no hace falta decidir nada. */
  conocida: boolean
  fecha: string
  detalle: string
}
export interface DudaAviso { key: string; ejercicio: string; fecha: string }

const CLAVE = /^ex_w(\d+)_d(\d+)_r(\d+)$/

/**
 * Sustituciones y dudas de técnica de los últimos días, con el ejercicio prescrito sacado del plan.
 * Las de dolor no salen aquí: el aviso de dolor ya las cubre. Las anteriores al bloque `sustitucion`
 * (solo `substituteName`) se tratan como pendientes de revisar.
 */
export function avisosDeEjercicios(logs: TrainingLogs, plan: TrainingPlan | null | undefined, desde: string): { sustituciones: SustitucionAviso[]; dudas: DudaAviso[] } {
  const sustituciones: SustitucionAviso[] = []
  const dudas: DudaAviso[] = []
  for (const [key, log] of Object.entries(logs || {})) {
    const m = key.match(CLAVE)
    if (!m || !log) continue
    const ex = plan?.weeks?.[+m[1]]?.days?.[+m[2]]?.exercises?.[+m[3]]
    if (!ex) continue
    const sust: Sustitucion | undefined = log.sustitucion
      ?? (log.substituteName ? { performedName: log.substituteName, reason: 'preferencia', approvedBy: 'pendiente', fecha: log.dateDone ?? '' } : undefined)
    if (sust && sust.reason !== 'dolor') {
      const fecha = sust.fecha || log.dateDone || ''
      if (fecha && fecha >= desde) {
        sustituciones.push({
          key, prescrita: ex.name, hecha: sust.performedName, exerciseId: sust.performedExerciseId, reason: sust.reason,
          conocida: sust.approvedBy === 'entrenador' || esAlternativaConocida(ex, sust.performedName),
          fecha, detalle: resumenSeries(log),
        })
      }
    }
    if (log.duda) {
      const fecha = log.duda.slice(0, 10)
      if (fecha >= desde) dudas.push({ key, ejercicio: ex.name, fecha })
    }
  }
  return { sustituciones, dudas }
}
