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

export const INTAKE_FREE_QUESTIONS = [
  { key: 'lesiones', label: 'Lesiones o condiciones médicas relevantes' },
  { key: 'objetivos', label: 'Objetivo principal con el entrenamiento' },
  { key: 'disponibilidad', label: '¿Qué días y horas prefieres entrenar?' },
]

export const WAIVER_TEXT_VERSION = 'v1'
export const WAIVER_TEXT = `Declaro que la información de salud que he proporcionado es veraz y que participo en el programa de entrenamiento de forma voluntaria, siendo consciente de los riesgos asociados a la actividad física. Soy responsable de informar a mi entrenador de cualquier molestia o cambio en mi estado de salud durante el programa. El entrenador no se hace responsable de lesiones derivadas de información de salud omitida o inexacta por mi parte.`
