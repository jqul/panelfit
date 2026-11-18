// De los registros y el plan a los datos que pide la lista de comprobación de estancamiento (lib/checklistEstancamiento): para UN
// ejercicio, el esfuerzo real frente al previsto, los vídeos de ejecución, cuánto trabajo recibe por semana y qué parte de lo
// previsto cumple. Puro: recibe logs y plan, no toca red.

import type { TrainingLogs, TrainingPlan } from '../types'
import { objetivoRir } from './strength'
import { lunesDeISO, sumarDiasISO } from './exposicionCargas'

const CLAVE = /^ex_w(\d+)_d(\d+)_r(\d+)$/
const SEMANAS = 4
const SESIONES_ESFUERZO = 3

export interface DatosEjercicio {
  sesionesConVideo: number
  esfuerzo: { rirMedio: number | null; objetivo: { min: number; max: number } | null }
  carga: { seriesPorSemana: number | null; sesionesPorSemana: number | null }
}

interface RegistroDeEjercicio { fecha: string; sets: { weight?: string; reps?: string; rir?: number; tipo?: string }[]; video: boolean; objetivo: { min: number; max: number } | null }

const nombreDe = (n?: string) => (n || '').trim().toLowerCase()

function registrosDe(logs: TrainingLogs, plan: TrainingPlan | null | undefined, nombre: string): RegistroDeEjercicio[] {
  const clave = nombreDe(nombre)
  const out: RegistroDeEjercicio[] = []
  for (const [k, l] of Object.entries(logs || {})) {
    const m = k.match(CLAVE)
    if (!m || !l?.done || !l.dateDone || l.noContar) continue
    const sem = plan?.weeks?.[+m[1]]
    const ex = sem?.days?.[+m[2]]?.exercises?.[+m[3]]
    if (ex?.kind === 'libre') continue
    if (nombreDe(l.substituteName || ex?.name) !== clave) continue
    out.push({
      fecha: l.dateDone,
      // El calentamiento no cuenta como serie de trabajo
      sets: Object.values(l.sets || {}).filter(s => s && s.tipo !== 'calentamiento'),
      video: !!l.videoEjecucion,
      objetivo: objetivoRir(ex?.rir, sem?.rpe),
    })
  }
  return out.sort((a, b) => b.fecha.localeCompare(a.fecha))
}

/** Datos del ejercicio `nombre` hasta `hoy` ('YYYY-MM-DD'). */
export function datosDelEjercicio(logs: TrainingLogs, plan: TrainingPlan | null | undefined, nombre: string, hoy: string): DatosEjercicio {
  const regs = registrosDe(logs, plan, nombre)

  // Esfuerzo: RIR medio de las series con RIR de las últimas sesiones, y el previsto de la más reciente que lo tiene
  const ultimas = regs.slice(0, SESIONES_ESFUERZO)
  const rirs = ultimas.flatMap(r => r.sets.map(s => s.rir).filter((v): v is number => typeof v === 'number' && Number.isFinite(v)))
  const rirMedio = rirs.length ? rirs.reduce((a, b) => a + b, 0) / rirs.length : null
  const objetivo = ultimas.find(r => r.objetivo)?.objetivo ?? null

  // Carga: media de las últimas 4 semanas (lunes a domingo, la actual incluida)
  const desde = sumarDiasISO(lunesDeISO(hoy), -7 * (SEMANAS - 1))
  const recientes = regs.filter(r => r.fecha >= desde && r.fecha <= hoy)
  const series = recientes.reduce((a, r) => a + r.sets.length, 0)
  const dias = new Set(recientes.map(r => r.fecha)).size
  const carga = recientes.length
    ? { seriesPorSemana: series / SEMANAS, sesionesPorSemana: dias / SEMANAS }
    : { seriesPorSemana: null, sesionesPorSemana: null }

  return { sesionesConVideo: ultimas.filter(r => r.video).length, esfuerzo: { rirMedio, objetivo }, carga }
}

/** Qué parte de lo previsto cumple: días distintos entrenados en las últimas 4 semanas entre los que marca la semana actual del plan
 *  por 4. null sin plan o sin días previstos. Es una referencia, no un porcentaje exacto (el plan puede haber cambiado en el bloque). */
export function adherenciaReciente(logs: TrainingLogs, plan: TrainingPlan | null | undefined, semanaActual: number, hoy: string): number | null {
  const previstos = (plan?.weeks?.[semanaActual]?.days || []).filter(d => d.exercises?.length).length
  if (!previstos) return null
  const desde = sumarDiasISO(hoy, -(SEMANAS * 7 - 1))
  const dias = new Set<string>()
  for (const [k, l] of Object.entries(logs || {})) {
    if (CLAVE.test(k) && l?.done && l.dateDone && l.dateDone >= desde && l.dateDone <= hoy) dias.add(l.dateDone)
  }
  return Math.min(100, (dias.size / (previstos * SEMANAS)) * 100)
}

export interface CargaFija { peso: number; sesiones: number; desde: string; rirInicial: number; rirActual: number }

const num = (v?: string) => parseFloat(String(v ?? '').replace(',', '.')) || 0
const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

/** El mismo peso en varias sesiones, ¿cuánto margen le queda? Si a 100 kg el RIR pasa de 1 a 3, le cuesta menos aunque el 1RM
 *  estimado no suba (el 1RM no ve esto). Solo se comparan sesiones con las mismas repeticiones (±1) a ese peso y con RIR
 *  registrado; hacen falta 3. Devuelve null si no hay un peso que cumpla. */
export function rirACargaFija(logs: TrainingLogs, plan: TrainingPlan | null | undefined, nombre: string): CargaFija | null {
  const porPeso = new Map<number, { fecha: string; rir: number; reps: number }[]>()
  for (const r of registrosDe(logs, plan, nombre).slice(0, 8)) {
    const series = r.sets.filter(s => typeof s.rir === 'number' && Number.isFinite(s.rir) && num(s.weight) > 0 && num(s.reps) > 0)
    const pesos = new Set(series.map(s => Math.round(num(s.weight) * 10) / 10))
    for (const p of pesos) {
      const delPeso = series.filter(s => Math.round(num(s.weight) * 10) / 10 === p)
      const lista = porPeso.get(p) ?? []
      lista.push({ fecha: r.fecha, rir: media(delPeso.map(s => s.rir as number)), reps: media(delPeso.map(s => num(s.reps))) })
      porPeso.set(p, lista)
    }
  }
  let mejor: CargaFija | null = null
  for (const [peso, ses] of porPeso) {
    const cron = [...ses].sort((a, b) => a.fecha.localeCompare(b.fecha))
    const repsActual = cron[cron.length - 1].reps
    const comparables = cron.filter(s => Math.abs(s.reps - repsActual) <= 1)
    if (comparables.length < 3) continue
    const c: CargaFija = { peso, sesiones: comparables.length, desde: comparables[0].fecha, rirInicial: comparables[0].rir, rirActual: comparables[comparables.length - 1].rir }
    // El que más sesiones reúne; a igualdad, el más pesado
    if (!mejor || c.sesiones > mejor.sesiones || (c.sesiones === mejor.sesiones && c.peso > mejor.peso)) mejor = c
  }
  return mejor
}
