export type Especialidad =
  | 'hipertrofia'
  | 'fuerza'
  | 'halterofilia'
  | 'rehabilitacion'
  | 'rendimiento'
  | 'perdida_grasa'

export const ESPECIALIDADES: {
  value: Especialidad
  label: string
  emoji: string
  desc: string
  metricas: string[]
  kpis: string[]
} [] = [
  {
    value: 'hipertrofia',
    label: 'Hipertrofia',
    emoji: '💪',
    desc: 'Ganancia muscular y volumen',
    metricas: ['volumen_semanal', 'adherencia', 'progresion_cargas', 'fotos'],
    kpis: ['Series totales/sem', 'Adherencia %', 'Progresión kg', 'Peso corporal'],
  },
  {
    value: 'fuerza',
    label: 'Fuerza / Powerlifting',
    emoji: '🏋️',
    desc: 'Fuerza máxima y marcas personales',
    metricas: ['rm_estimado', 'intensidad', 'rpe', 'tecnica'],
    kpis: ['RM estimado', 'Intensidad media %', 'RPE medio', 'Récords'],
  },
  {
    value: 'halterofilia',
    label: 'Halterofilia',
    emoji: '🥇',
    desc: 'Arranque, dos tiempos y variantes',
    metricas: ['rm_estimado', 'tecnica', 'ciclos', 'progresion_cargas'],
    kpis: ['RM arranque', 'RM dos tiempos', 'Ciclos completados', 'Técnica'],
  },
  {
    value: 'rehabilitacion',
    label: 'Rehabilitación',
    emoji: '🩺',
    desc: 'Recuperación funcional y terapéutica',
    metricas: ['dolor', 'rango_movimiento', 'cumplimiento', 'flags'],
    kpis: ['Dolor percibido', 'Rango movimiento', 'Cumplimiento %', 'Alertas'],
  },
  {
    value: 'rendimiento',
    label: 'Rendimiento general',
    emoji: '⚡',
    desc: 'Atletismo y rendimiento deportivo',
    metricas: ['adherencia', 'volumen_semanal', 'progresion_cargas', 'condicionamiento'],
    kpis: ['Adherencia %', 'Carga semanal', 'Progresión', 'Condición física'],
  },
  {
    value: 'perdida_grasa',
    label: 'Pérdida de grasa',
    emoji: '🔥',
    desc: 'Composición corporal y definición',
    metricas: ['peso', 'adherencia', 'fotos', 'medidas'],
    kpis: ['Peso corporal', 'Adherencia %', 'Fotos progreso', 'Medidas'],
  },
]

export const BLOQUES_POR_ESPECIALIDAD: Record<Especialidad, string[]> = {
  hipertrofia:    ['Calentamiento', 'Bloque principal', 'Accesorios', 'Pump/finisher'],
  fuerza:         ['Calentamiento', 'Técnica', 'Bloque principal', 'Accesorios', 'Movilidad'],
  halterofilia:   ['Activación', 'Técnica', 'Bloque olímpico', 'Fuerza complementaria'],
  rehabilitacion: ['Movilidad', 'Activación neuromuscular', 'Ejercicio terapéutico', 'Notas clínicas'],
  rendimiento:    ['Calentamiento', 'Técnica/habilidad', 'Bloque principal', 'Condicionamiento', 'Vuelta a la calma'],
  perdida_grasa:  ['Calentamiento', 'Bloque principal', 'Cardio/HIIT', 'Finisher metabólico'],
}

export const PLANTILLAS_SUGERIDAS: Record<Especialidad, { nombre: string; desc: string; semanas: number }[]> = {
  hipertrofia: [
    { nombre: 'PPL 6 días', desc: 'Push/Pull/Legs 2x semana', semanas: 8 },
    { nombre: 'Upper/Lower 4 días', desc: 'Tren superior e inferior alternos', semanas: 6 },
    { nombre: 'Full body 3 días', desc: 'Sesiones completas para principiantes', semanas: 4 },
  ],
  fuerza: [
    { nombre: 'GZCLP', desc: 'Progresión lineal por niveles', semanas: 12 },
    { nombre: '5/3/1 Wendler', desc: 'Ciclos de intensidad ondulante', semanas: 16 },
    { nombre: 'Texas Method', desc: 'Volumen/recuperación/intensidad', semanas: 8 },
  ],
  halterofilia: [
    { nombre: 'Bloque técnico 4 días', desc: 'Enfoque en técnica y posiciones', semanas: 4 },
    { nombre: 'Bloque fuerza 5 días', desc: 'Carga y fuerza complementaria', semanas: 6 },
  ],
  rehabilitacion: [
    { nombre: 'Protocolo rodilla fase 1', desc: 'Activación y movilidad inicial', semanas: 3 },
    { nombre: 'Protocolo hombro fase 2', desc: 'Fortalecimiento progresivo', semanas: 4 },
  ],
  rendimiento: [
    { nombre: 'Bloque base 4 días', desc: 'Fuerza + condicionamiento', semanas: 6 },
    { nombre: 'Bloque específico', desc: 'Transferencia al deporte', semanas: 4 },
  ],
  perdida_grasa: [
    { nombre: 'Metabólico 4 días', desc: 'Circuitos y densidad de entrenamiento', semanas: 6 },
    { nombre: 'Fuerza + cardio 3 días', desc: 'Preservar músculo, quemar grasa', semanas: 8 },
  ],
}
