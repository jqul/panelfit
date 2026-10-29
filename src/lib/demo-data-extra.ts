// Datos demo adicionales — todo lo que el modo demo no enseñaba todavía.
// Vive aparte de demo-data.ts para no seguir engordándolo; importa de él los
// ids y los clientes para que nada se desincronice.
import { DEMO_TRAINER_ID, DEMO_CLIENTS, DEMO_LOGS_MAP, DEMO_PLAN_MAP } from './demo-data'
import { localDateKey } from './dates'
import { isDemoClientId, isDemoTrainerId, DEMO_PUBLIC_SLUG } from './demoIds'

export { isDemoClientId, isDemoTrainerId, DEMO_PUBLIC_SLUG }

const dayStr = (daysAgo: number) => localDateKey(new Date(Date.now() - daysAgo * 86400000))

// ── DIETAS ──────────────────────────────────────────────
// Misma forma que DietPlan (components/shared/DietEditor.tsx). Los macros
// coinciden con `plan.macros` de cada cliente (demo-data.ts) y las comidas
// suman aproximadamente las kcal diarias.
type DemoMeal = { id: string; time: string; name: string; kcal: number; items: string[] }
interface DemoDiet {
  clientId: string; kcal: number; protein: number; carbs: number; fats: number
  meals: DemoMeal[]; advice: string; updatedAt: string
  mealDistribution?: { label: string; icon: string; pct: number }[]
  supplements?: { name: string; dosis: string; timing: string; visible: boolean }[]
  showSupplements?: boolean
}

const DIST_4 = [
  { label: 'Desayuno', icon: '🌅', pct: 25 }, { label: 'Media mañana', icon: '🍎', pct: 15 },
  { label: 'Comida', icon: '🍽️', pct: 35 }, { label: 'Cena', icon: '🌙', pct: 25 },
]
const DIST_5 = [
  { label: 'Desayuno', icon: '🌅', pct: 25 }, { label: 'Media mañana', icon: '🍎', pct: 15 },
  { label: 'Comida', icon: '🍽️', pct: 30 }, { label: 'Merienda', icon: '🥪', pct: 12 }, { label: 'Cena', icon: '🌙', pct: 18 },
]
const SUPS_BASE = [
  { name: 'Creatina', dosis: '5g diarios', timing: 'Cualquier momento', visible: true },
  { name: 'Proteína whey', dosis: 'Si no llegas a tu objetivo', timing: 'Post-entreno', visible: true },
  { name: 'Vitamina D', dosis: '2000 UI', timing: 'Con comida grasa', visible: true },
  { name: 'Omega-3', dosis: '2-3g EPA/DHA', timing: 'Con comidas', visible: false },
]
const m = (id: string, time: string, name: string, kcal: number, items: string[]): DemoMeal => ({ id, time, name, kcal, items })

export const DEMO_DIETS_MAP: Record<string, DemoDiet> = {
  'demo-client-001': {
    clientId: 'demo-client-001', kcal: 2100, protein: 155, carbs: 230, fats: 65, updatedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    advice: 'Distribuye la proteína en 4-5 tomas. Post-entreno prioriza proteína + carbos. Bebe al menos 2 L de agua al día.',
    mealDistribution: DIST_5, showSupplements: true, supplements: SUPS_BASE,
    meals: [
      m('m1', '08:00', 'Desayuno', 520, ['Avena 70g', 'Yogur griego 200g', 'Arándanos 80g', 'Nueces 15g']),
      m('m2', '11:00', 'Media mañana', 280, ['Tostada integral 2ud', 'Pavo 60g', 'Tomate']),
      m('m3', '14:30', 'Comida', 650, ['Arroz 90g (crudo)', 'Pollo 180g', 'Brócoli 200g', 'AOVE 15ml']),
      m('m4', '17:30', 'Merienda / pre-entreno', 250, ['Plátano 1ud', 'Proteína whey 25g']),
      m('m5', '21:00', 'Cena', 400, ['Salmón 150g', 'Patata cocida 200g', 'Ensalada variada']),
    ],
  },
  'demo-client-002': {
    clientId: 'demo-client-002', kcal: 3200, protein: 200, carbs: 380, fats: 90, updatedAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    advice: 'Surplus calórico moderado. Come bien antes y después de entrenar. En la semana de pico no recortes carbohidratos.',
    mealDistribution: DIST_5, showSupplements: true, supplements: SUPS_BASE,
    meals: [
      m('m1', '07:30', 'Desayuno', 800, ['Avena 100g', 'Leche 350ml', 'Huevos 3ud', 'Plátano 1ud']),
      m('m2', '11:00', 'Media mañana', 450, ['Bocadillo de pavo y queso', 'Fruta 1ud']),
      m('m3', '14:00', 'Comida', 1000, ['Pasta 160g (crudo)', 'Ternera picada 200g', 'Salsa de tomate', 'AOVE 20ml']),
      m('m4', '17:30', 'Pre-entreno', 450, ['Arroz con leche 250g', 'Proteína whey 30g']),
      m('m5', '21:30', 'Cena', 500, ['Merluza 220g', 'Patata 250g', 'Verduras salteadas']),
    ],
  },
  'demo-client-003': {
    clientId: 'demo-client-003', kcal: 1700, protein: 140, carbs: 160, fats: 55, updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    advice: 'Déficit moderado. No pases hambre — si tienes hambre, añade proteína o verduras. Un día libre a la semana, sin culpa.',
    mealDistribution: DIST_4, showSupplements: false, supplements: SUPS_BASE.map(s => ({ ...s, visible: false })),
    meals: [
      m('m1', '08:00', 'Desayuno', 420, ['Huevos 3ud', 'Tostada integral 1ud', 'Aguacate 1/4', 'Café solo']),
      m('m2', '11:30', 'Media mañana', 230, ['Yogur proteico 200g', 'Manzana 1ud']),
      m('m3', '14:30', 'Comida', 620, ['Pollo 180g', 'Arroz 70g (crudo)', 'Verdura al vapor 250g', 'AOVE 10ml']),
      m('m4', '21:00', 'Cena', 430, ['Merluza 200g', 'Ensalada grande', 'Boniato 150g']),
    ],
  },
  'demo-client-004': {
    clientId: 'demo-client-004', kcal: 3000, protein: 190, carbs: 350, fats: 85, updatedAt: new Date(Date.now() - 9 * 86400000).toISOString(),
    advice: 'Ligero superávit para sostener el volumen de esta fase. Ajustaremos según cómo evolucione el peso (objetivo +0,25 kg/semana).',
    mealDistribution: DIST_5, showSupplements: true, supplements: SUPS_BASE,
    meals: [
      m('m1', '08:00', 'Desayuno', 750, ['Avena 90g', 'Leche 300ml', 'Huevos 2ud', 'Mantequilla de cacahuete 20g']),
      m('m2', '11:00', 'Media mañana', 400, ['Arroz con leche', 'Fruta 1ud']),
      m('m3', '14:00', 'Comida', 950, ['Arroz 140g (crudo)', 'Pollo 220g', 'Verdura', 'AOVE 20ml']),
      m('m4', '17:30', 'Merienda', 400, ['Pan integral 80g', 'Pavo 100g', 'Queso fresco 100g']),
      m('m5', '21:30', 'Cena', 500, ['Salmón 200g', 'Patata 250g', 'Ensalada']),
    ],
  },
  'demo-client-005': {
    clientId: 'demo-client-005', kcal: 1900, protein: 130, carbs: 190, fats: 60, updatedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    advice: 'Mantenimiento — ahora el objetivo es recuperar movilidad y fuerza, no cambiar composición corporal. Prioriza proteína y alimentos antiinflamatorios.',
    mealDistribution: DIST_4, showSupplements: true,
    supplements: [
      { name: 'Colágeno + vitamina C', dosis: '10g + 200mg', timing: '45 min antes de la rehab', visible: true },
      { name: 'Omega-3', dosis: '2-3g EPA/DHA', timing: 'Con comidas', visible: true },
      { name: 'Vitamina D', dosis: '2000 UI', timing: 'Con comida grasa', visible: true },
    ],
    meals: [
      m('m1', '08:30', 'Desayuno', 480, ['Tostada integral 2ud', 'Huevos 2ud', 'Aguacate 1/2', 'Fruta 1ud']),
      m('m2', '11:30', 'Media mañana', 250, ['Yogur griego 200g', 'Nueces 20g']),
      m('m3', '14:30', 'Comida', 650, ['Lentejas 80g (crudo)', 'Pollo 150g', 'Verduras']),
      m('m4', '21:00', 'Cena', 520, ['Pescado azul 180g', 'Patata cocida 200g', 'Ensalada con AOVE']),
    ],
  },
  'demo-client-006': {
    clientId: 'demo-client-006', kcal: 1900, protein: 140, carbs: 170, fats: 60, updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    advice: 'Déficit sostenible — prioriza proteína y saciedad, nunca pases hambre. Pésate siempre en las mismas condiciones y mira la tendencia, no el día.',
    mealDistribution: DIST_4, showSupplements: false, supplements: SUPS_BASE.map(s => ({ ...s, visible: false })),
    meals: [
      m('m1', '08:00', 'Desayuno', 450, ['Yogur proteico 250g', 'Avena 40g', 'Fruta 1ud']),
      m('m2', '11:30', 'Media mañana', 250, ['Tostada integral 1ud', 'Pavo 50g']),
      m('m3', '14:30', 'Comida', 700, ['Pollo 180g', 'Arroz integral 70g (crudo)', 'Verduras al horno 250g']),
      m('m4', '21:00', 'Cena', 500, ['Tortilla de 2 huevos', 'Ensalada grande', 'Pan integral 40g']),
    ],
  },
  'demo-client-007': {
    clientId: 'demo-client-007', kcal: 3100, protein: 180, carbs: 400, fats: 80, updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    advice: 'Carga alta de carbohidratos para las sesiones de velocidad — no entrenar en ayunas los días de sprints. Hidratación con electrolitos en sesiones de más de 60 min.',
    mealDistribution: DIST_5, showSupplements: true,
    supplements: [
      { name: 'Creatina', dosis: '5g diarios', timing: 'Cualquier momento', visible: true },
      { name: 'Cafeína', dosis: '3 mg/kg', timing: '45 min antes de sprints', visible: true },
      { name: 'Electrolitos', dosis: '1 sobre', timing: 'Durante sesiones largas', visible: true },
      { name: 'Omega-3', dosis: '2-3g EPA/DHA', timing: 'Con comidas', visible: true },
    ],
    meals: [
      m('m1', '07:30', 'Desayuno', 800, ['Avena 100g', 'Leche 300ml', 'Plátano 1ud', 'Miel 15g', 'Huevos 2ud']),
      m('m2', '11:00', 'Media mañana', 450, ['Bocadillo de jamón serrano', 'Zumo de naranja 250ml']),
      m('m3', '14:00', 'Comida', 950, ['Pasta 150g (crudo)', 'Pollo 200g', 'Tomate frito casero', 'AOVE 15ml']),
      m('m4', '17:00', 'Pre-entreno', 400, ['Arroz con leche', 'Dátiles 3ud']),
      m('m5', '21:00', 'Cena', 500, ['Merluza 220g', 'Patata 250g', 'Verduras']),
    ],
  },
}

export const demoClientById = (id: string) => DEMO_CLIENTS.find(c => c.id === id)

// ── NOTIFICACIONES (campana del entrenador) ─────────────
const ago = (ms: number) => Date.now() - ms
const MIN = 60000, HOUR = 3600000, DAY = 86400000
export function buildDemoNotificaciones() {
  const n = (i: number, client_id: string, tipo: string, titulo: string, mensaje: string, createdAt: number, leida = false) =>
    ({ id: `demo-notif-${i}`, trainer_id: DEMO_TRAINER_ID, client_id, tipo, titulo, mensaje, leida, created_at: createdAt })
  return [
    n(1, 'demo-client-007', 'alerta_vencida', 'Molestia articular reportada', 'Lucas — Rodilla (6/10): "Duele al aterrizar en los saltos con carga"', ago(35 * MIN)),
    n(2, 'demo-client-001', 'sesion_completada', 'Sesión completada 💪', 'María terminó DÍA C — Pierna con 3 récords personales', ago(2 * HOUR)),
    n(3, 'demo-client-004', 'sesion_completada', 'Sesión completada 💪', 'Diego terminó DÍA B — Banca y accesorios', ago(5 * HOUR)),
    n(4, 'demo-client-002', 'inactividad', 'Cliente sin actividad', 'Carlos lleva 9 días sin entrenar y su motivación va a la baja', ago(9 * HOUR)),
    n(5, 'demo-client-006', 'mensaje', 'Mensaje de Beatriz', '"¿Puedo cambiar la sentadilla goblet por prensa? Me molestan las muñecas"', ago(1 * DAY + 2 * HOUR), true),
    n(6, 'demo-client-005', 'nueva_rutina', 'Plan visto por la cliente', 'Marta abrió la nueva fase de readaptación de rodilla', ago(1 * DAY + 6 * HOUR), true),
    n(7, 'demo-client-003', 'alerta_vencida', 'Recordatorio vencido', 'Laura — "Revisar medidas del mes" venció hace 2 días', ago(2 * DAY), true),
    n(8, 'demo-client-001', 'mensaje', 'Mensaje de María', '"Gracias por los ajustes del plan, ¡me noto mucho más fuerte!"', ago(3 * DAY), true),
    // Contactos de la página pública: el aviso de uno nuevo y el recordatorio de uno que lleva más de un día esperando
    n(9, '', 'nuevo_contacto', 'Nuevo contacto: Paula Navarro', 'Quiero empezar a entrenar fuerza, nunca he pisado un gimnasio. ¿Cómo funciona el plan online?', ago(5 * HOUR)),
    n(10, '', 'nuevo_contacto', 'Sin contestar: Marta Díaz', 'Lleva más de un día esperando tu respuesta', ago(1 * HOUR)),
  ]
}

// ── PLANTILLAS DE MENSAJE ───────────────────────────────
export function buildDemoMessageTemplates() {
  const t = (i: number, tipo: string, nombre: string, texto: string) =>
    ({ id: `demo-msg-${i}`, trainerId: DEMO_TRAINER_ID, tipo, nombre, texto, createdAt: Date.now() - (30 - i) * DAY })
  return [
    t(1, 'nueva_rutina', 'Nueva rutina asignada', 'Hola {{cliente}} 👋 Te he preparado una rutina nueva, ¡revísala cuando puedas! 💪'),
    t(2, 'racha', 'Felicitar racha', '¡{{cliente}}, qué racha llevas! 🔥 Sigue así, se nota el esfuerzo.'),
    t(3, 'descanso', 'Día de descanso', 'Hola {{cliente}}, hoy toca descanso 🛌 Aprovecha para recuperar bien, mañana seguimos.'),
    t(4, 'custom', 'Recordatorio de pesaje', 'Buenos días {{cliente}} ⚖️ Recuerda pesarte en ayunas y apuntarlo en tu panel.'),
    t(5, 'custom', 'Revisión de molestias', 'Hola {{cliente}}, ¿cómo va esa molestia? Apúntame en tu panel la intensidad (0-10) para ajustarte la carga 🩹'),
  ]
}

// ── MENSAJES PROGRAMADOS ────────────────────────────────
export function buildDemoScheduledMessages() {
  const s = (i: number, clientId: string, tipo: string, mensaje: string, offsetDays: number, pushEnviado = false) =>
    ({ id: `demo-sched-msg-${i}`, trainerId: DEMO_TRAINER_ID, clientId, tipo, mensaje, fechaEnvio: dayStr(-offsetDays), enviado: false, pushEnviado, createdAt: Date.now() - 10 * DAY })
  return [
    s(1, 'demo-client-002', 'racha', '¡Carlos, qué racha llevas! 🔥 Sigue así, se nota el esfuerzo.', 0),
    s(2, 'demo-client-003', 'custom', 'Laura, hoy toca pesaje y medidas. ¡Sin agobios, solo para ver la tendencia! 📏', 0, true),
    s(3, 'demo-client-005', 'custom', 'Marta, ¿cómo ha ido la semana de rehab? Cuéntame el dolor de rodilla (0-10) 🩹', 1),
    s(4, 'demo-client-006', 'nueva_rutina', 'Beatriz, la semana que viene subimos un poco la carga 💪 Prepárate.', 3),
    s(5, 'demo-client-004', 'descanso', 'Diego, mañana descarga: técnica ligera y a comer bien 🛌', 5),
  ]
}

// ── RECORDATORIOS POR CLIENTE (ClientAlert) ─────────────
type DemoAlert = { id: string; type: 'llamar' | 'revision' | 'valoracion' | 'otro'; note: string; date: string; done: boolean; createdAt: number }
const al = (id: string, type: DemoAlert['type'], note: string, offsetDays: number, done = false): DemoAlert =>
  ({ id: `demo-alert-${id}`, type, note, date: dayStr(-offsetDays), done, createdAt: Date.now() - 12 * DAY })
export const DEMO_ALERTS_MAP: Record<string, DemoAlert[]> = {
  'demo-client-001': [al('1a', 'revision', 'Revisar progresión de sentadilla antes de subir carga', 2), al('1b', 'otro', 'Enviar guía de nutrición para fase lútea', -3, true)],
  'demo-client-002': [al('2a', 'llamar', 'Llamar: motivación baja y 9 días sin entrenar', -1), al('2b', 'revision', 'Ajustar peso de apertura para el pico', 4)],
  'demo-client-003': [al('3a', 'valoracion', 'Revisar medidas del mes', -2)],
  'demo-client-004': [al('4a', 'revision', 'Revisar técnica de peso muerto en vídeo', 3), al('4b', 'otro', 'Inscripción a competición: fecha límite', 14)],
  'demo-client-005': [al('5a', 'llamar', 'Coordinar con el fisio la autorización de impacto', 1), al('5b', 'revision', 'Reevaluar dolor EVA tras la última fase', 6)],
  'demo-client-006': [al('6a', 'valoracion', 'Valoración inicial a las 4 semanas', 2)],
  'demo-client-007': [al('7a', 'llamar', 'Llamar hoy: molestia de rodilla + ACWR alto, valorar descarga', 0), al('7b', 'revision', 'Repetir test fuerza-velocidad tras la descarga', 5)],
}

// ── HISTORIAL DE PUBLICACIONES DEL PLAN ─────────────────
// Las versiones antiguas son copias recortadas del plan actual; sirven para
// que "Restaurar como borrador" tenga algo real que restaurar.
export interface DemoHistoryRow { id: string; plan: { P: any }; note: string | null; published_by: string | null; published_at: string }
export function buildDemoPlanHistory(clientId: string, plan: { weeks: any[] } | undefined): DemoHistoryRow[] {
  if (!plan) return []
  const notes: Record<string, (string | null)[]> = {
    'demo-client-001': ['Subo el volumen de pierna +1 serie', 'Añado semana de descarga', null],
    'demo-client-002': ['Fase de pico: bajan las reps, sube la intensidad', 'Ajuste de pesos de apertura'],
    'demo-client-004': ['Empezamos fase de volumen', 'Cambio sentadilla por pausa de 2s'],
    'demo-client-005': ['Pasamos a fase 2: isométricos con carga', 'Quito zancadas por molestia', 'Plan inicial de readaptación'],
    'demo-client-007': ['Bloque de sprints + pliometría', 'Ajuste de pliometría tras el test de salto'],
  }
  const list = notes[clientId]
  if (!list) return []
  return list.map((note, i) => ({
    id: `demo-hist-${clientId}-${i}`,
    plan: { P: { ...plan, weeks: plan.weeks.slice(0, Math.max(1, plan.weeks.length - i)) } },
    note, published_by: 'Alex Martínez',
    published_at: new Date(Date.now() - (i * 9 + 2) * DAY).toISOString(),
  }))
}
export const DEMO_PLAN_LAST_OPENED = (clientId: string): string | null =>
  clientId === 'demo-client-002' ? null : new Date(Date.now() - 1 * DAY).toISOString()

// Cliente cuyo plan aparece con un borrador sin publicar (Bandeja + Plan)
export const DEMO_BORRADOR_CLIENT_IDS = ['demo-client-002']

// ── HÁBITOS DIARIOS ─────────────────────────────────────
// Store mutable compartido: lo que añade el entrenador lo ve el cliente.
export interface DemoHabito { id: string; clientId: string; text: string; sub?: string; order: number }
const hb = (clientId: string, texts: string[]): DemoHabito[] =>
  texts.map((text, order) => ({ id: `demo-hab-${clientId.slice(-3)}-${order}`, clientId, text, order }))
export const DEMO_HABITOS_MAP: Record<string, DemoHabito[]> = {
  'demo-client-001': hb('demo-client-001', ['Beber 2 L de agua', 'Dormir 7-8 h', 'Proteína en cada comida', '8.000 pasos']),
  'demo-client-002': hb('demo-client-002', ['Dormir 8 h (clave en el pico)', 'Comer carbohidratos antes de entrenar', 'Movilidad de cadera 10 min']),
  'demo-client-003': hb('demo-client-003', ['Beber 2,5 L de agua', '10.000 pasos', 'Verdura en comida y cena', 'Sin picoteo nocturno']),
  'demo-client-004': hb('demo-client-004', ['Dormir 8 h', 'Pesarme en ayunas', 'Comer las 5 tomas']),
  'demo-client-005': hb('demo-client-005', ['Ejercicios de rehab (10 min)', 'Hielo 15 min si hay inflamación', 'Evitar escaleras largas']),
  'demo-client-006': hb('demo-client-006', ['Caminar 30 min', 'Beber 2 L de agua', 'Cenar antes de las 21:30']),
  'demo-client-007': hb('demo-client-007', ['Dormir 8-9 h', 'Hidratación con electrolitos', 'Rodillo de espuma post-sesión', 'Registrar sensaciones tras sprints']),
}

// ── REVISIONES SEMANALES DEL OBJETIVO ───────────────────
export interface DemoWeeklyReview {
  id: string; clientId: string; week_start: string; objetivo_semanal: string | null
  estado: 'en_curso' | 'riesgo' | 'conseguido'; nota: string | null; created_by: string | null; created_at: string
}
function mondayKey(weeksAgo: number): string {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1) - weeksAgo * 7)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const rv = (clientId: string, weeksAgo: number, objetivo: string, estado: DemoWeeklyReview['estado'], nota: string | null): DemoWeeklyReview =>
  ({ id: `demo-rev-${clientId.slice(-3)}-${weeksAgo}`, clientId, week_start: mondayKey(weeksAgo), objetivo_semanal: objetivo, estado, nota, created_by: DEMO_TRAINER_ID, created_at: new Date(Date.now() - weeksAgo * 7 * DAY - 2 * DAY).toISOString() })
// Algunos clientes con revisión al día (no salen en la Bandeja) y otros sin
// ninguna en los últimos 7 días (sí salen como "Toca revisión semanal").
export const DEMO_WEEKLY_REVIEWS_MAP: Record<string, DemoWeeklyReview[]> = {
  'demo-client-001': [
    rv('demo-client-001', 0, 'Sentadilla 4×8 con 60 kg', 'en_curso', 'Va según lo previsto, buen RIR'),
    rv('demo-client-001', 1, 'Hip thrust 4×10 con 70 kg', 'conseguido', 'Récord personal. Subimos 2,5 kg.'),
    rv('demo-client-001', 2, 'Completar 4 sesiones', 'conseguido', null),
  ],
  'demo-client-004': [
    rv('demo-client-004', 0, 'Mantener técnica en pausa a 2 s', 'en_curso', null),
    rv('demo-client-004', 1, '+0,25 kg de peso corporal', 'conseguido', 'Peso a 90,0 kg'),
  ],
  'demo-client-005': [
    rv('demo-client-005', 0, 'Dolor ≤ 3/10 en rodilla en todas las sesiones', 'riesgo', 'Sigue en 4/10. Esperar a la valoración del fisio.'),
    rv('demo-client-005', 1, 'Dolor ≤ 4/10 al bajar escaleras', 'conseguido', null),
    rv('demo-client-005', 2, 'Extensión completa activa', 'conseguido', null),
  ],
  'demo-client-003': [
    rv('demo-client-003', 2, 'Perder 0,5 kg esta semana', 'riesgo', 'Semana con eventos sociales.'),
  ],
}

// ── FICHA DE ADMISIÓN / PAR-Q ───────────────────────────
import { PARQ_QUESTIONS } from './intakeQuestions'
const intake = (si: number[], lesiones: string, objetivos: string, disponibilidad: string) => [
  ...PARQ_QUESTIONS.map((pregunta, i) => ({ pregunta, respuesta: si.includes(i) ? 'Sí' : 'No' })),
  { pregunta: 'Lesiones o condiciones médicas relevantes', respuesta: lesiones },
  { pregunta: 'Objetivo principal con el entrenamiento', respuesta: objetivos },
  { pregunta: '¿Qué días y horas prefieres entrenar?', respuesta: disponibilidad },
]
export const DEMO_INTAKE_MAP: Record<string, { pregunta: string; respuesta: string }[]> = {
  'demo-client-001': intake([], 'Ninguna', 'Ganar masa muscular y tonificar', 'Lunes a jueves, 18:00-19:30'),
  'demo-client-002': intake([4], 'Hombro derecho con molestia antigua (supraespinoso)', 'Competir en powerlifting', 'Lunes, miércoles, viernes y sábado por la tarde'),
  'demo-client-003': intake([], 'Ninguna', 'Perder grasa y mejorar la forma física', 'Martes, jueves y sábado por la mañana'),
  'demo-client-004': intake([], 'Ninguna', 'Preparar su próxima competición de powerlifting', 'Cuatro días, por la tarde'),
  'demo-client-005': intake([4, 6], 'Rotura parcial de menisco interno (rodilla derecha), cirugía artroscópica', 'Recuperar la rodilla y volver a correr', 'Lunes y jueves por la mañana, con fisio los miércoles'),
  'demo-client-006': intake([4, 5], 'Sobrepeso, tensión algo elevada en tratamiento', 'Perder peso de forma saludable', 'Tres días a la semana, a primera hora'),
  'demo-client-007': intake([], 'Tendinopatía rotuliana leve (resuelta hace 1 año)', 'Mejorar tiempos en 100 y 200 m', 'Seis días, mañana y tarde'),
}

// ── FOTOS DE PROGRESO (frente / lateral / espalda) ──────
// No hay fotos reales en el repo: siluetas SVG generadas, incrustadas como
// data: URI (no dependen de red ni de Storage). El tono cambia por sesión para
// que la comparativa antes/después se vea distinta.
function photoSvg(kind: 'front' | 'side' | 'back', hue: number, slim: number): string {
  const w = 120 + slim * 10 // más "ancho" = más volumen corporal
  const label = kind === 'front' ? 'FRENTE' : kind === 'side' ? 'LATERAL' : 'ESPALDA'
  const body = kind === 'side'
    ? `<ellipse cx="150" cy="190" rx="${w * 0.42}" ry="150" fill="hsl(${hue} 18% 36%)"/>`
    : `<path d="M${150 - w / 2} 330 Q${150 - w / 2 - 6} 230 ${150 - w / 2 + 12} 150 L${150 + w / 2 - 12} 150 Q${150 + w / 2 + 6} 230 ${150 + w / 2} 330 Z" fill="hsl(${hue} 18% 36%)"/>
       <rect x="${150 - w / 2 + 6}" y="330" width="${w / 2 - 10}" height="190" rx="14" fill="hsl(${hue} 18% 32%)"/>
       <rect x="${150 + 4}" y="330" width="${w / 2 - 10}" height="190" rx="14" fill="hsl(${hue} 18% 32%)"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 22% 88%)"/><stop offset="1" stop-color="hsl(${hue} 22% 74%)"/></linearGradient></defs>
    <rect width="300" height="400" fill="url(#g)"/>
    <g transform="translate(39 -26) scale(.74)">
      <circle cx="150" cy="96" r="34" fill="hsl(${hue} 18% 36%)"/>
      ${body}
    </g>
    <text x="150" y="386" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700" fill="hsl(${hue} 20% 28%)" letter-spacing="2">${label} · DEMO</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
export interface DemoFotoSession { id: string; client_id: string; date: string; front_url: string; side_url: string; back_url: string; note: string }
const fotoSession = (clientId: string, daysAgo: number, hue: number, slim: number, note: string): DemoFotoSession => ({
  id: `demo-foto-${clientId.slice(-3)}-${daysAgo}`, client_id: clientId, date: dayStr(daysAgo), note,
  front_url: photoSvg('front', hue, slim), side_url: photoSvg('side', hue, slim), back_url: photoSvg('back', hue, slim),
})
export const DEMO_FOTO_SESSIONS_MAP: Record<string, DemoFotoSession[]> = {
  'demo-client-001': [fotoSession('demo-client-001', 3, 28, 0, 'Semana 8 — se nota el glúteo'), fotoSession('demo-client-001', 31, 28, 1, 'Semana 4'), fotoSession('demo-client-001', 59, 28, 2, 'Punto de partida')],
  'demo-client-003': [fotoSession('demo-client-003', 5, 200, 1, 'Mes 1'), fotoSession('demo-client-003', 33, 200, 3, 'Punto de partida')],
  'demo-client-004': [fotoSession('demo-client-004', 4, 215, 3, 'Fase de volumen — semana 6'), fotoSession('demo-client-004', 32, 215, 2, 'Inicio de volumen')],
  'demo-client-006': [fotoSession('demo-client-006', 2, 330, 4, 'Semana 4'), fotoSession('demo-client-006', 24, 330, 6, 'Día 1')],
}
export const demoPhotoSvg = photoSvg

// ── REACCIONES AL TERMINAR UNA SESIÓN (😅 🤕 💪 …) ───────
// Las fechas salen de los propios logs del cliente (los últimos días con
// sesión), así que siempre coinciden con las sesiones que se ven en Entrenos.
export type DemoReaction = { date: string; emoji: string; comment: string | null }
const REACTION_SCRIPT: Record<string, [string, string | null][]> = {
  'demo-client-001': [['🔥', 'Hoy salió genial, récord en sentadilla'], ['💪', null], ['👍', null], ['🔥', null]],
  'demo-client-002': [['😩', 'Muy cansado esta semana, el trabajo me está matando'], ['😅', null], ['👍', null]],
  'demo-client-003': [['👍', null], ['😅', 'Costó empezar, pero al final bien'], ['💪', null]],
  'demo-client-004': [['💪', null], ['🔥', 'Peso muerto más rápido que nunca'], ['👍', null]],
  'demo-client-005': [['🤕', 'La rodilla molesta al bajar en el último ejercicio'], ['😅', null], ['🤕', 'Algo de molestia, pero tolerable'], ['👍', null]],
  'demo-client-006': [['😅', 'Agujetas por todo el cuerpo, pero contenta'], ['💪', '¡He podido con todas las series!'], ['👍', null]],
  'demo-client-007': [['🤕', 'Duele al aterrizar en los saltos con carga'], ['😩', 'Piernas muertas tras el bloque de sprints'], ['🔥', null]],
}
export const DEMO_REACTIONS_MAP: Record<string, DemoReaction[]> = (() => {
  const out: Record<string, DemoReaction[]> = {}
  for (const [clientId, script] of Object.entries(REACTION_SCRIPT)) {
    const dates = [...new Set(Object.values(DEMO_LOGS_MAP[clientId] || {}).map(l => l.dateDone).filter(Boolean) as string[])].sort().reverse()
    out[clientId] = script.slice(0, dates.length).map(([emoji, comment], i) => ({ date: dates[i], emoji, comment }))
  }
  return out
})()

// ── VALORACIONES (composición corporal + perímetros) ────
// Tres mediciones por cliente (hoy, hace ~30 y ~60 días) con la tendencia que
// encaja con su objetivo: recomposición, volumen, pérdida de grasa, rehab…
export interface DemoValoracion {
  id: string; client_id: string; trainer_id: string; fecha: string
  peso: number | null; imc: number | null; grasa_corporal: number | null; masa_muscular: number | null
  cintura: number | null; cadera: number | null; pecho: number | null
  brazo_d: number | null; brazo_i: number | null; muslo_d: number | null; muslo_i: number | null
  notas: string; fotos: string[]; created_at: number
}
const r1 = (n: number) => Math.round(n * 10) / 10
function valoraciones(clientId: string, trend: { peso: number; grasa: number; musculo: number; cintura: number; brazo: number; muslo: number }, notes: [string, string, string]): DemoValoracion[] {
  const c = demoClientById(clientId)!
  const alt = (c.altura || 170) / 100
  return [0, 1, 2].map(i => {
    const k = i // 0 = hoy, 1 = hace 30 d, 2 = hace 60 d
    const peso = r1(c.weight + trend.peso * k), grasa = r1(c.fatPercentage + trend.grasa * k), musc = r1(c.muscleMass + trend.musculo * k)
    return {
      id: `demo-val-${clientId.slice(-3)}-${k}`, client_id: clientId, trainer_id: DEMO_TRAINER_ID, fecha: dayStr(k * 30 + 2),
      peso, imc: r1(peso / (alt * alt)), grasa_corporal: grasa, masa_muscular: musc,
      cintura: r1(78 + trend.cintura * k + (c.weight - 62) * 0.55), cadera: r1(96 + (c.weight - 62) * 0.45), pecho: r1(92 + (c.weight - 62) * 0.4 - trend.brazo * k),
      brazo_d: r1(31 + (c.muscleMass - 45) * 0.15 - trend.brazo * k), brazo_i: r1(30.6 + (c.muscleMass - 45) * 0.15 - trend.brazo * k),
      muslo_d: r1(56 + (c.weight - 62) * 0.35 - trend.muslo * k), muslo_i: r1(55.6 + (c.weight - 62) * 0.35 - trend.muslo * k),
      notas: notes[k], fotos: [], created_at: Date.now() - (k * 30 + 2) * DAY,
    }
  })
}
export const DEMO_VALORACIONES_MAP: Record<string, DemoValoracion[]> = {
  'demo-client-001': valoraciones('demo-client-001', { peso: 0.9, grasa: 1.4, musculo: -1.1, cintura: 1.2, brazo: 0.4, muslo: 0.7 }, ['Recomposición en marcha: baja la grasa, sube el músculo', 'Mejora de cintura visible', 'Valoración inicial']),
  'demo-client-002': valoraciones('demo-client-002', { peso: 0.3, grasa: 0.2, musculo: -0.2, cintura: 0.2, brazo: 0.1, muslo: 0.2 }, ['Peso estable de cara al pico', 'Sin cambios relevantes', 'Valoración inicial']),
  'demo-client-003': valoraciones('demo-client-003', { peso: 1.6, grasa: 1.8, musculo: -0.5, cintura: 2.4, brazo: 0.2, muslo: 1.0 }, ['−3,2 kg en 2 meses, ritmo sostenible', 'Cintura −2 cm', 'Valoración inicial']),
  'demo-client-004': valoraciones('demo-client-004', { peso: -1.0, grasa: -0.4, musculo: -1.2, cintura: -0.6, brazo: 0.6, muslo: 0.8 }, ['Fase de volumen: sube peso y músculo, grasa controlada', 'Superávit bien llevado', 'Valoración inicial']),
  'demo-client-005': valoraciones('demo-client-005', { peso: -0.1, grasa: 0.3, musculo: -0.6, cintura: 0.2, brazo: 0.1, muslo: 1.1 }, ['Pierna operada: perímetro de muslo aún por debajo', 'Recupera masa en el cuádriceps', 'Valoración tras la cirugía']),
  'demo-client-006': valoraciones('demo-client-006', { peso: 2.8, grasa: 1.9, musculo: -0.4, cintura: 3.1, brazo: 0.2, muslo: 1.4 }, ['Mejor ritmo del esperado, mucha energía', 'Primera mejora clara en cintura', 'Valoración inicial']),
  'demo-client-007': valoraciones('demo-client-007', { peso: 0.2, grasa: 0.2, musculo: -0.1, cintura: 0.1, brazo: 0.1, muslo: 0.3 }, ['Peso de competición mantenido', 'Sin cambios', 'Valoración de pretemporada']),
}

// ── BLOQUES DE ACONDICIONAMIENTO (EMOM / AMRAP / Tabata…) ─
export function buildDemoConditioningBlocks() {
  const b = (id: string, name: string, type: string, extra: Record<string, unknown>, items: { exercise: string; target: string }[], notes?: string) =>
    ({ id: `demo-cb-${id}`, trainerId: DEMO_TRAINER_ID, name, type, items, notes, createdAt: Date.now() - 20 * DAY, ...extra })
  return [
    b('emom', 'EMOM 12 — Kettlebell y core', 'emom', { rounds: 12 }, [{ exercise: 'Swing con kettlebell', target: '12 reps' }, { exercise: 'Burpees', target: '8 reps' }, { exercise: 'Rueda abdominal', target: '10 reps' }], 'Minuto impar: swing + burpees. Minuto par: abdominal y descanso.'),
    b('amrap', 'AMRAP 15 — Cuerpo completo', 'amrap', { durationMin: 15 }, [{ exercise: 'Sentadilla goblet', target: '10 reps' }, { exercise: 'Flexiones', target: '8 reps' }, { exercise: 'Remo con mancuerna', target: '10 reps' }], 'Rondas completas + repeticiones sueltas. Ritmo sostenible.'),
    b('tabata', 'Tabata — Remo y saltos', 'tabata', { rounds: 8, workSec: 20, restSec: 10 }, [{ exercise: 'Remo en máquina', target: '20 s' }, { exercise: 'Saltos al cajón', target: '20 s' }]),
    b('fortime', 'For Time — 5 rondas 400 m', 'for_time', { rounds: 5 }, [{ exercise: 'Carrera', target: '400 m' }, { exercise: 'Sentadilla con salto', target: '15 reps' }, { exercise: 'Fondos en banco', target: '12 reps' }], 'Registrar tiempo total. Meta: bajar de 22 min.'),
    b('circuito', 'Circuito HIIT principiantes', 'circuito', { rounds: 4, workSec: 40, restSec: 20 }, [{ exercise: 'Sentadilla', target: '40 s' }, { exercise: 'Remo con banda', target: '40 s' }, { exercise: 'Plancha', target: '40 s' }, { exercise: 'Zancadas alternas', target: '40 s' }], 'Pensado para clientes nuevos: técnica antes que ritmo.'),
  ]
}

// ── PÁGINA PÚBLICA Y CONTACTOS (LEADS) ──────────────────
export const DEMO_PUBLIC_PAGE = {
  bio: 'Entrenador personal especializado en hipertrofia y fuerza. Más de 200 clientes transformados con planes 100% personalizados, seguimiento semanal y nutrición incluida.',
  especialidades: ['Hipertrofia', 'Fuerza', 'Powerlifting', 'Pérdida de grasa', 'Rehabilitación', 'Rendimiento deportivo'],
  servicios: ['Entrenamiento online personalizado', 'Seguimiento semanal con revisión de objetivos', 'Plan de nutrición con macros', 'Valoración corporal y fotos de progreso', 'Readaptación tras lesión'],
  ubicacion: 'Valencia · Online',
  instagram: '@alexfit.training',
  whatsapp: '+34 600 000 000',
  activa: true,
}
export function buildDemoLeads() {
  const l = (i: number, name: string, email: string | null, phone: string | null, message: string | null, status: string, hoursAgo: number, ref: string | null = null) =>
    ({ id: `demo-lead-${i}`, name, email, phone, message, status, created_at: Date.now() - hoursAgo * 3600000, referred_by_client_id: ref, referrerName: ref ? demoClientById(ref)?.name + ' ' + (demoClientById(ref)?.surname || '') : undefined })
  return [
    l(1, 'Paula Navarro', 'paula.navarro@example.com', null, 'Quiero empezar a entrenar fuerza, nunca he pisado un gimnasio. ¿Cómo funciona el plan online?', 'nuevo', 5),
    l(2, 'Javier Ortega', null, '+34 622 11 22 33', 'Me recomendó Carlos. Me preparo para mi primer press banca en competición.', 'nuevo', 20, 'demo-client-002'),
    l(3, 'Elena Ruiz', 'elena.ruiz@example.com', '+34 633 44 55 66', 'Operada del menisco hace 3 meses, busco readaptación como la de Marta.', 'contactado', 52, 'demo-client-005'),
    l(4, 'Sergio Blanco', 'sergio.blanco@example.com', null, '¿Precios de seguimiento mensual?', 'convertido', 120),
    l(5, 'Irene Castro', null, '+34 644 77 88 99', null, 'descartado', 240),
    // Lleva más de un día sin contestar: la demo enseña cómo se marca (y el recordatorio que le llega al entrenador)
    l(6, 'Marta Díaz', null, '+34 655 12 34 56', 'Vi tu página en Instagram. ¿Haces seguimiento online para powerlifting? Quiero preparar mi primera competición.', 'nuevo', 30),
  ]
}

// ── BIBLIOTECA DE EJERCICIOS (vídeos, etiquetas, especialidades) ──
// La biblioteca de serie viene sin vídeos ni etiquetas; en demo se enriquecen
// los ejercicios que de verdad usan los planes (mismos vídeos, mismo tipo de plan).
export function buildDemoLibraryEnrichment() {
  const out: Record<string, { videos: { url: string; label?: string; especialidades?: string[] }[]; especialidades: string[]; tags: string[] }> = {}
  Object.values(DEMO_PLAN_MAP).forEach(plan => {
    plan.weeks.forEach(week => week.days.forEach(day => day.exercises.forEach(ex => {
      const e = out[ex.name] || (out[ex.name] = { videos: [], especialidades: [], tags: [] })
      if (plan.type && !e.especialidades.includes(plan.type)) e.especialidades.push(plan.type)
      const urls = [ex.videoUrl, ...(ex.videoUrls || [])].filter(Boolean) as string[]
      urls.forEach(url => { if (!e.videos.some(v => v.url === url)) e.videos.push({ url, label: 'Técnica', especialidades: [plan.type] }) })
      const add = (t: string) => { if (!e.tags.includes(t)) e.tags.push(t) }
      if (ex.isMain) add('básico')
      if (ex.enReadaptacion) add('readaptación')
      if (/salto|sprint|pliom/i.test(ex.name)) add('potencia')
      if (ex.tempo) add('tempo')
      if (ex.requiresVideo) add('pide vídeo')
    })))
  })
  return out
}
