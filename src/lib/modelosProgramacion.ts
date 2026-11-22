// Cuestionarios de PROGRAMACIÓN del cliente: lo que hace falta saber de alguien para plantear su primer plan de entreno y unas macros orientativas
// sin adivinar. Se le envían a un cliente que ya tiene ficha (nombre y teléfono), justo después de su registro: el registro recoge quién es (cuestionario
// de salud, consentimiento, firma y los datos básicos: género, nacimiento, altura y peso) y este recoge TODO lo demás. Por eso aquí no se repite nada de eso.
//
// Estructura: un NÚCLEO común (objetivo, experiencia, tiempo y material, preferencias, molestias, hábitos y nutrición básica) + un BLOQUE por enfoque
// (fuerza, composición corporal, rehabilitación). El entrenador elige cuál mandar al crear el cliente y los edita al 100 % en Encuestas: son una
// plantilla suya, no un formulario fijo. Los ids son estables y los mismos del núcleo en todos los modelos: es lo que lee quien prepara el borrador.
// Lo que depende de otra respuesta («si sí, ¿dónde?») va como texto opcional a continuación: las encuestas no tienen condicionales.
// No es un diagnóstico ni una valoración clínica: en rehabilitación se recoge lo necesario para saber si hay que parar y que lo vea un profesional.

import type { Pregunta } from './cuestionarios'
import { MODELO_PROGRAMACION_INICIAL, type ModeloEncuesta } from './modelosEncuesta'

const q = (id: string, type: Pregunta['type'], label: string, extra: Partial<Pregunta> = {}): Pregunta => ({ id, type, label, required: false, ...extra })
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

/** Lo que recoge el registro (no se vuelve a preguntar aquí). */
export const DATOS_DEL_REGISTRO = ['genero', 'fecha_nacimiento', 'altura', 'peso']

export const NUCLEO_PROGRAMACION: Pregunta[] = [
  // Objetivo
  q('objetivo', 'choice', '¿Cuál es tu objetivo principal?', { required: true, options: ['Ganar músculo', 'Perder grasa', 'Ganar fuerza', 'Mejorar mi salud y mi forma general', 'Recuperarme de una lesión', 'Rendimiento en un deporte', 'Otro'] }),
  q('objetivo_detalle', 'text', 'Cuéntalo con tus palabras: ¿qué quieres conseguir en concreto y para cuándo? (una fecha, un viaje, una competición…)'),
  // Experiencia y rutina actual
  q('experiencia', 'choice', '¿Cuánto tiempo llevas entrenando con pesas?', { required: true, options: ['Nunca he entrenado', 'Menos de 6 meses', 'De 6 meses a 2 años', 'De 2 a 5 años', 'Más de 5 años'] }),
  q('rutina_actual', 'text', '¿Cómo entrenas ahora? (días, ejercicios, desde cuándo lo haces). Si ahora no entrenas, cuándo fue la última vez que lo hiciste en serio.'),
  q('esfuerzo', 'choice', '¿Sabes medir el esfuerzo con el RIR o el RPE (cuántas repeticiones te quedan en la recámara)?', { options: ['Sí, lo uso', 'Lo he oído, pero no lo uso', 'No sé qué es'] }),
  q('marcas', 'text', 'Pesos o marcas que conozcas (sentadilla, press banca, peso muerto, dominadas…), aunque sean aproximados. Si no las sabes, déjalo en blanco.'),
  // Tiempo, lugar y material
  q('dias', 'choice', '¿Cuántos días por semana puedes entrenar de verdad?', { required: true, options: ['2', '3', '4', '5', '6'] }),
  q('dias_concretos', 'multi', '¿Qué días te vienen mejor?', { options: DIAS_SEMANA }),
  q('duracion', 'choice', '¿Cuánto tiempo tienes por sesión?', { required: true, options: ['Menos de 45 min', '45-60 min', '60-75 min', '75-90 min', 'Más de 90 min'] }),
  q('horario', 'choice', '¿A qué hora sueles entrenar?', { options: ['Por la mañana', 'A mediodía', 'Por la tarde', 'Por la noche', 'Es muy variable'] }),
  q('lugar', 'choice', '¿Dónde vas a entrenar?', { required: true, options: ['Gimnasio completo', 'Gimnasio pequeño o de barrio', 'En casa, con algo de material', 'En casa, sin material', 'Al aire libre'] }),
  q('material', 'multi', '¿Con qué material cuentas?', { required: true, options: ['Barra y discos', 'Rack o jaula', 'Banco', 'Mancuernas', 'Máquinas', 'Poleas', 'Barra de dominadas', 'Kettlebells', 'Bandas elásticas', 'Cinta o bici', 'Casi nada'] }),
  // Preferencias
  q('gustos', 'text', '¿Qué ejercicios o tipo de entrenamiento te gustan más? ¿Y cuáles no soportas?'),
  q('rechaza', 'text', '¿Hay ejercicios que no puedas o no quieras hacer? ¿Por qué?'),
  q('prioridad', 'multi', '¿Hay músculos que quieras priorizar?', { options: ['Pecho', 'Espalda', 'Hombros', 'Brazos', 'Cuádriceps', 'Femoral y glúteo', 'Abdomen y core', 'Gemelos', 'Ninguno en especial'] }),
  // Molestias y salud (lo que cambia el programa; el cuestionario de salud ya lo hizo en el registro)
  q('molestias', 'yesno', '¿Tienes ahora alguna molestia o dolor al entrenar o en el día a día, o has tenido una lesión importante?', { required: true }),
  q('molestias_detalle', 'text', 'Si has contestado que sí: ¿dónde, desde cuándo, qué la empeora y qué movimientos evitas?'),
  q('condiciones', 'text', '¿Alguna condición médica, medicación o cirugía reciente que debamos tener en cuenta? Si no, déjalo en blanco.'),
  // Hábitos
  q('sueno', 'number', '¿Cuántas horas duermes de media?', { unit: 'h' }),
  q('estres', 'scale', '¿Cómo de estresante es tu día a día ahora mismo? (1 = muy tranquilo, 10 = muy estresante)'),
  q('trabajo', 'choice', '¿Cómo es tu día a día?', { options: ['Sentado casi todo el día', 'De pie o en movimiento', 'Trabajo físico', 'Muy variable'] }),
  q('pasos', 'number', '¿Cuántos pasos das al día, más o menos?', { unit: 'pasos' }),
  q('cardio', 'text', '¿Haces cardio u otro deporte? ¿Cuánto y de qué tipo?'),
  q('barreras', 'multi', '¿Qué te ha hecho dejar de entrenar en otras ocasiones?', { options: ['Falta de tiempo', 'Aburrimiento', 'Lesiones', 'No ver resultados', 'Viajes o trabajo', 'Falta de motivación', 'Nada en especial'] }),
  // Nutrición básica: lo mínimo para proponer calorías y proteína orientativas (no es una dieta ni un plan clínico)
  q('cambio_peso', 'choice', '¿Qué quieres hacer con tu peso?', { required: true, options: ['Bajar de peso', 'Mantenerlo', 'Subir de peso', 'No lo tengo claro'] }),
  q('peso_objetivo', 'number', 'Si tienes un peso objetivo, ¿cuál es?', { unit: 'kg' }),
  q('comidas', 'choice', '¿Cuántas comidas haces al día?', { options: ['1 o 2', '3', '4', '5 o más'] }),
  q('control_comida', 'choice', 'Ahora mismo, ¿cómo llevas la comida?', { options: ['Cuento calorías o macros', 'Como con cabeza, pero sin contar', 'Como sin ningún control', 'Sigo una dieta de otro profesional'] }),
  q('dieta_tipo', 'multi', '¿Sigues algún tipo de alimentación?', { options: ['Como de todo', 'Vegetariana', 'Vegana', 'Sin gluten', 'Sin lactosa', 'Otra'] }),
  q('alergias', 'text', '¿Alergias o intolerancias alimentarias? Si no, déjalo en blanco.'),
  q('cocina', 'choice', '¿Cuánto tiempo tienes para cocinar?', { options: ['Poco: comida rápida o preparada', 'Algo: cocino a diario', 'Bastante: preparo comida para varios días'] }),
  q('macros', 'choice', '¿Quieres que te proponga calorías y proteína orientativas?', { options: ['Sí', 'No, ya las llevo', 'Prefiero hablarlo contigo'] }),
  q('extra', 'text', '¿Algo más que debamos saber para preparar tu plan?'),
]

// ── Bloques por enfoque ──
const BLOQUE_GENERAL: Pregunta[] = [
  q('motivacion', 'text', '¿Qué te ha llevado a empezar ahora?'),
  q('apoyo', 'text', '¿Qué necesitas de tu entrenador para cumplir el plan?'),
]

const BLOQUE_FUERZA: Pregunta[] = [
  q('compite', 'choice', '¿Compites o quieres competir?', { options: ['No, entreno para mí', 'Quiero competir algún día', 'Ya compito'] }),
  q('competicion_fecha', 'date', 'Si tienes una competición cerca, ¿qué día es?'),
  q('categoria', 'short', 'Federación y categoría de peso, si compites'),
  q('marcas_sbd', 'text', 'Tus mejores marcas recientes en sentadilla, press banca y peso muerto (peso × repeticiones, y de cuándo son)'),
  q('estilo_sentadilla', 'choice', '¿Cómo colocas la barra en la sentadilla?', { options: ['Barra alta', 'Barra baja', 'No lo sé'] }),
  q('estilo_muerto', 'choice', '¿Qué estilo de peso muerto haces?', { options: ['Convencional', 'Sumo', 'No lo sé'] }),
  q('puntos_debiles', 'multi', '¿Dónde sientes que te cuesta más?', { options: ['Salida del suelo', 'Fondo de la sentadilla', 'Salida del pecho en banca', 'Bloqueo', 'Mantener la técnica', 'No lo sé'] }),
  q('equipo_fuerza', 'multi', '¿Qué equipo usas?', { options: ['Cinturón', 'Muñequeras', 'Rodilleras', 'Zapatillas de levantamiento', 'Magnesio', 'Ninguno'] }),
  q('prefiere_carga', 'choice', '¿Cómo prefieres que se te marque la carga?', { options: ['Por RPE o RIR', 'Por porcentajes', 'Me da igual'] }),
]

const BLOQUE_COMPOSICION: Pregunta[] = [
  q('fase_actual', 'choice', 'Ahora mismo, ¿en qué fase estás?', { options: ['Déficit (para perder grasa)', 'Mantenimiento', 'Superávit (para ganar)', 'No lo sé'] }),
  q('historial_dietas', 'text', '¿Qué dietas has hecho y cómo te fueron? ¿Cuál fue tu mayor y menor peso en el último año?'),
  q('ritmo', 'choice', '¿A qué ritmo quieres cambiar?', { options: ['Lento y sostenible', 'Moderado', 'Lo más rápido que sea sano'] }),
  q('hambre', 'scale', 'Cuando haces dieta, ¿cuánta hambre pasas entre comidas? (1 = ninguna, 10 = muchísima)'),
  q('pesajes', 'choice', '¿Te pesas con regularidad?', { options: ['A diario', 'Varias veces por semana', 'Una vez por semana', 'Casi nunca'] }),
  q('cintura', 'number', 'Si te la has medido, ¿cuánto mide tu cintura (a la altura del ombligo)?', { unit: 'cm' }),
  q('comer_fuera', 'choice', '¿Con qué frecuencia comes fuera de casa?', { options: ['Casi nunca', 'Algunas veces por semana', 'Casi a diario'] }),
]

const BLOQUE_REHABILITACION: Pregunta[] = [
  q('rehab_zona', 'multi', '¿Qué zona te molesta o estás recuperando?', { required: true, options: ['Cuello', 'Hombro', 'Codo', 'Muñeca o mano', 'Espalda alta', 'Zona lumbar', 'Cadera', 'Rodilla', 'Tobillo o pie', 'Otra'] }),
  q('rehab_cuando', 'choice', '¿Desde cuándo?', { options: ['Menos de 3 semanas', 'Entre 3 semanas y 3 meses', 'Entre 3 y 12 meses', 'Más de un año'] }),
  q('rehab_diagnostico', 'choice', '¿Te lo ha valorado un médico o fisioterapeuta?', { options: ['Sí, tengo diagnóstico', 'Sí, pero no tengo un diagnóstico claro', 'No, es una molestia que noto yo'] }),
  q('rehab_dolor_reposo', 'scale', 'Dolor en reposo, en un día normal (1 = ninguno, 10 = el peor)'),
  q('rehab_dolor_esfuerzo', 'scale', 'Dolor al moverte o entrenar (1 = ninguno, 10 = el peor)'),
  q('rehab_movimientos', 'text', '¿Qué movimientos o ejercicios te duelen o evitas?'),
  q('rehab_tratamiento', 'choice', '¿Qué tratamiento llevas?', { options: ['Estoy en fisioterapia', 'Terminé la fisioterapia', 'Me han indicado reposo', 'Ninguno'] }),
  q('rehab_alta', 'choice', '¿Te han dicho que puedes entrenar?', { required: true, options: ['Sí, tengo el visto bueno para entrenar', 'Me han dicho que espere', 'No lo he consultado'] }),
  q('rehab_restricciones', 'text', '¿Qué te han prohibido o limitado exactamente?'),
  q('rehab_objetivo', 'text', '¿Qué quieres volver a poder hacer?'),
]

/** «Programación inicial: fuerza» → «Fuerza» (para el selector del alta de cliente). */
export const nombreCorto = (m: ModeloEncuesta) => { const t = m.name.split(': ')[1] ?? m.name; return t.charAt(0).toUpperCase() + t.slice(1) }

/** Todos los cuestionarios de programación. Los nombres son únicos y distintos de «Programación inicial» (el del enlace público): así el editor sabe cuáles ya se han usado. */
export const MODELOS_PROGRAMACION: ModeloEncuesta[] = [
  { id: 'programacion-general', name: 'Programación inicial: general',
    descripcion: 'Todo lo necesario para plantear un primer plan de entreno y unas macros orientativas: objetivo, experiencia, tiempo, material, preferencias, molestias, hábitos y nutrición básica.',
    questions: [...NUCLEO_PROGRAMACION, ...BLOQUE_GENERAL] },
  { id: 'programacion-fuerza', name: 'Programación inicial: fuerza',
    descripcion: 'El núcleo general más lo que hace falta para programar fuerza: marcas, técnica en los tres básicos, puntos débiles, competición y equipo.',
    questions: [...NUCLEO_PROGRAMACION, ...BLOQUE_FUERZA] },
  { id: 'programacion-composicion', name: 'Programación inicial: composición corporal',
    descripcion: 'El núcleo general más lo que hace falta para perder grasa o ganar músculo: fase, historial de dietas, ritmo, hambre, pesajes y medidas.',
    questions: [...NUCLEO_PROGRAMACION, ...BLOQUE_COMPOSICION] },
  { id: 'programacion-rehabilitacion', name: 'Programación inicial: rehabilitación',
    descripcion: 'El núcleo general más lo necesario para saber si se puede entrenar y qué evitar: zona, tiempo, valoración profesional, dolor, tratamiento y restricciones. No es un diagnóstico: lo revisa una persona.',
    questions: [...NUCLEO_PROGRAMACION, ...BLOQUE_REHABILITACION] },
]

/** Todo lo que ofrece el editor de Encuestas como «modelo»: el del enlace público y los cuatro de programación del cliente. */
export const TODOS_LOS_MODELOS: ModeloEncuesta[] = [MODELO_PROGRAMACION_INICIAL, ...MODELOS_PROGRAMACION]
