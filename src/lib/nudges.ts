// Sistema de nudges por segmento de cliente

export type Objetivo = 'fuerza' | 'hipertrofia' | 'perdida_grasa' | 'resistencia' | 'general'

export const OBJETIVOS: { value: Objetivo; label: string; emoji: string; desc: string }[] = [
  { value: 'fuerza',        label: 'Fuerza',        emoji: '🏋️', desc: 'Aumentar marcas y fuerza máxima' },
  { value: 'hipertrofia',   label: 'Hipertrofia',   emoji: '💪', desc: 'Ganar músculo y volumen' },
  { value: 'perdida_grasa', label: 'Pérdida de grasa', emoji: '🔥', desc: 'Perder grasa y definir' },
  { value: 'resistencia',   label: 'Resistencia',   emoji: '🏃', desc: 'Mejorar resistencia y cardio' },
  { value: 'general',       label: 'General',        emoji: '⭐', desc: 'Mantenimiento y salud general' },
]

interface NudgeContext {
  clientName: string
  diasSinEntrenar: number
  racha: number
  adherencia: number
  url: string
}

const NUDGES: Record<Objetivo, {
  recordatorio: string[]
  felicitacion: string[]
  checkin: string[]
  consejo: string[]
}> = {
  fuerza: {
    recordatorio: [
      `Hola {name} 💪 Llevas {dias} días sin entrenar. Cada día que descansas de más, pierdes adaptación neural. ¡Vuelve hoy!\n\n{url}`,
      `{name}, tus músculos están esperando estímulo. {dias} días sin entrenamiento es demasiado para progresar en fuerza. ¡Vamos!\n\n{url}`,
    ],
    felicitacion: [
      `{name} 🔥 {racha} días seguidos entrenando. Esa consistencia es lo que construye fuerza real. ¡Sigue así!`,
      `Brutal constancia, {name}. {racha} días de racha. Los números en la barra van a subir. 💪`,
    ],
    checkin: [
      `Hola {name} 👋 Check-in semanal de fuerza. ¿Cómo han ido las marcas esta semana? ¿Alguna molestia?\n\n{url}`,
    ],
    consejo: [
      '💡 Recuerda: el descanso es parte del entrenamiento. Sin recuperación no hay adaptación.',
      '💡 Para ganar fuerza, la progresión de carga es clave. Anota siempre lo que levantas.',
      '💡 Duerme 7-9h. El 90% de la adaptación de fuerza ocurre mientras duermes.',
    ],
  },
  hipertrofia: {
    recordatorio: [
      `Hola {name} 💪 {dias} días sin entrenar. El músculo necesita estímulo constante para crecer. ¡No pierdas el ritmo!\n\n{url}`,
      `{name}, la hipertrofia se construye con consistencia. {dias} días de pausa es mucho. ¡Vuelve hoy!\n\n{url}`,
    ],
    felicitacion: [
      `{name} 🌟 {racha} días seguidos. Esa es la consistencia que hace crecer el músculo. ¡Orgulloso de ti!`,
      `Imparable, {name}. {racha} días de racha. El volumen y la constancia son tu arma secreta. 💪`,
    ],
    checkin: [
      `Hola {name} 👋 ¿Cómo te notas esta semana? ¿Estás comiendo suficiente proteína? Cuéntame.\n\n{url}`,
    ],
    consejo: [
      '💡 La proteína es fundamental: apunta a 1.6-2.2g por kg de peso corporal al día.',
      '💡 El volumen de entrenamiento importa. Más series = más estímulo de crecimiento.',
      '💡 La bomba muscular no es solo sensación — indica buena conexión mente-músculo.',
    ],
  },
  perdida_grasa: {
    recordatorio: [
      `Hola {name} 🔥 {dias} días sin entrenar. Recuerda que cada sesión activa tu metabolismo. ¡Vuelve!\n\n{url}`,
      `{name}, no dejes que el hábito se rompa. {dias} días sin entrenar y el cuerpo se adapta a no moverse. ¡Hoy es el día!\n\n{url}`,
    ],
    felicitacion: [
      `{name} ⭐ {racha} días seguidos. Esa constancia está quemando calorías incluso cuando duermes. ¡Brutal!`,
      `Increíble, {name}. {racha} días de racha. Tu metabolismo te lo agradece. 🔥`,
    ],
    checkin: [
      `Hola {name} 👋 Check-in semanal. ¿Cómo va la alimentación? ¿Cómo te notas de energía?\n\n{url}`,
    ],
    consejo: [
      '💡 No pases hambre — come suficiente proteína para preservar músculo mientras pierdes grasa.',
      '💡 El cardio ayuda, pero la alimentación es el 80%. No puedes compensar una mala dieta.',
      '💡 Pésate siempre a la misma hora (mañana, en ayunas) para datos consistentes.',
    ],
  },
  resistencia: {
    recordatorio: [
      `Hola {name} 🏃 {dias} días sin entrenar. La resistencia se pierde rápido. ¡Vuelve hoy!\n\n{url}`,
      `{name}, tu capacidad aeróbica necesita estímulo continuo. {dias} días de pausa es demasiado. ¡Ánimo!\n\n{url}`,
    ],
    felicitacion: [
      `{name} 💚 {racha} días seguidos entrenando. Tu corazón y pulmones te lo agradecen. ¡Sigue!`,
      `Increíble consistencia, {name}. {racha} días de racha. Tu resistencia está mejorando. 🏃`,
    ],
    checkin: [
      `Hola {name} 👋 ¿Cómo te has sentido en los entrenos esta semana? ¿Algún dolor o fatiga acumulada?\n\n{url}`,
    ],
    consejo: [
      '💡 La hidratación es clave en resistencia. Bebe antes, durante y después de entrenar.',
      '💡 No todas las sesiones deben ser a tope — alterna intensidades para recuperar mejor.',
      '💡 El sueño es tu mayor aliado para mejorar en resistencia. Priorízalo.',
    ],
  },
  general: {
    recordatorio: [
      `Hola {name} 👋 Llevas {dias} días sin entrenar. Tu cuerpo y mente se benefician de moverse. ¡Vuelve!\n\n{url}`,
      `{name}, un pequeño entreno hoy marca la diferencia mañana. ¡{dias} días de pausa es suficiente!\n\n{url}`,
    ],
    felicitacion: [
      `{name} ⭐ {racha} días seguidos cuidándote. ¡Eso es calidad de vida! Sigue así.`,
      `Constancia pura, {name}. {racha} días de racha. Así se construyen hábitos para toda la vida. 💪`,
    ],
    checkin: [
      `Hola {name} 👋 ¿Cómo te has sentido esta semana? Cuéntame qué tal va todo.\n\n{url}`,
    ],
    consejo: [
      '💡 La consistencia supera a la intensidad. Mejor entrenar 3 días suave que 1 día brutal.',
      '💡 Moverse aunque sea 20 minutos cambia tu energía y humor del día.',
      '💡 El mejor ejercicio es el que haces. Encuentra lo que te gusta y hazlo a menudo.',
    ],
  },
}

function fill(template: string, ctx: NudgeContext): string {
  return template
    .replace(/\{name\}/g, ctx.clientName)
    .replace(/\{dias\}/g, ctx.diasSinEntrenar.toString())
    .replace(/\{racha\}/g, ctx.racha.toString())
    .replace(/\{url\}/g, ctx.url)
}

export function getNudge(
  tipo: 'recordatorio' | 'felicitacion' | 'checkin',
  objetivo: Objetivo,
  ctx: NudgeContext
): string {
  const set = NUDGES[objetivo][tipo]
  const template = set[Math.floor(Math.random() * set.length)]
  return fill(template, ctx)
}

export function getConsejo(objetivo: Objetivo): string {
  const set = NUDGES[objetivo].consejo
  return set[Math.floor(Math.random() * set.length)]
}
