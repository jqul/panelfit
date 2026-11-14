import type { Exercise, TrainingLogs, TrainingPlan } from '../types'
import { historialPorEjercicio, type SesionEjercicio } from './historialEjercicio'
import { estimate1RM } from './strength'
import { convertirPeso, porLadoDe } from './pesoMancuerna'

// Progresión automática: el peso y las reps de la próxima sesión de cada ejercicio, sacados de lo que hizo la última
// vez. Dos reglas:
//  - lineal (reps fijas, "4x5"): si todas las series llegaron, sube un paso de peso.
//  - doble (rango, "3x8-12"): primero sube reps (la serie más floja + 1) y, cuando todas llegan arriba, sube peso y
//    vuelve abajo del rango.
// En las dos: si la última vez costó más de lo previsto (RIR por debajo del objetivo), mantiene; si ni la mejor serie
// llegó a las reps, baja a un peso que pueda mover para esas reps (de su 1RM estimado).
// El entrenador tiene la última palabra: elige la regla y el paso, y si es solo una guía para él, una sugerencia que ve
// el cliente o algo que se aplica solo. Se guarda en el plan (que es de cada cliente), por defecto y por ejercicio.

export type TipoProgresion = 'no' | 'auto' | 'lineal' | 'doble'
export type ModoProgresion = 'guia' | 'sugerencia' | 'auto'
export interface ReglaProgresion { tipo: TipoProgresion; paso?: number; modo?: ModoProgresion }
export interface ProgresionPlan { defecto?: ReglaProgresion; ejercicios?: Record<string, ReglaProgresion> }

export const TIPOS_PROGRESION: { id: TipoProgresion; label: string; detalle: string }[] = [
  { id: 'no', label: 'Sin progresión', detalle: 'El peso lo decides tú' },
  { id: 'auto', label: 'Según las series', detalle: 'Doble con rango de reps (3x8-12); lineal con reps fijas (4x5)' },
  { id: 'lineal', label: 'Lineal', detalle: 'Si completa todas las series, sube un paso de peso' },
  { id: 'doble', label: 'Doble progresión', detalle: 'Primero sube reps hasta arriba del rango; luego peso' },
]
export const MODOS_PROGRESION: { id: ModoProgresion; label: string; detalle: string }[] = [
  { id: 'guia', label: 'Solo para ti', detalle: 'Lo ves en el plan como guía; el cliente no' },
  { id: 'sugerencia', label: 'Sugerencia', detalle: 'El cliente ve el objetivo y decide si lo usa' },
  { id: 'auto', label: 'Automático', detalle: 'El objetivo ya sale puesto en su entreno' },
]
export const PASOS = [0.5, 1, 1.25, 2, 2.5, 5]

export interface Objetivo {
  kg: number
  reps: number
  cambio: 'sube' | 'reps' | 'mantiene' | 'baja'
  deltaKg: number        // respecto al peso de la última vez
  motivo: string
  ultima: { kg: number; reps: number[]; fecha: string }
}

const clave = (nombre: string) => nombre.trim().toLowerCase()
const fmt = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 2 })

/** La regla que manda para un ejercicio: la suya, si tiene; si no, la del plan; si no, ninguna. */
export function reglaDe(plan: Pick<TrainingPlan, 'progresion'> | null | undefined, nombre: string): Required<ReglaProgresion> | null {
  const p = plan?.progresion
  const r = p?.ejercicios?.[clave(nombre)] ?? p?.defecto
  if (!r || r.tipo === 'no') return null
  return { tipo: r.tipo, paso: r.paso && r.paso > 0 ? r.paso : 0, modo: r.modo ?? 'sugerencia' }
}

/** Series y reps objetivo del ejercicio: "4x5" → 5..5, "3x8-12" → 8..12. */
export function repsObjetivo(sets: string | undefined): { min: number; max: number } | null {
  const m = sets?.match(/\d+\s*[×x]\s*(\d+)(?:\s*[-–]\s*(\d+))?/)
  if (!m) return null
  const min = parseInt(m[1]), max = m[2] ? parseInt(m[2]) : min
  return min > 0 && max >= min ? { min, max } : null
}

/** ¿Se le puede aplicar? Solo a series con kilos que pone el cliente: no a %, top set, test de RM, carrera ni libre. */
export function admiteProgresion(ex: Exercise): boolean {
  if (ex.kind === 'run' || ex.kind === 'libre' || ex.backoff || ex.testRM) return false
  if (/%/.test(ex.weight || '')) return false
  return !!repsObjetivo(ex.sets)
}

const redondearAbajo = (kg: number, paso: number) => Math.floor(kg / paso + 1e-9) * paso

/**
 * El objetivo de la próxima sesión a partir de la última. `rirObjetivo` es el RIR que pide el plan (si lo pide) y
 * `rirUltimo` el que marcó el cliente en su serie más dura la última vez.
 */
export function calcularObjetivo(ex: Exercise, regla: Required<ReglaProgresion>, ultima: SesionEjercicio | null,
  rirObjetivo?: number | null, rirUltimo?: number | null): Objetivo | null {
  if (!ultima || !admiteProgresion(ex)) return null
  const rango = repsObjetivo(ex.sets)!
  const kg = Math.max(0, ...ultima.series.map(s => s.weight))
  if (!kg) return null
  // Series de trabajo: las del peso más alto (las de calentamiento, más ligeras, no cuentan)
  const reps = ultima.series.filter(s => s.weight === kg).map(s => s.reps)
  const paso = regla.paso || (kg >= 40 ? 2.5 : 1)
  const tipo = regla.tipo === 'auto' ? (rango.max > rango.min ? 'doble' : 'lineal') : regla.tipo
  const base = { ultima: { kg, reps, fecha: ultima.date } }
  const peor = Math.min(...reps), mejor = Math.max(...reps)
  const costoMas = rirObjetivo != null && rirUltimo != null && rirUltimo < rirObjetivo
  const arriba = tipo === 'doble' ? rango.max : rango.min

  // Ni la mejor serie llegó al mínimo: baja a un peso que pueda mover para esas reps
  if (mejor < rango.min) {
    const kgNuevo = Math.max(paso, redondearAbajo(estimate1RM(kg, mejor) / (1 + rango.min / 30), paso))
    if (kgNuevo < kg) return { ...base, kg: kgNuevo, reps: rango.min, cambio: 'baja', deltaKg: kgNuevo - kg, motivo: `No llegó a ${rango.min} reps (mejor serie: ${mejor}): baja a un peso que pueda mover` }
    return { ...base, kg, reps: rango.min, cambio: 'mantiene', deltaKg: 0, motivo: `No llegó a ${rango.min} reps: repite el peso` }
  }
  // Todas llegaron arriba: sube peso (salvo que le costara más de lo previsto)
  if (peor >= arriba) {
    if (costoMas) return { ...base, kg, reps: arriba, cambio: 'mantiene', deltaKg: 0, motivo: `Completó todo, pero le costó más de lo previsto (RIR ${rirUltimo}): repite el peso` }
    return { ...base, kg: kg + paso, reps: rango.min, cambio: 'sube', deltaKg: paso, motivo: `Completó ${reps.length}×${arriba}: sube ${fmt(paso)} kg` }
  }
  // Doble progresión a medio camino: mismo peso, una rep más que su serie más floja
  if (tipo === 'doble') {
    if (costoMas) return { ...base, kg, reps: Math.max(rango.min, peor), cambio: 'mantiene', deltaKg: 0, motivo: `Le costó más de lo previsto (RIR ${rirUltimo}): mismas reps` }
    const objetivo = Math.min(rango.max, Math.max(rango.min, peor + 1))
    return { ...base, kg, reps: objetivo, cambio: 'reps', deltaKg: 0, motivo: `Su serie más floja fue de ${peor}: a por ${objetivo} reps con el mismo peso` }
  }
  return { ...base, kg, reps: rango.min, cambio: 'mantiene', deltaKg: 0, motivo: `No completó todas las series de ${rango.min}: repite el peso` }
}

/** La última sesión de ese ejercicio antes de `hoy` (lo de hoy no mueve el objetivo mientras entrena). */
// El historial se calcula una vez por cada objeto de registros (y plan): en el entreno se pide en cada pintado
const cache = new WeakMap<object, { plan: unknown; porNombre: Map<string, { sesiones: SesionEjercicio[]; porLado: boolean }> }>()
function historialDe(logs: TrainingLogs, plan: TrainingPlan | null | undefined) {
  const c = cache.get(logs)
  if (c && c.plan === plan) return c.porNombre
  const porNombre = new Map(historialPorEjercicio(logs, plan).map(h => [clave(h.name), { sesiones: h.sesiones, porLado: h.porLado }]))
  cache.set(logs, { plan, porNombre })
  return porNombre
}

/** La última sesión antes de `hoy`; con `porLado`, sus pesos en esa forma (por mancuerna o total: lib/pesoMancuerna). */
export function ultimaSesion(logs: TrainingLogs, plan: TrainingPlan | null | undefined, nombre: string, hoy: string, porLado?: boolean): SesionEjercicio | null {
  const h = historialDe(logs || {}, plan).get(clave(nombre))
  const s = h?.sesiones.find(x => x.date < hoy) ?? null
  if (!s || porLado === undefined || porLado === h!.porLado) return s
  const c = (kg: number) => convertirPeso(kg, h!.porLado, porLado)
  return { ...s, series: s.series.map(x => ({ ...x, weight: c(x.weight) })), mejor: s.mejor && { ...s.mejor, weight: c(s.mejor.weight) }, e1rm: c(s.e1rm) }
}

/** RIR más bajo que marcó en ese ejercicio en la sesión de `fecha` (la serie más dura). */
export function rirMasBajo(logs: TrainingLogs, plan: TrainingPlan | null | undefined, nombre: string, fecha: string): number | null {
  let min: number | null = null
  for (const [key, log] of Object.entries(logs || {})) {
    if (log?.dateDone !== fecha) continue
    const m = key.match(/^ex_w(\d+)_d(\d+)_r(\d+)$/)
    const n = (log.substituteName || (m ? plan?.weeks?.[+m[1]]?.days?.[+m[2]]?.exercises?.[+m[3]]?.name : '') || '').trim().toLowerCase()
    if (n !== clave(nombre)) continue
    for (const s of Object.values(log.sets || {})) {
      const r = (s as { rir?: number })?.rir
      if (typeof r === 'number') min = min === null ? r : Math.min(min, r)
    }
  }
  return min
}

/** RIR objetivo del ejercicio ("2-3" → 2, "1" → 1). */
export function rirPedido(ex: Exercise): number | null {
  const m = ex.rir?.match(/\d+/)
  return m ? parseInt(m[0]) : null
}

/** Todo junto: el objetivo de un ejercicio del plan para hoy, o null si no tiene progresión o no hay con qué. */
export function objetivoDe(plan: TrainingPlan | null | undefined, logs: TrainingLogs, ex: Exercise, hoy: string): (Objetivo & { modo: ModoProgresion }) | null {
  const regla = reglaDe(plan, ex.name)
  if (!regla) return null
  const ultima = ultimaSesion(logs, plan, ex.name, hoy, porLadoDe(ex, plan))
  const obj = calcularObjetivo(ex, regla, ultima, rirPedido(ex), ultima ? rirMasBajo(logs, plan, ex.name, ultima.date) : null)
  return obj ? { ...obj, modo: regla.modo } : null
}

/** Pone (o quita, con null) la regla de un ejercicio o la del plan, sin tocar lo demás. */
export function conRegla(plan: Pick<TrainingPlan, 'progresion'>, nombre: string | null, regla: ReglaProgresion | null): ProgresionPlan {
  const p: ProgresionPlan = { ...(plan.progresion || {}) }
  if (nombre === null) {
    if (regla) p.defecto = regla; else delete p.defecto
    return p
  }
  const ej = { ...(p.ejercicios || {}) }
  if (regla) ej[clave(nombre)] = regla; else delete ej[clave(nombre)]
  p.ejercicios = ej
  return p
}

/** Texto corto del objetivo: "85 kg × 5 (+2,5)". */
export function textoObjetivo(o: Objetivo): string {
  const d = o.deltaKg > 0 ? ` (+${fmt(o.deltaKg)})` : o.deltaKg < 0 ? ` (${fmt(o.deltaKg)})` : o.cambio === 'reps' ? ' (+1 rep)' : ''
  return `${fmt(o.kg)} kg × ${o.reps}${d}`
}
