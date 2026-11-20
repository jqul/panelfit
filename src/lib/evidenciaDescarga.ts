// «¿Puede tocar descarga?»: una LECTURA DE EVIDENCIA de un cliente, no un recomendador. Junta lo que hay —semanas seguidas de carga, evolución de
// rendimiento y RIR en ejercicios comparables, adherencia, check-ins, molestias, ausencias y decisiones previas— y lo separa en tres cajas:
// «datos insuficientes», «señales a observar» y «evidencia disponible», más qué falta para tener más confianza. NO dice «toca descarga» ni
// «sobreentrenado», no crea ni sugiere ningún plan y no confunde poca adherencia, una ausencia o la calibración con cansancio: en un contexto
// atípico, las señales de rendimiento, RIR y carga no se interpretan. Todos los umbrales viven en UNA política con versión (POLITICA_DESCARGA,
// provisional: de teoría, no de datos reales); la beta con clientes reales servirá para ajustarlos y afinar el lenguaje. Sin React ni red.

import type { TrainingLogs, TrainingPlan } from '../types'
import { estimate1RM } from './strength'
import { algunaBaja } from './checkinConfig'
import { lunesDe } from './recordsSemana'
import { weekIdxFromStart } from './planWeek'
import { exposicionesComparables } from './recomendacionProgresion'
import { estadoCalibracion } from './calibracion'
import { esDecisionDeCarga, type Decision } from './diarioDecisiones'

export type Confianza = 'baja' | 'media' | 'alta'

/** La política: todo lo que decide qué se enseña y dónde, en un solo sitio. PROVISIONAL. */
export interface PoliticaDescarga {
  version: string
  /** Semanas completas que se miran hacia atrás. */
  semanasVentana: number
  /** Semanas completas con entrenos para poder hablar de evolución. */
  semanasHistorialMin: number
  /** Semanas seguidas de carga (sin una de descarga marcada) desde las que se señala. */
  semanasCargaConsecutivas: number
  /** Adherencia (% de lo previsto) por debajo de la cual se considera baja, y sobre cuántas semanas completas se promedia. */
  adherenciaBajaPct: number
  semanasAdherencia: number
  /** El 1RM estimado de las 2 últimas exposiciones por debajo del de las anteriores en al menos este %. */
  rendimientoCaidaPct: number
  /** RIR medio de las 2 últimas exposiciones por debajo del de las anteriores en al menos estos puntos (va más justo). */
  rirDerivaPuntos: number
  /** En cuántos ejercicios comparables debe darse un cambio para señalarlo (uno solo es ruido). */
  ejerciciosParaSenal: number
  /** Ejercicios con 3 exposiciones comparables necesarios para valorar rendimiento. */
  ejerciciosComparablesMin: number
  /** Check-ins mínimos en la ventana, días de la ventana y proporción de «bajos» que se señala. */
  checkinsMin: number
  diasCheckins: number
  checkinsBajosProporcion: number
  /** Molestia articular (0-10) desde la que se señala, y días de ventana. */
  molestiaMin: number
  diasMolestias: number
  /** Una ausencia de al menos tantos días en la semana hace que esa semana sea atípica. */
  diasAusenciaAtipica: number
  /** Semanas con entrenos para una confianza alta. */
  semanasConfianzaAlta: number
}

export const POLITICA_DESCARGA: PoliticaDescarga = {
  version: 'desc-v0-provisional-2026-11',
  semanasVentana: 6,
  semanasHistorialMin: 3,
  semanasCargaConsecutivas: 3,
  adherenciaBajaPct: 70,
  semanasAdherencia: 2,
  rendimientoCaidaPct: 3,
  rirDerivaPuntos: 1,
  ejerciciosParaSenal: 2,
  ejerciciosComparablesMin: 2,
  checkinsMin: 3,
  diasCheckins: 14,
  checkinsBajosProporcion: 0.5,
  molestiaMin: 4,
  diasMolestias: 14,
  diasAusenciaAtipica: 3,
  semanasConfianzaAlta: 6,
}

export interface EntradaDescarga {
  hoy: string
  plan: TrainingPlan | null | undefined
  logs: TrainingLogs
  checkins: { date: string; sleep: number | null; soreness: number | null; motivation: number | null }[]
  dolor: { date: string; zona: string; intensidad: number; tipo?: string }[]
  ausencias: { desde: string; hasta: string }[]
  decisiones: Decision[]
}

export interface SemanaEvidencia {
  lunes: string
  sesiones: number
  previstas: number
  /** La semana en curso: no cuenta para la carga consecutiva ni la adherencia. */
  enCurso: boolean
  /** El plan la marca como semana de descarga. */
  descarga: boolean
  /** Días de ausencia en esa semana. */
  diasAusencia: number
}

export interface ItemEvidencia { id: string; texto: string }
export interface EvidenciaDescarga {
  politicaVersion: string
  confianza: Confianza
  /** Una frase de cabecera: nunca un veredicto. */
  resumen: string
  semanas: SemanaEvidencia[]
  datosInsuficientes: ItemEvidencia[]
  senales: ItemEvidencia[]
  evidencia: ItemEvidencia[]
  /** Contexto que hace que algunas señales no se interpreten (ausencia, adherencia baja, calibración). */
  contextoAtipico: string[]
  /** Qué faltaría para tener más confianza. */
  falta: string[]
  decisionesPrevias: { id: string; fecha: string; tipo: string; texto: string; revisada: boolean }[]
}

const CLAVE = /^ex_w\d+_d\d+_r\d+$/
const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios)

export function sumarDias(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}
const antesDe = (hoy: string, dias: number) => sumarDias(hoy, -dias)

/** Días que comparten dos intervalos de fechas, ambos inclusive. */
export function diasSolapados(desdeA: string, hastaA: string, desdeB: string, hastaB: string): number {
  const a = desdeA > desdeB ? desdeA : desdeB, b = hastaA < hastaB ? hastaA : hastaB
  return a > b ? 0 : Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86_400_000) + 1
}

/** Días de [desde, hasta] (inclusive) que caen en la semana que empieza el `lunes`. */
function diasEnSemana(lunes: string, desde: string, hasta: string): number {
  return diasSolapados(lunes, sumarDias(lunes, 6), desde, hasta)
}

/** Sesiones previstas por semana en el plan, según la semana que le toca en `fecha`. */
export function previstasPorSemana(plan: TrainingPlan | null | undefined, fecha: string): number {
  const w = plan?.weeks?.length ? plan.weeks[weekIdxFromStart(plan.fechaInicio || fecha, plan.weeks.length, new Date(fecha + 'T12:00:00'))] : undefined
  return (w?.days || []).filter(d => d.exercises?.length).length
}

export function evidenciaDescarga(e: EntradaDescarga, p: PoliticaDescarga = POLITICA_DESCARGA): EvidenciaDescarga {
  const lunesHoy = lunesDe(e.hoy)
  const fechasHechas = new Map<string, true>()
  for (const [k, l] of Object.entries(e.logs || {})) if (CLAVE.test(k) && l?.done && l.dateDone && !l.noContar) fechasHechas.set(l.dateDone, true)
  const previstasPlan = previstasPorSemana(e.plan, e.hoy)

  // ── Semanas: la última es la en curso; las demás, completas (de más antigua a más reciente) ──
  const semanas: SemanaEvidencia[] = []
  for (let i = p.semanasVentana; i >= 0; i--) {
    const lunes = sumarDias(lunesHoy, -7 * i)
    const fin = sumarDias(lunes, 6)
    const sesiones = [...fechasHechas.keys()].filter(f => f >= lunes && f <= fin && f <= e.hoy).length
    const idx = e.plan?.weeks?.length ? weekIdxFromStart(e.plan.fechaInicio || lunes, e.plan.weeks.length, new Date(lunes + 'T12:00:00')) : -1
    semanas.push({
      lunes, sesiones, previstas: previstasPlan, enCurso: i === 0,
      descarga: !!(e.plan?.fechaInicio && idx >= 0 && e.plan.weeks[idx]?.isDeload),
      diasAusencia: e.ausencias.reduce((a, x) => a + diasEnSemana(lunes, x.desde, x.hasta), 0),
    })
  }
  const completas = semanas.filter(s => !s.enCurso)
  const primera = completas.findIndex(s => s.sesiones > 0)
  const conHistorial = primera === -1 ? [] : completas.slice(primera)
  const semanasConEntrenos = conHistorial.filter(s => s.sesiones > 0).length

  // Semanas seguidas de carga, hacia atrás desde la última completa: con entrenos y sin descarga marcada
  let cargaConsecutiva = 0
  for (let i = completas.length - 1; i >= 0; i--) { if (completas[i].sesiones > 0 && !completas[i].descarga) cargaConsecutiva++; else break }

  // Adherencia de las últimas semanas completas (las atípicas por ausencia no cuentan contra el cliente)
  const paraAdherencia = completas.slice(-p.semanasAdherencia).filter(s => s.previstas > 0 && s.diasAusencia < p.diasAusenciaAtipica && !s.descarga)
  const adherenciaPct = paraAdherencia.length ? Math.round(media(paraAdherencia.map(s => Math.min(100, (s.sesiones / s.previstas) * 100)))) : null
  const adherenciaBaja = adherenciaPct !== null && adherenciaPct < p.adherenciaBajaPct

  // ── Contexto atípico: no se interpreta como cansancio ──
  const contextoAtipico: string[] = []
  const ausenteReciente = semanas.slice(-3).reduce((a, s) => a + s.diasAusencia, 0)
  if (ausenteReciente >= p.diasAusenciaAtipica) contextoAtipico.push(`Ausencia reciente (${ausenteReciente} ${plural(ausenteReciente, 'día', 'días')} en las últimas 3 semanas): lo que cambie puede deberse a eso.`)
  if (adherenciaBaja) contextoAtipico.push(`Adherencia baja (${adherenciaPct} % de lo previsto): menos sesiones no es lo mismo que más cansancio.`)
  const calibrando = estadoCalibracion(e.logs, e.plan, e.hoy)
  if (calibrando.activa && calibrando.sesionesHechas > 0) contextoAtipico.push('Primera semana de calibración: los datos aún no se interpretan como progreso.')
  const atipico = contextoAtipico.length > 0

  // ── Rendimiento y RIR en ejercicios comparables (sin calibración) ──
  const nombres = [...new Set((e.plan?.weeks || []).flatMap(w => (w.days || []).flatMap(d => (d.exercises || []).filter(x => x.kind !== 'libre' && x.kind !== 'run').map(x => x.name))))]
  const cayendo: string[] = [], subiendo: string[] = [], rirJusto: string[] = []
  let comparables = 0, conRir = 0
  for (const nombre of nombres) {
    const expo = exposicionesComparables(e.logs, e.plan, nombre).exposiciones.filter(x => !x.deCalibracion)
    if (expo.length < 3) continue
    comparables++
    const rm = (x: { kg: number; reps: number[] }) => estimate1RM(x.kg, Math.round(media(x.reps)))
    const ultimas = expo.slice(0, 2), previas = expo.slice(2, 5)
    const cambio = ((media(ultimas.map(rm)) - media(previas.map(rm))) / media(previas.map(rm))) * 100
    if (cambio <= -p.rendimientoCaidaPct) cayendo.push(nombre)
    else if (cambio >= p.rendimientoCaidaPct) subiendo.push(nombre)
    const rirU = ultimas.map(x => x.rirMedio).filter((v): v is number => v !== null), rirP = previas.map(x => x.rirMedio).filter((v): v is number => v !== null)
    if (rirU.length && rirP.length) { conRir++; if (media(rirP) - media(rirU) >= p.rirDerivaPuntos) rirJusto.push(nombre) }
  }

  // ── Recuperación: check-ins y molestias ──
  const desdeCheck = antesDe(e.hoy, p.diasCheckins)
  const checks = e.checkins.filter(c => c.date >= desdeCheck && c.date <= e.hoy)
  const checksBajos = checks.filter(c => algunaBaja(c.sleep, c.soreness, c.motivation)).length
  const desdeDolor = antesDe(e.hoy, p.diasMolestias)
  const molestias = e.dolor.filter(d => d.date >= desdeDolor && d.date <= e.hoy && d.tipo !== 'doms' && d.intensidad >= p.molestiaMin).sort((a, b) => b.intensidad - a.intensidad)

  // ── Decisiones previas relacionadas con volumen, intensidad o descarga ──
  const decisionesPrevias = [...e.decisiones]
    .filter(esDecisionDeCarga)
    .sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 3)
    .map(d => ({ id: d.id, fecha: d.fecha, tipo: d.tipo, texto: d.intervencion || d.hipotesis || d.tipo, revisada: !!d.revisada_el }))

  // ── Las tres cajas ──
  const datosInsuficientes: ItemEvidencia[] = []
  const falta: string[] = []
  if (semanasConEntrenos < p.semanasHistorialMin) {
    datosInsuficientes.push({ id: 'historial', texto: `Solo ${semanasConEntrenos} ${plural(semanasConEntrenos, 'semana completa', 'semanas completas')} con entrenos (hacen falta ${p.semanasHistorialMin}).` })
    falta.push(`${p.semanasHistorialMin - semanasConEntrenos} ${plural(p.semanasHistorialMin - semanasConEntrenos, 'semana más', 'semanas más')} de historial`)
  }
  if (calibrando.activa && calibrando.sesionesHechas > 0) datosInsuficientes.push({ id: 'calibracion', texto: 'Está en la primera semana de calibración: aún no se interpreta.' })
  if (comparables < p.ejerciciosComparablesMin) {
    datosInsuficientes.push({ id: 'comparables', texto: `Pocos ejercicios con 3 exposiciones comparables (${comparables} de ${p.ejerciciosComparablesMin}): no se puede valorar el rendimiento.` })
    falta.push(`Ejercicios con 3 exposiciones comparables (${p.ejerciciosComparablesMin - comparables} más)`)
  } else if (conRir === 0) {
    datosInsuficientes.push({ id: 'rir', texto: 'Sin RIR registrado en los ejercicios comparables: no se puede valorar el esfuerzo.' })
    falta.push('RIR registrado en los ejercicios comparables')
  }
  if (checks.length < p.checkinsMin) {
    datosInsuficientes.push({ id: 'checkins', texto: `Pocos check-ins en ${p.diasCheckins} días (${checks.length} de ${p.checkinsMin}): no se puede valorar la recuperación.` })
    falta.push(`Check-ins (${p.checkinsMin} o más en ${p.diasCheckins} días)`)
  }

  const senales: ItemEvidencia[] = []
  // Carga, rendimiento y RIR NO se interpretan con contexto atípico: la poca adherencia o una ausencia no es cansancio
  if (!atipico && semanasConEntrenos >= p.semanasHistorialMin && cargaConsecutiva >= p.semanasCargaConsecutivas) {
    senales.push({ id: 'carga', texto: `${cargaConsecutiva} semanas seguidas de carga sin una semana de descarga marcada.` })
  }
  if (!atipico && cayendo.length >= p.ejerciciosParaSenal) senales.push({ id: 'rendimiento', texto: `El 1RM estimado baja al menos un ${p.rendimientoCaidaPct} % en ${cayendo.length} ejercicios comparables: ${cayendo.slice(0, 3).join(', ')}.` })
  if (!atipico && rirJusto.length >= p.ejerciciosParaSenal) senales.push({ id: 'rir', texto: `El RIR va más justo (${p.rirDerivaPuntos} punto o más) en ${rirJusto.length} ejercicios comparables: ${rirJusto.slice(0, 3).join(', ')}.` })
  if (checks.length >= p.checkinsMin && checksBajos / checks.length >= p.checkinsBajosProporcion) senales.push({ id: 'checkins', texto: `${checksBajos} de ${checks.length} check-ins con alguna escala baja (sueño, agujetas o ánimo).` })
  if (molestias.length) senales.push({ id: 'molestias', texto: `Molestia articular: ${molestias[0].zona} (${molestias[0].intensidad}/10)${molestias.length > 1 ? ` y ${molestias.length - 1} más` : ''}.` })

  const evidencia: ItemEvidencia[] = []
  if (conHistorial.length) evidencia.push({ id: 'semanas', texto: `${semanasConEntrenos} de ${conHistorial.length} ${plural(conHistorial.length, 'semana completa', 'semanas completas')} con entrenos; ${cargaConsecutiva} ${plural(cargaConsecutiva, 'semana seguida', 'semanas seguidas')} de carga hasta la última.` })
  if (adherenciaPct !== null) evidencia.push({ id: 'adherencia', texto: `Adherencia reciente: ${adherenciaPct} % de lo previsto (últimas ${paraAdherencia.length} ${plural(paraAdherencia.length, 'semana', 'semanas')} completas sin ausencia).` })
  if (comparables) evidencia.push({ id: 'comparables', texto: `${comparables} ${plural(comparables, 'ejercicio', 'ejercicios')} con 3 exposiciones comparables${subiendo.length ? `; ${subiendo.length} sube${subiendo.length === 1 ? '' : 'n'} (${subiendo.slice(0, 3).join(', ')})` : ''}.` })
  if (checks.length) evidencia.push({ id: 'checkins', texto: `${checks.length} ${plural(checks.length, 'check-in', 'check-ins')} en ${p.diasCheckins} días, ${checksBajos} con alguna escala baja.` })
  if (semanas.some(s => s.descarga)) evidencia.push({ id: 'descarga-previa', texto: 'El plan ya incluyó una semana de descarga en estas semanas.' })
  for (const c of contextoAtipico) evidencia.push({ id: 'atipico', texto: `Contexto atípico: ${c}` })

  const confianza: Confianza = datosInsuficientes.length >= 2 || semanasConEntrenos < p.semanasHistorialMin || atipico ? 'baja'
    : semanasConEntrenos >= p.semanasConfianzaAlta && datosInsuficientes.length === 0 ? 'alta' : 'media'
  if (atipico) falta.push('Que pase el contexto atípico (ausencia, adherencia baja o calibración) para poder interpretar el resto')
  if (confianza !== 'alta' && !datosInsuficientes.length && !atipico && semanasConEntrenos < p.semanasConfianzaAlta) falta.push(`${p.semanasConfianzaAlta - semanasConEntrenos} ${plural(p.semanasConfianzaAlta - semanasConEntrenos, 'semana más', 'semanas más')} de historial para una confianza alta`)

  const resumen = datosInsuficientes.length >= 2 || semanasConEntrenos < p.semanasHistorialMin ? 'Datos insuficientes para valorar.'
    : senales.length ? `${senales.length} ${plural(senales.length, 'señal', 'señales')} a observar. Es evidencia, no un veredicto.`
    : 'Sin señales a observar con los datos disponibles.'

  return { politicaVersion: p.version, confianza, resumen, semanas, datosInsuficientes, senales, evidencia, contextoAtipico, falta, decisionesPrevias }
}
