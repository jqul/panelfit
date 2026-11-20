// «¿Qué pasó desde esta decisión?»: la lectura de evidencia con la que se cierra una decisión de volumen, intensidad o descarga del diario.
// Compara el periodo DESPUÉS de la decisión con uno igual de largo ANTES, y solo DESCRIBE: «mejoró», «se mantuvo», «empeoró» o «datos
// insuficientes». Nunca atribuye causa («la decisión provocó esto») ni recomienda qué hacer después: el cierre es del entrenador y no cambia
// ningún plan. No inventa reglas para medir lo que ya se mide en otro sitio: la comparabilidad de las exposiciones es la de
// `exposicionesComparables` (la de «Siguiente exposición»), y los umbrales de adherencia baja, ausencia relevante, caída de rendimiento, deriva del
// RIR, check-ins y molestias son los de `POLITICA_DESCARGA`. Aquí solo se añade lo propio de esta pantalla (días mínimos observados, tamaño
// de la ventana), en una política con versión, provisional. Sin React ni red.

import type { TrainingLogs, TrainingPlan } from '../types'
import { estimate1RM } from './strength'
import { algunaBaja } from './checkinConfig'
import { exposicionesComparables } from './recomendacionProgresion'
import { finCalibracion } from './calibracion'
import { historialPorEjercicio } from './historialEjercicio'
import { POLITICA_DESCARGA, sumarDias, diasSolapados, previstasPorSemana, type PoliticaDescarga } from './evidenciaDescarga'
import type { Decision } from './diarioDecisiones'

export interface PoliticaRevision {
  version: string
  /** Los umbrales compartidos con «¿Puede tocar descarga?»: adherencia baja, ausencia relevante, caída de rendimiento, deriva del RIR, check-ins, molestias. */
  base: PoliticaDescarga
  /** Días que tienen que haber pasado desde la decisión para decir algo. */
  diasMinimosObservados: number
  /** Tope de la ventana (antes y después), para que una revisión muy tardía no mezcle meses. */
  diasVentanaMax: number
  /** Exposiciones comparables mínimas en cada lado (antes y después) de un ejercicio. */
  exposicionesMinPorLado: number
  /** Cambio de adherencia (puntos porcentuales) desde el que se dice que mejoró o empeoró. */
  adherenciaCambioPuntos: number
}

export const POLITICA_REVISION: PoliticaRevision = {
  version: 'rev-v0-provisional-2026-11',
  base: POLITICA_DESCARGA,
  diasMinimosObservados: 14,
  diasVentanaMax: 56,
  exposicionesMinPorLado: 2,
  adherenciaCambioPuntos: 10,
}

export type Veredicto = 'mejoro' | 'se-mantuvo' | 'empeoro' | 'datos-insuficientes'
export const ETIQUETA_VEREDICTO: Record<Veredicto, string> = { mejoro: 'Mejoró', 'se-mantuvo': 'Se mantuvo', empeoro: 'Empeoró', 'datos-insuficientes': 'Datos insuficientes' }

export const AVISO_REVISION = 'Describe lo que ocurrió después de la decisión: no demuestra que la decisión lo causara.'

export interface EntradaRevision {
  hoy: string
  decision: Decision
  plan: TrainingPlan | null | undefined
  logs: TrainingLogs
  checkins: { date: string; sleep: number | null; soreness: number | null; motivation: number | null }[]
  dolor: { date: string; zona: string; intensidad: number; tipo?: string }[]
  ausencias: { desde: string; hasta: string }[]
}

export interface PeriodoRevision {
  desde: string
  hasta: string
  dias: number
  sesiones: number
  previstas: number
  adherenciaPct: number | null
  diasAusencia: number
  checkins: number
  checkinsBajos: number
  /** Molestias articulares (no agujetas) a partir del umbral. */
  molestias: number
}

export interface EjercicioRevision {
  nombre: string
  /** 1RM estimado medio de las exposiciones comparables de cada lado. */
  e1rmAntes: number
  e1rmDespues: number
  cambioPct: number
  veredicto: Exclude<Veredicto, 'datos-insuficientes'>
  rirAntes: number | null
  rirDespues: number | null
}

export interface RevisionDecision {
  politicaVersion: string
  decision: Pick<Decision, 'fecha' | 'tipo' | 'ejercicio' | 'hipotesis' | 'intervencion' | 'revisar_el' | 'revisada_el'>
  antes: PeriodoRevision
  despues: PeriodoRevision
  /** Aún no han pasado los días mínimos: no se dice nada del rendimiento. */
  periodoCorto: boolean
  /** Por qué el rendimiento y el RIR no se interpretan (ausencia, adherencia baja…); vacío si sí. */
  excluido: string[]
  rendimiento: { interpretado: boolean; veredicto: Veredicto; ejercicios: EjercicioRevision[] }
  adherencia: Veredicto
  records: { ejercicio: string; antes: number; ahora: number; fecha: string }[]
  /** La conclusión descriptiva: la del rendimiento si se pudo interpretar; si no, «datos insuficientes». */
  conclusion: Veredicto
  resumen: string[]
  /** Qué datos faltan para poder decir más. */
  falta: string[]
}

const CLAVE = /^ex_w\d+_d\d+_r\d+$/
const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const r1 = (n: number) => Math.round(n * 10) / 10
const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios)

function periodo(e: EntradaRevision, desde: string, hasta: string, p: PoliticaRevision): PeriodoRevision {
  const dias = diasSolapados(desde, hasta, desde, hasta)
  const fechas = new Set<string>()
  for (const [k, l] of Object.entries(e.logs || {})) if (CLAVE.test(k) && l?.done && l.dateDone && !l.noContar && l.dateDone >= desde && l.dateDone <= hasta) fechas.add(l.dateDone)
  // Previstas: las del plan de cada semana que cae dentro del periodo, en proporción a los días que caen
  let previstas = 0
  for (let ini = desde; ini <= hasta; ini = sumarDias(ini, 7)) {
    const fin = sumarDias(ini, 6) < hasta ? sumarDias(ini, 6) : hasta
    previstas += previstasPorSemana(e.plan, ini) * (diasSolapados(ini, fin, ini, fin) / 7)
  }
  previstas = Math.round(previstas * 10) / 10
  const cs = e.checkins.filter(c => c.date >= desde && c.date <= hasta)
  return {
    desde, hasta, dias, sesiones: fechas.size, previstas,
    adherenciaPct: previstas > 0 ? Math.min(100, Math.round((fechas.size / previstas) * 100)) : null,
    diasAusencia: e.ausencias.reduce((a, x) => a + diasSolapados(desde, hasta, x.desde, x.hasta), 0),
    checkins: cs.length,
    checkinsBajos: cs.filter(c => algunaBaja(c.sleep, c.soreness, c.motivation)).length,
    molestias: e.dolor.filter(d => d.date >= desde && d.date <= hasta && d.tipo !== 'doms' && d.intensidad >= p.base.molestiaMin).length,
  }
}

/** Por qué un periodo no sirve para interpretar el rendimiento (ausencia relevante o baja adherencia), o null si sirve. */
function motivoAtipico(per: PeriodoRevision, nombre: string, p: PoliticaRevision): string[] {
  const m: string[] = []
  if (per.diasAusencia >= p.base.diasAusenciaAtipica) m.push(`${nombre}: ${per.diasAusencia} ${plural(per.diasAusencia, 'día', 'días')} de ausencia`)
  if (per.dias >= 7 && per.adherenciaPct !== null && per.adherenciaPct < p.base.adherenciaBajaPct) m.push(`${nombre}: adherencia baja (${per.adherenciaPct} % de lo previsto)`)
  return m
}

const verdictoDe = (cambio: number, umbral: number): 'mejoro' | 'se-mantuvo' | 'empeoro' => (cambio >= umbral ? 'mejoro' : cambio <= -umbral ? 'empeoro' : 'se-mantuvo')

export function revisionDecision(e: EntradaRevision, p: PoliticaRevision = POLITICA_REVISION): RevisionDecision {
  const d = e.decision
  // Después: desde el día siguiente a la decisión hasta hoy (o hasta que se cerró), con tope. Antes: igual de largo, hasta el día de la decisión.
  const tope = sumarDias(d.fecha, p.diasVentanaMax)
  const finObservado = [e.hoy, d.revisada_el ?? e.hoy, tope].reduce((a, b) => (b < a ? b : a))
  const desdeDespues = sumarDias(d.fecha, 1)
  const diasDespues = finObservado >= desdeDespues ? diasSolapados(desdeDespues, finObservado, desdeDespues, finObservado) : 0
  const despues = periodo(e, desdeDespues, finObservado >= desdeDespues ? finObservado : desdeDespues, p)
  if (diasDespues === 0) { despues.dias = 0; despues.sesiones = 0; despues.previstas = 0; despues.adherenciaPct = null }
  const antes = periodo(e, sumarDias(d.fecha, -(Math.max(diasDespues, 1) - 1)), d.fecha, p)
  const periodoCorto = diasDespues < p.diasMinimosObservados

  const falta: string[] = []
  if (periodoCorto) falta.push(`Esperar ${p.diasMinimosObservados - diasDespues} ${plural(p.diasMinimosObservados - diasDespues, 'día más', 'días más')} desde la decisión (hacen falta ${p.diasMinimosObservados})`)

  // ── Rendimiento y RIR: solo con ejercicios comparables, fuera de la calibración y sin contexto atípico ──
  const excluido = periodoCorto ? [] : [...motivoAtipico(antes, 'Antes', p), ...motivoAtipico(despues, 'Después', p)]
  const fin = finCalibracion(e.logs, e.plan)
  if (fin && antes.desde <= fin && !periodoCorto) excluido.push(`Se deja fuera la calibración (hasta el ${fin}) en el periodo anterior`)
  const bloqueado = excluido.some(x => !x.startsWith('Se deja fuera la calibración'))
  const nombres = d.ejercicio ? [d.ejercicio] : [...new Set((e.plan?.weeks || []).flatMap(w => (w.days || []).flatMap(x => (x.exercises || []).filter(y => y.kind !== 'libre' && y.kind !== 'run').map(y => y.name))))]
  const ejercicios: EjercicioRevision[] = []
  if (!periodoCorto && !bloqueado) {
    for (const nombre of nombres) {
      const expo = exposicionesComparables(e.logs, e.plan, nombre).exposiciones.filter(x => !x.deCalibracion)
      const a = expo.filter(x => x.fecha >= antes.desde && x.fecha <= antes.hasta)
      const z = expo.filter(x => x.fecha >= despues.desde && x.fecha <= despues.hasta)
      if (a.length < p.exposicionesMinPorLado || z.length < p.exposicionesMinPorLado) continue
      const rm = (x: { kg: number; reps: number[] }) => estimate1RM(x.kg, Math.round(media(x.reps)))
      const ra = media(a.map(rm)), rz = media(z.map(rm))
      if (!(ra > 0)) continue
      const cambioPct = ((rz - ra) / ra) * 100
      const rirs = (xs: typeof a) => xs.map(x => x.rirMedio).filter((v): v is number => v !== null)
      const rA = rirs(a), rZ = rirs(z)
      ejercicios.push({ nombre, e1rmAntes: r1(ra), e1rmDespues: r1(rz), cambioPct: r1(cambioPct), veredicto: verdictoDe(cambioPct, p.base.rendimientoCaidaPct), rirAntes: rA.length ? r1(media(rA)) : null, rirDespues: rZ.length ? r1(media(rZ)) : null })
    }
  }
  const minimo = d.ejercicio ? 1 : p.base.ejerciciosComparablesMin
  let veredictoRend: Veredicto = 'datos-insuficientes'
  if (!periodoCorto && !bloqueado) {
    if (ejercicios.length >= minimo) {
      const m = ejercicios.filter(x => x.veredicto === 'mejoro').length, w = ejercicios.filter(x => x.veredicto === 'empeoro').length
      veredictoRend = m > w ? 'mejoro' : w > m ? 'empeoro' : 'se-mantuvo'
    } else {
      falta.push(d.ejercicio
        ? `Al menos ${p.exposicionesMinPorLado} exposiciones comparables de ${d.ejercicio} antes y ${p.exposicionesMinPorLado} después de la decisión`
        : `Al menos ${minimo} ejercicios con ${p.exposicionesMinPorLado} exposiciones comparables antes y después de la decisión`)
    }
  }
  if (bloqueado) falta.push('Que el periodo no tenga ausencia relevante ni baja adherencia para poder interpretar el rendimiento')
  if (!periodoCorto && (antes.checkins < p.base.checkinsMin || despues.checkins < p.base.checkinsMin)) falta.push(`Check-ins (${p.base.checkinsMin} o más) en el periodo anterior y en el posterior`)

  // ── Adherencia ──
  const adherencia: Veredicto = periodoCorto || antes.adherenciaPct === null || despues.adherenciaPct === null ? 'datos-insuficientes'
    : verdictoDe(despues.adherenciaPct - antes.adherenciaPct, p.adherenciaCambioPuntos)

  // ── Récords: 1RM estimado por encima del mejor de antes de la decisión (la primera vez no cuenta) ──
  const records: RevisionDecision['records'] = []
  if (!periodoCorto || diasDespues > 0) {
    for (const h of historialPorEjercicio(e.logs, e.plan)) {
      if (d.ejercicio && h.name.trim().toLowerCase() !== d.ejercicio.trim().toLowerCase()) continue
      const previo = Math.max(0, ...h.sesiones.filter(s => s.date <= d.fecha).map(s => s.e1rm))
      if (previo <= 0) continue
      const mejores = h.sesiones.filter(s => s.date >= despues.desde && s.date <= despues.hasta && s.e1rm > previo)
      if (!mejores.length) continue
      const mejor = mejores.reduce((a, b) => (b.e1rm > a.e1rm ? b : a))
      records.push({ ejercicio: h.name, antes: r1(previo), ahora: r1(mejor.e1rm), fecha: mejor.date })
    }
  }

  // ── Resumen descriptivo, sin causa ni consejo ──
  const resumen: string[] = []
  if (periodoCorto) resumen.push(`Han pasado ${diasDespues} ${plural(diasDespues, 'día', 'días')} desde la decisión: aún no hay datos suficientes para describir qué pasó.`)
  else {
    resumen.push(bloqueado ? 'Rendimiento y RIR: no se interpretan en este periodo (ver el motivo).' : `Rendimiento: ${ETIQUETA_VEREDICTO[veredictoRend].toLowerCase()}${veredictoRend === 'datos-insuficientes' ? '' : ` (${ejercicios.length} ${plural(ejercicios.length, 'ejercicio comparable', 'ejercicios comparables')})`}.`)
    if (antes.adherenciaPct !== null && despues.adherenciaPct !== null) resumen.push(`Adherencia: ${antes.adherenciaPct} % antes y ${despues.adherenciaPct} % después (${ETIQUETA_VEREDICTO[adherencia].toLowerCase()}).`)
    resumen.push(`Sesiones realizadas: ${antes.sesiones} antes y ${despues.sesiones} después.`)
    if (antes.checkins || despues.checkins) resumen.push(`Check-ins con alguna escala baja: ${antes.checkinsBajos} de ${antes.checkins} antes y ${despues.checkinsBajos} de ${despues.checkins} después.`)
    if (antes.molestias || despues.molestias) resumen.push(`Molestias articulares: ${antes.molestias} antes y ${despues.molestias} después.`)
    if (records.length) resumen.push(`Récords de 1RM estimado: ${records.map(r => r.ejercicio).join(', ')}.`)
  }

  return {
    politicaVersion: p.version,
    decision: { fecha: d.fecha, tipo: d.tipo, ejercicio: d.ejercicio, hipotesis: d.hipotesis, intervencion: d.intervencion, revisar_el: d.revisar_el, revisada_el: d.revisada_el },
    antes, despues, periodoCorto,
    excluido,
    rendimiento: { interpretado: !periodoCorto && !bloqueado, veredicto: veredictoRend, ejercicios },
    adherencia, records,
    conclusion: veredictoRend,
    resumen, falta,
  }
}
