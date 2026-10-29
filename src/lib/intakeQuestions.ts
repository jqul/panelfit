// Cuestionario de admisión basado en PAR-Q (Physical Activity Readiness Questionnaire)
export const PARQ_QUESTIONS = [
  '¿Tu médico te ha dicho alguna vez que tienes un problema cardíaco?',
  '¿Sientes dolor en el pecho al hacer actividad física?',
  '¿Has tenido dolor en el pecho en reposo durante el último mes?',
  '¿Pierdes el equilibrio por mareo o llegas a perder el conocimiento?',
  '¿Tienes algún problema óseo o articular que el ejercicio pueda agravar?',
  '¿Te receta actualmente tu médico medicación para la tensión o el corazón?',
  '¿Conoces alguna otra razón por la que no deberías hacer ejercicio físico?',
]

export interface IntakeFreeQuestion {
  key: string
  label: string
  /** Solo se guarda si el cliente la contesta: así la ficha del entrenador no se llena de «Sin responder». */
  soloSiRespondida?: boolean
}

export const INTAKE_FREE_QUESTIONS: IntakeFreeQuestion[] = [
  { key: 'lesiones', label: 'Lesiones o condiciones médicas relevantes' },
  { key: 'objetivos', label: 'Objetivo principal con el entrenamiento' },
  { key: 'disponibilidad', label: '¿Qué días y horas prefieres entrenar?' },
  // Opcionales: ayudan al entrenador a ajustar la carga desde la primera semana (volumen, recuperación, punto de partida).
  { key: 'experiencia', label: '¿Cuánto tiempo llevas entrenando y cómo?', soloSiRespondida: true },
  { key: 'marcas', label: 'Marcas o pesos actuales en los ejercicios que domines (si las sabes)', soloSiRespondida: true },
  { key: 'sueno', label: '¿Cuántas horas duermes de media?', soloSiRespondida: true },
]

/** Las respuestas tal como se guardan en la ficha de admisión: PAR-Q, preguntas libres y, de las opcionales, solo las contestadas. */
export function respuestasDeAdmision(parq: Record<number, boolean | null>, libres: Record<string, string>) {
  return [
    ...PARQ_QUESTIONS.map((pregunta, i) => ({
      pregunta, respuesta: parq[i] === true ? 'Sí' : parq[i] === false ? 'No' : 'Sin responder',
    })),
    ...INTAKE_FREE_QUESTIONS
      .filter(q => !q.soloSiRespondida || libres[q.key]?.trim())
      .map(q => ({ pregunta: q.label, respuesta: libres[q.key]?.trim() || 'Sin responder' })),
  ]
}

export const WAIVER_TEXT_VERSION = 'v1'
export const WAIVER_TEXT = `Declaro que la información de salud que he proporcionado es veraz y que participo en el programa de entrenamiento de forma voluntaria, siendo consciente de los riesgos asociados a la actividad física. Soy responsable de informar a mi entrenador de cualquier molestia o cambio en mi estado de salud durante el programa. El entrenador no se hace responsable de lesiones derivadas de información de salud omitida o inexacta por mi parte.`
