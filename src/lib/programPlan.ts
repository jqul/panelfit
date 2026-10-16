import type { WeekPlan, DayPlan, Exercise } from '../types'

// Un programa es un calendario de tareas (workout, cardio, mensaje...). Una tarea "workout" no lleva
// ejercicios: guarda `data.templateId`, una referencia a un workout (plan_templates). Al asignar un
// programa a un cliente hay que convertirlo en un plan de entrenamiento copiando esos ejercicios.

export interface ProgramTaskLike { type: string; title: string; data?: Record<string, any> }
export interface ProgramWeekLike { label: string; days: { tasks: ProgramTaskLike[] }[] }
/** Workouts por id; cada uno es una plantilla con semanas y días. */
export type TemplatesById = Record<string, { weeks?: WeekPlan[] } | undefined>

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

/** Ids de los workouts que usa un programa, sin repetir. */
export function workoutTemplateIds(weeks: ProgramWeekLike[] | undefined): string[] {
  const ids = new Set<string>()
  for (const w of weeks || []) for (const d of w.days || []) for (const t of d.tasks || []) {
    if (t.type === 'workout' && typeof t.data?.templateId === 'string') ids.add(t.data.templateId)
  }
  return [...ids]
}

/**
 * Convierte las semanas de un programa en semanas de plan.
 *
 * Qué día de la plantilla va en cada tarea:
 *  - la semana i del programa usa la semana i de la plantilla (si es más corta, repite la última);
 *  - si la misma plantilla aparece varias veces en una semana del programa, cada aparición toma el
 *    siguiente día de la plantilla (día 1, día 2...) y vuelve al primero si se acaban;
 *  - el título del día es el del día de la plantilla (si lo tiene) y el RPE/descarga los de su semana.
 *
 * `missing` lista los workouts del programa que ya no existen: esos días quedan sin ejercicios.
 */
export function programToPlanWeeks(weeks: ProgramWeekLike[] | undefined, templates: TemplatesById): { weeks: WeekPlan[]; missing: string[] } {
  const missing = new Set<string>()
  const result: WeekPlan[] = (weeks || []).map((w, wi) => {
    const uses = new Map<string, number>()
    let rpe = ''
    let isDeload: boolean | undefined
    let weekMeta = false

    const days: DayPlan[] = (w.days || []).map(d => {
      const tasks = d.tasks || []
      const workouts = tasks.filter(t => t.type === 'workout')
      let title = workouts[0]?.title || 'Día'
      let tplFocus = ''
      let exercises: Exercise[] = []
      let extra: Partial<DayPlan> = {}
      let first = true

      for (const t of workouts) {
        const id = t.data?.templateId
        if (typeof id !== 'string') continue
        const tws = templates[id]?.weeks
        if (!tws?.length) { missing.add(t.data?.templateName || t.title); continue }
        const tw = tws[Math.min(wi, tws.length - 1)]
        if (!tw.days?.length) { missing.add(t.data?.templateName || t.title); continue }
        const n = uses.get(id) ?? 0
        uses.set(id, n + 1)
        const day = tw.days[n % tw.days.length]
        exercises = exercises.concat(clone(day.exercises || []))
        if (first) {
          if (day.title) title = day.title
          tplFocus = day.focus || ''
          if (day.warmup) extra.warmup = day.warmup
          if (day.warmupExercises?.length) extra.warmupExercises = clone(day.warmupExercises)
          if (day.testIds?.length) extra.testIds = [...day.testIds]
          first = false
        }
        if (!weekMeta) { rpe = tw.rpe || ''; isDeload = tw.isDeload; weekMeta = true }
      }

      const focus = tasks.filter(t => t.type !== 'workout').map(t => t.title).join(', ') || tplFocus
      return { title, focus, exercises, ...extra }
    })

    const week: WeekPlan = { label: w.label, rpe, isCurrent: false, days }
    if (isDeload) week.isDeload = true
    return week
  })
  if (result.length > 0) result[0].isCurrent = true
  return { weeks: result, missing: [...missing] }
}
