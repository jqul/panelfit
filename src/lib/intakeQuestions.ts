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

/** ¿Alguna de las siete respuestas del PAR-Q es un «Sí»? Mismo criterio que `resumenParq` (un «Sí» nunca queda escondido). */
export const parqRequiereAtencion = (parq: Record<number, boolean | null>): boolean => Object.values(parq).some(v => v === true)

// No todos los «Sí» pesan igual. Tres niveles, por el índice de la pregunta (el orden de PARQ_QUESTIONS):
//   alarma  (1-4): problema cardíaco, dolor en el pecho al hacer actividad o en reposo, mareo o pérdida de conocimiento → posible contraindicación: que lo valore
//                  un profesional sanitario antes de entrenar. Retiene el cuestionario de programación hasta que el entrenador lo marque como revisado.
//   revisar (5-6): problema óseo o articular, medicación para la tensión o el corazón → el entrenador lo revisa y adapta el plan; no retiene nada.
//   aclarar (7):   «otra razón»: hay que preguntar cuál; no retiene nada.
// Los cuatro primeros son los mismos que ya paraban el borrador en la solicitud pública (lib/solicitudProgramacion: PARQ_ALARMA_INDICES); una prueba lo comprueba.
export type NivelParq = 'ninguno' | 'aclarar' | 'revisar' | 'alarma'
export const PARQ_INDICES_ALARMA = [0, 1, 2, 3]
export const PARQ_INDICES_REVISAR = [4, 5]
export const PARQ_INDICES_ACLARAR = [6]
export const GRAVEDAD_PARQ: Record<NivelParq, number> = { ninguno: 0, aclarar: 1, revisar: 2, alarma: 3 }

function nivelDe(si: (i: number) => boolean): NivelParq {
  if (PARQ_INDICES_ALARMA.some(si)) return 'alarma'
  if (PARQ_INDICES_REVISAR.some(si)) return 'revisar'
  if (PARQ_INDICES_ACLARAR.some(si)) return 'aclarar'
  return 'ninguno'
}
/** El nivel de lo que acaba de contestar (por índice de pregunta). */
export const nivelParq = (parq: Record<number, boolean | null>): NivelParq => nivelDe(i => parq[i] === true)
/** El nivel de lo ya guardado en la ficha de admisión (por el texto de la pregunta). */
export const nivelParqGuardado = (respuestas: { pregunta: string; respuesta: string }[] | null | undefined): NivelParq =>
  nivelDe(i => (respuestas ?? []).some(r => r.pregunta === PARQ_QUESTIONS[i] && r.respuesta === 'Sí'))

/** Lo que se le dice al entrenador de cada nivel (sin diagnosticar). */
export const TEXTO_NIVEL_PARQ: Record<NivelParq, string> = {
  ninguno: 'Sin respuestas de riesgo',
  aclarar: 'Hay una «otra razón» por aclarar: pregúntale cuál',
  revisar: 'Problema articular o medicación: revísalo y adapta el plan',
  alarma: 'Posible contraindicación: que lo valore un profesional sanitario antes de entrenar',
}

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

/** Qué dice el PAR-Q de un vistazo, para la cabecera de la ficha cuando va plegada: un «Sí» nunca queda escondido tras un título neutro.
 *  Solo cuentan las siete preguntas del PAR-Q (por su texto): un «Sí» en una respuesta libre no es una alerta de salud. */
export function resumenParq(respuestas: { pregunta: string; respuesta: string }[]) {
  const parq = respuestas.filter(r => PARQ_QUESTIONS.includes(r.pregunta))
  const requierenAtencion = parq.filter(r => r.respuesta === 'Sí').length
  const sinResponder = parq.filter(r => r.respuesta !== 'Sí' && r.respuesta !== 'No').length
  const texto = requierenAtencion > 0
    ? `PAR-Q · ${requierenAtencion} respuesta${requierenAtencion > 1 ? 's requieren' : ' requiere'} atención`
    : sinResponder > 0
      ? `PAR-Q · ${sinResponder} sin responder`
      : 'PAR-Q · sin respuestas de riesgo'
  return { requierenAtencion, sinResponder, texto, atencion: requierenAtencion > 0 }
}

export const WAIVER_TEXT_VERSION = 'v1'
export const WAIVER_TEXT = `Declaro que la información de salud que he proporcionado es veraz y que participo en el programa de entrenamiento de forma voluntaria, siendo consciente de los riesgos asociados a la actividad física. Soy responsable de informar a mi entrenador de cualquier molestia o cambio en mi estado de salud durante el programa. El entrenador no se hace responsable de lesiones derivadas de información de salud omitida o inexacta por mi parte.`
