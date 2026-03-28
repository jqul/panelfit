import { TrainingPlan, ClientData } from '../types'

export const TRAINING_TYPES = [
  { value: 'powerlifting',   label: 'Powerlifting' },
  { value: 'hipertrofia',    label: 'Hipertrofia' },
  { value: 'fuerza',         label: 'Fuerza' },
  { value: 'perdida_grasa',  label: 'Pérdida de grasa' },
  { value: 'resistencia',    label: 'Resistencia' },
  { value: 'funcional',      label: 'Funcional' },
]

export const DEFAULT_EXERCISES = [
  'Sentadilla con barra', 'Sentadilla goblet', 'Sentadilla búlgara', 'Prensa de piernas',
  'Peso muerto', 'Peso muerto rumano', 'Peso muerto sumo',
  'Press banca', 'Press banca inclinado', 'Press banca declinado', 'Aperturas en banco',
  'Press militar', 'Press Arnold', 'Elevaciones laterales', 'Pájaro',
  'Dominadas', 'Jalón al pecho', 'Remo con barra', 'Remo con mancuerna', 'Remo en polea',
  'Curl de bíceps', 'Curl martillo', 'Curl concentrado',
  'Press francés', 'Extensión tríceps polea', 'Fondos en paralelas',
  'Zancadas', 'Hip thrust', 'Glute bridge', 'Leg curl', 'Leg extension',
  'Plancha', 'Crunch', 'Rueda abdominal', 'Elevación de piernas', 'Russian twist',
  'Face pull', 'Encogimientos de hombros', 'Pull-over',
]

export const DEMO_CLIENT: ClientData = {
  id: 'demo-client',
  name: 'Alex',
  surname: 'García',
  weight: 83.5,
  fatPercentage: 14.2,
  muscleMass: 68.1,
  totalLifted: 485,
  planDescription: 'Powerlifting · Progresión +2.5 kg/semana',
  trainerId: 'demo-trainer',
  token: 'demo-token',
  createdAt: Date.now(),
  isActive: true,
}

export const DEMO_PLAN: TrainingPlan = {
  clientId: 'demo-client',
  type: 'powerlifting',
  restMain: 180,
  restAcc: 90,
  restWarn: 30,
  message: '¡A por ello esta semana! Recuerda mantener la técnica en los pesos altos.',
  weeks: [
    {
      label: 'Semana 1',
      rpe: '@7',
      isCurrent: false,
      days: [
        {
          title: 'LUNES — Empuje',
          focus: 'Sentadilla / Banca / Militar',
          exercises: [
            { name: 'Sentadilla con barra', sets: '4×5', weight: '100 kg', isMain: true,  comment: 'Mantén el pecho alto.' },
            { name: 'Press banca',          sets: '4×5', weight: '80 kg',  isMain: true,  comment: 'Codos a 45°.' },
            { name: 'Press militar',        sets: '3×8', weight: '50 kg',  isMain: false, comment: '' },
          ],
        },
        {
          title: 'MIÉRCOLES — Tirón',
          focus: 'Peso muerto / Remo / Jalón',
          exercises: [
            { name: 'Peso muerto',     sets: '4×4', weight: '120 kg', isMain: true,  comment: 'Espalda neutral.' },
            { name: 'Remo con barra',  sets: '4×8', weight: '70 kg',  isMain: false, comment: '' },
            { name: 'Jalón al pecho',  sets: '3×10', weight: '60 kg', isMain: false, comment: '' },
          ],
        },
      ],
    },
    {
      label: 'Semana 2',
      rpe: '@8',
      isCurrent: true,
      days: [
        {
          title: 'LUNES — Empuje',
          focus: 'Sentadilla / Banca / Militar',
          exercises: [
            { name: 'Sentadilla con barra', sets: '4×5', weight: '102.5 kg', isMain: true,  comment: '' },
            { name: 'Press banca',          sets: '4×5', weight: '82.5 kg',  isMain: true,  comment: '' },
            { name: 'Elevaciones laterales', sets: '3×12', weight: '12 kg',  isMain: false, comment: '' },
          ],
        },
      ],
    },
  ],
}

export const EXERCISE_CATEGORIES = [
  'Piernas', 'Pecho', 'Espalda', 'Hombros',
  'Bíceps', 'Tríceps', 'Core', 'Cardio', 'General'
]
