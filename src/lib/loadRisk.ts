import { TrainingLogs } from '../types'

export interface TrainingSignal {
  avgRirThis: number | null
  avgRirLast: number | null
  volChangePct: number | null
  sesionesThisWeek: number
  hasData: boolean
}

export interface ReadinessSignal {
  avgSleep: number | null
  avgSoreness: number | null
  avgStress: number | null
  avgMotivation: number | null
  hasData: boolean
}

export type RiskLevel = 'bajo' | 'moderado' | 'alto'

export interface CombinedRisk {
  level: RiskLevel
  reasons: string[]
}

export interface ACWRSignal {
  acute: number      // media diaria agudo/crónico, en la unidad de `source` (incluyendo días de descanso)
  chronic: number
  ratio: number | null
  hasData: boolean
  source?: 'tonelaje' | 'sRPE'
}

function buildDayTonnage(logs: TrainingLogs): Record<string, number> {
  const dayTonnage: Record<string, number> = {}
  Object.values(logs).forEach(log => {
    if (!log.done || !log.dateDone) return
    const vol = Object.values(log.sets || {}).reduce((a, s) => a + ((parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)), 0)
    dayTonnage[log.dateDone] = (dayTonnage[log.dateDone] || 0) + vol
  })
  return dayTonnage
}

// Media móvil con decaimiento exponencial (Williams et al. 2016 / Murray et al.
// 2017) — sustituye la media móvil uniforme de arriba para el ACWR. La uniforme
// tiene el "efecto escalón": un día de carga alta pesa lo mismo el día 1 que el
// día 6, y desaparece de golpe el día 7/29 en vez de perder peso gradualmente.
// λ = 2/(N+1); EWMA_hoy = carga_hoy·λ + EWMA_ayer·(1-λ), acumulado día a día
// desde el primer registro (no es una ventana fija: por diseño, todo el
// historial influye, cada vez menos cuanto más viejo).
// Pasos de día en milisegundos puros (no setDate/getDate, que operan en hora
// LOCAL) — así el recorrido día a día no se desalinea con las claves de
// dayTonnage (generadas vía toISOString) según la zona horaria de quien ejecute
// esto, que ya nos mordió una vez con un desfase de un día entero.
function ewmaFrom(dayTonnage: Record<string, number>, endDate: Date, firstDate: Date, windowDays: number): number {
  const lambda = 2 / (windowDays + 1)
  const totalDays = Math.max(1, Math.floor((endDate.getTime() - firstDate.getTime()) / 86400000) + 1)
  let ewma = 0
  for (let i = 0; i < totalDays; i++) {
    const key = new Date(firstDate.getTime() + i * 86400000).toISOString().slice(0, 10)
    const load = dayTonnage[key] || 0
    ewma = i === 0 ? load : load * lambda + ewma * (1 - lambda)
  }
  return ewma
}

function firstLoggedDate(dayTonnage: Record<string, number>): Date | undefined {
  const dates = Object.keys(dayTonnage).sort()
  return dates.length ? new Date(dates[0] + 'T00:00:00Z') : undefined
}

// Núcleo compartido: ACWR por EWMA a partir de cualquier mapa fecha→carga
// diaria — el tonelaje (abajo) y la carga interna por sRPE (duración×RPE, en
// loadRisk de sesión) son dos formas distintas de llenar ese mapa, pero el
// cálculo agudo:crónico es exactamente el mismo.
function acwrFromDaily(dayLoad: Record<string, number>, today: Date, source: 'tonelaje' | 'sRPE'): ACWRSignal {
  const firstDate = firstLoggedDate(dayLoad)
  if (!firstDate) return { acute: 0, chronic: 0, ratio: null, hasData: false }
  const acute = ewmaFrom(dayLoad, today, firstDate, 7)
  const chronic = ewmaFrom(dayLoad, today, firstDate, 28)
  return {
    acute: Math.round(acute),
    chronic: Math.round(chronic),
    ratio: chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : null,
    hasData: true,
    source,
  }
}

/**
 * Ratio de carga aguda:crónica (ACWR) sobre el tonelaje (peso × reps) diario,
 * con medias EWMA en vez de medias móviles uniformes (Williams et al. 2016;
 * Murray et al. 2017) — el estándar actual sobre el modelo original de
 * Gabbett (2016), que evita el "efecto escalón" al entrar/salir de la ventana.
 * Zonas: <0.8 desentrenamiento, 0.8–1.3 óptima, 1.3–1.5 moderado, >1.5 alto.
 */
export function computeACWR(logs: TrainingLogs, today: Date = new Date()): ACWRSignal {
  return acwrFromDaily(buildDayTonnage(logs), today, 'tonelaje')
}

export interface SessionLoadRow { date: string; duration_min: number; rpe: number }

/**
 * ACWR sobre carga interna (sRPE de Foster: duración en minutos × RPE de la
 * sesión, en unidades arbitrarias) en vez de tonelaje. Necesario para
 * disciplinas que combinan gimnasio con trabajo de campo/pista (sprints,
 * pliometría, técnica) donde el tonelaje es ciego a la mayor parte de la
 * carga real — un atleta puede tener el ACWR de tonelaje perfecto y aun así
 * estar sobrecargado si esas sesiones no entran en el cálculo.
 */
export function computeSessionLoadACWR(rows: SessionLoadRow[], today: Date = new Date()): ACWRSignal {
  const dayLoad: Record<string, number> = {}
  rows.forEach(r => { dayLoad[r.date] = (dayLoad[r.date] || 0) + r.duration_min * r.rpe })
  return acwrFromDaily(dayLoad, today, 'sRPE')
}

/** El ACWR "más preocupante" de dos señales — para no dejar que una lectura
 * tranquila en una tapadera lo que la otra sí está viendo. */
export function worseAcwr(a: ACWRSignal, b: ACWRSignal): ACWRSignal {
  if (!a.hasData) return b
  if (!b.hasData) return a
  const distFrom1 = (r: number | null) => r === null ? -1 : Math.abs(r - 1)
  return distFrom1(b.ratio) > distFrom1(a.ratio) ? b : a
}

export interface LoadTrendPoint { date: string; fitness: number; fatigue: number; form: number }

/** Ventana de la carga crónica en la tendencia Fitness / Fatiga / Forma. */
export const FITNESS_DIAS = 42
/** Semanas con carga registrada antes de dar un estado de forma. */
export const SEMANAS_MIN_FORMA = Math.ceil(FITNESS_DIAS / 7)

/**
 * Serie temporal de Fitness (carga crónica 42d) / Fatiga (carga aguda 7d) /
 * Forma (fitness - fatiga), muestreada semana a semana — el mismo concepto
 * del Performance Management Chart de TrainingPeaks (CTL/ATL/TSB), aplicado
 * aquí al tonelaje de fuerza en vez de al Training Stress Score.
 */
export function computeLoadTrend(logs: TrainingLogs, weeks = 12, today: Date = new Date()): LoadTrendPoint[] {
  return trendFromDaily(buildDayTonnage(logs), weeks, today)
}

/**
 * La misma tendencia sobre la carga de sesión (sRPE: minutos × RPE). Ve también el
 * cardio, la pista y la técnica, que el tonelaje no cuenta.
 */
export function computeSessionLoadTrend(rows: SessionLoadRow[], weeks = 12, today: Date = new Date()): LoadTrendPoint[] {
  const dayLoad: Record<string, number> = {}
  rows.forEach(r => { dayLoad[r.date] = (dayLoad[r.date] || 0) + r.duration_min * r.rpe })
  return trendFromDaily(dayLoad, weeks, today)
}

function trendFromDaily(dayLoad: Record<string, number>, weeks: number, today: Date): LoadTrendPoint[] {
  const firstDate = firstLoggedDate(dayLoad)
  if (!firstDate) return []
  const points: LoadTrendPoint[] = []
  for (let w = weeks - 1; w >= 0; w--) {
    const endDate = new Date(today); endDate.setDate(today.getDate() - w * 7)
    // Antes del primer registro no hay carga. ewmaFrom con una fecha final anterior al primer
    // día devolvía la carga de ese primer día: rellenaba hacia atrás semanas inexistentes con
    // una línea plana y la "rampa" de la semana siguiente salía disparada.
    const antes = endDate.toISOString().slice(0, 10) < firstDate.toISOString().slice(0, 10)
    // Fitness a 42 días (modelo de Banister y el de TrainingPeaks): más estable que 28, que se
    // queda para el ACWR, donde es la ventana de la literatura de riesgo de lesión.
    const fitness = antes ? 0 : ewmaFrom(dayLoad, endDate, firstDate, FITNESS_DIAS)
    const fatigue = antes ? 0 : ewmaFrom(dayLoad, endDate, firstDate, 7)
    points.push({
      date: endDate.toISOString().slice(0, 10),
      fitness: Math.round(fitness),
      fatigue: Math.round(fatigue),
      form: Math.round(fitness - fatigue),
    })
  }
  const firstNonZero = points.findIndex(p => p.fitness > 0 || p.fatigue > 0)
  return firstNonZero === -1 ? [] : points.slice(firstNonZero)
}

export type ClaveForma = 'recargando' | 'fresco' | 'manteniendo' | 'productivo' | 'sobrecarga'

export interface EstadoForma {
  clave: ClaveForma
  etiqueta: string
  /** Para el entrenador. */
  frase: string
  /** Para el cliente: sin números ni jerga. */
  fraseCliente: string
  tono: 'ok' | 'neutro' | 'aviso'
  /** Forma como % de la forma física (negativo = más fatiga que forma de base). */
  formaPct: number
  /** Cuánto ha cambiado la forma física respecto al punto anterior (una semana), en %. */
  rampaPct: number | null
}

/**
 * Traduce el último punto de la tendencia a un estado con frase, como hace TrainingPeaks con su
 * "Form". La carga no tiene unidades fijas (tonelaje o minutos × RPE), así que los cortes van en %
 * de la forma física en vez de en puntos absolutos: así valen igual para un cliente que levanta
 * 2 t a la semana que para uno que levanta 20.
 */
export function estadoForma(trend: LoadTrendPoint[], { minSemanas = SEMANAS_MIN_FORMA } = {}): EstadoForma | null {
  const last = trend[trend.length - 1]
  // Con pocas semanas la media larga aún no se ha asentado y daría alarmas falsas
  // ("fitness +111 %"): mejor no dar estado que darlo mal.
  if (!last || last.fitness <= 0 || trend.length < minSemanas) return null
  const formaPct = Math.round((last.form / last.fitness) * 100)
  const prev = trend[trend.length - 2]
  const rampaPct = prev && prev.fitness > 0 ? Math.round(((last.fitness - prev.fitness) / prev.fitness) * 100) : null
  const base = { formaPct, rampaPct }
  if (formaPct >= 25) return { ...base, clave: 'recargando', etiqueta: 'Recargando', tono: 'neutro',
    frase: 'Muy descansado: buen momento para un test o una competición; si se alarga, se pierde forma física.',
    fraseCliente: 'Estás muy descansado. Aprovecha para darlo todo; si sigues mucho así, perderás algo de forma.' }
  if (formaPct >= 5) return { ...base, clave: 'fresco', etiqueta: 'Fresco', tono: 'ok',
    frase: 'Fresco y con forma física: el mejor momento para rendir.',
    fraseCliente: 'Llegas fresco: buen momento para rendir.' }
  if (formaPct >= -10) return { ...base, clave: 'manteniendo', etiqueta: 'Manteniendo', tono: 'neutro',
    frase: 'Carga estable: mantiene la forma física sin acumular fatiga.',
    fraseCliente: 'Vas estable: mantienes tu forma sin acumular cansancio.' }
  if (formaPct >= -30) return { ...base, clave: 'productivo', etiqueta: 'Productivo', tono: 'ok',
    frase: 'Fatiga propia de un bloque que construye: la forma física sube.',
    fraseCliente: 'Estás construyendo: notarás cansancio, es lo que hace que mejores.' }
  return { ...base, clave: 'sobrecarga', etiqueta: 'Sobrecarga', tono: 'aviso',
    frase: 'La fatiga va muy por encima de la forma física: valora una semana de descarga.',
    fraseCliente: 'Llevas mucha carga acumulada. Descansa bien y cuéntaselo a tu entrenador si te notas muy cansado.' }
}

/** Señal de carga de entrenamiento: RIR semanal, cambio de volumen, sesiones. */
export function computeTrainingSignal(logs: TrainingLogs): TrainingSignal {
  const now = new Date()
  const hace7 = new Date(now); hace7.setDate(now.getDate() - 7)
  const hace14 = new Date(now); hace14.setDate(now.getDate() - 14)

  const rirsThisWeek: number[] = []
  const rirsLastWeek: number[] = []
  let volThisWeek = 0
  let volLastWeek = 0

  Object.values(logs).forEach(log => {
    if (!log.done || !log.dateDone) return
    const d = new Date(log.dateDone + 'T00:00:00')
    const setsArr = Object.values(log.sets || {})
    const vol = setsArr.reduce((a, s) => a + ((parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)), 0)
    const rirs = setsArr.filter(s => s.rir !== undefined).map(s => s.rir as number)

    if (d >= hace7) {
      rirsThisWeek.push(...rirs)
      volThisWeek += vol
    } else if (d >= hace14 && d < hace7) {
      rirsLastWeek.push(...rirs)
      volLastWeek += vol
    }
  })

  const datesThisWeek = new Set(Object.values(logs).filter(l => l.dateDone && new Date(l.dateDone + 'T00:00:00') >= hace7).map(l => l.dateDone))

  return {
    avgRirThis: rirsThisWeek.length ? rirsThisWeek.reduce((a, b) => a + b, 0) / rirsThisWeek.length : null,
    avgRirLast: rirsLastWeek.length ? rirsLastWeek.reduce((a, b) => a + b, 0) / rirsLastWeek.length : null,
    volChangePct: volLastWeek > 0 ? Math.round(((volThisWeek - volLastWeek) / volLastWeek) * 100) : null,
    sesionesThisWeek: datesThisWeek.size,
    hasData: rirsThisWeek.length > 0,
  }
}

/** Señal de bienestar a partir de los check-ins diarios de readiness (escala 1-5). */
export function computeReadinessSignal(rows: { sleep: number; soreness: number; stress: number; motivation: number }[]): ReadinessSignal {
  if (!rows.length) return { avgSleep: null, avgSoreness: null, avgStress: null, avgMotivation: null, hasData: false }
  const avg = (key: 'sleep' | 'soreness' | 'stress' | 'motivation') => Math.round((rows.reduce((a, r) => a + r[key], 0) / rows.length) * 10) / 10
  return { avgSleep: avg('sleep'), avgSoreness: avg('soreness'), avgStress: avg('stress'), avgMotivation: avg('motivation'), hasData: true }
}

/**
 * Combina la señal de ACWR real, una heurística de RIR/volumen/frecuencia
 * y el bienestar autoinformado en un único semáforo de riesgo.
 */
export function combineRisk(training: TrainingSignal, readiness: ReadinessSignal, acwr?: ACWRSignal): CombinedRisk {
  let level: RiskLevel = 'bajo'
  const reasons: string[] = []
  const escalate = (next: RiskLevel) => { if (next === 'alto' || level === 'bajo') level = next }

  if (acwr?.ratio !== null && acwr?.ratio !== undefined) {
    const unidad = acwr.source === 'sRPE' ? ' (carga interna, sRPE — el tonelaje puede no verlo)' : acwr.source === 'tonelaje' ? ' (tonelaje)' : ''
    if (acwr.ratio > 1.5) {
      escalate('alto')
      reasons.push(`Ratio carga aguda:crónica de ${acwr.ratio}${unidad} (>1.5) — riesgo de lesión elevado según el modelo de Gabbett`)
    } else if (acwr.ratio >= 1.3) {
      escalate('moderado')
      reasons.push(`Ratio carga aguda:crónica de ${acwr.ratio}${unidad} (1.3–1.5) — zona de precaución`)
    } else if (acwr.ratio < 0.8 && acwr.chronic > 0) {
      escalate('moderado')
      reasons.push(`Ratio carga aguda:crónica de ${acwr.ratio}${unidad} (<0.8) — desentrenamiento, una vuelta brusca a la carga habitual también eleva el riesgo`)
    }
  }

  if (training.avgRirThis !== null && training.avgRirThis <= 1.5) {
    escalate('alto')
    reasons.push('RIR medio muy bajo esta semana (entrenando casi al fallo constantemente)')
  }
  if (training.avgRirThis !== null && training.avgRirLast !== null && training.avgRirThis < training.avgRirLast - 1) {
    escalate('moderado')
    reasons.push('El RIR ha bajado significativamente respecto a la semana anterior (más fatiga acumulada)')
  }
  if (training.volChangePct !== null && training.volChangePct > 30) {
    escalate('moderado')
    reasons.push(`El volumen ha subido un ${training.volChangePct}% respecto a la semana anterior`)
  }
  if (training.sesionesThisWeek >= 6) {
    escalate('moderado')
    reasons.push('6 o más sesiones esta semana sin días claros de descanso')
  }
  if (readiness.avgSleep !== null && readiness.avgSleep <= 2) {
    escalate('alto')
    reasons.push('Sueño deficiente en los últimos días')
  }
  if (readiness.avgSoreness !== null && readiness.avgSoreness <= 2) {
    escalate('moderado')
    reasons.push('Dolor muscular elevado en los check-ins recientes')
  }
  if (readiness.avgMotivation !== null && readiness.avgMotivation <= 2) {
    escalate('moderado')
    reasons.push('Motivación baja en los check-ins recientes')
  }

  return { level, reasons }
}
