// «Siguiente exposición»: una orientación EXPLICABLE de qué hacer la próxima vez con un ejercicio (subir, mantener, bajar u observar), a
// partir de las últimas exposiciones COMPARABLES del cliente. Nunca modifica el plan ni los pesos, no crea decisiones, no habla de estancamiento
// ni de descarga, y mientras no haya historial suficiente (o venga de la primera semana de calibración) lo dice: «datos insuficientes» u
// «orientación provisional». Todos los umbrales viven en UNA política con versión (POLITICA_PROGRESION): cuando haya sesiones reales se ajusta
// ahí, sin rehacer la función. Sin React ni red.

import type { Exercise, TrainingLogs, TrainingPlan } from '../types'
import { objetivoRir } from './strength'
import type { RirTarget } from './rirTarget'
import { repsObjetivo } from './progresionAuto'
import { finCalibracion } from './calibracion'

export type Material = 'barra' | 'mancuerna' | 'maquina' | 'polea' | 'otro'
export type TipoRecomendacion = 'subir' | 'mantener' | 'bajar' | 'observar' | 'datos-insuficientes'
export type Confianza = 'baja' | 'media' | 'alta'

/** La política: todo lo que decide qué se recomienda, en un solo sitio. PROVISIONAL: sale de teoría, no de datos de clientes reales. */
export interface PoliticaProgresion {
  version: string
  /** Exposiciones comparables mínimas para orientar; por debajo, «datos insuficientes». */
  minExposiciones: number
  /** Exposiciones comparables (sin calibración) para una confianza alta. */
  exposicionesConfianzaAlta: number
  /** Cuántas exposiciones recientes se enseñan y se usan para la confianza. */
  exposicionesVisibles: number
  /** Margen de RIR respecto al previsto que se considera dentro de lo normal. */
  rirMargen: number
  /** SUBIR: todas las series llegan al tope del rango de repeticiones y el RIR medio no queda por debajo del previsto en más que este margen (0 = ni uno por debajo). */
  subir: { rirPorDebajoDelPrevistoMax: number }
  /** BAJAR/revisar: las repeticiones medias quedan por debajo del mínimo del rango en más de esto Y el RIR medio queda por debajo del previsto en más del margen. */
  bajar: { repsPorDebajoDelMinimo: number }
  /** Cuánto subir (kg) según el tipo de material. */
  incrementoKg: Record<Material, number>
}

export const POLITICA_PROGRESION: PoliticaProgresion = {
  version: 'prog-v0-provisional-2026-11',
  minExposiciones: 3,
  exposicionesConfianzaAlta: 5,
  exposicionesVisibles: 3,
  rirMargen: 1,
  subir: { rirPorDebajoDelPrevistoMax: 0 },
  bajar: { repsPorDebajoDelMinimo: 1 },
  incrementoKg: { barra: 2.5, mancuerna: 1, maquina: 2.5, polea: 2.5, otro: 2.5 },
}

export interface Exposicion {
  fecha: string
  /** Carga de trabajo de ese día (la más repetida entre las series de trabajo; a igualdad, la más pesada). */
  kg: number
  /** Repeticiones de las series de trabajo a esa carga. */
  reps: number[]
  /** RIR medio de esas series (null si no se registró). */
  rirMedio: number | null
  /** Venía de la primera semana de calibración (lib/calibracion). */
  deCalibracion: boolean
}

export interface Recomendacion {
  ejercicio: string
  politicaVersion: string
  tipo: TipoRecomendacion
  /** Solo con «subir»: la carga sugerida. */
  kgSugerido: number | null
  /** Una frase. */
  explicacion: string
  confianza: Confianza
  /** «Orientación provisional»: viene de la calibración o la confianza es baja. */
  provisional: boolean
  /** Las últimas exposiciones comparables (la más reciente primero), tal como se usaron. */
  exposiciones: Exposicion[]
  /** Cuántas exposiciones comparables hay en total. */
  totalComparables: number
}

const CLAVE = /^ex_w(\d+)_d(\d+)_r(\d+)$/
const num = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')
const pesoDe = (v: unknown) => parseFloat(String(v ?? '').replace(',', '.')) || 0
const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

/** Material del ejercicio: el de la biblioteca si está; si no, se deduce del nombre. */
export function materialDe(nombre: string, materialBiblioteca?: string | null): Material {
  const t = `${materialBiblioteca ?? ''} ${nombre}`.toLowerCase()
  if (/mancuerna|dumbbell/.test(t)) return 'mancuerna'
  if (/polea|cable|poleas/.test(t)) return 'polea'
  if (/m[áa]quina|prensa|smith|hack|pec deck|multipower/.test(t)) return 'maquina'
  if (/barra|barbell|z\b/.test(t)) return 'barra'
  return 'otro'
}

interface PosicionPlan { ex: Exercise; rpeSemana?: string }

/** Las exposiciones COMPARABLES de un ejercicio, de la más reciente a la más antigua. Solo cuentan los registros hechos del ejercicio tal como está
 *  en el plan (nada sustituido ni sacado de las estadísticas), solo las series normales con peso y repeticiones (ni calentamiento, ni dropset, ni «al
 *  fallo») y, de cada día, solo las series a la carga de trabajo: no se mezclan cargas distintas. */
export function exposicionesComparables(logs: TrainingLogs, plan: TrainingPlan | null | undefined, nombre: string): { exposiciones: Exposicion[]; posicion: PosicionPlan | null } {
  const clave = nombre.trim().toLowerCase()
  const fin = finCalibracion(logs, plan)
  const porFecha = new Map<string, Exposicion>()
  let posicion: (PosicionPlan & { fecha: string }) | null = null
  let porLadoRef: boolean | null = null
  const ordenados = Object.entries(logs || {}).filter(([k, l]) => CLAVE.test(k) && l?.done && l.dateDone && !l.noContar).sort((a, b) => (b[1].dateDone as string).localeCompare(a[1].dateDone as string))
  for (const [k, l] of ordenados) {
    const m = k.match(CLAVE)!
    const sem = plan?.weeks?.[+m[1]]
    const ex = sem?.days?.[+m[2]]?.exercises?.[+m[3]]
    if (!ex || ex.kind === 'libre' || ex.kind === 'run') continue
    if (ex.name.trim().toLowerCase() !== clave) continue
    if (l.substituteName || l.sustitucion) continue // sustituido: no es este ejercicio
    const fecha = l.dateDone as string
    if (porFecha.has(fecha)) continue
    const porLado = !!l.porLado
    if (porLadoRef === null) porLadoRef = porLado
    if (porLado !== porLadoRef) continue // otra forma de apuntar el peso: no se compara
    const series = Object.values(l.sets || {}).filter(s => s && s.tipo === undefined && pesoDe(s.weight) > 0 && (parseInt(String(s.reps)) || 0) > 0)
    if (!series.length) continue
    const cuentas = new Map<number, number>()
    for (const s of series) cuentas.set(pesoDe(s.weight), (cuentas.get(pesoDe(s.weight)) ?? 0) + 1)
    const kg = [...cuentas.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0]
    const aEsaCarga = series.filter(s => pesoDe(s.weight) === kg)
    const rirs = aEsaCarga.map(s => s.rir).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    porFecha.set(fecha, { fecha, kg, reps: aEsaCarga.map(s => parseInt(String(s.reps)) || 0), rirMedio: rirs.length ? media(rirs) : null, deCalibracion: !!fin && fecha <= fin })
    if (!posicion || fecha > posicion.fecha) posicion = { ex, rpeSemana: sem?.rpe, fecha }
  }
  return { exposiciones: [...porFecha.values()].sort((a, b) => b.fecha.localeCompare(a.fecha)), posicion }
}

/** La orientación para la próxima exposición. `material` es el de la biblioteca (opcional): decide cuánto subir. */
export function recomendarSiguiente(logs: TrainingLogs, plan: TrainingPlan | null | undefined, nombre: string, opts: { material?: string | null; politica?: PoliticaProgresion } = {}): Recomendacion {
  const p = opts.politica ?? POLITICA_PROGRESION
  const { exposiciones: todas, posicion } = exposicionesComparables(logs, plan, nombre)
  const visibles = todas.slice(0, p.exposicionesVisibles)
  const base = { ejercicio: nombre, politicaVersion: p.version, exposiciones: visibles, totalComparables: todas.length }

  if (todas.length < p.minExposiciones) {
    return { ...base, tipo: 'datos-insuficientes', kgSugerido: null, confianza: 'baja', provisional: true,
      explicacion: `Datos insuficientes: hacen falta ${p.minExposiciones} exposiciones comparables y hay ${todas.length}.` }
  }
  const sinCalibracion = visibles.every(e => !e.deCalibracion)
  const confianza: Confianza = !sinCalibracion ? 'baja'
    : todas.length >= p.exposicionesConfianzaAlta && visibles.every(e => e.rirMedio !== null) ? 'alta' : 'media'
  const provisional = !sinCalibracion || confianza === 'baja'
  const con = (tipo: TipoRecomendacion, explicacion: string, kgSugerido: number | null = null): Recomendacion => ({ ...base, tipo, explicacion, kgSugerido, confianza, provisional })

  const ultima = visibles[0]
  const rango = repsObjetivo(posicion?.ex.sets)
  const objetivo: RirTarget | null = posicion ? objetivoRir(posicion.ex.rir, posicion.rpeSemana) : null
  if (!rango) return con('observar', 'El ejercicio no tiene un rango de repeticiones claro en el plan (por ejemplo 3x8-12): no se puede orientar.')
  if (!objetivo) return con('observar', 'El ejercicio no tiene un RIR previsto ni un RPE en su semana: no se puede orientar el esfuerzo.')
  if (ultima.rirMedio === null) return con('observar', 'La última vez no se registró el RIR: sin él no se puede orientar el esfuerzo.')

  const repsMin = Math.min(...ultima.reps)
  const repsMedias = media(ultima.reps)
  const previsto = objetivo.min === objetivo.max ? String(objetivo.min) : `${objetivo.min}-${objetivo.max}`
  const rirTexto = `RIR medio ${num(ultima.rirMedio)} (previsto ${previsto})`

  // Revisar a la baja: no llega al rango Y va más justo de lo previsto
  if (repsMedias < rango.min - p.bajar.repsPorDebajoDelMinimo && ultima.rirMedio < objetivo.min - p.rirMargen) {
    return con('bajar', `La última vez, ${num(ultima.kg)} kg: ${ultima.reps.join('/')} repeticiones (el rango es ${rango.min}-${rango.max}) y ${rirTexto}. Conviene revisar la carga.`)
  }
  // Subir: todas las series en el tope del rango y sin ir más justo de lo previsto
  if (repsMin >= rango.max && ultima.rirMedio >= objetivo.min - p.subir.rirPorDebajoDelPrevistoMax) {
    const incremento = p.incrementoKg[materialDe(nombre, opts.material)]
    return con('subir', `La última vez, ${num(ultima.kg)} kg: todas las series en ${rango.max} repeticiones y ${rirTexto}. Puede subir ${num(incremento)} kg.`, Math.round((ultima.kg + incremento) * 100) / 100)
  }
  return con('mantener', `La última vez, ${num(ultima.kg)} kg: ${ultima.reps.join('/')} repeticiones (el rango es ${rango.min}-${rango.max}) y ${rirTexto}. Mantén la carga y busca más repeticiones.`)
}

export const ETIQUETA_RECOMENDACION: Record<TipoRecomendacion, string> = {
  subir: 'Subir', mantener: 'Mantener', bajar: 'Revisar a la baja', observar: 'Observar', 'datos-insuficientes': 'Datos insuficientes',
}
