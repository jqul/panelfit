// Modelos de encuesta listos para usar: el entrenador los abre en el editor ya rellenos, los ajusta y los guarda como suyos.
// «Programación inicial»: lo que hace falta saber de alguien para preparar su primer programa sin adivinar. El PAR-Q y los datos
// de salud se piden aparte en el alta del cliente (lib/intakeQuestions): ante una señal de alarma ahí no se programa, se deriva
// a un profesional sanitario. Aquí NO se pide nada sensible que no cambie el programa. Las preguntas que dependen de otra
// («si sí, ¿dónde y desde cuándo?») van como texto opcional a continuación: las encuestas no tienen condicionales.

import type { Pregunta } from './cuestionarios'

export interface ModeloEncuesta { id: string; name: string; descripcion: string; questions: Pregunta[] }

const q = (id: string, type: Pregunta['type'], label: string, extra: Partial<Pregunta> = {}): Pregunta => ({ id, type, label, required: false, ...extra })

export const MODELO_PROGRAMACION_INICIAL: ModeloEncuesta = {
  id: 'programacion-inicial',
  name: 'Programación inicial',
  descripcion: 'Objetivo, experiencia, tiempo, material, lesiones, marcas, sueño y barreras: lo necesario para preparar un primer programa a medida.',
  questions: [
    q('objetivo', 'choice', '¿Cuál es tu objetivo principal?', { required: true, options: ['Ganar músculo', 'Perder grasa', 'Ganar fuerza', 'Rendimiento deportivo', 'Salud y forma general', 'Otro'] }),
    q('objetivo_detalle', 'text', 'Cuéntalo con tus palabras: ¿qué te gustaría conseguir y para cuándo?'),
    q('experiencia', 'choice', '¿Cuánto tiempo llevas entrenando con pesas?', { required: true, options: ['Nunca he entrenado', 'Menos de 6 meses', 'De 6 meses a 2 años', 'De 2 a 5 años', 'Más de 5 años'] }),
    q('rutina_actual', 'text', '¿Cómo entrenas ahora? (rutina, días, ejercicios que haces)'),
    q('dias', 'choice', '¿Cuántos días por semana puedes entrenar de verdad?', { required: true, options: ['2', '3', '4', '5', '6'] }),
    q('duracion', 'choice', '¿Cuánto tiempo tienes por sesión?', { required: true, options: ['Menos de 45 min', '45-60 min', '60-75 min', '75-90 min', 'Más de 90 min'] }),
    q('material', 'multi', '¿Con qué material cuentas?', { required: true, options: ['Gimnasio completo', 'Barra y discos', 'Mancuernas', 'Máquinas', 'Bandas elásticas', 'Solo peso corporal'] }),
    q('rechaza', 'text', '¿Hay ejercicios que no quieras hacer o que no puedas hacer? ¿Por qué?'),
    q('molestias', 'yesno', '¿Tienes ahora alguna molestia o dolor al entrenar o en el día a día?'),
    q('molestias_detalle', 'text', 'Si has contestado que sí (o has tenido una lesión): ¿dónde, desde cuándo y qué lo empeora?'),
    q('marcas', 'text', 'Marcas o pesos que conozcas (sentadilla, press banca, peso muerto, dominadas…), aunque sean aproximadas'),
    q('peso', 'number', 'Peso actual', { unit: 'kg' }),
    q('altura', 'number', 'Altura', { unit: 'cm' }),
    q('edad', 'number', 'Edad', { unit: 'años' }),
    q('fase', 'choice', 'Ahora mismo, ¿qué haces con la comida?', { options: ['Estoy en déficit (para perder grasa)', 'Como en mantenimiento', 'Estoy en superávit (para ganar)', 'No lo sé / no lo controlo'] }),
    q('sueno', 'number', '¿Cuántas horas duermes de media?', { unit: 'h' }),
    q('estres', 'scale', '¿Cómo de estresante es tu día a día ahora mismo? (1 = muy tranquilo, 10 = muy estresante)'),
    q('pasos', 'number', '¿Cuántos pasos das al día, más o menos?', { unit: 'pasos' }),
    q('cardio', 'text', '¿Haces cardio u otro deporte? ¿Cuánto y de qué tipo?'),
    q('prioridad', 'multi', '¿Hay músculos que quieras priorizar?', { options: ['Pecho', 'Espalda', 'Hombros', 'Brazos', 'Cuádriceps', 'Femoral y glúteo', 'Abdomen y core', 'Gemelos', 'Ninguno en especial'] }),
    q('barreras', 'multi', '¿Qué te ha hecho dejar de entrenar en otras ocasiones?', { options: ['Falta de tiempo', 'Aburrimiento', 'Lesiones', 'No ver resultados', 'Viajes o trabajo', 'Falta de motivación', 'Nada en especial'] }),
    q('extra', 'text', '¿Algo más que debamos saber para preparar tu programa?'),
  ],
}

// Solo el del enlace público (lo usan la página pública y Coach IA). Los cuestionarios de programación del cliente viven en lib/modelosProgramacion, que solo carga el editor de Encuestas.
export const MODELOS_ENCUESTA: ModeloEncuesta[] = [MODELO_PROGRAMACION_INICIAL]
