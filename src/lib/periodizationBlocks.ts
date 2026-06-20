// Plantillas de bloques de periodización (estilo mesociclo): cada paso define
// el RPE objetivo y si es semana de descarga. El entrenador aplica un bloque
// sobre la semana activa y se generan N semanas clonando sus días/ejercicios.
export interface PeriodizationStep {
  rpe: string
  isDeload: boolean
}

export interface PeriodizationBlock {
  id: string
  label: string
  desc: string
  steps: PeriodizationStep[]
}

export const PERIODIZATION_BLOCKS: PeriodizationBlock[] = [
  {
    id: 'strength_4w',
    label: 'Bloque de fuerza · 4 semanas',
    desc: 'Acumulación → Acumulación → Intensificación → Descarga',
    steps: [
      { rpe: '@7', isDeload: false },
      { rpe: '@8', isDeload: false },
      { rpe: '@9', isDeload: false },
      { rpe: '@6', isDeload: true },
    ],
  },
  {
    id: 'hypertrophy_5w',
    label: 'Bloque de hipertrofia · 5 semanas',
    desc: 'Volumen progresivo durante 4 semanas + descarga',
    steps: [
      { rpe: '@6.5', isDeload: false },
      { rpe: '@7', isDeload: false },
      { rpe: '@7.5', isDeload: false },
      { rpe: '@8.5', isDeload: false },
      { rpe: '@6', isDeload: true },
    ],
  },
  {
    id: 'peaking_3w',
    label: 'Bloque de peaking · 3 semanas',
    desc: 'Rampa de intensidad hacia una marca/competición',
    steps: [
      { rpe: '@8', isDeload: false },
      { rpe: '@9', isDeload: false },
      { rpe: '@9.5', isDeload: false },
    ],
  },
]
