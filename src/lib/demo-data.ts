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
    isActive: true,
    createdAt: Date.now() - 60 * 86400000,
  },
  {
    id: 'demo-client-002',
    name: 'Carlos', surname: 'López',
    trainerId: DEMO_TRAINER_ID,
    token: 'demo-carlos-002',
    objetivo: 'fuerza',
    weight: 85, fatPercentage: 18, muscleMass: 68, totalLifted: 0,
    planDescription: 'Powerlifting intermedio',
    isActive: true,
    createdAt: Date.now() - 90 * 86400000,
  },
  {
    id: 'demo-client-003',
    name: 'Laura', surname: 'Martín',
    trainerId: DEMO_TRAINER_ID,
    token: 'demo-laura-003',
    objetivo: 'perdida_grasa',
    weight: 70, fatPercentage: 28, muscleMass: 47, totalLifted: 0,
    planDescription: 'Definición 3 días',
    isActive: true,
    createdAt: Date.now() - 30 * 86400000,
  },
]

// ── PERFIL ENTRENADOR DEMO ─────────────────────────────
export const DEMO_TRAINER_PROFILE = {
  displayName: 'Alex Martínez',
  brandName: 'AlexFit Training',
  brandColor: '#1a6038',
  brandLogo: '',
  brandBg: '',
  phone: '+34 600 000 000',
  bio: 'Entrenador personal especializado en hipertrofia y fuerza. +200 clientes transformados.',
  welcomeMsg: '¡Bienvenido/a a tu panel! 💪 Aquí tienes todo lo que necesitas para alcanzar tus objetivos.',
  motivMsg: 'Hoy es día de descanso. El músculo crece mientras descansas. 🧘 Aprovecha para comer bien.',
  restDayMsg: '¡Racha increíble! Eso es lo que marca la diferencia. 🔥 Sigue así.',
  especialidades: ['hipertrofia', 'fuerza'],
}

// ── PLAN MARÍA (Hipertrofia 4 días) ───────────────────
export const DEMO_PLAN_MARIA: TrainingPlan = {
  clientId: 'demo-client-001',
  type: 'hipertrofia',
  restMain: 180, restAcc: 90, restWarn: 30,
  message: '¡Cada serie te acerca a tu mejor versión! 💪',
  fechaInicio: new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0],
  autoCheckin: true, autoWelcome: true,
  diasSemana: 4,
  coachNotes: 'María progresa muy bien. Cuidado con la rodilla derecha en sentadilla — usar rodillera. Aumentar peso en press banca la próxima semana.',
  macros: { kcal: 2100, protein: 155, carbs: 230, fats: 65, notaMacros: 'Distribuye la proteína en 4-5 tomas. Post-entreno prioriza proteína + carbos.' },
  weeks: [
    {
      label: 'Semana 1 — Base',
      rpe: '@7-8', isCurrent: false,
      days: [
        {
          title: 'DÍA A — Pecho + Tríceps', focus: 'Empuje horizontal',
          exercises: [
            { name: 'Press banca', sets: '4×8', weight: '60kg', isMain: true, comment: 'Control en la bajada 3 segundos', videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg', restSets: 180, restAfter: 120 },
            { name: 'Press inclinado mancuernas', sets: '3×10', weight: '24kg', isMain: false, comment: 'Codos a 45°', videoUrl: '', restSets: 90, restAfter: 90 },
            { name: 'Fondos en paralelas', sets: '3×12', weight: 'Peso corporal', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 90 },
            { name: 'Press francés', sets: '3×12', weight: '20kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
          ]
        },
        {
          title: 'DÍA B — Espalda + Bíceps', focus: 'Tirón vertical y horizontal',
          exercises: [
            { name: 'Dominadas', sets: '4×6', weight: 'Peso corporal', isMain: true, comment: 'Rango completo, escápulas activadas', videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g', restSets: 180, restAfter: 120 },
            { name: 'Remo con barra', sets: '4×8', weight: '70kg', isMain: false, comment: 'Espalda neutra', videoUrl: '', restSets: 90, restAfter: 90 },
            { name: 'Pulldown agarre neutro', sets: '3×12', weight: '55kg', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 90 },
            { name: 'Curl bíceps barra', sets: '3×12', weight: '30kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
          ]
        },
        {
          title: 'DÍA C — Pierna', focus: 'Cuádriceps y femoral',
          exercises: [
            { name: 'Sentadilla barra', sets: '4×8', weight: '80kg', isMain: true, comment: 'Profundidad paralela mínima, rodillas alineadas', videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8', restSets: 180, restAfter: 120 },
            { name: 'Prensa 45°', sets: '4×12', weight: '140kg', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 90 },
            { name: 'Curl femoral tumbado', sets: '3×12', weight: '35kg', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 90 },
            { name: 'Elevación de talones', sets: '4×15', weight: '60kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
          ]
        },
        {
          title: 'DÍA D — Hombro + Core', focus: 'Empuje vertical',
          exercises: [
            { name: 'Press militar barra', sets: '4×8', weight: '50kg', isMain: true, comment: 'Núcleo activado, no arquees la espalda', videoUrl: '', restSets: 180, restAfter: 120 },
            { name: 'Elevaciones laterales', sets: '4×15', weight: '10kg', isMain: false, comment: 'Codo ligeramente flexionado', videoUrl: '', restSets: 60, restAfter: 60 },
            { name: 'Facepull', sets: '3×15', weight: '25kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
            { name: 'Plancha', sets: '3×45s', weight: '-', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
          ]
        },
      ]
    },
    {
      label: 'Semana 2 — Progresión',
      rpe: '@8', isCurrent: true,
      days: [
        {
          title: 'DÍA A — Pecho + Tríceps', focus: 'Empuje horizontal +2.5kg',
          exercises: [
            { name: 'Press banca', sets: '4×8', weight: '62.5kg', isMain: true, comment: 'Control en la bajada 3 segundos', videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg', restSets: 180, restAfter: 120 },
            { name: 'Press inclinado mancuernas', sets: '3×10', weight: '26kg', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 90 },
            { name: 'Fondos en paralelas', sets: '3×12', weight: 'Peso corporal', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 90 },
            { name: 'Press francés', sets: '3×12', weight: '22kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
          ]
        },
        {
          title: 'DÍA B — Espalda + Bíceps', focus: 'Tirón',
          exercises: [
            { name: 'Dominadas lastradas', sets: '4×5', weight: '+5kg', isMain: true, comment: '', videoUrl: '', restSets: 180, restAfter: 120 },
            { name: 'Remo con barra', sets: '4×8', weight: '72.5kg', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 90 },
            { name: 'Pulldown agarre neutro', sets: '3×12', weight: '57.5kg', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 90 },
            { name: 'Curl martillo', sets: '3×12', weight: '16kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
          ]
        },
        {
          title: 'DÍA C — Pierna', focus: 'Cuádriceps +2.5kg',
          exercises: [
            { name: 'Sentadilla barra', sets: '4×8', weight: '82.5kg', isMain: true, comment: '', videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8', restSets: 180, restAfter: 120 },
            { name: 'Prensa 45°', sets: '4×12', weight: '145kg', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 90 },
            { name: 'Curl femoral tumbado', sets: '3×12', weight: '37.5kg', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 90 },
            { name: 'Elevación de talones', sets: '4×15', weight: '62.5kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
          ]
        },
        {
          title: 'DÍA D — Hombro + Core', focus: 'Empuje vertical',
          exercises: [
            { name: 'Press militar barra', sets: '4×8', weight: '52.5kg', isMain: true, comment: '', videoUrl: '', restSets: 180, restAfter: 120 },
            { name: 'Elevaciones laterales', sets: '4×15', weight: '11kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
            { name: 'Facepull', sets: '3×15', weight: '27.5kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
            { name: 'Rueda abdominal', sets: '3×10', weight: '-', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
          ]
        },
      ]
    },
  ]
}

// ── LOGS MARÍA — 8 semanas de historial ───────────────
export const DEMO_LOGS_MARIA: TrainingLogs = (() => {
  const logs: TrainingLogs = {}
  const today = new Date()
  // lunes, miércoles, viernes, sábado durante 5 semanas
  const offsets = [1,3,5,7, 8,10,12,14, 15,17,19,21, 22,24,26,28, 29,31,33,35]
  offsets.forEach((offset, idx) => {
    const d = new Date(today); d.setDate(d.getDate() - offset)
    const fecha = d.toISOString().split('T')[0]
    const weekIdx = offset < 7 ? 1 : 0
    const dayIdx = idx % 4
    ;[0,1,2,3].forEach(ri => {
      const baseWeights: Record<number, number[]> = {
        0: [60,62.5,65,67.5,70], 1: [70,72.5,75,77.5,80],
        2: [80,82.5,85,87.5,90], 3: [50,52.5,55,57.5,60]
      }
      const progression = Math.min(Math.floor(offset / 7), 4)
      const bw = (baseWeights[dayIdx] || [60,62.5,65,67.5,70])[progression]
      const sets: Record<number, {weight:string;reps:string}> = {}
      const n = ri === 0 ? 4 : 3
      for (let si = 0; si < n; si++) {
        sets[si] = { weight: String(bw - (si * 2.5)), reps: String(ri === 0 ? 8 : 10) }
      }
      logs[`ex_w${weekIdx}_d${dayIdx}_r${ri}`] = { sets, done: true, dateDone: fecha }
    })
  })
  return logs
})()

// ── PLAN CARLOS (Powerlifting) ─────────────────────────
export const DEMO_PLAN_CARLOS: TrainingPlan = {
  clientId: 'demo-client-002',
  type: 'fuerza',
  restMain: 240, restAcc: 120, restWarn: 45,
  message: 'La fuerza se construye con paciencia y progresión. ¡A por los récords! 🏋️',
  fechaInicio: new Date(Date.now() - 42 * 86400000).toISOString().split('T')[0],
  autoCheckin: true,
  diasSemana: 3,
  coachNotes: 'Carlos está en fase pico. No tocar técnica ahora — solo progresión de carga. Competición en 3 semanas.',
  macros: { kcal: 3200, protein: 200, carbs: 380, fats: 90, notaMacros: 'Surplus calórico moderado. Come bien antes y después de entrenar.' },
  weeks: [
    {
      label: 'Semana 6 — Pico',
      rpe: '@9', isCurrent: true,
      days: [
        {
          title: 'DÍA 1 — Sentadilla', focus: 'Fuerza máxima tren inferior',
          exercises: [
            { name: 'Sentadilla barra alta', sets: '5×3', weight: '120kg', isMain: true, comment: 'RPE 8-9. Si va bien, añade 2.5kg', videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8', restSets: 300, restAfter: 240 },
            { name: 'Sentadilla pausa', sets: '3×3', weight: '95kg', isMain: false, comment: '3 segundos abajo', videoUrl: '', restSets: 180, restAfter: 120 },
            { name: 'Prensa 45°', sets: '3×8', weight: '180kg', isMain: false, comment: '', videoUrl: '', restSets: 120, restAfter: 90 },
            { name: 'Extensión cuádriceps', sets: '3×12', weight: '60kg', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 60 },
          ]
        },
        {
          title: 'DÍA 2 — Press banca', focus: 'Fuerza máxima tren superior',
          exercises: [
            { name: 'Press banca', sets: '5×3', weight: '105kg', isMain: true, comment: 'RPE 8-9. Arco controlado, pies en el suelo', videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg', restSets: 300, restAfter: 240 },
            { name: 'Press banca agarre cerrado', sets: '3×5', weight: '82.5kg', isMain: false, comment: '', videoUrl: '', restSets: 180, restAfter: 120 },
            { name: 'Press inclinado', sets: '3×8', weight: '72.5kg', isMain: false, comment: '', videoUrl: '', restSets: 120, restAfter: 90 },
            { name: 'Tríceps polea', sets: '3×12', weight: '37.5kg', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 60 },
          ]
        },
        {
          title: 'DÍA 3 — Peso muerto', focus: 'Fuerza máxima cadena posterior',
          exercises: [
            { name: 'Peso muerto convencional', sets: '4×3', weight: '165kg', isMain: true, comment: 'RPE 8-9. Espalda neutra en todo momento', videoUrl: 'https://www.youtube.com/watch?v=op9kVnSso6Q', restSets: 300, restAfter: 240 },
            { name: 'Peso muerto rumano', sets: '3×6', weight: '125kg', isMain: false, comment: '', videoUrl: '', restSets: 180, restAfter: 120 },
            { name: 'Remo barra', sets: '4×6', weight: '92.5kg', isMain: false, comment: '', videoUrl: '', restSets: 120, restAfter: 90 },
            { name: 'Jalón al pecho', sets: '3×10', weight: '72.5kg', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 60 },
          ]
        },
      ]
    }
  ]
}

// ── LOGS CARLOS ────────────────────────────────────────
export const DEMO_LOGS_CARLOS: TrainingLogs = (() => {
  const logs: TrainingLogs = {}
  const today = new Date()
  // lunes, miércoles, viernes — 6 semanas
  const offsets = [2,4,6, 9,11,13, 16,18,20, 23,25,27, 30,32,34, 37,39,41]
  offsets.forEach((offset, idx) => {
    const d = new Date(today); d.setDate(d.getDate() - offset)
    const fecha = d.toISOString().split('T')[0]
    const dayIdx = idx % 3
    const week = Math.floor(idx / 3)
    const baseWeights = [[115,100,155],[117.5,102.5,157.5],[120,105,160],[122.5,107.5,162.5],[122.5,107.5,165],[122.5,107.5,165]]
    const bw = baseWeights[Math.min(week, 5)][dayIdx]
    ;[0,1,2,3].forEach(ri => {
      const sets: Record<number, {weight:string;reps:string}> = {}
      const n = ri === 0 ? 5 : 3
      for (let si = 0; si < n; si++) {
        sets[si] = { weight: String(bw - (ri * 10)), reps: ri === 0 ? '3' : '6' }
      }
      logs[`ex_w0_d${dayIdx}_r${ri}`] = { sets, done: true, dateDone: fecha }
    })
  })
  return logs
})()

// ── PLAN LAURA (Definición) ────────────────────────────
export const DEMO_PLAN_LAURA: TrainingPlan = {
  clientId: 'demo-client-003',
  type: 'perdida_grasa',
  restMain: 90, restAcc: 60, restWarn: 20,
  message: 'Cada entreno es un paso hacia tu mejor versión. ¡Tú puedes! 🔥',
  fechaInicio: new Date(Date.now() - 21 * 86400000).toISOString().split('T')[0],
  autoCheckin: true, autoInactividad: true,
  diasSemana: 3,
  coachNotes: 'Laura empieza muy motivada. Vigilar que no baje demasiado las calorías por su cuenta.',
  macros: { kcal: 1700, protein: 140, carbs: 160, fats: 55, notaMacros: 'Déficit moderado. No pases hambre — si tienes hambre, añade proteína o verduras.' },
  weeks: [
    {
      label: 'Semana 3 — Progresión',
      rpe: '@7', isCurrent: true,
      days: [
        {
          title: 'DÍA A — Full body', focus: 'Activación y base',
          exercises: [
            { name: 'Sentadilla goblet', sets: '3×12', weight: '20kg', isMain: true, comment: 'Técnica primero, peso después', videoUrl: '', restSets: 90, restAfter: 60 },
            { name: 'Press mancuernas', sets: '3×12', weight: '14kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
            { name: 'Remo mancuerna', sets: '3×12', weight: '16kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
            { name: 'Hip thrust', sets: '3×15', weight: '50kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
            { name: 'Plancha', sets: '3×40s', weight: '-', isMain: false, comment: '', videoUrl: '', restSets: 45, restAfter: 45 },
          ]
        },
        {
          title: 'DÍA B — Pierna + Glúteo', focus: 'Tren inferior',
          exercises: [
            { name: 'Sentadilla búlgara', sets: '3×10', weight: '22kg', isMain: true, comment: '', videoUrl: '', restSets: 90, restAfter: 60 },
            { name: 'Peso muerto pierna rígida', sets: '3×12', weight: '35kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
            { name: 'Abducción cadera máquina', sets: '3×15', weight: '45kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
            { name: 'Step up con mancuernas', sets: '3×12', weight: '10kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
          ]
        },
        {
          title: 'DÍA C — Tren superior + Cardio', focus: 'Brazos y finisher',
          exercises: [
            { name: 'Jalón al pecho', sets: '3×12', weight: '45kg', isMain: true, comment: '', videoUrl: '', restSets: 90, restAfter: 60 },
            { name: 'Press hombro mancuernas', sets: '3×12', weight: '12kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
            { name: 'Curl bíceps', sets: '3×12', weight: '12kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
            { name: 'HIIT bici 15min', sets: '1×15min', weight: '-', isMain: false, comment: '30s sprint / 30s descanso', videoUrl: '', restSets: 0, restAfter: 0 },
          ]
        },
      ]
    }
  ]
}

// ── LOGS LAURA ─────────────────────────────────────────
export const DEMO_LOGS_LAURA: TrainingLogs = (() => {
  const logs: TrainingLogs = {}
  const today = new Date()
  // lunes, miércoles, sábado — 3 semanas
  const offsets = [2,4,6, 9,11,13, 16,18,20]
  offsets.forEach((offset, idx) => {
    const d = new Date(today); d.setDate(d.getDate() - offset)
    const fecha = d.toISOString().split('T')[0]
    const dayIdx = idx % 3
    const baseW = [20, 35, 45]
    ;[0,1,2,3].forEach(ri => {
      const sets: Record<number, {weight:string;reps:string}> = {}
      for (let si = 0; si < 3; si++) {
        sets[si] = { weight: String((baseW[dayIdx] || 20) + ri * 2), reps: '12' }
      }
      logs[`ex_w0_d${dayIdx}_r${ri}`] = { sets, done: true, dateDone: fecha }
    })
  })
  return logs
})()

// ── PESOS CORPORALES (para localStorage en demo) ───────
export const DEMO_WEIGHTS_MARIA = [
  { date: new Date(Date.now() - 0*86400000).toISOString().split('T')[0], weight: 61.2 },
  { date: new Date(Date.now() - 7*86400000).toISOString().split('T')[0], weight: 61.8 },
  { date: new Date(Date.now() - 14*86400000).toISOString().split('T')[0], weight: 62.3 },
  { date: new Date(Date.now() - 21*86400000).toISOString().split('T')[0], weight: 62.5 },
  { date: new Date(Date.now() - 28*86400000).toISOString().split('T')[0], weight: 63.0 },
  { date: new Date(Date.now() - 35*86400000).toISOString().split('T')[0], weight: 63.4 },
  { date: new Date(Date.now() - 42*86400000).toISOString().split('T')[0], weight: 63.8 },
  { date: new Date(Date.now() - 49*86400000).toISOString().split('T')[0], weight: 64.1 },
]

export const DEMO_WEIGHTS_CARLOS = [
  { date: new Date(Date.now() - 0*86400000).toISOString().split('T')[0], weight: 85.5 },
  { date: new Date(Date.now() - 7*86400000).toISOString().split('T')[0], weight: 85.2 },
  { date: new Date(Date.now() - 14*86400000).toISOString().split('T')[0], weight: 84.8 },
  { date: new Date(Date.now() - 21*86400000).toISOString().split('T')[0], weight: 84.5 },
  { date: new Date(Date.now() - 28*86400000).toISOString().split('T')[0], weight: 85.0 },
  { date: new Date(Date.now() - 35*86400000).toISOString().split('T')[0], weight: 85.3 },
]

export const DEMO_WEIGHTS_LAURA = [
  { date: new Date(Date.now() - 0*86400000).toISOString().split('T')[0], weight: 68.5 },
  { date: new Date(Date.now() - 7*86400000).toISOString().split('T')[0], weight: 69.1 },
  { date: new Date(Date.now() - 14*86400000).toISOString().split('T')[0], weight: 69.8 },
  { date: new Date(Date.now() - 21*86400000).toISOString().split('T')[0], weight: 70.2 },
]

// ── RESPUESTAS ENCUESTAS DEMO ──────────────────────────
export const DEMO_SURVEY_RESPONSES = [
  {
    id: 'demo-resp-001', client_id: 'demo-client-001',
    trainer_id: DEMO_TRAINER_ID, template_id: 'demo-tmpl-001',
    completed_at: Date.now() - 2*86400000,
    answers: { q1: 8, q2: 7, q3: 4, q4: true, q5: 'Me noto más fuerte en press banca, ¡genial! 💪' }
  },
  {
    id: 'demo-resp-002', client_id: 'demo-client-001',
    trainer_id: DEMO_TRAINER_ID, template_id: 'demo-tmpl-001',
    completed_at: Date.now() - 9*86400000,
    answers: { q1: 6, q2: 5, q3: 7, q4: false, q5: 'Semana dura de trabajo, me costó entrenar' }
  },
  {
    id: 'demo-resp-003', client_id: 'demo-client-002',
    trainer_id: DEMO_TRAINER_ID, template_id: 'demo-tmpl-001',
    completed_at: Date.now() - 3*86400000,
    answers: { q1: 9, q2: 8, q3: 3, q4: true, q5: 'Todo perfecto, listo para la competición' }
  },
  {
    id: 'demo-resp-004', client_id: 'demo-client-003',
    trainer_id: DEMO_TRAINER_ID, template_id: 'demo-tmpl-001',
    completed_at: Date.now() - 1*86400000,
    answers: { q1: 7, q2: 6, q3: 5, q4: true, q5: '' }
  },
]

// Template de encuesta demo
export const DEMO_SURVEY_TEMPLATE = {
  id: 'demo-tmpl-001',
  trainer_id: DEMO_TRAINER_ID,
  name: 'Check-in semanal',
  questions: [
    { id: 'q1', type: 'scale', label: '¿Cómo valorarías tu energía esta semana? (1-10)', required: true },
    { id: 'q2', type: 'scale', label: '¿Cómo has dormido esta semana? (1-10)', required: true },
    { id: 'q3', type: 'scale', label: '¿Nivel de estrés esta semana? (1-10)', required: true },
    { id: 'q4', type: 'yesno', label: '¿Has seguido la dieta esta semana?', required: false },
    { id: 'q5', type: 'text', label: '¿Algo que quieras comentar?', required: false },
  ],
  created_at: Date.now() - 30*86400000,
}
