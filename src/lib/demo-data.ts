// Datos del modo demo — entrenador ficticio con clientes de ejemplo
import { ClientData, TrainingPlan, TrainingLogs } from '../types'

export const DEMO_TRAINER_ID = 'demo-trainer-001'

export const DEMO_CLIENTS: ClientData[] = [
  {
    id: 'demo-client-001',
    name: 'María', surname: 'García',
    trainerId: DEMO_TRAINER_ID,
    token: 'demo-maria-001',
    objetivo: 'hipertrofia',
    weight: 62, fatPercentage: 22, muscleMass: 45, totalLifted: 0,
    planDescription: 'Programa hipertrofia 4 días',
    createdAt: Date.now() - 30 * 86400000,
  },
  {
    id: 'demo-client-002',
    name: 'Carlos', surname: 'López',
    trainerId: DEMO_TRAINER_ID,
    token: 'demo-carlos-002',
    objetivo: 'fuerza',
    weight: 85, fatPercentage: 18, muscleMass: 68, totalLifted: 0,
    planDescription: 'Powerlifting intermedio',
    createdAt: Date.now() - 60 * 86400000,
  },
  {
    id: 'demo-client-003',
    name: 'Laura', surname: 'Martín',
    trainerId: DEMO_TRAINER_ID,
    token: 'demo-laura-003',
    objetivo: 'perdida_grasa',
    weight: 70, fatPercentage: 28, muscleMass: 47, totalLifted: 0,
    planDescription: 'Definición 3 días',
    createdAt: Date.now() - 15 * 86400000,
  },
]

export const DEMO_PLAN_MARIA: TrainingPlan = {
  clientId: 'demo-client-001',
  type: 'hipertrofia',
  restMain: 180, restAcc: 90, restWarn: 30,
  message: '¡Cada serie te acerca a tu mejor versión! 💪',
  fechaInicio: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
  autoCheckin: true,
  autoWelcome: true,
  diasSemana: 4,
  macros: { kcal: 2100, protein: 155, carbs: 230, fats: 65, notaMacros: 'Distribuye la proteína en 4-5 tomas. Post-entreno prioriza proteína + carbos.' },
  weeks: [
    {
      label: 'Semana 1 — Base',
      rpe: '@7-8',
      isCurrent: false,
      days: [
        {
          title: 'DÍA A — Pecho + Tríceps',
          focus: 'Empuje horizontal',
          exercises: [
            { name: 'Press banca', sets: '4×8', weight: '60kg', isMain: true, comment: 'Control en la bajada 3 segundos', videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg' },
            { name: 'Press inclinado mancuernas', sets: '3×10', weight: '24kg', isMain: false, comment: 'Codos a 45°', videoUrl: '' },
            { name: 'Fondos en paralelas', sets: '3×12', weight: 'Peso corporal', isMain: false, comment: '', videoUrl: '' },
            { name: 'Press francés', sets: '3×12', weight: '20kg', isMain: false, comment: '', videoUrl: '' },
          ]
        },
        {
          title: 'DÍA B — Espalda + Bíceps',
          focus: 'Tirón vertical y horizontal',
          exercises: [
            { name: 'Dominadas', sets: '4×6', weight: 'Peso corporal', isMain: true, comment: 'Rango completo, escápulas activadas', videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g' },
            { name: 'Remo con barra', sets: '4×8', weight: '70kg', isMain: false, comment: 'Espalda neutra', videoUrl: '' },
            { name: 'Pulldown agarre neutro', sets: '3×12', weight: '55kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Curl bíceps barra', sets: '3×12', weight: '30kg', isMain: false, comment: '', videoUrl: '' },
          ]
        },
        {
          title: 'DÍA C — Pierna',
          focus: 'Cuádriceps y femoral',
          exercises: [
            { name: 'Sentadilla barra', sets: '4×8', weight: '80kg', isMain: true, comment: 'Profundidad paralela mínima, rodillas alineadas', videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8' },
            { name: 'Prensa 45°', sets: '4×12', weight: '140kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Curl femoral tumbado', sets: '3×12', weight: '35kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Elevación de talones', sets: '4×15', weight: '60kg', isMain: false, comment: '', videoUrl: '' },
          ]
        },
        {
          title: 'DÍA D — Hombro + Core',
          focus: 'Empuje vertical',
          exercises: [
            { name: 'Press militar barra', sets: '4×8', weight: '50kg', isMain: true, comment: 'Núcleo activado, no arquees la espalda', videoUrl: '' },
            { name: 'Elevaciones laterales', sets: '4×15', weight: '10kg', isMain: false, comment: 'Codo ligeramente flexionado', videoUrl: '' },
            { name: 'Facepull', sets: '3×15', weight: '25kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Plancha', sets: '3×45s', weight: '-', isMain: false, comment: '', videoUrl: '' },
          ]
        },
      ]
    },
    {
      label: 'Semana 2 — Progresión',
      rpe: '@8',
      isCurrent: true,
      days: [
        {
          title: 'DÍA A — Pecho + Tríceps',
          focus: 'Empuje horizontal +2.5kg',
          exercises: [
            { name: 'Press banca', sets: '4×8', weight: '62.5kg', isMain: true, comment: 'Control en la bajada 3 segundos', videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg' },
            { name: 'Press inclinado mancuernas', sets: '3×10', weight: '26kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Fondos en paralelas', sets: '3×12', weight: 'Peso corporal', isMain: false, comment: '', videoUrl: '' },
            { name: 'Press francés', sets: '3×12', weight: '22kg', isMain: false, comment: '', videoUrl: '' },
          ]
        },
        {
          title: 'DÍA B — Espalda + Bíceps',
          focus: 'Tirón',
          exercises: [
            { name: 'Dominadas lastradas', sets: '4×5', weight: '+5kg', isMain: true, comment: '', videoUrl: '' },
            { name: 'Remo con barra', sets: '4×8', weight: '72.5kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Pulldown agarre neutro', sets: '3×12', weight: '57.5kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Curl martillo', sets: '3×12', weight: '16kg', isMain: false, comment: '', videoUrl: '' },
          ]
        },
        {
          title: 'DÍA C — Pierna',
          focus: 'Cuádriceps +2.5kg',
          exercises: [
            { name: 'Sentadilla barra', sets: '4×8', weight: '82.5kg', isMain: true, comment: '', videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8' },
            { name: 'Prensa 45°', sets: '4×12', weight: '145kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Curl femoral tumbado', sets: '3×12', weight: '37.5kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Elevación de talones', sets: '4×15', weight: '62.5kg', isMain: false, comment: '', videoUrl: '' },
          ]
        },
        {
          title: 'DÍA D — Hombro + Core',
          focus: 'Empuje vertical',
          exercises: [
            { name: 'Press militar barra', sets: '4×8', weight: '52.5kg', isMain: true, comment: '', videoUrl: '' },
            { name: 'Elevaciones laterales', sets: '4×15', weight: '11kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Facepull', sets: '3×15', weight: '27.5kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Rueda abdominal', sets: '3×10', weight: '-', isMain: false, comment: '', videoUrl: '' },
          ]
        },
      ]
    },
  ]
}

export const DEMO_LOGS_MARIA: TrainingLogs = (() => {
  const logs: TrainingLogs = {}
  const today = new Date()
  // Simular entrenos los últimos 14 días — lun/mié/vie/sáb
  const diasEntrenados = [1, 3, 6, 8, 10, 13]
  diasEntrenados.forEach(offset => {
    const d = new Date(today); d.setDate(d.getDate() - offset)
    const fecha = d.toISOString().split('T')[0]
    const weekIdx = offset < 7 ? 1 : 0
    const dayIdx = [0, 1, 2, 3][Math.floor(offset / 3) % 4]
    ;[0, 1, 2, 3].forEach(ri => {
      const key = `ex_w${weekIdx}_d${dayIdx}_r${ri}`
      const sets: Record<number, { weight: string; reps: string }> = {}
      const n = ri === 0 ? 4 : 3
      for (let si = 0; si < n; si++) {
        sets[si] = { weight: String(Math.floor(Math.random() * 20 + 50)), reps: String(Math.floor(Math.random() * 3 + 7)) }
      }
      logs[key] = { sets, done: true, dateDone: fecha }
    })
  })
  return logs
})()

export const DEMO_TRAINER_PROFILE = {
  displayName: 'Alex Trainer',
  brandName: 'AlexFit',
  brandColor: '#1a6038',
  brandLogo: '',
  phone: '+34 600 000 000',
  bio: 'Entrenador personal especializado en hipertrofia y fuerza',
  welcomeMsg: 'Bienvenido/a a tu panel personalizado. ¡Vamos a conseguir tus objetivos juntos! 💪',
  motivMsg: 'Hoy es día de descanso. Recupera bien para dar el 100% mañana. 🧘',
  especialidades: ['hipertrofia', 'fuerza'],
}
