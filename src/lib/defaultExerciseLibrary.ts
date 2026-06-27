// Biblioteca de ejercicios de serie — se siembra automáticamente la primera vez
// que un entrenador entra a "Ejercicios" y aún no tiene ninguno. El entrenador
// decide luego a qué especialidad pertenece cada uno; aquí solo se clasifican
// por grupo muscular.
export interface DefaultExercise { name: string; category: string }

export const DEFAULT_EXERCISE_LIBRARY: DefaultExercise[] = [
  // Pecho
  { name: 'Press banca', category: 'Pecho' },
  { name: 'Press banca inclinado', category: 'Pecho' },
  { name: 'Press banca declinado', category: 'Pecho' },
  { name: 'Press inclinado mancuernas', category: 'Pecho' },
  { name: 'Aperturas con mancuernas', category: 'Pecho' },
  { name: 'Cruces en polea (cable cross)', category: 'Pecho' },
  { name: 'Fondos en paralelas', category: 'Pecho' },
  { name: 'Press en máquina', category: 'Pecho' },

  // Espalda
  { name: 'Dominadas', category: 'Espalda' },
  { name: 'Remo con barra', category: 'Espalda' },
  { name: 'Remo con mancuerna a una mano', category: 'Espalda' },
  { name: 'Jalón al pecho', category: 'Espalda' },
  { name: 'Pulldown agarre neutro', category: 'Espalda' },
  { name: 'Peso muerto convencional', category: 'Espalda' },
  { name: 'Peso muerto rumano', category: 'Espalda' },
  { name: 'Remo en máquina', category: 'Espalda' },
  { name: 'Hiperextensiones', category: 'Espalda' },

  // Pierna
  { name: 'Sentadilla con barra', category: 'Pierna' },
  { name: 'Sentadilla goblet', category: 'Pierna' },
  { name: 'Sentadilla búlgara', category: 'Pierna' },
  { name: 'Prensa de piernas', category: 'Pierna' },
  { name: 'Zancadas', category: 'Pierna' },
  { name: 'Curl femoral tumbado', category: 'Pierna' },
  { name: 'Extensión de cuádriceps', category: 'Pierna' },
  { name: 'Elevación de talones (gemelo)', category: 'Pierna' },
  { name: 'Hip thrust', category: 'Pierna' },
  { name: 'Abducción de cadera en máquina', category: 'Pierna' },

  // Hombro
  { name: 'Press militar con barra', category: 'Hombro' },
  { name: 'Press de hombro con mancuernas', category: 'Hombro' },
  { name: 'Elevaciones laterales', category: 'Hombro' },
  { name: 'Elevaciones frontales', category: 'Hombro' },
  { name: 'Pájaros (elevación posterior)', category: 'Hombro' },
  { name: 'Face pull', category: 'Hombro' },
  { name: 'Press Arnold', category: 'Hombro' },

  // Bíceps
  { name: 'Curl de bíceps con barra', category: 'Bíceps' },
  { name: 'Curl de bíceps con mancuernas', category: 'Bíceps' },
  { name: 'Curl martillo', category: 'Bíceps' },
  { name: 'Curl en banco Scott', category: 'Bíceps' },

  // Tríceps
  { name: 'Press francés', category: 'Tríceps' },
  { name: 'Extensión de tríceps en polea', category: 'Tríceps' },
  { name: 'Patada de tríceps', category: 'Tríceps' },
  { name: 'Fondos de tríceps en banco', category: 'Tríceps' },

  // Core
  { name: 'Plancha', category: 'Core' },
  { name: 'Rueda abdominal (ab wheel)', category: 'Core' },
  { name: 'Crunch abdominal', category: 'Core' },
  { name: 'Elevación de piernas colgado', category: 'Core' },
  { name: 'Russian twist', category: 'Core' },

  // Cardio
  { name: 'Carrera continua', category: 'Cardio' },
  { name: 'Bicicleta estática', category: 'Cardio' },
  { name: 'Remo (cardio)', category: 'Cardio' },
  { name: 'Comba (saltar a la cuerda)', category: 'Cardio' },
  { name: 'Burpees', category: 'Cardio' },
]
