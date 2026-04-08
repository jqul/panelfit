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

export const DEMO_PLAN_CARLOS: TrainingPlan = {
  clientId: 'demo-client-002',
  type: 'fuerza',
  restMain: 240, restAcc: 120, restWarn: 45,
  message: 'La fuerza se construye con paciencia y progresión. ¡A por los récords! 🏋️',
  fechaInicio: new Date(Date.now() - 21 * 86400000).toISOString().split('T')[0],
  autoCheckin: true,
  diasSemana: 3,
  macros: { kcal: 3200, protein: 200, carbs: 380, fats: 90, notaMacros: 'Surplus calórico moderado. Come bien antes y después de entrenar.' },
  weeks: [
    {
      label: 'Semana 3 — Intensidad',
      rpe: '@8-9',
      isCurrent: true,
      days: [
        {
          title: 'DÍA 1 — Sentadilla',
          focus: 'Fuerza máxima tren inferior',
          exercises: [
            { name: 'Sentadilla barra alta', sets: '5×3', weight: '120kg', isMain: true, comment: 'RPE 8. Si va bien, añade 2.5kg', videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8' },
            { name: 'Sentadilla pausa', sets: '3×3', weight: '95kg', isMain: false, comment: '3 segundos abajo', videoUrl: '' },
            { name: 'Prensa 45°', sets: '3×8', weight: '180kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Extensión cuádriceps', sets: '3×12', weight: '60kg', isMain: false, comment: '', videoUrl: '' },
          ]
        },
        {
          title: 'DÍA 2 — Press banca',
          focus: 'Fuerza máxima tren superior',
          exercises: [
            { name: 'Press banca', sets: '5×3', weight: '100kg', isMain: true, comment: 'RPE 8. Arco controlado, pies en el suelo', videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg' },
            { name: 'Press banca agarre cerrado', sets: '3×5', weight: '80kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Press inclinado', sets: '3×8', weight: '70kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Triceps polea', sets: '3×12', weight: '35kg', isMain: false, comment: '', videoUrl: '' },
          ]
        },
        {
          title: 'DÍA 3 — Peso muerto',
          focus: 'Fuerza máxima cadena posterior',
          exercises: [
            { name: 'Peso muerto convencional', sets: '4×3', weight: '160kg', isMain: true, comment: 'RPE 8-9. Espalda neutra en todo momento', videoUrl: 'https://www.youtube.com/watch?v=op9kVnSso6Q' },
            { name: 'Peso muerto rumano', sets: '3×6', weight: '120kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Remo barra', sets: '4×6', weight: '90kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Jalón al pecho', sets: '3×10', weight: '70kg', isMain: false, comment: '', videoUrl: '' },
          ]
        },
      ]
    }
  ]
}

export const DEMO_PLAN_LAURA: TrainingPlan = {
  clientId: 'demo-client-003',
  type: 'perdida_grasa',
  restMain: 90, restAcc: 60, restWarn: 20,
  message: 'Cada entreno es un paso hacia tu mejor versión. ¡Tú puedes! 🔥',
  fechaInicio: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
  autoCheckin: true,
  autoInactividad: true,
  diasSemana: 3,
  macros: { kcal: 1700, protein: 140, carbs: 160, fats: 55, notaMacros: 'Déficit moderado. No pases hambre — si tienes hambre, añade proteína o verduras.' },
  weeks: [
    {
      label: 'Semana 1 — Adaptación',
      rpe: '@6-7',
      isCurrent: true,
      days: [
        {
          title: 'DÍA A — Full body',
          focus: 'Activación y base',
          exercises: [
            { name: 'Sentadilla goblet', sets: '3×12', weight: '16kg', isMain: true, comment: 'Técnica primero, peso después', videoUrl: '' },
            { name: 'Press mancuernas', sets: '3×12', weight: '12kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Remo mancuerna', sets: '3×12', weight: '14kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Hip thrust', sets: '3×15', weight: '40kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Plancha', sets: '3×30s', weight: '-', isMain: false, comment: '', videoUrl: '' },
          ]
        },
        {
          title: 'DÍA B — Pierna + Glúteo',
          focus: 'Tren inferior y quema',
          exercises: [
            { name: 'Sentadilla búlgara', sets: '3×10', weight: '20kg', isMain: true, comment: '', videoUrl: '' },
            { name: 'Peso muerto pierna rígida', sets: '3×12', weight: '30kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Abducción cadera máquina', sets: '3×15', weight: '40kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Step up con mancuernas', sets: '3×12', weight: '8kg', isMain: false, comment: '', videoUrl: '' },
          ]
        },
        {
          title: 'DÍA C — Tren superior + Cardio',
          focus: 'Brazos, espalda y finisher',
          exercises: [
            { name: 'Jalón al pecho', sets: '3×12', weight: '40kg', isMain: true, comment: '', videoUrl: '' },
            { name: 'Press hombro mancuernas', sets: '3×12', weight: '10kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'Curl bíceps', sets: '3×12', weight: '10kg', isMain: false, comment: '', videoUrl: '' },
            { name: 'HIIT bici 15min', sets: '1×15min', weight: '-', isMain: false, comment: '30s sprint / 30s descanso', videoUrl: '' },
          ]
        },
      ]
    }
  ]
}
