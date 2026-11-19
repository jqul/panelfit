// Primera semana guiada: un cliente nuevo no sabe poner el RIR ni qué peso tocar, y sin una buena línea base el resto de métricas
// parece precisa y no lo es. Mientras calibra, el cliente lo ve («Calibrando · Semana 1 de 1»), el RIR se le explica en el momento de
// ponerlo, al acabar cada ejercicio dice si le resultó fácil, correcto o duro, y el entrenador revisa esas cargas y las CONFIRMA antes
// de que la progresión trabaje con ellas. Los datos de esta semana no se interpretan como progreso. Sin React ni red.

import type { TrainingLogs, TrainingPlan } from '../types'
import { objetivoRir } from './strength'

export type Sensacion = 'facil' | 'correcto' | 'duro'
export const SENSACIONES: { id: Sensacion; label: string }[] = [
  { id: 'facil', label: 'Demasiado fácil' },
  { id: 'correcto', label: 'Correcto' },
  { id: 'duro', label: 'Demasiado duro' },
]

/** Pasado este tiempo desde la primera sesión, deja de tratarse como calibración aunque no se haya confirmado. */
export const DIAS_MAX_CALIBRACION = 14
/** Un plan creado hace más que esto y sin entrenos no es un cliente que esté empezando. */
const DIAS_PLAN_NUEVO = 30

/** Días enteros entre dos fechas YYYY-MM-DD (propio: importar atencionCliente metería código del lado del entrenador en el bundle del cliente). */
function diasDesde(desde: string, hasta: string): number | null {
  const d = (Date.parse(hasta + 'T00:00:00Z') - Date.parse(desde + 'T00:00:00Z')) / 86_400_000
  return Number.isFinite(d) ? Math.max(0, Math.round(d)) : null
}

const CLAVE = /^ex_w(\d+)_d(\d+)_r(\d+)$/
export const ETIQUETA_CALIBRACION = 'Calibrando · Semana 1 de 1'

export interface EstadoCalibracion { activa: boolean; sesionesHechas: number; etiqueta: string }

/** ¿Está en calibración? Con plan, sin confirmar por el entrenador y dentro de las 2 semanas de su primera sesión
 *  (o sin haber entrenado aún, si el plan es reciente). */
export function estadoCalibracion(logs: TrainingLogs, plan: TrainingPlan | null | undefined, hoy: string): EstadoCalibracion {
  const no: EstadoCalibracion = { activa: false, sesionesHechas: 0, etiqueta: ETIQUETA_CALIBRACION }
  if (!plan?.weeks?.length || plan.calibracion?.confirmadaEl) return no
  const hechas = Object.entries(logs || {}).filter(([k, l]) => CLAVE.test(k) && l?.done && l.dateDone)
  const dias = [...new Set(hechas.map(([, l]) => l.dateDone as string))].sort()
  if (!dias.length) {
    // Sin entrenos: calibra si el plan es nuevo; uno que empezó hace más de un mes no es de alguien que esté empezando
    const antiguedad = plan.fechaInicio ? diasDesde(plan.fechaInicio, hoy) : null
    return { ...no, activa: antiguedad === null || antiguedad <= DIAS_PLAN_NUEVO }
  }
  const desde = diasDesde(dias[0], hoy)
  return { activa: desde !== null && desde <= DIAS_MAX_CALIBRACION, sesionesHechas: dias.length, etiqueta: ETIQUETA_CALIBRACION }
}

export interface FilaCalibracion {
  ejercicio: string
  sesiones: number
  sensacion: Sensacion | null
  rirMedio: number | null
  objetivo: { min: number; max: number } | null
  /** Qué mirar de esa fila (vacío = sin nada raro). */
  avisos: string[]
}

const num = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')

/** Una fila por ejercicio hecho: cómo le resultó, su RIR medio frente al previsto y lo que conviene mirar antes de confirmar las cargas. */
export function revisionCalibracion(logs: TrainingLogs, plan: TrainingPlan | null | undefined): FilaCalibracion[] {
  type Acum = { nombre: string; fechas: Set<string>; rirs: number[]; sensacion: { fecha: string; v: Sensacion } | null; objetivo: { min: number; max: number } | null }
  const por = new Map<string, Acum>()
  for (const [k, l] of Object.entries(logs || {})) {
    const m = k.match(CLAVE)
    if (!m || !l?.done || !l.dateDone || l.noContar) continue
    const sem = plan?.weeks?.[+m[1]]
    const ex = sem?.days?.[+m[2]]?.exercises?.[+m[3]]
    if (ex?.kind === 'libre') continue
    const nombre = (l.substituteName || ex?.name || '').trim()
    if (!nombre) continue
    const a = por.get(nombre.toLowerCase()) ?? { nombre, fechas: new Set<string>(), rirs: [], sensacion: null, objetivo: null }
    a.fechas.add(l.dateDone)
    for (const s of Object.values(l.sets || {})) if (s && s.tipo !== 'calentamiento' && typeof s.rir === 'number' && Number.isFinite(s.rir)) a.rirs.push(s.rir)
    if (l.sensacion && (!a.sensacion || l.dateDone >= a.sensacion.fecha)) a.sensacion = { fecha: l.dateDone, v: l.sensacion }
    a.objetivo = a.objetivo ?? objetivoRir(ex?.rir, sem?.rpe)
    por.set(nombre.toLowerCase(), a)
  }
  return [...por.values()].map(a => {
    const rirMedio = a.rirs.length ? a.rirs.reduce((x, y) => x + y, 0) / a.rirs.length : null
    const avisos: string[] = []
    if (a.sensacion?.v === 'facil') avisos.push('Le resultó demasiado fácil: puede convenir subir la carga')
    if (a.sensacion?.v === 'duro') avisos.push('Le resultó demasiado duro: puede convenir bajar la carga')
    if (rirMedio !== null && a.objetivo) {
      const previsto = a.objetivo.min === a.objetivo.max ? String(a.objetivo.min) : `${a.objetivo.min}-${a.objetivo.max}`
      if (rirMedio > a.objetivo.max + 1) avisos.push(`RIR medio ${num(rirMedio)} frente a ${previsto} previsto: va sobrado`)
      else if (rirMedio < a.objetivo.min - 1) avisos.push(`RIR medio ${num(rirMedio)} frente a ${previsto} previsto: llega muy justo`)
    }
    return { ejercicio: a.nombre, sesiones: a.fechas.size, sensacion: a.sensacion?.v ?? null, rirMedio, objetivo: a.objetivo, avisos }
  }).sort((x, y) => y.avisos.length - x.avisos.length || x.ejercicio.localeCompare(y.ejercicio, 'es'))
}

/** Cuántas filas llaman la atención antes de confirmar las cargas. */
export function filasConAviso(filas: FilaCalibracion[]): number {
  return filas.filter(f => f.avisos.length > 0).length
}

/** Ejemplos del RIR para explicarlo en el momento de ponerlo, con lenguaje de quien empieza. */
export const AYUDA_RIR: { valor: string; texto: string }[] = [
  { valor: '0', texto: 'No podía hacer ni una más' },
  { valor: '1', texto: 'Podía hacer una más, justa' },
  { valor: '2', texto: 'Podía hacer dos más' },
  { valor: '3', texto: 'Podía hacer tres más, iba cómodo' },
  { valor: '5+', texto: 'Iba muy sobrado' },
]
