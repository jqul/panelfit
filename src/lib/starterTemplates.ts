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
  /** Para filtrar los programas de PanelFit en la galería. */
  dias: number
  nivel: NivelPrograma
  objetivo: ObjetivoPrograma
}

export type NivelPrograma = 'principiante' | 'intermedio' | 'avanzado'
export type ObjetivoPrograma = 'general' | 'hipertrofia' | 'fuerza' | 'gluteo'
export const NIVELES_PROGRAMA: { id: NivelPrograma; label: string }[] = [
  { id: 'principiante', label: 'Principiante' }, { id: 'intermedio', label: 'Intermedio' }, { id: 'avanzado', label: 'Avanzado' },
]
export const OBJETIVOS_PROGRAMA: { id: ObjetivoPrograma; label: string }[] = [
  { id: 'general', label: 'Forma general' }, { id: 'hipertrofia', label: 'Hipertrofia' }, { id: 'fuerza', label: 'Fuerza' }, { id: 'gluteo', label: 'Glúteo y pierna' },
]

function build(key: string, name: string, type: string, description: string, meta: { nivel: NivelPrograma; objetivo: ObjetivoPrograma }, days: DayPlan[]): StarterTemplate {
  const total = days.reduce((n, d) => n + d.exercises.length, 0)
  return {
    key, name, type, description, resumen: `${days.length} días · ${total} ejercicios`,
    weeks: [{ label: 'Semana 1', rpe: '@7', isCurrent: true, days }],
    dias: days.length, ...meta,
  }
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  build('fullbody', 'Cuerpo completo 3 días', 'General', 'Tres sesiones iguales de cuerpo entero: ideal para empezar o para quien entrena poco.', { nivel: 'principiante', objetivo: 'general' }, [
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
  build('torso-pierna', 'Torso / Pierna 4 días', 'Hipertrofia', 'Dos días de torso y dos de pierna a la semana, con ejercicios principales y accesorios.', { nivel: 'intermedio', objetivo: 'hipertrofia' }, [
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
  build('empuje-tiron-pierna', 'Empuje / Tirón / Pierna 3 días', 'Fuerza', 'Una sesión de empuje, una de tirón y una de pierna: fuerza con volumen contenido.', { nivel: 'intermedio', objetivo: 'fuerza' }, [
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

/** Más programas para la galería (además de los tres de arranque del asistente del primer cliente). */
const MAS_PROGRAMAS: StarterTemplate[] = [
  build('fullbody-2', 'Cuerpo completo 2 días', 'General', 'Dos sesiones completas a la semana: para quien tiene poco tiempo o vuelve a entrenar.', { nivel: 'principiante', objetivo: 'general' }, [
    day('DÍA A', 'Cuerpo completo', [
      ex('Sentadilla goblet', '3x10', true), ex('Press banca con mancuernas', '3x10'), ex('Remo con mancuerna', '3x10'), ex('Puente de glúteo', '3x12'), ex('Plancha', '3x30s'),
    ]),
    day('DÍA B', 'Cuerpo completo', [
      ex('Peso muerto rumano', '3x10', true), ex('Press militar con mancuernas', '3x10'), ex('Jalón al pecho', '3x12'), ex('Zancadas con mancuernas', '3x10'), ex('Pallof press', '3x12'),
    ]),
  ]),
  build('casa-3', 'En casa con mancuernas 3 días', 'General', 'Tres sesiones con un par de mancuernas y el peso del cuerpo, sin máquinas.', { nivel: 'principiante', objetivo: 'general' }, [
    day('DÍA A', 'Cuerpo completo', [
      ex('Sentadilla goblet', '3x12', true), ex('Flexiones', '3x10'), ex('Remo con mancuerna', '3x12'), ex('Puente de glúteo', '3x15'), ex('Plancha', '3x30s'),
    ]),
    day('DÍA B', 'Cuerpo completo', [
      ex('Zancadas con mancuernas', '3x10', true), ex('Press militar con mancuernas', '3x10'), ex('Remo invertido en mesa', '3x10'), ex('Peso muerto rumano con mancuernas', '3x12'), ex('Dead bug', '3x10'),
    ]),
    day('DÍA C', 'Cuerpo completo', [
      ex('Sentadilla búlgara', '3x10', true), ex('Press banca con mancuernas en suelo', '3x10'), ex('Pullover con mancuerna', '3x12'), ex('Elevación de talones', '3x15'), ex('Plancha lateral', '3x20s'),
    ]),
  ]),
  build('gluteo-pierna-3', 'Glúteo y pierna 3 días', 'Hipertrofia', 'Dos días centrados en glúteo y pierna y uno de torso para mantener el equilibrio.', { nivel: 'intermedio', objetivo: 'gluteo' }, [
    day('DÍA A', 'Glúteo y cuádriceps', [
      ex('Hip thrust', '4x10', true), ex('Sentadilla', '3x8'), ex('Sentadilla búlgara', '3x10'), ex('Extensión de cuádriceps', '3x12'), ex('Abducción en máquina', '3x15'),
    ]),
    day('DÍA B', 'Torso', [
      ex('Press inclinado con mancuernas', '3x10', true), ex('Jalón al pecho', '3x10'), ex('Remo en polea baja', '3x12'), ex('Elevaciones laterales', '3x15'), ex('Face pull', '3x15'),
    ]),
    day('DÍA C', 'Glúteo e isquios', [
      ex('Peso muerto rumano', '4x8', true), ex('Hip thrust a una pierna', '3x10'), ex('Curl femoral', '3x12'), ex('Patada de glúteo en polea', '3x12'), ex('Elevación de talones', '3x15'),
    ]),
  ]),
  build('fuerza-4', 'Fuerza básica 4 días', 'Fuerza', 'Sentadilla, press banca, peso muerto y press militar como ejes, con pocos accesorios.', { nivel: 'avanzado', objetivo: 'fuerza' }, [
    day('DÍA A', 'Sentadilla', [ex('Sentadilla', '5x3', true), ex('Sentadilla pausada', '3x5'), ex('Prensa de piernas', '3x8'), ex('Plancha', '3x40s')]),
    day('DÍA B', 'Press banca', [ex('Press banca', '5x3', true), ex('Press banca agarre estrecho', '3x6'), ex('Remo con barra', '4x6'), ex('Face pull', '3x15')]),
    day('DÍA C', 'Peso muerto', [ex('Peso muerto', '5x3', true), ex('Peso muerto rumano', '3x6'), ex('Dominadas', '4x6'), ex('Rueda abdominal', '3x10')]),
    day('DÍA D', 'Press militar', [ex('Press militar', '5x3', true), ex('Press inclinado con mancuernas', '3x8'), ex('Remo con mancuerna', '3x8'), ex('Fondos en paralelas', '3x8')]),
  ]),
  build('dividida-5', 'Rutina dividida 5 días', 'Hipertrofia', 'Un grupo muscular por día con más volumen por sesión: para quien ya tiene base y entrena a menudo.', { nivel: 'avanzado', objetivo: 'hipertrofia' }, [
    day('DÍA A', 'Pecho', [ex('Press banca', '4x8', true), ex('Press inclinado con mancuernas', '3x10'), ex('Aperturas en polea', '3x12'), ex('Fondos en paralelas', '3x10')]),
    day('DÍA B', 'Espalda', [ex('Dominadas', '4x8', true), ex('Remo con barra', '4x8'), ex('Jalón al pecho', '3x12'), ex('Pullover en polea', '3x12')]),
    day('DÍA C', 'Pierna', [ex('Sentadilla', '4x8', true), ex('Prensa de piernas', '3x12'), ex('Curl femoral', '3x12'), ex('Extensión de cuádriceps', '3x12'), ex('Elevación de talones', '4x15')]),
    day('DÍA D', 'Hombro', [ex('Press militar', '4x8', true), ex('Elevaciones laterales', '4x15'), ex('Pájaros', '3x15'), ex('Face pull', '3x15')]),
    day('DÍA E', 'Brazos', [ex('Curl con barra', '4x10', true), ex('Press francés', '4x10'), ex('Curl martillo', '3x12'), ex('Extensión de tríceps en polea', '3x12')]),
  ]),

  // ── Clásicos de la biblioteca (estructuras de toda la vida, escritas para PanelFit). Los accesorios van con rango de
  //    repeticiones para que la progresión automática (doble progresión) los lleve sola si el entrenador la activa.
  build('fuerza-empezar-3', 'Fuerza para empezar 3 días (A/B)', 'Fuerza', 'Dos sesiones que se alternan (A, B, A y la semana siguiente B, A, B) con las básicas a 3x5: subir un poco de peso cada sesión mientras se pueda.', { nivel: 'principiante', objetivo: 'fuerza' }, [
    day('DÍA A', 'Sentadilla · banca · remo', [ex('Sentadilla', '3x5', true), ex('Press banca', '3x5', true), ex('Remo con barra', '3x5'), ex('Plancha', '3x30s')]),
    day('DÍA B', 'Sentadilla · militar · peso muerto', [ex('Sentadilla', '3x5', true), ex('Press militar', '3x5', true), ex('Peso muerto', '1x5', true), ex('Dominadas asistidas', '3x6-10')]),
    day('DÍA A', 'Sentadilla · banca · remo', [ex('Sentadilla', '3x5', true), ex('Press banca', '3x5', true), ex('Remo con barra', '3x5'), ex('Plancha', '3x30s')]),
  ]),
  build('torso-pierna-empezar-4', 'Torso / Pierna 4 días para empezar', 'Hipertrofia', 'Torso y pierna dos veces por semana con máquinas y mancuernas: fácil de aprender y seguro para coger técnica.', { nivel: 'principiante', objetivo: 'hipertrofia' }, [
    day('DÍA A', 'Torso', [ex('Press de pecho en máquina', '3x8-12', true), ex('Jalón al pecho', '3x8-12'), ex('Press militar con mancuernas', '3x8-12'), ex('Remo en polea baja', '3x10-15'), ex('Curl de bíceps con mancuernas', '2x10-15')]),
    day('DÍA B', 'Pierna', [ex('Prensa de piernas', '3x8-12', true), ex('Curl femoral', '3x10-15'), ex('Extensión de cuádriceps', '3x10-15'), ex('Puente de glúteo', '3x10-15'), ex('Elevación de talones', '3x12-15')]),
    day('DÍA C', 'Torso', [ex('Press inclinado con mancuernas', '3x8-12', true), ex('Remo con mancuerna', '3x8-12'), ex('Elevaciones laterales', '3x12-15'), ex('Extensión de tríceps en polea', '2x10-15'), ex('Face pull', '2x12-15')]),
    day('DÍA D', 'Pierna', [ex('Sentadilla goblet', '3x8-12', true), ex('Peso muerto rumano con mancuernas', '3x8-12'), ex('Zancadas con mancuernas', '3x10-12'), ex('Abducción de cadera en máquina', '3x12-15'), ex('Plancha', '3x30s')]),
  ]),
  build('casa-sin-material-3', 'En casa sin material 3 días', 'General', 'Solo el peso del cuerpo: sentadillas, flexiones, zancadas y core. Para viajar o empezar sin gimnasio.', { nivel: 'principiante', objetivo: 'general' }, [
    day('DÍA A', 'Cuerpo completo', [ex('Sentadilla con peso corporal', '3x12-20', true), ex('Flexiones', '3x6-15'), ex('Remo invertido en mesa', '3x6-12'), ex('Puente de glúteo', '3x15-20'), ex('Plancha', '3x30s')]),
    day('DÍA B', 'Cuerpo completo', [ex('Zancadas alternas', '3x10-15', true), ex('Fondos en silla', '3x8-15'), ex('Superman', '3x12-15'), ex('Sentadilla búlgara', '3x8-12'), ex('Plancha lateral', '3x20s')]),
    day('DÍA C', 'Cuerpo completo', [ex('Sentadilla con salto', '3x8-12', true), ex('Flexiones declinadas', '3x6-12'), ex('Remo invertido en mesa', '3x6-12'), ex('Puente de glúteo a una pierna', '3x10-15'), ex('Escaladores', '3x30s')]),
  ]),
  build('fullbody-hipertrofia-3', 'Cuerpo completo hipertrofia 3 días', 'Hipertrofia', 'Tres sesiones distintas de cuerpo entero: cada músculo tres veces por semana con volumen moderado.', { nivel: 'intermedio', objetivo: 'hipertrofia' }, [
    day('DÍA A', 'Cuerpo completo', [ex('Sentadilla', '3x6-10', true), ex('Press banca', '3x6-10', true), ex('Remo con barra', '3x8-12'), ex('Elevaciones laterales', '3x12-15'), ex('Curl de bíceps', '2x10-15')]),
    day('DÍA B', 'Cuerpo completo', [ex('Peso muerto rumano', '3x6-10', true), ex('Press militar', '3x6-10', true), ex('Jalón al pecho', '3x8-12'), ex('Prensa de piernas', '3x10-15'), ex('Extensión de tríceps en polea', '2x10-15')]),
    day('DÍA C', 'Cuerpo completo', [ex('Sentadilla búlgara', '3x8-12', true), ex('Press inclinado con mancuernas', '3x8-12', true), ex('Remo con mancuerna', '3x8-12'), ex('Curl femoral', '3x10-15'), ex('Face pull', '2x12-15')]),
  ]),
  build('powerlifting-3', 'Powerlifting 3 días', 'Fuerza', 'Sentadilla, press banca y peso muerto varias veces por semana: un día pesado, uno de técnica y uno de volumen.', { nivel: 'intermedio', objetivo: 'fuerza' }, [
    day('DÍA A', 'Pesado', [ex('Sentadilla', '4x3', true, 'RPE 8'), ex('Press banca', '4x3', true, 'RPE 8'), ex('Remo con barra', '3x6-10'), ex('Plancha', '3x40s')]),
    day('DÍA B', 'Técnica', [ex('Peso muerto', '4x3', true, 'RPE 8'), ex('Press banca pausado', '4x4', true, 'Pausa de 1 s en el pecho'), ex('Sentadilla pausada', '3x4'), ex('Dominadas', '3x5-8')]),
    day('DÍA C', 'Volumen', [ex('Sentadilla', '4x6', true, 'RPE 7'), ex('Press banca', '5x5', true, 'RPE 7'), ex('Peso muerto rumano', '3x6-10'), ex('Face pull', '3x12-15')]),
  ]),
  build('powerbuilding-4', 'Powerbuilding 4 días', 'Fuerza', 'Fuerza y músculo a la vez: cada día empieza con una básica pesada y sigue con accesorios a más repeticiones.', { nivel: 'intermedio', objetivo: 'fuerza' }, [
    day('DÍA A', 'Sentadilla + pierna', [ex('Sentadilla', '4x4-6', true), ex('Prensa de piernas', '3x8-12'), ex('Curl femoral', '3x10-15'), ex('Elevación de talones', '3x10-15')]),
    day('DÍA B', 'Press banca + empuje', [ex('Press banca', '4x4-6', true), ex('Press inclinado con mancuernas', '3x8-12'), ex('Elevaciones laterales', '3x12-15'), ex('Extensión de tríceps en polea', '3x10-15')]),
    day('DÍA C', 'Peso muerto + espalda', [ex('Peso muerto', '3x3-5', true), ex('Dominadas', '4x6-10'), ex('Remo con mancuerna', '3x8-12'), ex('Curl de bíceps', '3x10-15')]),
    day('DÍA D', 'Press militar + hombro', [ex('Press militar', '4x5-8', true), ex('Fondos en paralelas', '3x6-10'), ex('Pájaros', '3x12-15'), ex('Face pull', '3x12-15')]),
  ]),
  build('gluteo-4', 'Glúteo 4 días', 'Hipertrofia', 'Dos días de glúteo con distinto enfoque (cadera y sentadilla), uno de pierna completa y uno de torso.', { nivel: 'intermedio', objetivo: 'gluteo' }, [
    day('DÍA A', 'Glúteo (cadera)', [ex('Hip thrust', '4x6-10', true), ex('Peso muerto rumano', '3x8-12'), ex('Patada de glúteo en polea', '3x12-15'), ex('Abducción de cadera en máquina', '3x15-20')]),
    day('DÍA B', 'Torso', [ex('Jalón al pecho', '3x8-12', true), ex('Press inclinado con mancuernas', '3x8-12'), ex('Remo en polea baja', '3x10-12'), ex('Elevaciones laterales', '3x12-15')]),
    day('DÍA C', 'Glúteo (sentadilla)', [ex('Sentadilla búlgara', '4x8-12', true), ex('Sentadilla goblet', '3x10-12'), ex('Step-up al banco', '3x10-12'), ex('Puente de glúteo a una pierna', '3x12-15')]),
    day('DÍA D', 'Pierna completa', [ex('Sentadilla', '3x6-10', true), ex('Curl femoral', '3x10-15'), ex('Extensión de cuádriceps', '3x12-15'), ex('Hip thrust', '3x10-15'), ex('Elevación de talones', '3x12-15')]),
  ]),
  build('empuje-tiron-pierna-6', 'Empuje / Tirón / Pierna 6 días', 'Hipertrofia', 'Cada grupo dos veces por semana con mucho volumen: para quien ya tiene base, recupera bien y entrena casi a diario.', { nivel: 'avanzado', objetivo: 'hipertrofia' }, [
    day('DÍA A', 'Empuje', [ex('Press banca', '4x6-8', true), ex('Press militar', '3x8-10'), ex('Press inclinado con mancuernas', '3x8-12'), ex('Elevaciones laterales', '4x12-15'), ex('Extensión de tríceps en polea', '3x10-15')]),
    day('DÍA B', 'Tirón', [ex('Dominadas', '4x6-10', true), ex('Remo con barra', '3x8-10'), ex('Remo en polea baja', '3x10-12'), ex('Face pull', '3x12-15'), ex('Curl de bíceps', '3x10-12')]),
    day('DÍA C', 'Pierna', [ex('Sentadilla', '4x6-8', true), ex('Peso muerto rumano', '3x8-10'), ex('Prensa de piernas', '3x10-15'), ex('Curl femoral', '3x10-15'), ex('Elevación de talones', '4x12-15')]),
    day('DÍA D', 'Empuje', [ex('Press inclinado con barra', '4x6-10', true), ex('Press con mancuernas sentado', '3x8-12'), ex('Aperturas en polea', '3x12-15'), ex('Elevaciones laterales', '3x15-20'), ex('Press francés', '3x10-12')]),
    day('DÍA E', 'Tirón', [ex('Remo con mancuerna', '4x8-10', true), ex('Jalón al pecho', '3x10-12'), ex('Pullover en polea', '3x12-15'), ex('Pájaros', '3x12-15'), ex('Curl martillo', '3x10-12')]),
    day('DÍA F', 'Pierna', [ex('Peso muerto', '3x4-6', true), ex('Sentadilla búlgara', '3x8-12'), ex('Extensión de cuádriceps', '3x12-15'), ex('Hip thrust', '3x8-12'), ex('Elevación de talones', '4x12-15')]),
  ]),
]

/** Todos los programas de PanelFit: los de arranque y los demás, para la galería con filtros. */
export const PROGRAMAS_PANELFIT: StarterTemplate[] = [...STARTER_TEMPLATES, ...MAS_PROGRAMAS]

/** Filtra por días a la semana, nivel y objetivo (sin un filtro, vale cualquiera); de menos a más días. */
export function filtrarProgramas(lista: StarterTemplate[], f: { dias?: number | null; nivel?: NivelPrograma | null; objetivo?: ObjetivoPrograma | null }): StarterTemplate[] {
  return lista.filter(p => (!f.dias || p.dias === f.dias) && (!f.nivel || p.nivel === f.nivel) && (!f.objetivo || p.objetivo === f.objetivo))
    .sort((a, b) => a.dias - b.dias)
}

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
