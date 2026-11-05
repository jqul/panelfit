// Preparación de una competición de powerlifting: la fecha, los intentos de cada levantamiento (primero, segundo y
// tercero) y lo que daría el total en puntos DOTS e IPF GL (clásico, sin equipo). Va en el plan del cliente
// (TrainingPlan.competicion): lo escribe el entrenador y el cliente lo ve en Hoy con la cuenta atrás.
// Los intentos se proponen desde la marca de referencia de cada levantamiento (lib/marcaRM): un primero seguro, un
// segundo para asegurar el total y un tercero a por la marca.

export type Levantamiento = 'sentadilla' | 'banca' | 'muerto'
export type Sexo = 'h' | 'm'

export interface Competicion {
  fecha: string
  nombre?: string
  sexo?: Sexo
  pesoCorporal?: number
  /** Qué ejercicio del plan es cada levantamiento (para tomar su marca). */
  ejercicios?: Partial<Record<Levantamiento, string>>
  /** Intentos en kg; 0 o vacío = sin decidir. */
  intentos?: Partial<Record<Levantamiento, [number, number, number]>>
}

export const LEVANTAMIENTOS: { id: Levantamiento; label: string; pista: RegExp }[] = [
  { id: 'sentadilla', label: 'Sentadilla', pista: /sentadilla|squat/i },
  { id: 'banca', label: 'Press banca', pista: /banca|bench/i },
  { id: 'muerto', label: 'Peso muerto', pista: /muerto|deadlift/i },
]

/** % de la marca para cada intento: primero seguro, segundo para asegurar, tercero a por la marca. */
export const PCT_INTENTOS: [number, number, number] = [91, 96, 101]

const disco = (kg: number) => Math.round(kg / 2.5) * 2.5

/** Intentos propuestos a partir de una marca, redondeados a 2,5 kg (lo que se puede cargar en la barra). */
export function intentosSugeridos(marca: number): [number, number, number] {
  if (!(marca > 0)) return [0, 0, 0]
  const [a, b, c] = PCT_INTENTOS.map(p => disco((marca * p) / 100))
  // Que siempre suban, aunque con poco peso el redondeo los iguale
  const b2 = Math.max(b, a + 2.5), c2 = Math.max(c, b2 + 2.5)
  return [a, b2, c2]
}

/** El ejercicio del plan que parece cada levantamiento (por el nombre), para no tener que elegirlo a mano. */
export function ejercicioProbable(lev: Levantamiento, nombres: string[]): string | undefined {
  const pista = LEVANTAMIENTOS.find(l => l.id === lev)!.pista
  // El más corto que encaja: «Sentadilla» antes que «Sentadilla búlgara»
  return nombres.filter(n => pista.test(n)).sort((a, b) => a.length - b.length)[0]
}

/** Total con el mejor intento planificado de cada levantamiento (null si falta alguno). */
export function totalPlanificado(c: Pick<Competicion, 'intentos'>, cual: 0 | 1 | 2 = 2): number | null {
  let t = 0
  for (const l of LEVANTAMIENTOS) {
    const kg = c.intentos?.[l.id]?.[cual]
    if (!kg || !(kg > 0)) return null
    t += kg
  }
  return t
}

/** Puntos DOTS de un total (fórmula de 2019). Peso corporal acotado como en la fórmula: 40-210 kg (h) / 40-150 (m). */
export function puntosDots(total: number, pesoCorporal: number, sexo: Sexo): number | null {
  if (!(total > 0) || !(pesoCorporal > 0)) return null
  const bw = Math.min(Math.max(pesoCorporal, 40), sexo === 'h' ? 210 : 150)
  const [a, b, c, d, e] = sexo === 'h'
    ? [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093]
    : [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706]
  const den = a + b * bw + c * bw ** 2 + d * bw ** 3 + e * bw ** 4
  return Math.round((total * 500) / den * 10) / 10
}

/** Puntos IPF GL (2020), powerlifting clásico (sin equipo). */
export function puntosGL(total: number, pesoCorporal: number, sexo: Sexo): number | null {
  if (!(total > 0) || !(pesoCorporal > 35)) return null
  const [A, B, C] = sexo === 'h' ? [1199.72839, 1025.18162, 0.00921] : [610.32796, 1045.59282, 0.03048]
  return Math.round((total * 100) / (A - B * Math.exp(-C * pesoCorporal)) * 10) / 10
}

/** Días hasta la competición (0 = hoy; negativo = ya pasó). */
export function diasHasta(fecha: string, hoy: Date = new Date()): number {
  const [y, m, d] = fecha.split('-').map(Number)
  const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  return Math.round((new Date(y, m - 1, d).getTime() - h.getTime()) / 86400000)
}

/** Qué toca según lo que falta: la última semana se descarga, las 3 anteriores son el peaking. */
export function faseHasta(dias: number): string | null {
  if (dias < 0) return null
  if (dias <= 7) return 'Semana de descarga: poco volumen y cargas que salgan rápidas'
  if (dias <= 28) return 'Peaking: menos volumen, más intensidad y practicar los intentos'
  return null
}

/** Limpia lo que venga del plan; sin fecha válida, no hay competición. */
export function limpiarCompeticion(raw: unknown): Competicion | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  if (typeof r.fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.fecha)) return undefined
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v * 10) / 10 : 0)
  const intentos: Competicion['intentos'] = {}
  const ejercicios: Competicion['ejercicios'] = {}
  for (const l of LEVANTAMIENTOS) {
    const v = (r.intentos as Record<string, unknown> | undefined)?.[l.id]
    if (Array.isArray(v)) intentos[l.id] = [num(v[0]), num(v[1]), num(v[2])]
    const e = (r.ejercicios as Record<string, unknown> | undefined)?.[l.id]
    if (typeof e === 'string' && e.trim()) ejercicios[l.id] = e.trim().slice(0, 80)
  }
  return {
    fecha: r.fecha,
    ...(typeof r.nombre === 'string' && r.nombre.trim() ? { nombre: r.nombre.trim().slice(0, 80) } : {}),
    ...(r.sexo === 'h' || r.sexo === 'm' ? { sexo: r.sexo } : {}),
    ...(num(r.pesoCorporal) ? { pesoCorporal: num(r.pesoCorporal) } : {}),
    ejercicios, intentos,
  }
}
