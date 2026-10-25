// Plantillas de arranque para el entrenador nuevo que aún no tiene ninguna: tres rutinas sencillas y
// correctas (sin pesos prescritos: se ajustan por cliente), listas para asignar en el primer minuto.
// `buildPlanFromTemplate` convierte cualquier plantilla en el plan que se guarda para un cliente.
import type { TrainingTemplate, TrainingPlan, Exercise, DayPlan } from '../types'
import { weekIdxFromStart } from './planWeek'

const ex = (name: string, sets: string, isMain = false, comment = ''): Exercise =>
  ({ name, sets, weight: '', isMain, comment, videoUrl: '', restSets: isMain ? 120 : 75, restAfter: 60 })

const day = (title: string, focus: string, exercises: Exercise[]): DayPlan => ({ title, focus, exercises })

export interface StarterTemplate {
  key: string
  name: string
  type: string
  description: string
  /** Para la tarjeta: "3 días · 18 ejercicios". */
  resumen: string
  weeks: TrainingTemplate['weeks']
}

function build(key: string, name: string, type: string, description: string, days: DayPlan[]): StarterTemplate {
  const total = days.reduce((n, d) => n + d.exercises.length, 0)
  return {
    key, name, type, description, resumen: `${days.length} días · ${total} ejercicios`,
    weeks: [{ label: 'Semana 1', rpe: '@7', isCurrent: true, days }],
  }
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  build('fullbody', 'Cuerpo completo 3 días', 'General', 'Tres sesiones iguales de cuerpo entero: ideal para empezar o para quien entrena poco.', [
    day('DÍA A', 'Cuerpo completo', [
      ex('Sentadilla goblet', '3x10', true), ex('Press banca con mancuernas', '3x10'), ex('Remo con mancuerna', '3x10'),
      ex('Peso muerto rumano', '3x10'), ex('Plancha', '3x30s'),
    ]),
    day('DÍA B', 'Cuerpo completo', [
      ex('Prensa de piernas', '3x12', true), ex('Press militar con mancuernas', '3x10'), ex('Jalón al pecho', '3x12'),
      ex('Zancadas con mancuernas', '3x10'), ex('Elevación de talones', '3x15'),
    ]),
    day('DÍA C', 'Cuerpo completo', [
      ex('Sentadilla goblet', '3x10', true), ex('Press inclinado con mancuernas', '3x10'), ex('Remo en polea baja', '3x12'),
      ex('Puente de glúteo', '3x12'), ex('Pallof press', '3x12'),
    ]),
  ]),
  build('torso-pierna', 'Torso / Pierna 4 días', 'Hipertrofia', 'Dos días de torso y dos de pierna a la semana, con ejercicios principales y accesorios.', [
    day('DÍA A', 'Torso', [
      ex('Press banca', '4x8', true), ex('Remo con barra', '4x8'), ex('Press militar', '3x10'), ex('Jalón al pecho', '3x10'), ex('Curl de bíceps', '3x12'),
    ]),
    day('DÍA B', 'Pierna', [
      ex('Sentadilla', '4x8', true), ex('Peso muerto rumano', '3x10'), ex('Prensa de piernas', '3x12'), ex('Curl femoral', '3x12'), ex('Elevación de talones', '4x15'),
    ]),
    day('DÍA C', 'Torso', [
      ex('Press inclinado con mancuernas', '4x10', true), ex('Remo con mancuerna', '4x10'), ex('Elevaciones laterales', '3x15'), ex('Fondos en banco', '3x12'), ex('Face pull', '3x15'),
    ]),
    day('DÍA D', 'Pierna', [
      ex('Peso muerto', '3x5', true), ex('Zancadas con mancuernas', '3x10'), ex('Extensión de cuádriceps', '3x12'), ex('Hip thrust', '3x10'), ex('Plancha', '3x40s'),
    ]),
  ]),
  build('empuje-tiron-pierna', 'Empuje / Tirón / Pierna 3 días', 'Fuerza', 'Una sesión de empuje, una de tirón y una de pierna: fuerza con volumen contenido.', [
    day('DÍA A', 'Empuje', [
      ex('Press banca', '5x5', true), ex('Press militar', '3x8'), ex('Press inclinado con mancuernas', '3x10'), ex('Fondos en paralelas', '3x10'), ex('Extensión de tríceps', '3x12'),
    ]),
    day('DÍA B', 'Tirón', [
      ex('Dominadas', '5x5', true), ex('Remo con barra', '4x8'), ex('Jalón al pecho', '3x10'), ex('Face pull', '3x15'), ex('Curl de bíceps', '3x12'),
    ]),
    day('DÍA C', 'Pierna', [
      ex('Sentadilla', '5x5', true), ex('Peso muerto rumano', '3x8'), ex('Prensa de piernas', '3x12'), ex('Curl femoral', '3x12'), ex('Elevación de talones', '4x15'),
    ]),
  ]),
]

/** Una plantilla de arranque como fila de la librería del entrenador (`plan_templates`). */
export function starterToTemplate(s: StarterTemplate, trainerId: string, now = Date.now()): TrainingTemplate {
  return {
    id: `tmpl_${s.key}_${now}`, trainerId, name: s.name, type: s.type, description: s.description,
    weeks: JSON.parse(JSON.stringify(s.weeks)), createdAt: now, updatedAt: now, label_ids: [], isPublic: false,
  }
}

/** El plan que se guarda para un cliente nuevo a partir de una plantilla: copia profunda, y marca la semana en curso. */
export function buildPlanFromTemplate(t: Pick<TrainingTemplate, 'type' | 'weeks'>, clientId: string, fechaInicio: string): TrainingPlan {
  const weeks = JSON.parse(JSON.stringify(t.weeks)) as TrainingPlan['weeks']
  const actual = weekIdxFromStart(fechaInicio, weeks.length)
  weeks.forEach((w, i) => { w.isCurrent = i === actual })
  return { clientId, type: t.type, restMain: 180, restAcc: 90, restWarn: 30, weeks, fechaInicio }
}
