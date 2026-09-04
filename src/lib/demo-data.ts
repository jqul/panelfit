// Datos del modo demo — entrenador ficticio con clientes de ejemplo
import { ClientData, TrainingPlan, TrainingLogs, TrainingTemplate, WeekPlan } from '../types'

export const DEMO_TRAINER_ID = 'demo-trainer-001'

// ── ETIQUETAS DEMO ──────────────────────────────────────
// Definidas antes de DEMO_CLIENTS para poder asignarlas por id a cada cliente.
export const DEMO_LABEL_IDS = {
  vip: 'demo-lbl-vip',
  powerlifting: 'demo-lbl-powerlifting',
  hipertrofia: 'demo-lbl-hipertrofia',
  perdidaGrasa: 'demo-lbl-perdida-grasa',
  rehab: 'demo-lbl-rehab',
  primeriza: 'demo-lbl-primeriza',
  altoRendimiento: 'demo-lbl-alto-rendimiento',
  riesgoAbandono: 'demo-lbl-riesgo-abandono',
  ciclo: 'demo-lbl-ciclo',
  atletismo: 'demo-lbl-atletismo',
}

export const DEMO_CLIENTS: ClientData[] = [
  {
    id: 'demo-client-001',
    name: 'María', surname: 'García',
    trainerId: DEMO_TRAINER_ID,
    token: 'demo-maria-001',
    phone: '+34 611 22 33 01',
    objetivo: 'hipertrofia',
    weight: 62, fatPercentage: 22, muscleMass: 45, totalLifted: 0,
    planDescription: 'Programa hipertrofia 4 días',
    isActive: true,
    createdAt: Date.now() - 60 * 86400000,
    precio_mensual: 80,
    label_ids: [DEMO_LABEL_IDS.hipertrofia, DEMO_LABEL_IDS.vip, DEMO_LABEL_IDS.ciclo],
  },
  {
    id: 'demo-client-002',
    name: 'Carlos', surname: 'López',
    trainerId: DEMO_TRAINER_ID,
    token: 'demo-carlos-002',
    phone: '+34 611 22 33 02',
    objetivo: 'fuerza',
    weight: 85, fatPercentage: 18, muscleMass: 68, totalLifted: 0,
    planDescription: 'Powerlifting intermedio',
    isActive: true,
    createdAt: Date.now() - 90 * 86400000,
    precio_mensual: 100,
    label_ids: [DEMO_LABEL_IDS.powerlifting, DEMO_LABEL_IDS.vip, DEMO_LABEL_IDS.riesgoAbandono],
  },
  {
    id: 'demo-client-003',
    name: 'Laura', surname: 'Martín',
    trainerId: DEMO_TRAINER_ID,
    token: 'demo-laura-003',
    phone: '+34 611 22 33 03',
    objetivo: 'perdida_grasa',
    weight: 70, fatPercentage: 28, muscleMass: 47, totalLifted: 0,
    planDescription: 'Definición 3 días',
    isActive: true,
    createdAt: Date.now() - 30 * 86400000,
    label_ids: [DEMO_LABEL_IDS.perdidaGrasa, DEMO_LABEL_IDS.riesgoAbandono],
  },
  {
    id: 'demo-client-004',
    name: 'Diego', surname: 'Fernández',
    trainerId: DEMO_TRAINER_ID,
    token: 'demo-diego-004',
    phone: '+34 611 22 33 04',
    objetivo: 'fuerza',
    weight: 90, fatPercentage: 20, muscleMass: 70, totalLifted: 0,
    planDescription: 'Powerlifting — fase de volumen (a 3 meses de competir)',
    isActive: true,
    createdAt: Date.now() - 75 * 86400000,
    precio_mensual: 100,
    label_ids: [DEMO_LABEL_IDS.powerlifting],
  },
  {
    id: 'demo-client-005',
    name: 'Marta', surname: 'Ruiz',
    trainerId: DEMO_TRAINER_ID,
    token: 'demo-marta-005',
    phone: '+34 611 22 33 05',
    objetivo: 'rehabilitacion',
    weight: 64, fatPercentage: 26, muscleMass: 42, totalLifted: 0,
    planDescription: 'Readaptación post-quirúrgica de rodilla',
    isActive: true,
    createdAt: Date.now() - 40 * 86400000,
    lesiones: 'Rotura parcial de menisco interno (rodilla derecha) — cirugía artroscópica hace 6 semanas. Sin sentadilla profunda ni impacto hasta autorización del fisio.',
    precio_mensual: 70,
    label_ids: [DEMO_LABEL_IDS.rehab],
  },
  {
    id: 'demo-client-006',
    name: 'Beatriz', surname: 'Soto',
    trainerId: DEMO_TRAINER_ID,
    token: 'demo-beatriz-006',
    phone: '+34 611 22 33 06',
    objetivo: 'perdida_grasa',
    weight: 96.5, fatPercentage: 38, muscleMass: 55, totalLifted: 0,
    planDescription: 'Primeros pasos — pérdida de peso, sin experiencia previa',
    isActive: true,
    createdAt: Date.now() - 25 * 86400000,
    precio_mensual: 65,
    label_ids: [DEMO_LABEL_IDS.perdidaGrasa, DEMO_LABEL_IDS.primeriza],
  },
  {
    id: 'demo-client-007',
    name: 'Lucas', surname: 'Vega',
    trainerId: DEMO_TRAINER_ID,
    token: 'demo-lucas-007',
    phone: '+34 611 22 33 07',
    objetivo: 'rendimiento',
    weight: 72, fatPercentage: 10, muscleMass: 62, totalLifted: 0,
    planDescription: 'Preparación física para atletismo — velocidad y potencia',
    isActive: true,
    createdAt: Date.now() - 55 * 86400000,
    precio_mensual: 110,
    label_ids: [DEMO_LABEL_IDS.altoRendimiento, DEMO_LABEL_IDS.atletismo],
  },
]

// TrainerLabel completo (id, trainer_id, name, color, emoji, survey_template_id, created_at)
export const DEMO_LABELS = [
  { id: DEMO_LABEL_IDS.vip, trainer_id: DEMO_TRAINER_ID, name: 'VIP', color: '#eab308', emoji: '⭐', survey_template_id: null, created_at: Date.now() - 80 * 86400000 },
  { id: DEMO_LABEL_IDS.powerlifting, trainer_id: DEMO_TRAINER_ID, name: 'Powerlifting', color: '#6e5438', emoji: '🏋️', survey_template_id: null, created_at: Date.now() - 80 * 86400000 + 1 },
  { id: DEMO_LABEL_IDS.hipertrofia, trainer_id: DEMO_TRAINER_ID, name: 'Hipertrofia', color: '#3b82f6', emoji: '💪', survey_template_id: null, created_at: Date.now() - 80 * 86400000 + 2 },
  { id: DEMO_LABEL_IDS.perdidaGrasa, trainer_id: DEMO_TRAINER_ID, name: 'Pérdida de grasa', color: '#22c55e', emoji: '🎯', survey_template_id: null, created_at: Date.now() - 80 * 86400000 + 3 },
  { id: DEMO_LABEL_IDS.rehab, trainer_id: DEMO_TRAINER_ID, name: 'Rehabilitación', color: '#06b6d4', emoji: '🩹', survey_template_id: null, created_at: Date.now() - 80 * 86400000 + 4 },
  { id: DEMO_LABEL_IDS.primeriza, trainer_id: DEMO_TRAINER_ID, name: 'Primeriza', color: '#8b5cf6', emoji: '🌱', survey_template_id: null, created_at: Date.now() - 80 * 86400000 + 5 },
  { id: DEMO_LABEL_IDS.altoRendimiento, trainer_id: DEMO_TRAINER_ID, name: 'Alto rendimiento', color: '#ec4899', emoji: '🔥', survey_template_id: null, created_at: Date.now() - 80 * 86400000 + 6 },
  { id: DEMO_LABEL_IDS.riesgoAbandono, trainer_id: DEMO_TRAINER_ID, name: 'Riesgo de abandono', color: '#ef4444', emoji: '🚩', survey_template_id: null, created_at: Date.now() - 80 * 86400000 + 7 },
  { id: DEMO_LABEL_IDS.ciclo, trainer_id: DEMO_TRAINER_ID, name: 'Ciclo menstrual', color: '#f97316', emoji: '🌙', survey_template_id: null, created_at: Date.now() - 80 * 86400000 + 8 },
  { id: DEMO_LABEL_IDS.atletismo, trainer_id: DEMO_TRAINER_ID, name: 'Atletismo', color: '#64748b', emoji: '🏃', survey_template_id: null, created_at: Date.now() - 80 * 86400000 + 9 },
]

// ── HISTORIAL DE VARIAS SEMANAS (helpers) ───────────────
// En vez de mantener arrays de progresión de peso por separado del propio
// plan (lo que causó un bug real: los pesos logueados de todos los
// ejercicios del día se sacaban de una única tabla indexada por día, no por
// ejercicio, así que "Anterior" mostraba el MISMO peso para el press banca,
// las mancuernas y los fondos), el peso logueado de cada semana se DERIVA
// del propio peso prescrito en el plan para esa semana. Nunca puede
// desincronizarse del plan porque es la misma fuente.
function parseWeightNum(w: string): number | null {
  const m = w?.trim().match(/^(\d+(\.\d+)?)\s*kg$/i)
  return m ? parseFloat(m[1]) : null
}
function stepFor(w: number): number {
  return w >= 40 ? 2.5 : w >= 15 ? 1 : 0.5
}
function parseSetsStrDemo(s: string): { numSets: number; repsText: string } {
  const m = s?.match(/^(\d+)\s*[×x]\s*(.+)$/)
  return m ? { numSets: parseInt(m[1]), repsText: m[2] } : { numSets: 3, repsText: '10' }
}
// Clona una semana subiendo (o bajando, si weeksForward es negativo) el peso
// de cada ejercicio cargado un "step" por semana de diferencia. Los
// ejercicios sin peso numérico (peso corporal, tiempo, "+5kg" añadido...) se
// dejan tal cual — mejor no tocar lo que no se puede derivar con confianza.
function bumpWeek(base: WeekPlan, weeksForward: number, label: string, isCurrent: boolean): WeekPlan {
  return {
    ...base, label, isCurrent,
    days: base.days.map(day => ({
      ...day,
      exercises: day.exercises.map(ex => {
        const n = parseWeightNum(ex.weight)
        if (n === null) return { ...ex }
        const bumped = Math.max(stepFor(n), n + stepFor(n) * weeksForward)
        return { ...ex, weight: `${bumped}kg` }
      }),
    })),
  }
}
/** Genera N semanas de plan a partir de UNA semana ya autorada (la trata como
 * la semana ACTUAL) — las anteriores se generan bajando el peso semana a
 * semana. Conserva ejercicios/vídeos/comentarios idénticos entre semanas
 * (igual que un plan real con progresión de carga sin cambiar de ejercicio). */
function expandToWeeks(currentWeek: WeekPlan, numWeeks: number, labelPrefix = 'Semana'): WeekPlan[] {
  return Array.from({ length: numWeeks }, (_, i) => {
    const weeksForward = i - (numWeeks - 1) // negativo = semanas atrás, 0 = la actual
    // La semana actual conserva su etiqueta original tal cual (ej. "Semana 6 —
    // Fortalecimiento inicial") — las anteriores se numeran de forma simple.
    const label = i === numWeeks - 1 ? currentWeek.label : `${labelPrefix} ${i + 1}`
    return bumpWeek(currentWeek, weeksForward, label, i === numWeeks - 1)
  })
}
/**
 * Genera logs realistas para TODO el historial ya definido en `plan.weeks`,
 * derivando el peso logueado del propio peso prescrito en cada semana (nunca
 * puede desincronizarse del plan). La última semana se deja "en curso" —
 * `doneInLastWeek` días hechos de los que tiene, el resto sin empezar,
 * igual que un cliente real a mitad de semana.
 */
function buildDemoLogsFromPlan(plan: TrainingPlan, doneInLastWeek?: number): TrainingLogs {
  const logs: TrainingLogs = {}
  const numWeeks = plan.weeks.length
  const today = new Date()
  for (let weekIdx = numWeeks - 1; weekIdx >= 0; weekIdx--) {
    const week = plan.weeks[weekIdx]
    const numDays = week.days.length
    const weeksAgo = numWeeks - 1 - weekIdx
    const isCurrent = weekIdx === numWeeks - 1
    const doneCount = isCurrent ? Math.min(doneInLastWeek ?? numDays - 1, numDays) : numDays
    // Fatiga: RIR más bajo (más cerca del fallo) cuanto más reciente la semana
    const baseRir = weeksAgo === 0 ? 1 : weeksAgo === 1 ? 2 : 3
    for (let dayIdx = 0; dayIdx < doneCount; dayIdx++) {
      const dayOffsetWithinWeek = Math.round((numDays - 1 - dayIdx) * (7 / numDays))
      const totalOffsetDays = weeksAgo * 7 + dayOffsetWithinWeek + (isCurrent ? 1 : 0)
      const fecha = new Date(today.getTime() - totalOffsetDays * 86400000).toISOString().split('T')[0]
      week.days[dayIdx].exercises.forEach((ex, ri) => {
        const plannedW = parseWeightNum(ex.weight)
        const { numSets, repsText } = parseSetsStrDemo(ex.sets)
        const sets: Record<number, { weight: string; reps: string; rir: number }> = {}
        for (let si = 0; si < numSets; si++) {
          const w = plannedW !== null ? Math.max(0, plannedW - si * stepFor(plannedW)) : null
          sets[si] = { weight: w !== null ? String(w) : ex.weight, reps: repsText, rir: Math.max(0, baseRir - Math.floor(si / 2)) }
        }
        logs[`ex_w${weekIdx}_d${dayIdx}_r${ri}`] = { sets, done: true, dateDone: fecha }
      })
    }
  }
  return logs
}

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

// ── LOGS MARÍA ──────────────────────────────────────────
// Semana 2 (actual) con DÍA D todavía sin empezar — igual que antes.
export const DEMO_LOGS_MARIA: TrainingLogs = buildDemoLogsFromPlan(DEMO_PLAN_MARIA, 3)

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
  weeks: expandToWeeks({
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
    }, 6),
}

// ── LOGS CARLOS — 6 semanas de historial ───────────────
// El press banca de la semana actual conserva el esquema de rampa VBT
// (2 series de aproximación + 3 al peso top, fatigadas) — el resto del
// historial se deriva genéricamente del propio plan de cada semana.
export const DEMO_LOGS_CARLOS: TrainingLogs = (() => {
  const base = buildDemoLogsFromPlan(DEMO_PLAN_CARLOS, 2) // día 3 (peso muerto) de esta semana aún sin hacer
  const lastWeekIdx = DEMO_PLAN_CARLOS.weeks.length - 1
  const benchKey = `ex_w${lastWeekIdx}_d1_r0`
  const benchDate = base[benchKey]?.dateDone
  if (!benchDate) return base
  const bw = 105 // peso de esta semana para el press banca (ver plan)
  const v0 = 0.48 // velocidad media a 105kg — ver estimateVelocityProfile
  const rampVelocities = [v0 + 0.20, v0 + 0.09, v0, v0 * 0.92, v0 * 0.87]
  const sets: Record<number, { weight: string; reps: string; velocity: number }> = {}
  ;[bw - 20, bw - 10, bw, bw, bw].forEach((w, si) => {
    sets[si] = { weight: String(w), reps: '3', velocity: Math.round(rampVelocities[si] * 100) / 100 }
  })
  return { ...base, [benchKey]: { sets, done: true, dateDone: benchDate } }
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
  weeks: expandToWeeks({
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
    }, 3),
}

// ── LOGS LAURA — 3 semanas de historial ────────────────
export const DEMO_LOGS_LAURA: TrainingLogs = buildDemoLogsFromPlan(DEMO_PLAN_LAURA, 2)

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
  weeks: expandToWeeks({
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
    }, 4),
}

// ── LOGS DIEGO — 4 semanas de historial ────────────────
export const DEMO_LOGS_DIEGO: TrainingLogs = buildDemoLogsFromPlan(DEMO_PLAN_DIEGO, 3)

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
  weeks: expandToWeeks({
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
    }, 4),
}

// ── LOGS MARTA — 4 semanas de historial ────────────────
export const DEMO_LOGS_MARTA: TrainingLogs = buildDemoLogsFromPlan(DEMO_PLAN_MARTA, 2)

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
  weeks: expandToWeeks({
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
    }, 4),
}

// ── LOGS BEATRIZ — 4 semanas de historial ──────────────
export const DEMO_LOGS_BEATRIZ: TrainingLogs = buildDemoLogsFromPlan(DEMO_PLAN_BEATRIZ, 2)

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
  weeks: expandToWeeks({
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
    }, 5),
}

// ── LOGS LUCAS — 5 semanas de historial ────────────────
export const DEMO_LOGS_LUCAS: TrainingLogs = buildDemoLogsFromPlan(DEMO_PLAN_LUCAS, 3)

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

// Programación de la encuesta demo — a todos los clientes cada lunes, y una
// puntual a Carlos (de baja) ya pausada
export const DEMO_SURVEY_SCHEDULES = [
  { id: 'demo-sched-1', trainer_id: DEMO_TRAINER_ID, template_id: 'demo-tmpl-001', client_id: null, frequency: 'weekly' as const, day_of_week: 1, active: true, last_sent_at: Date.now() - 6 * 86400000 },
  { id: 'demo-sched-2', trainer_id: DEMO_TRAINER_ID, template_id: 'demo-tmpl-001', client_id: 'demo-client-002', frequency: 'weekly' as const, day_of_week: 1, active: false, last_sent_at: Date.now() - 20 * 86400000 },
]

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
// Genera 7 días de check-in a partir de un patrón base (para variar sin repetir a mano)
function genReadiness(pattern: { sleep: number; soreness: number; stress: number; motivation: number }[]): DemoReadinessRow[] {
  return pattern.map((vals, i) => ({ ...vals, date: new Date(Date.now() - (pattern.length - 1 - i) * 86400000).toISOString().split('T')[0] }))
}
// Carlos: motivación cayendo — coherente con su etiqueta de riesgo de abandono
export const DEMO_READINESS_CARLOS: DemoReadinessRow[] = genReadiness([
  { sleep: 4, soreness: 4, stress: 3, motivation: 4 },
  { sleep: 3, soreness: 3, stress: 3, motivation: 3 },
  { sleep: 3, soreness: 3, stress: 4, motivation: 2 },
  { sleep: 2, soreness: 2, stress: 4, motivation: 2 },
  { sleep: 3, soreness: 2, stress: 4, motivation: 2 },
  { sleep: 2, soreness: 2, stress: 5, motivation: 1 },
  { sleep: 2, soreness: 1, stress: 5, motivation: 1 },
])
// Diego: estable, buena recuperación (fase de volumen sin prisa)
export const DEMO_READINESS_DIEGO: DemoReadinessRow[] = genReadiness([
  { sleep: 4, soreness: 4, stress: 4, motivation: 4 },
  { sleep: 4, soreness: 3, stress: 4, motivation: 4 },
  { sleep: 4, soreness: 4, stress: 3, motivation: 5 },
  { sleep: 5, soreness: 4, stress: 4, motivation: 4 },
  { sleep: 4, soreness: 4, stress: 4, motivation: 4 },
  { sleep: 4, soreness: 3, stress: 4, motivation: 5 },
  { sleep: 5, soreness: 4, stress: 4, motivation: 5 },
])
// Beatriz: primeriza con agujetas fuertes las primeras semanas
export const DEMO_READINESS_BEATRIZ: DemoReadinessRow[] = genReadiness([
  { sleep: 3, soreness: 1, stress: 3, motivation: 5 },
  { sleep: 3, soreness: 1, stress: 3, motivation: 5 },
  { sleep: 4, soreness: 2, stress: 2, motivation: 4 },
  { sleep: 3, soreness: 2, stress: 3, motivation: 4 },
  { sleep: 4, soreness: 3, stress: 2, motivation: 5 },
  { sleep: 4, soreness: 3, stress: 2, motivation: 5 },
  { sleep: 4, soreness: 3, stress: 2, motivation: 4 },
])
export const DEMO_READINESS_MAP: Record<string, DemoReadinessRow[]> = {
  'demo-client-001': DEMO_READINESS_MARIA,
  'demo-client-002': DEMO_READINESS_CARLOS,
  'demo-client-004': DEMO_READINESS_DIEGO,
  'demo-client-006': DEMO_READINESS_BEATRIZ,
}
// Igual que DEMO_READINESS_MAP pero aplanado con clientId en cada fila — lo
// que necesita la Bandeja para mostrar check-ins de TODOS los clientes juntos.
export const DEMO_READINESS_FLAT: ({ clientId: string } & DemoReadinessRow)[] =
  Object.entries(DEMO_READINESS_MAP).flatMap(([clientId, rows]) => rows.map(r => ({ clientId, ...r })))

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
// Lucas (el mismo con ACWR de carga interna disparado — ver LUCAS_SESSIONS
// más abajo): su salto vertical también cae justo en el mismo bloque de
// sprints/pliometría intenso — dos señales independientes (carga externa y
// fatiga neuromuscular) apuntando a lo mismo, que es exactamente el caso de
// uso de esta alerta (a veces el cuestionario subjetivo no lo refleja, pero
// el salto sí). Línea base ~41cm, cae a 36cm (-12%) en la última medición.
export const DEMO_TEST_RESULTS_LUCAS = [
  { id: 'demo-res-lucas-1', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-007', test_id: 'demo-test-salto', valor: 40, fecha: new Date(Date.now() - 21 * 86400000).toISOString().split('T')[0], notas: '', created_at: 0 },
  { id: 'demo-res-lucas-2', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-007', test_id: 'demo-test-salto', valor: 42, fecha: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0], notas: '', created_at: 0 },
  { id: 'demo-res-lucas-3', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-007', test_id: 'demo-test-salto', valor: 41, fecha: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0], notas: '', created_at: 0 },
  { id: 'demo-res-lucas-4', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-007', test_id: 'demo-test-salto', valor: 36, fecha: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0], notas: 'Se ve cansado, cuesta activar', created_at: 0 },
]
export const DEMO_TEST_RESULTS_MAP: Record<string, typeof DEMO_TEST_RESULTS_MARIA> = {
  'demo-client-001': DEMO_TEST_RESULTS_MARIA,
  'demo-client-007': DEMO_TEST_RESULTS_LUCAS,
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

// ── PERFIL FUERZA-VELOCIDAD / Samozino-Morin (demo) ─────
// Lucas (velocidad/potencia) es el ejemplo natural: 3 saltos con cargas
// distintas (peso corporal, +20kg, +40kg) el mismo día de test, con la
// misma distancia de empuje. La altura de salto baja con cada carga —
// exactamente lo que hace falta para ajustar la recta fuerza-velocidad.
export const DEMO_FV_PROFILE_TRIALS_LUCAS = [
  { id: 'demo-fv-1', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-007', date: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0], load_kg: 0, bodyweight_kg: 72, pushoff_distance_m: 0.40, jump_height_m: 0.38, notes: 'Salto libre (sin carga)', created_at: Date.now() - 20 * 86400000 },
  { id: 'demo-fv-2', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-007', date: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0], load_kg: 20, bodyweight_kg: 72, pushoff_distance_m: 0.40, jump_height_m: 0.24, notes: 'Chaleco lastrado +20kg', created_at: Date.now() - 20 * 86400000 + 1 },
  { id: 'demo-fv-3', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-007', date: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0], load_kg: 40, bodyweight_kg: 72, pushoff_distance_m: 0.40, jump_height_m: 0.14, notes: 'Barra hexagonal +40kg', created_at: Date.now() - 20 * 86400000 + 2 },
]
export const DEMO_FV_PROFILE_TRIALS_MAP: Record<string, typeof DEMO_FV_PROFILE_TRIALS_LUCAS> = {
  'demo-client-007': DEMO_FV_PROFILE_TRIALS_LUCAS,
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

// ── PLANTILLAS DE WORKOUT (demo) ────────────────────────
// La mayoría reutiliza las semanas ya construidas de los propios clientes
// (con ejercicios, vídeos, descansos... reales) en vez de inventar contenido
// nuevo — así el catálogo se ve lleno sin duplicar trabajo de autoría.
export const DEMO_PLAN_TEMPLATES: TrainingTemplate[] = [
  { id: 'demo-tmpl-fuerza', trainerId: DEMO_TRAINER_ID, name: 'Fuerza 5×3 — Powerlifting', type: 'Fuerza', description: 'Sentadilla/banca/peso muerto a 5×3, en fase de pico.', weeks: DEMO_PLAN_CARLOS.weeks, createdAt: Date.now() - 70 * 86400000, updatedAt: Date.now() - 20 * 86400000, label_ids: [DEMO_LABEL_IDS.powerlifting], isPublic: false },
  { id: 'demo-tmpl-volumen', trainerId: DEMO_TRAINER_ID, name: 'Volumen tren inferior — Powerlifting', type: 'Volumen', description: 'Base de volumen a 3 meses de competir, técnica por encima de la carga.', weeks: DEMO_PLAN_DIEGO.weeks, createdAt: Date.now() - 65 * 86400000, updatedAt: Date.now() - 15 * 86400000, label_ids: [DEMO_LABEL_IDS.powerlifting], isPublic: false },
  { id: 'demo-tmpl-hipertrofia', trainerId: DEMO_TRAINER_ID, name: 'Hipertrofia 4 días', type: 'Hipertrofia', description: 'Split de 4 días con RIR objetivo por semana.', weeks: DEMO_PLAN_MARIA.weeks, createdAt: Date.now() - 55 * 86400000, updatedAt: Date.now() - 10 * 86400000, label_ids: [DEMO_LABEL_IDS.hipertrofia], isPublic: true },
  { id: 'demo-tmpl-definicion', trainerId: DEMO_TRAINER_ID, name: 'Definición 3 días', type: 'Pérdida de grasa', description: 'Full body + HIIT, pensado para 3 sesiones/semana con déficit moderado.', weeks: DEMO_PLAN_LAURA.weeks, createdAt: Date.now() - 28 * 86400000, updatedAt: Date.now() - 5 * 86400000, label_ids: [DEMO_LABEL_IDS.perdidaGrasa], isPublic: false },
  { id: 'demo-tmpl-rehab-rodilla', trainerId: DEMO_TRAINER_ID, name: 'Readaptación de rodilla (post-quirúrgico)', type: 'Rehabilitación', description: 'Progresión sin sentadilla profunda ni impacto — isométricos y control motor.', weeks: DEMO_PLAN_MARTA.weeks, createdAt: Date.now() - 38 * 86400000, updatedAt: Date.now() - 3 * 86400000, label_ids: [DEMO_LABEL_IDS.rehab], isPublic: false },
  { id: 'demo-tmpl-iniciacion', trainerId: DEMO_TRAINER_ID, name: 'Iniciación — primeros pasos', type: 'Iniciación', description: 'Full body para alguien sin experiencia previa, técnica antes que carga.', weeks: DEMO_PLAN_BEATRIZ.weeks, createdAt: Date.now() - 24 * 86400000, updatedAt: Date.now() - 2 * 86400000, label_ids: [DEMO_LABEL_IDS.primeriza], isPublic: true },
  { id: 'demo-tmpl-rendimiento', trainerId: DEMO_TRAINER_ID, name: 'Rendimiento — velocidad y potencia', type: 'Rendimiento', description: 'Sprints, pliometría y fuerza — preparación física para atletismo.', weeks: DEMO_PLAN_LUCAS.weeks, createdAt: Date.now() - 50 * 86400000, updatedAt: Date.now() - 1 * 86400000, label_ids: [DEMO_LABEL_IDS.altoRendimiento, DEMO_LABEL_IDS.atletismo], isPublic: false },
  {
    id: 'demo-tmpl-fullbody', trainerId: DEMO_TRAINER_ID, name: 'Full body 3 días — Mantenimiento', type: 'Mantenimiento', description: 'Para clientes de temporada baja: mantener sin sobrecargar la agenda.',
    weeks: [{
      label: 'Semana 1', rpe: '@7', isCurrent: true,
      days: [
        { title: 'DÍA A', focus: 'Full body', exercises: [
          { name: 'Sentadilla goblet', sets: '3×10', weight: '24kg', isMain: true, comment: '', videoUrl: '', restSets: 90, restAfter: 60 },
          { name: 'Press banca mancuernas', sets: '3×10', weight: '20kg', isMain: false, comment: '', videoUrl: '', restSets: 90, restAfter: 60 },
          { name: 'Remo mancuerna', sets: '3×10', weight: '18kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
        ] },
        { title: 'DÍA B', focus: 'Full body', exercises: [
          { name: 'Peso muerto rumano', sets: '3×10', weight: '40kg', isMain: true, comment: '', videoUrl: '', restSets: 90, restAfter: 60 },
          { name: 'Press militar mancuernas', sets: '3×10', weight: '12kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
          { name: 'Jalón al pecho', sets: '3×12', weight: '40kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
        ] },
        { title: 'DÍA C', focus: 'Full body', exercises: [
          { name: 'Zancadas con mancuernas', sets: '3×10', weight: '14kg', isMain: true, comment: '', videoUrl: '', restSets: 90, restAfter: 60 },
          { name: 'Press inclinado mancuernas', sets: '3×10', weight: '16kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
          { name: 'Remo en polea baja', sets: '3×12', weight: '35kg', isMain: false, comment: '', videoUrl: '', restSets: 60, restAfter: 60 },
        ] },
      ]
    }], createdAt: Date.now() - 45 * 86400000, updatedAt: Date.now() - 45 * 86400000, label_ids: [], isPublic: true,
  },
  {
    id: 'demo-tmpl-test-inicial', trainerId: DEMO_TRAINER_ID, name: 'Test inicial — Valoración física', type: 'Test inicial', description: 'Primera sesión con un cliente nuevo: valorar movilidad, fuerza básica y forma física.',
    weeks: [{
      label: 'Semana 1', rpe: '@6', isCurrent: true,
      days: [
        { title: 'VALORACIÓN', focus: 'Movilidad, fuerza y resistencia básica', exercises: [
          { name: 'Sentadilla goblet', sets: '2×10', weight: '10kg', isMain: true, comment: 'Valorar profundidad y control de rodillas', videoUrl: '', restSets: 60, restAfter: 60 },
          { name: 'Flexiones (push-ups)', sets: '2×AMRAP', weight: '-', isMain: false, comment: 'Al fallo técnico', videoUrl: '', restSets: 60, restAfter: 60 },
          { name: 'Plancha', sets: '2×30s', weight: '-', isMain: false, comment: '', videoUrl: '', restSets: 45, restAfter: 45 },
          { name: 'Test de Cooper', sets: '1×12min', weight: '-', isMain: false, comment: 'Metros recorridos', videoUrl: '', restSets: 0, restAfter: 0 },
        ] },
      ]
    }], createdAt: Date.now() - 90 * 86400000, updatedAt: Date.now() - 90 * 86400000, label_ids: [], isPublic: false,
  },
]

// ── PROGRAMAS (demo) — periodización con tareas por día ──
export const DEMO_PROGRAMS = [
  {
    id: 'demo-prog-recomp', trainer_id: DEMO_TRAINER_ID, name: 'Reto 8 semanas — Recomposición corporal', tipo: 'Pérdida de grasa',
    label_ids: [DEMO_LABEL_IDS.perdidaGrasa], created_at: Date.now() - 40 * 86400000, updated_at: Date.now() - 5 * 86400000,
    weeks: Array.from({ length: 2 }, (_, wi) => ({
      label: `Semana ${wi + 1}`,
      days: Array.from({ length: 7 }, (_, di) => {
        const tasks = []
        if ([0, 2, 4].includes(di)) tasks.push({ id: `t_${wi}_${di}_w`, type: 'workout', title: 'Full body + HIIT', data: { objective: 'Definición 3 días' } })
        if (di === 1) tasks.push({ id: `t_${wi}_${di}_c`, type: 'cardio', title: 'Cardio suave 30min', data: { objective: 'Caminar a paso ligero' } })
        if (di === 6 && wi === 0) tasks.push({ id: `t_${wi}_${di}_e`, type: 'evolucion', title: 'Fotos + peso', data: { objective: 'Registro quincenal' } })
        if (di === 0) tasks.push({ id: `t_${wi}_${di}_m`, type: 'mensaje', title: 'Recordatorio motivacional', data: { text: '¡Vamos con todo esta semana! 💪' } })
        return { tasks }
      }),
    })),
  },
  {
    id: 'demo-prog-531', trainer_id: DEMO_TRAINER_ID, name: 'Programa Fuerza 5/3/1', tipo: 'Fuerza',
    label_ids: [DEMO_LABEL_IDS.powerlifting], created_at: Date.now() - 85 * 86400000, updated_at: Date.now() - 10 * 86400000,
    weeks: Array.from({ length: 4 }, (_, wi) => ({
      label: wi < 3 ? `Semana ${wi + 1} — ciclo de intensidad` : 'Semana 4 — descarga',
      days: Array.from({ length: 7 }, (_, di) => {
        const tasks = []
        if ([0, 2, 4].includes(di)) tasks.push({ id: `t531_${wi}_${di}_w`, type: 'workout', title: wi < 3 ? 'Sentadilla/banca/peso muerto 5/3/1' : 'Descarga — técnica ligera', data: { objective: wi < 3 ? `Semana ${wi + 1} de intensidad` : 'Semana de descarga' } })
        if (di === 5) tasks.push({ id: `t531_${wi}_${di}_v`, type: 'video', title: 'Vídeo de ejecución sentadilla', data: { objective: 'Revisar profundidad y técnica' } })
        return { tasks }
      }),
    })),
  },
  {
    id: 'demo-prog-rehab', trainer_id: DEMO_TRAINER_ID, name: 'Vuelta al deporte — Rehabilitación de rodilla', tipo: 'Rehabilitación',
    label_ids: [DEMO_LABEL_IDS.rehab], created_at: Date.now() - 42 * 86400000, updated_at: Date.now() - 2 * 86400000,
    weeks: Array.from({ length: 3 }, (_, wi) => ({
      label: `Fase ${wi + 1}`,
      days: Array.from({ length: 7 }, (_, di) => {
        const tasks = []
        if ([0, 3].includes(di)) tasks.push({ id: `trh_${wi}_${di}_w`, type: 'workout', title: 'Readaptación de rodilla', data: { objective: 'Sin sentadilla profunda ni impacto' } })
        if (di === 5) tasks.push({ id: `trh_${wi}_${di}_f`, type: 'formulario', title: 'Cuestionario de dolor', data: { objective: 'Escala de dolor 0-10' } })
        return { tasks }
      }),
    })),
  },
]

// ── GRUPOS / RETOS (demo) ────────────────────────────────
export const DEMO_COHORTES = [
  { id: 'demo-coh-fuerza', trainer_id: DEMO_TRAINER_ID, nombre: 'Reto Fuerza Otoño', descripcion: 'Grupo de powerlifting rumbo a competición — puntos por sesión completada.', color: '#6e5438', fecha_inicio: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0], fecha_fin: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], activa: true, created_at: Date.now() - 30 * 86400000, puntos_por_sesion: 10 },
  { id: 'demo-coh-grasa', trainer_id: DEMO_TRAINER_ID, nombre: 'Reto Recomposición 8 semanas', descripcion: 'Clientes en fase de pérdida de grasa, seguimiento conjunto.', color: '#22c55e', fecha_inicio: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0], fecha_fin: new Date(Date.now() + 36 * 86400000).toISOString().split('T')[0], activa: true, created_at: Date.now() - 20 * 86400000, puntos_por_sesion: 10 },
  { id: 'demo-coh-verano', trainer_id: DEMO_TRAINER_ID, nombre: 'Reto Verano (cerrado)', descripcion: 'Reto de verano ya finalizado — se mantiene como historial.', color: '#f59e0b', fecha_inicio: new Date(Date.now() - 120 * 86400000).toISOString().split('T')[0], fecha_fin: new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0], activa: false, created_at: Date.now() - 120 * 86400000, puntos_por_sesion: 5 },
]
export const DEMO_COHORTE_CLIENTES = [
  { id: 'demo-cc-1', cohorte_id: 'demo-coh-fuerza', client_id: 'demo-client-002', joined_at: Date.now() - 30 * 86400000 },
  { id: 'demo-cc-2', cohorte_id: 'demo-coh-fuerza', client_id: 'demo-client-004', joined_at: Date.now() - 30 * 86400000 },
  { id: 'demo-cc-3', cohorte_id: 'demo-coh-grasa', client_id: 'demo-client-003', joined_at: Date.now() - 20 * 86400000 },
  { id: 'demo-cc-4', cohorte_id: 'demo-coh-grasa', client_id: 'demo-client-006', joined_at: Date.now() - 20 * 86400000 },
  { id: 'demo-cc-5', cohorte_id: 'demo-coh-verano', client_id: 'demo-client-001', joined_at: Date.now() - 120 * 86400000 },
]

// ── CALENDARIO (demo) — sesiones pasadas y próximas ─────
function citaAt(daysOffset: number, hour: number, min = 0): { start_at: string; end_at: string } {
  const d = new Date(); d.setHours(hour, min, 0, 0); d.setDate(d.getDate() + daysOffset)
  const end = new Date(d.getTime() + 60 * 60000)
  return { start_at: d.toISOString(), end_at: end.toISOString() }
}
export const DEMO_CITAS = [
  { id: 'demo-cita-1', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-001', title: 'Sesión — María', ...citaAt(1, 9), status: 'confirmada' as const, notes: '', recurring: 'weekly' as const, recurring_until: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0] },
  { id: 'demo-cita-2', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-002', title: 'Sesión — Carlos (pico)', ...citaAt(1, 18), status: 'confirmada' as const, notes: 'Revisar RPE del press banca', recurring: null, recurring_until: null },
  { id: 'demo-cita-3', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-007', title: 'Test Fuerza-Velocidad — Lucas', ...citaAt(2, 17), status: 'pendiente' as const, notes: 'Traer chaleco lastrado y barra hexagonal', recurring: null, recurring_until: null },
  { id: 'demo-cita-4', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-005', title: 'Sesión — Marta (rehab)', ...citaAt(3, 10), status: 'confirmada' as const, notes: '', recurring: 'weekly' as const, recurring_until: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0] },
  { id: 'demo-cita-5', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-003', title: 'Sesión — Laura', ...citaAt(-1, 19), status: 'completada' as const, notes: '', recurring: null, recurring_until: null },
  { id: 'demo-cita-6', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-006', title: 'Sesión — Beatriz', ...citaAt(-2, 11), status: 'completada' as const, notes: 'Primera sesión con sentadilla goblet', recurring: null, recurring_until: null },
  { id: 'demo-cita-7', trainer_id: DEMO_TRAINER_ID, client_id: 'demo-client-004', title: 'Sesión — Diego', ...citaAt(4, 18), status: 'pendiente' as const, notes: '', recurring: null, recurring_until: null },
  { id: 'demo-cita-8', trainer_id: DEMO_TRAINER_ID, client_id: null, title: 'Bloqueado — formación', ...citaAt(5, 16), status: 'confirmada' as const, notes: 'No disponible', recurring: null, recurring_until: null },
]
