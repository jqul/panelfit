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
    precio_mensual: 80,
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
    precio_mensual: 100,
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
  {
    id: 'demo-client-004',
    name: 'Diego', surname: 'Fernández',
    trainerId: DEMO_TRAINER_ID,
    token: 'demo-diego-004',
    objetivo: 'fuerza',
    weight: 90, fatPercentage: 20, muscleMass: 70, totalLifted: 0,
    planDescription: 'Powerlifting — fase de volumen (a 3 meses de competir)',
    isActive: true,
    createdAt: Date.now() - 75 * 86400000,
    precio_mensual: 100,
  },
  {
    id: 'demo-client-005',
    name: 'Marta', surname: 'Ruiz',
    trainerId: DEMO_TRAINER_ID,
    token: 'demo-marta-005',
    objetivo: 'rehabilitacion',
    weight: 64, fatPercentage: 26, muscleMass: 42, totalLifted: 0,
    planDescription: 'Readaptación post-quirúrgica de rodilla',
    isActive: true,
    createdAt: Date.now() - 40 * 86400000,
    lesiones: 'Rotura parcial de menisco interno (rodilla derecha) — cirugía artroscópica hace 6 semanas. Sin sentadilla profunda ni impacto hasta autorización del fisio.',
    precio_mensual: 70,
  },
  {
    id: 'demo-client-006',
    name: 'Beatriz', surname: 'Soto',
    trainerId: DEMO_TRAINER_ID,
    token: 'demo-beatriz-006',
    objetivo: 'perdida_grasa',
    weight: 96.5, fatPercentage: 38, muscleMass: 55, totalLifted: 0,
    planDescription: 'Primeros pasos — pérdida de peso, sin experiencia previa',
    isActive: true,
    createdAt: Date.now() - 25 * 86400000,
    precio_mensual: 65,
  },
  {
    id: 'demo-client-007',
    name: 'Lucas', surname: 'Vega',
    trainerId: DEMO_TRAINER_ID,
    token: 'demo-lucas-007',
    objetivo: 'rendimiento',
    weight: 72, fatPercentage: 10, muscleMass: 62, totalLifted: 0,
    planDescription: 'Preparación física para atletismo — velocidad y potencia',
    isActive: true,
    createdAt: Date.now() - 55 * 86400000,
    precio_mensual: 110,
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
      // RIR: más fatiga (RIR bajo) en la semana más reciente, para que el
      // semáforo de riesgo tenga algo real que mostrar en la demo.
      const baseRir = offset <= 7 ? 1 : offset <= 14 ? 2 : 3
      const sets: Record<number, {weight:string;reps:string;rir:number}> = {}
      const n = ri === 0 ? 4 : 3
      for (let si = 0; si < n; si++) {
        sets[si] = { weight: String(bw - (si * 2.5)), reps: String(ri === 0 ? 8 : 10), rir: Math.max(0, baseRir - Math.floor(si / 2)) }
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
  // VBT — velocidad de barra en el press banca principal (dayIdx=1, ri=0), con
  // un esquema de rampa real: 2 series de aproximación a menor peso y 3 series
  // al peso top (la 2ª y 3ª ya fatigadas). Esto da a la vez cargas DISTINTAS
  // en la misma sesión (perfil carga-velocidad → 1RM diario) y series a la
  // MISMA carga (% de pérdida de velocidad intraserie por fatiga).
  const BENCH_V0: Record<number, number> = { 100: 0.55, 102.5: 0.52, 105: 0.48, 107.5: 0.46 }
  const RAMP_OFFSET = [0.20, 0.09, 0, 0, 0]  // m/s de más por ir más ligero en las series de aproximación
  const TOP_DECAY = [1, 1, 1, 0.92, 0.87]    // fatiga solo entre las series al peso top (posiciones 2,3,4)
  offsets.forEach((offset, idx) => {
    const d = new Date(today); d.setDate(d.getDate() - offset)
    const fecha = d.toISOString().split('T')[0]
    const dayIdx = idx % 3
    const week = Math.floor(idx / 3)
    const baseWeights = [[115,100,155],[117.5,102.5,157.5],[120,105,160],[122.5,107.5,162.5],[122.5,107.5,165],[122.5,107.5,165]]
    const bw = baseWeights[Math.min(week, 5)][dayIdx]
    const benchTopV = dayIdx === 1 ? BENCH_V0[bw] : undefined
    ;[0,1,2,3].forEach(ri => {
      const sets: Record<number, {weight:string;reps:string;velocity?:number}> = {}
      const n = ri === 0 ? 5 : 3
      for (let si = 0; si < n; si++) {
        if (ri === 0 && dayIdx === 1 && benchTopV !== undefined) {
          const w = si === 0 ? bw - 20 : si === 1 ? bw - 10 : bw
          sets[si] = { weight: String(w), reps: '3', velocity: Math.round((benchTopV + RAMP_OFFSET[si]) * TOP_DECAY[si] * 100) / 100 }
        } else {
          sets[si] = { weight: String(bw - (ri * 10)), reps: ri === 0 ? '3' : '6' }
        }
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

// ── PLAN DIEGO (Powerlifting — fase de volumen, a 3 meses de competir) ──
export const DEMO_PLAN_DIEGO: TrainingPlan = {
  clientId: 'demo-client-004',
  type: 'fuerza',
  restMain: 180, restAcc: 90, restWarn: 30,
  message: 'Todavía queda tiempo — hoy construimos la base sobre la que vamos a competir. 🏋️',
  fechaInicio: new Date(Date.now() - 50 * 86400000).toISOString().split('T')[0],
  autoCheckin: true,
  diasSemana: 4,
  coachNotes: 'A 3 meses de su competición. Fase de acumulación de volumen — no buscamos RPE 9 todavía, prioriza técnica y consistencia. La bajada de intensidad y el pico llegarán en el último mes.',
  macros: { kcal: 3000, protein: 190, carbs: 350, fats: 85, notaMacros: 'Ligero superávit para sostener el volumen de esta fase. Ajustaremos según cómo evolucione el peso.' },
  weeks: [
    {
      label: 'Semana 4 — Acumulación',
      rpe: '@7-8', isCurrent: true,
      days: [
        {
          title: 'DÍA 1 — Sentadilla (volumen)', focus: 'Base tren inferior',
          exercises: [
            { name: 'Sentadilla barra alta', sets: '5×5', weight: '100kg', isMain: true, comment: 'RPE 7-8, técnica limpia por encima de todo ahora mismo', videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8', restSets: 180, restAfter: 120 },
            { name: 'Sentadilla frontal', sets: '3×6', weight: '70kg', isMain: false, comment: '', videoUrl: '', restSets: 120, restAfter: 90 },
            { name: 'Prensa 45°', sets: '4×10', weight: '160kg', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 60 },
            { name: 'Extensión cuádriceps', sets: '3×15', weight: '55kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
          ]
        },
        {
          title: 'DÍA 2 — Press banca (volumen)', focus: 'Base tren superior',
          exercises: [
            { name: 'Press banca', sets: '5×5', weight: '85kg', isMain: true, comment: 'RPE 7-8, pausa breve en el pecho', videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg', restSets: 180, restAfter: 120 },
            { name: 'Press banca pausa', sets: '3×5', weight: '75kg', isMain: false, comment: '2 segundos en el pecho', videoUrl: '', restSets: 120, restAfter: 90 },
            { name: 'Press inclinado mancuernas', sets: '3×10', weight: '30kg', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 60 },
            { name: 'Fondos lastrados', sets: '3×8', weight: '+10kg', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 60 },
          ]
        },
        {
          title: 'DÍA 3 — Peso muerto (volumen)', focus: 'Cadena posterior',
          exercises: [
            { name: 'Peso muerto convencional', sets: '4×5', weight: '130kg', isMain: true, comment: 'RPE 7-8, espalda neutra en todo momento', videoUrl: 'https://www.youtube.com/watch?v=op9kVnSso6Q', restSets: 180, restAfter: 120 },
            { name: 'Peso muerto déficit', sets: '3×5', weight: '110kg', isMain: false, comment: 'Déficit de 2.5cm', videoUrl: '', restSets: 150, restAfter: 90 },
            { name: 'Remo Pendlay', sets: '4×8', weight: '80kg', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 60 },
            { name: 'Buenos días', sets: '3×10', weight: '50kg', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 60 },
          ]
        },
        {
          title: 'DÍA 4 — Accesorios y puntos débiles', focus: 'Hombro y espalda',
          exercises: [
            { name: 'Press militar barra', sets: '4×8', weight: '45kg', isMain: true, comment: '', videoUrl: '', restSets: 120, restAfter: 90 },
            { name: 'Dominadas lastradas', sets: '4×6', weight: '+10kg', isMain: false, comment: '', videoUrl: '', restSets: 120, restAfter: 90 },
            { name: 'Zancadas', sets: '3×10', weight: '20kg', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 60 },
            { name: 'Curl femoral tumbado', sets: '3×12', weight: '30kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
          ]
        },
      ]
    }
  ]
}

// ── LOGS DIEGO ───────────────────────────────────────────
export const DEMO_LOGS_DIEGO: TrainingLogs = (() => {
  const logs: TrainingLogs = {}
  const today = new Date()
  // lunes, miércoles, viernes, sábado — 5 semanas. Se procesa de más antiguo a
  // más reciente para que, si dos fechas caen en la misma clave de ejercicio
  // (solo hay una "semana" en el plan), sobreviva la más reciente y no una de
  // hace un mes — si no, la última actividad del cliente saldría mal en el dashboard.
  const offsets = [1,3,5,7, 8,10,12,14, 15,17,19,21, 22,24,26,28, 29,31,33,35].slice().reverse()
  offsets.forEach((offset, idx) => {
    const d = new Date(today); d.setDate(d.getDate() - offset)
    const fecha = d.toISOString().split('T')[0]
    const dayIdx = idx % 4
    const week = Math.min(Math.floor(offset / 7), 4)
    const baseWeights: Record<number, number[]> = {
      0: [92,94,96,98,100], 1: [78,80,82,84,85],
      2: [120,124,127,129,130], 3: [40,42,43,44,45],
    }
    const bw = (baseWeights[dayIdx] || [80,82,84,86,88])[4 - week]
    ;[0,1,2,3].forEach(ri => {
      const sets: Record<number, {weight:string;reps:string;rir:number}> = {}
      const n = ri === 0 ? 5 : 3
      for (let si = 0; si < n; si++) {
        sets[si] = { weight: String(bw - (ri * 15)), reps: ri === 0 ? '5' : '8', rir: 2 }
      }
      logs[`ex_w0_d${dayIdx}_r${ri}`] = { sets, done: true, dateDone: fecha }
    })
  })
  return logs
})()

// ── PLAN MARTA (Rehabilitación de rodilla) ────────────────
export const DEMO_PLAN_MARTA: TrainingPlan = {
  clientId: 'demo-client-005',
  type: 'rehabilitacion',
  restMain: 90, restAcc: 60, restWarn: 20,
  message: 'Cada sesión suma en la recuperación. Vamos con paciencia, sin prisa. 🧘',
  fechaInicio: new Date(Date.now() - 35 * 86400000).toISOString().split('T')[0],
  autoCheckin: true,
  diasSemana: 3,
  coachNotes: 'Semana 6 post-cirugía de menisco. Progresar rango de movimiento de forma gradual. Ante cualquier dolor agudo (no simple molestia), parar el ejercicio y avisar — nada de "aguantar".',
  macros: { kcal: 1900, protein: 130, carbs: 190, fats: 60, notaMacros: 'Mantenimiento — ahora el objetivo es recuperar movilidad y fuerza, no cambiar composición corporal.' },
  weeks: [
    {
      label: 'Semana 6 — Fortalecimiento inicial',
      rpe: '@5-6', isCurrent: true,
      days: [
        {
          title: 'DÍA A — Tren inferior controlado', focus: 'Fuerza sin impacto',
          exercises: [
            { name: 'Sentadilla isométrica en pared', sets: '3×30s', weight: '-', isMain: true, comment: 'Solo hasta 60° de flexión, sin dolor', videoUrl: '', restSets: 90, restAfter: 60 },
            { name: 'Extensión de rodilla con banda', sets: '3×15', weight: 'Banda media', isMain: false, comment: 'Rango controlado, sin tirones', videoUrl: '', restSets: 60, restAfter: 60 },
            { name: 'Puente de glúteo', sets: '3×15', weight: '-', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
            { name: 'Elevación de talones sentado', sets: '3×15', weight: '10kg', isMain: false, comment: '', videoUrl: '', restSets: 45, restAfter: 45 },
          ]
        },
        {
          title: 'DÍA B — Movilidad + tren superior', focus: 'Mantener el resto del cuerpo activo',
          exercises: [
            { name: 'Press mancuernas sentado', sets: '3×12', weight: '8kg', isMain: true, comment: '', videoUrl: '', restSets: 90, restAfter: 60 },
            { name: 'Remo sentado en polea', sets: '3×12', weight: '25kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
            { name: 'Step up bajo (10cm)', sets: '3×8', weight: '-', isMain: false, comment: 'Controlado, sin prisa, apóyate si lo necesitas', videoUrl: '', restSets: 90, restAfter: 60 },
            { name: 'Plancha', sets: '3×20s', weight: '-', isMain: false, comment: '', videoUrl: '', restSets: 45, restAfter: 45 },
          ]
        },
        {
          title: 'DÍA C — Cardio suave + core', focus: 'Recuperación activa',
          exercises: [
            { name: 'Bici estática', sets: '1×15min', weight: '-', isMain: true, comment: 'Resistencia baja, cero dolor en la rodilla', videoUrl: '', restSets: 0, restAfter: 0 },
            { name: 'Elevación de piernas tumbado', sets: '3×12', weight: '-', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
            { name: 'Pallof press', sets: '3×12', weight: 'Banda ligera', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
            { name: 'Estiramientos guiados', sets: '1×10min', weight: '-', isMain: false, comment: '', videoUrl: '', restSets: 0, restAfter: 0 },
          ]
        },
      ]
    }
  ]
}

// ── LOGS MARTA ───────────────────────────────────────────
export const DEMO_LOGS_MARTA: TrainingLogs = (() => {
  const logs: TrainingLogs = {}
  const today = new Date()
  // lunes, miércoles, viernes — 4 semanas. Cargas bajas y progresión lenta,
  // acorde a una fase de readaptación (no se busca ni RIR ni intensidad alta).
  // Se procesa de más antiguo a más reciente para que la clave de ejercicio (solo
  // hay una "semana" en el plan) se quede con la fecha más reciente, no una vieja.
  const offsets = [2,4,6, 9,11,13, 16,18,20, 23,25,27].slice().reverse()
  offsets.forEach((offset, idx) => {
    const d = new Date(today); d.setDate(d.getDate() - offset)
    const fecha = d.toISOString().split('T')[0]
    const dayIdx = idx % 3
    const week = Math.floor(idx / 3)
    const baseW = [8, 6, 0][dayIdx] // día A (banda/isométrico ~sin peso), B (mancuernas ligeras), C (cardio, sin peso)
    ;[0,1,2,3].forEach(ri => {
      const sets: Record<number, {weight:string;reps:string}> = {}
      for (let si = 0; si < 3; si++) {
        sets[si] = { weight: String(baseW + week * 0.5), reps: dayIdx === 2 ? '1' : '12' }
      }
      logs[`ex_w0_d${dayIdx}_r${ri}`] = { sets, done: true, dateDone: fecha }
    })
  })
  return logs
})()

// ── PLAN BEATRIZ (Primeriza, pérdida de peso) ─────────────
export const DEMO_PLAN_BEATRIZ: TrainingPlan = {
  clientId: 'demo-client-006',
  type: 'perdida_grasa',
  restMain: 90, restAcc: 60, restWarn: 20,
  message: '¡Ya llevas 4 semanas seguidas! Eso ya es una victoria en sí misma. 🎉',
  fechaInicio: new Date(Date.now() - 25 * 86400000).toISOString().split('T')[0],
  autoCheckin: true, autoInactividad: true,
  diasSemana: 3,
  coachNotes: 'Primera vez en el gimnasio. Foco 100% en aprender la técnica y crear el hábito — nada de buscar peso máximo todavía. Ánimo en cada sesión: cuesta arrancar, pero ya lleva 4 semanas seguidas sin fallar.',
  macros: { kcal: 1900, protein: 140, carbs: 170, fats: 60, notaMacros: 'Déficit sostenible — prioriza proteína y saciedad, nunca pases hambre.' },
  weeks: [
    {
      label: 'Semana 4 — Adaptación',
      rpe: '@6', isCurrent: true,
      days: [
        {
          title: 'DÍA A — Full body (bajo impacto)', focus: 'Aprender los movimientos base',
          exercises: [
            { name: 'Sentadilla a silla (sit to stand)', sets: '3×10', weight: '-', isMain: true, comment: 'Baja controlada, siéntate suave y levántate sin impulso', videoUrl: '', restSets: 90, restAfter: 60 },
            { name: 'Press mancuernas sentado', sets: '3×12', weight: '6kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
            { name: 'Remo en máquina', sets: '3×12', weight: '20kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
            { name: 'Marcha en el sitio', sets: '1×3min', weight: '-', isMain: false, comment: '', videoUrl: '', restSets: 0, restAfter: 0 },
          ]
        },
        {
          title: 'DÍA B — Full body + core', focus: 'Consolidar técnica',
          exercises: [
            { name: 'Zancada estática asistida', sets: '3×8', weight: '-', isMain: true, comment: 'Apóyate en el poste o la pared si hace falta', videoUrl: '', restSets: 90, restAfter: 60 },
            { name: 'Jalón al pecho en máquina', sets: '3×12', weight: '25kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
            { name: 'Elevación de piernas sentada', sets: '3×12', weight: '-', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
            { name: 'Plancha de rodillas', sets: '3×20s', weight: '-', isMain: false, comment: '', videoUrl: '', restSets: 45, restAfter: 45 },
          ]
        },
        {
          title: 'DÍA C — Cardio + tonificación', focus: 'Quemar y sumar hábito',
          exercises: [
            { name: 'Bici estática', sets: '1×20min', weight: '-', isMain: true, comment: 'Ritmo cómodo — que puedas hablar mientras pedaleas', videoUrl: '', restSets: 0, restAfter: 0 },
            { name: 'Curl bíceps mancuerna', sets: '3×12', weight: '4kg', isMain: false, comment: '', videoUrl: '', restSets: 45, restAfter: 45 },
            { name: 'Extensión tríceps en polea', sets: '3×12', weight: '12kg', isMain: false, comment: '', videoUrl: '', restSets: 45, restAfter: 45 },
            { name: 'Puente de glúteo', sets: '3×15', weight: '-', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
          ]
        },
      ]
    }
  ]
}

// ── LOGS BEATRIZ ─────────────────────────────────────────
export const DEMO_LOGS_BEATRIZ: TrainingLogs = (() => {
  const logs: TrainingLogs = {}
  const today = new Date()
  // lunes, miércoles, viernes — 4 semanas. "Ganancias de principiante": progresión
  // de reps más que de peso, típica en las primeras semanas de alguien sin experiencia.
  // Se procesa de más antiguo a más reciente para que la clave de ejercicio (solo
  // hay una "semana" en el plan) se quede con la fecha más reciente, no una vieja.
  const offsets = [2,4,6, 9,11,13, 16,18,20, 23,25,27].slice().reverse()
  offsets.forEach((offset, idx) => {
    const d = new Date(today); d.setDate(d.getDate() - offset)
    const fecha = d.toISOString().split('T')[0]
    const dayIdx = idx % 3
    const week = Math.floor(idx / 3)
    const baseW = [0, 5, 0][dayIdx]
    const baseReps = 8 + week // 8→9→10→11 reps a medida que avanzan las semanas
    ;[0,1,2,3].forEach(ri => {
      const sets: Record<number, {weight:string;reps:string}> = {}
      for (let si = 0; si < 3; si++) {
        sets[si] = { weight: String(baseW + ri), reps: dayIdx === 2 && ri === 0 ? '1' : String(baseReps) }
      }
      logs[`ex_w0_d${dayIdx}_r${ri}`] = { sets, done: true, dateDone: fecha }
    })
  })
  return logs
})()

// ── PLAN LUCAS (Atletismo — velocidad y potencia) ─────────
export const DEMO_PLAN_LUCAS: TrainingPlan = {
  clientId: 'demo-client-007',
  type: 'rendimiento',
  restMain: 180, restAcc: 120, restWarn: 45,
  message: 'La potencia se construye en el gimnasio, la velocidad se afina en la pista. ⚡',
  fechaInicio: new Date(Date.now() - 45 * 86400000).toISOString().split('T')[0],
  autoCheckin: true,
  diasSemana: 4,
  coachNotes: 'Pretemporada — bloque de fuerza-potencia en el gimnasio antes de afinar la técnica de carrera con el entrenador de pista. Vigilar isquiotibiales, tiene historial de sobrecarga.',
  macros: { kcal: 3100, protein: 180, carbs: 400, fats: 80, notaMacros: 'Carga alta de carbohidratos para las sesiones de velocidad — no entrenar en ayunas los días de sprints.' },
  weeks: [
    {
      label: 'Semana 5 — Fuerza-Potencia',
      rpe: '@8', isCurrent: true,
      days: [
        {
          title: 'DÍA 1 — Fuerza tren inferior', focus: 'Base de fuerza',
          exercises: [
            { name: 'Sentadilla trasera', sets: '4×5', weight: '110kg', isMain: true, comment: '', videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8', restSets: 180, restAfter: 120 },
            { name: 'Peso muerto rumano', sets: '3×6', weight: '90kg', isMain: false, comment: 'Cuidado con el isquiotibial, controla el descenso', videoUrl: '', restSets: 150, restAfter: 90 },
            { name: 'Zancada con salto', sets: '3×8', weight: '-', isMain: false, comment: 'Explosivo, máxima altura', videoUrl: '', restSets: 120, restAfter: 90 },
            { name: 'Elevación de talones', sets: '4×12', weight: '60kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
          ]
        },
        {
          title: 'DÍA 2 — Potencia y pliometría', focus: 'Transferencia a la pista',
          exercises: [
            { name: 'Cargada de potencia (power clean)', sets: '5×3', weight: '60kg', isMain: true, comment: 'Técnica antes que peso', videoUrl: '', restSets: 180, restAfter: 120 },
            { name: 'Salto al cajón', sets: '4×5', weight: '-', isMain: false, comment: 'Aterrizaje suave y controlado', videoUrl: '', restSets: 120, restAfter: 90 },
            { name: 'Sprints 30m', sets: '6×30m', weight: '-', isMain: false, comment: 'Recuperación completa entre series', videoUrl: '', restSets: 180, restAfter: 0 },
            { name: 'Abdominales colgado', sets: '3×12', weight: '-', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
          ]
        },
        {
          title: 'DÍA 3 — Tren superior + core', focus: 'Mantener equilibrio muscular',
          exercises: [
            { name: 'Press banca', sets: '4×6', weight: '70kg', isMain: true, comment: '', videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg', restSets: 150, restAfter: 90 },
            { name: 'Dominadas', sets: '4×8', weight: 'Peso corporal', isMain: false, comment: '', videoUrl: '', restSets: 120, restAfter: 90 },
            { name: 'Press militar barra', sets: '3×8', weight: '40kg', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 60 },
            { name: 'Plancha con rotación', sets: '3×12', weight: '-', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
          ]
        },
        {
          title: 'DÍA 4 — Velocidad y core', focus: 'Sesión de pista',
          exercises: [
            { name: 'Sprints progresivos 60m', sets: '5×60m', weight: '-', isMain: true, comment: '70-80-90-95-100% de intensidad', videoUrl: '', restSets: 240, restAfter: 0 },
            { name: 'Skipping y técnica de carrera', sets: '3×20m', weight: '-', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 60 },
            { name: 'Peso muerto a una pierna', sets: '3×8', weight: '16kg', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 60 },
            { name: 'Core anti-rotación', sets: '3×12', weight: 'Banda', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
          ]
        },
      ]
    }
  ]
}

// ── LOGS LUCAS ───────────────────────────────────────────
export const DEMO_LOGS_LUCAS: TrainingLogs = (() => {
  const logs: TrainingLogs = {}
  const today = new Date()
  // lunes, martes, jueves, viernes — 5 semanas. Se procesa de más antiguo a más
  // reciente para que la clave de ejercicio (solo hay una "semana" en el plan)
  // se quede con la fecha más reciente, no una de hace un mes.
  const offsets = [1,2,4,5, 8,9,11,12, 15,16,18,19, 22,23,25,26, 29,30,32,33].slice().reverse()
  offsets.forEach((offset, idx) => {
    const d = new Date(today); d.setDate(d.getDate() - offset)
    const fecha = d.toISOString().split('T')[0]
    const dayIdx = idx % 4
    const week = Math.min(Math.floor(offset / 7), 4)
    const baseWeights: Record<number, number[]> = {
      0: [102,104,106,108,110], 1: [55,56,58,59,60],
      2: [64,66,68,69,70], 3: [45,45,45,45,45],
    }
    const bw = (baseWeights[dayIdx] || [60,62,64,66,68])[4 - week]
    ;[0,1,2,3].forEach(ri => {
      const sets: Record<number, {weight:string;reps:string;rir:number}> = {}
      const n = ri === 0 ? 4 : 3
      for (let si = 0; si < n; si++) {
        sets[si] = { weight: String(bw - (ri * 10)), reps: dayIdx >= 2 && ri === 0 ? '1' : '6', rir: 1 }
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

// Diego — fase de volumen, ligero superávit sostenido (sube de peso a propósito)
export const DEMO_WEIGHTS_DIEGO = [
  { date: new Date(Date.now() - 0*86400000).toISOString().split('T')[0], weight: 90.5 },
  { date: new Date(Date.now() - 7*86400000).toISOString().split('T')[0], weight: 90.0 },
  { date: new Date(Date.now() - 14*86400000).toISOString().split('T')[0], weight: 89.5 },
  { date: new Date(Date.now() - 21*86400000).toISOString().split('T')[0], weight: 89.0 },
  { date: new Date(Date.now() - 28*86400000).toISOString().split('T')[0], weight: 88.5 },
  { date: new Date(Date.now() - 35*86400000).toISOString().split('T')[0], weight: 88.0 },
]

// Marta — rehabilitación, peso estable (no es el objetivo de esta fase)
export const DEMO_WEIGHTS_MARTA = [
  { date: new Date(Date.now() - 0*86400000).toISOString().split('T')[0], weight: 64.0 },
  { date: new Date(Date.now() - 7*86400000).toISOString().split('T')[0], weight: 64.2 },
  { date: new Date(Date.now() - 14*86400000).toISOString().split('T')[0], weight: 63.9 },
  { date: new Date(Date.now() - 21*86400000).toISOString().split('T')[0], weight: 64.1 },
]

// Beatriz — pérdida de peso sostenida y saludable (~0.6kg/semana)
export const DEMO_WEIGHTS_BEATRIZ = [
  { date: new Date(Date.now() - 0*86400000).toISOString().split('T')[0], weight: 96.5 },
  { date: new Date(Date.now() - 7*86400000).toISOString().split('T')[0], weight: 97.2 },
  { date: new Date(Date.now() - 14*86400000).toISOString().split('T')[0], weight: 97.8 },
  { date: new Date(Date.now() - 21*86400000).toISOString().split('T')[0], weight: 98.4 },
  { date: new Date(Date.now() - 28*86400000).toISOString().split('T')[0], weight: 99.0 },
]

// Lucas — atleta ya en su peso de competición, se mantiene estable
export const DEMO_WEIGHTS_LUCAS = [
  { date: new Date(Date.now() - 0*86400000).toISOString().split('T')[0], weight: 72.0 },
  { date: new Date(Date.now() - 7*86400000).toISOString().split('T')[0], weight: 72.2 },
  { date: new Date(Date.now() - 14*86400000).toISOString().split('T')[0], weight: 71.8 },
  { date: new Date(Date.now() - 21*86400000).toISOString().split('T')[0], weight: 72.1 },
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

export const DEMO_LOGS_MAP: Record<string, TrainingLogs> = {
  'demo-client-001': DEMO_LOGS_MARIA,
  'demo-client-002': DEMO_LOGS_CARLOS,
  'demo-client-003': DEMO_LOGS_LAURA,
  'demo-client-004': DEMO_LOGS_DIEGO,
  'demo-client-005': DEMO_LOGS_MARTA,
  'demo-client-006': DEMO_LOGS_BEATRIZ,
  'demo-client-007': DEMO_LOGS_LUCAS,
}
export const DEMO_PLAN_MAP: Record<string, TrainingPlan> = {
  'demo-client-001': DEMO_PLAN_MARIA,
  'demo-client-002': DEMO_PLAN_CARLOS,
  'demo-client-003': DEMO_PLAN_LAURA,
  'demo-client-004': DEMO_PLAN_DIEGO,
  'demo-client-005': DEMO_PLAN_MARTA,
  'demo-client-006': DEMO_PLAN_BEATRIZ,
  'demo-client-007': DEMO_PLAN_LUCAS,
}

// ── CHECK-INS DE BIENESTAR (demo) ──────────────────────
// Sueño/motivación bajando un poco esta semana — cuenta la misma historia
// que el RIR: hay algo de fatiga acumulada, buen ejemplo para el semáforo.
export interface DemoReadinessRow { sleep: number; soreness: number; stress: number; motivation: number; date: string }
export const DEMO_READINESS_MARIA: DemoReadinessRow[] = [0,1,2,3,4,5,6].map(i => {
  const d = new Date(Date.now() - i * 86400000)
  const vals = [
    { sleep: 3, soreness: 3, stress: 3, motivation: 3 },
    { sleep: 3, soreness: 2, stress: 3, motivation: 4 },
    { sleep: 4, soreness: 3, stress: 3, motivation: 4 },
    { sleep: 3, soreness: 3, stress: 4, motivation: 3 },
    { sleep: 4, soreness: 4, stress: 4, motivation: 4 },
    { sleep: 4, soreness: 4, stress: 4, motivation: 5 },
    { sleep: 5, soreness: 4, stress: 5, motivation: 5 },
  ][i]
  return { ...vals, date: d.toISOString().split('T')[0] }
})
export const DEMO_READINESS_MAP: Record<string, DemoReadinessRow[]> = {
  'demo-client-001': DEMO_READINESS_MARIA,
}

// ── PRUEBAS FÍSICAS (demo) ──────────────────────────────
export const DEMO_TEST_CATALOG = [
  { id: 'demo-test-salto', trainer_id: DEMO_TRAINER_ID, nombre: 'Salto vertical (CMJ)', categoria: 'Potencia', unidad: 'cm', descripcion: 'Salto máximo con contramovimiento y sin carrera previa (test de Sargent / CMJ).', es_default: true, created_at: Date.now() - 60 * 86400000 },
  { id: 'demo-test-dropjump', trainer_id: DEMO_TRAINER_ID, nombre: 'Drop Jump (RSI)', categoria: 'Potencia', unidad: 'índice', descripcion: 'Caída desde un cajón seguida de salto máximo — mide el Índice de Fuerza Reactiva (RSI = tiempo de vuelo ÷ tiempo de contacto), un indicador de fatiga del sistema nervioso central.', es_default: true, created_at: Date.now() - 60 * 86400000 },
  { id: 'demo-test-plancha', trainer_id: DEMO_TRAINER_ID, nombre: 'Plancha (plank)', categoria: 'Fuerza', unidad: 'segundos', descripcion: 'Tiempo máximo sosteniendo la posición de plancha.', es_default: true, created_at: Date.now() - 60 * 86400000 },
  { id: 'demo-test-cooper', trainer_id: DEMO_TRAINER_ID, nombre: 'Test de Cooper', categoria: 'Resistencia', unidad: 'm', descripcion: 'Metros recorridos corriendo en 12 minutos.', es_default: true, created_at: Date.now() - 60 * 86400000 },
]
export const DEMO_TEST_RESULTS_MARIA = [
  { id: 'demo-res-1', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-001', test_id: 'demo-test-salto', valor: 32, fecha: new Date(Date.now() - 45 * 86400000).toISOString().split('T')[0], notas: '', created_at: 0 },
  { id: 'demo-res-2', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-001', test_id: 'demo-test-salto', valor: 36, fecha: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0], notas: '', created_at: 0 },
  { id: 'demo-res-3', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-001', test_id: 'demo-test-salto', valor: 39, fecha: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], notas: 'Mejor marca hasta la fecha 🔥', created_at: 0 },
  { id: 'demo-res-4', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-001', test_id: 'demo-test-plancha', valor: 45, fecha: new Date(Date.now() - 45 * 86400000).toISOString().split('T')[0], notas: '', created_at: 0 },
  { id: 'demo-res-5', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-001', test_id: 'demo-test-plancha', valor: 62, fecha: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0], notas: '', created_at: 0 },
  { id: 'demo-res-6', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-001', test_id: 'demo-test-dropjump', valor: 1.4, fecha: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0], notas: 'Calculado desde vídeo · t. vuelo 480ms · t. contacto 340ms · 60fps', created_at: 0 },
  { id: 'demo-res-7', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-001', test_id: 'demo-test-dropjump', valor: 1.7, fecha: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0], notas: 'Calculado desde vídeo · t. vuelo 510ms · t. contacto 300ms · 60fps', created_at: 0 },
]
export const DEMO_TEST_RESULTS_MAP: Record<string, typeof DEMO_TEST_RESULTS_MARIA> = {
  'demo-client-001': DEMO_TEST_RESULTS_MARIA,
}

// ── CARGA INTERNA / sRPE (demo) ─────────────────────────
// Lucas (atletismo) es el ejemplo pensado a propósito: sus sesiones de
// sprints/pliometría casi no levantan peso, así que el ACWR por tonelaje no
// las ve — pero sí producen fatiga real, que el sRPE (minutos × RPE) capta.
// Últimas semanas con una subida real de RPE/duración para que el ACWR de
// carga interna dispare aunque el de tonelaje esté tranquilo.
export interface DemoSessionLoadRow { date: string; duration_min: number; rpe: number }
const LUCAS_SESSIONS: { offset: number; duration: number; rpe: number }[] = [
  // Pico reciente — bloque de sprints/pliometría intenso, 6 días seguidos
  { offset: 1, duration: 95, rpe: 9 },
  { offset: 2, duration: 90, rpe: 9 },
  { offset: 3, duration: 85, rpe: 8 },
  { offset: 4, duration: 90, rpe: 9 },
  { offset: 5, duration: 80, rpe: 8 },
  { offset: 6, duration: 85, rpe: 8 },
  // Carga base de las ~5 semanas previas, mucho más suave
  { offset: 9, duration: 50, rpe: 5 },
  { offset: 12, duration: 50, rpe: 5 },
  { offset: 15, duration: 55, rpe: 5 },
  { offset: 18, duration: 50, rpe: 5 },
  { offset: 21, duration: 55, rpe: 5 },
  { offset: 24, duration: 50, rpe: 5 },
  { offset: 27, duration: 50, rpe: 5 },
  { offset: 30, duration: 55, rpe: 5 },
  { offset: 33, duration: 50, rpe: 5 },
]
export const DEMO_SESSION_LOAD_LUCAS: DemoSessionLoadRow[] = LUCAS_SESSIONS.map(s => ({
  date: new Date(Date.now() - s.offset * 86400000).toISOString().split('T')[0],
  duration_min: s.duration, rpe: s.rpe,
}))
export const DEMO_SESSION_LOAD_MAP: Record<string, DemoSessionLoadRow[]> = {
  'demo-client-007': DEMO_SESSION_LOAD_LUCAS,
}

// ── CICLO (demo) — activado; la fecha se eligió para que las sesiones ya
// registradas de María (ver offsets más arriba) se repartan entre las 4 fases
// del ciclo en vez de amontonarse en una sola, así el gráfico de rendimiento
// por fase se ve representativo para mostrar a futuros clientes.
export const DEMO_CICLO_MARIA = {
  client_id: 'demo-client-001', trainer_id: DEMO_TRAINER_ID,
  activo: true,
  ultima_regla: new Date(Date.now() - 16 * 86400000).toISOString().split('T')[0],
  duracion_ciclo: 28,
  updated_at: 0,
}
export const DEMO_CICLO_MAP: Record<string, typeof DEMO_CICLO_MARIA> = {
  'demo-client-001': DEMO_CICLO_MARIA,
}

// ── VÍDEOS ENVIADOS POR EL CLIENTE (demo) ──────────────
// El clip es un vídeo de muestra genérico (no un salto real) solo para poder
// probar el mecanismo de marcar fotogramas en la demo — no viene del cliente.
export const DEMO_VIDEO_FEEDBACK_MARIA = [
  {
    id: 'demo-vf-1', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-001',
    exercise_name: 'Salto vertical', video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    client_note: null, trainer_comment: null, trainer_comment_video_url: null,
    status: 'pendiente' as const, created_at: Date.now() - 2 * 86400000, commented_at: null,
  },
  {
    id: 'demo-vf-2', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-001',
    exercise_name: 'Sentadilla barra', video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    client_note: '¿La técnica está bien? Noto molestia en la rodilla derecha', trainer_comment: 'Baja un poco más el pecho y controla la bajada, se ve buena profundidad 💪',
    trainer_comment_video_url: null, status: 'comentado' as const, created_at: Date.now() - 8 * 86400000, commented_at: Date.now() - 7 * 86400000,
  },
]
export const DEMO_VIDEO_FEEDBACK_MAP: Record<string, typeof DEMO_VIDEO_FEEDBACK_MARIA> = {
  'demo-client-001': DEMO_VIDEO_FEEDBACK_MARIA,
}
