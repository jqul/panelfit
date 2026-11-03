import type { TrainingPlan, TrainingTemplate } from '../types'
import { buildPlanFromTemplate } from './starterTemplates'
import { weekIdxFromStart } from './planWeek'

// Lo que hace «Cargar workout» con el plan de un cliente: las semanas del workout con su fecha de inicio, conservando el
// resto del plan. Puro (lo usan la ficha del cliente y Asignar desde Workouts, lib/asignarWorkout).

/** El plan resultante: el actual con las semanas del workout, o uno nuevo si no tenía. */
export function planDesdeWorkout(tmpl: Pick<TrainingTemplate, 'type' | 'weeks'>, clientId: string, fechaInicio: string, actual?: TrainingPlan | null): TrainingPlan {
  if (!actual?.weeks) return buildPlanFromTemplate(tmpl, clientId, fechaInicio)
  const semana = weekIdxFromStart(fechaInicio, tmpl.weeks.length)
  const weeks = JSON.parse(JSON.stringify(tmpl.weeks)) as TrainingPlan['weeks']
  weeks.forEach((w, i) => { w.isCurrent = i === semana })
  return { ...actual, clientId, type: tmpl.type, weeks, fechaInicio }
}
