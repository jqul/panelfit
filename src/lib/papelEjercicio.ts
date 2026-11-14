// Papel de un ejercicio en el plan: de competición (el levantamiento tal cual se hace en el pódium), variante (lo
// modifica sin dejar de ser ese levantamiento: pausa, déficit, agarre cerrado...) o accesorio (todo lo demás).
// Sirve para separar el trabajo ESPECÍFICO de sentadilla, banca y peso muerto del complementario: una serie de
// sentadilla de competición no vale lo mismo, para mejorar la sentadilla, que una de extensión de cuádriceps.
//
// El entrenador puede marcar el papel de cada ejercicio (`Exercise.papel`). Si no lo marca, se DEDUCE del nombre con
// reglas sencillas; es una ayuda, no un dictamen: «sumo» y «convencional» cuentan como competición porque no sabemos
// cuál compite cada levantador, y «banca con pausa» también (la pausa es la reglamentaria en banca clásica).

import { hecha } from './seriesEfectivas'
import { esCalentamiento, type TipoSerie } from './tipoSerie'

export type PapelEjercicio = 'competicion' | 'variante' | 'accesorio'
export type Levantamiento = 'sentadilla' | 'banca' | 'peso_muerto'

export const PAPELES: { id: PapelEjercicio; label: string; desc: string }[] = [
  { id: 'competicion', label: 'Competición', desc: 'El levantamiento tal cual se hace en competición' },
  { id: 'variante', label: 'Variante', desc: 'Modifica el levantamiento (pausa, déficit, agarre cerrado...) y transfiere mucho' },
  { id: 'accesorio', label: 'Accesorio', desc: 'Complementa: desarrolla músculo o capacidades, pero no es el levantamiento' },
]

export const LEVANTAMIENTOS: { id: Levantamiento; label: string }[] = [
  { id: 'sentadilla', label: 'Sentadilla' },
  { id: 'banca', label: 'Press banca' },
  { id: 'peso_muerto', label: 'Peso muerto' },
]

export const etiquetaPapel = (p: PapelEjercicio) => PAPELES.find(x => x.id === p)?.label ?? p

const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
const tiene = (t: string, palabras: string[]) => palabras.some(p => t.includes(p))

export interface Clasificacion { levantamiento: Levantamiento; papel: 'competicion' | 'variante' }

/**
 * ¿A qué levantamiento se parece este ejercicio y es el movimiento tal cual o una variante? `null` si no es ninguno
 * de los tres (prensa, hack, búlgara, rumano, press inclinado...: esos son accesorios).
 */
export function clasificarLevantamiento(nombre: string): Clasificacion | null {
  const t = normalizar(nombre)
  if (!t) return null

  // Sentadilla: la de barra. Hack, búlgara, goblet, zancadas y demás no son el levantamiento.
  if (t.includes('sentadilla') || /\bsquat\b/.test(t)) {
    if (tiene(t, ['hack', 'bulgara', 'goblet', 'copa', 'zancada', 'split', 'pistol', 'sissy', 'maquina', 'smith', 'multipower', 'mancuerna', 'kettlebell'])) return null
    const variante = tiene(t, ['pausa', 'pausada', 'tempo', 'frontal', 'front', 'caja', 'box', 'deficit', 'pin ', 'parcial', 'bandas', 'cadenas', 'safety', 'zercher', 'overhead'])
    return { levantamiento: 'sentadilla', papel: variante ? 'variante' : 'competicion' }
  }

  // Press banca: el plano de barra. El inclinado, declinado, de mancuernas o en máquina son accesorios.
  if (t.includes('banca') || /\bbench\b/.test(t)) {
    if (tiene(t, ['inclinad', 'declinad', 'mancuerna', 'maquina', 'smith', 'multipower', 'unilateral'])) return null
    const variante = tiene(t, ['agarre cerrado', 'cerrado', 'agarre ancho', 'pin', 'spoto', 'tabla', 'board', 'tempo', 'deficit', 'pausa larga', 'parcial', 'bandas', 'cadenas', 'suelo', 'floor', 'un brazo'])
    return { levantamiento: 'banca', papel: variante ? 'variante' : 'competicion' }
  }

  // Peso muerto: el rumano, las piernas rígidas y las buenas mañanas son accesorios; el rack pull es una variante.
  if (t.includes('peso muerto') || /\bdeadlift\b/.test(t) || t.includes('rack pull')) {
    if (tiene(t, ['rumano', 'rumanian', 'rdl', 'piernas rigidas', 'stiff', 'a una pierna', 'unilateral', 'mancuerna', 'kettlebell', 'trap bar', 'hex'])) return null
    const variante = tiene(t, ['rack pull', 'pausa', 'pausado', 'deficit', 'bloque', 'tempo', 'parcial', 'bandas', 'cadenas', 'snatch grip'])
    return { levantamiento: 'peso_muerto', papel: variante ? 'variante' : 'competicion' }
  }

  return null
}

type ConPapel = { name: string; papel?: PapelEjercicio }

/** Papel de un ejercicio: el que marcó el entrenador o, si no marcó ninguno, el que se deduce del nombre. */
export function papelDe(ex: ConPapel): PapelEjercicio {
  if (ex.papel === 'competicion' || ex.papel === 'variante' || ex.papel === 'accesorio') return ex.papel
  return clasificarLevantamiento(ex.name)?.papel ?? 'accesorio'
}

/** Levantamiento al que se parece el ejercicio (siempre por el nombre), o `null`. */
export const levantamientoDe = (nombre: string): Levantamiento | null => clasificarLevantamiento(nombre)?.levantamiento ?? null

// ── Trabajo específico por semana ──────────────────────────────

export interface TrabajoSerie { series: number; reps: number }

/** Series y repeticiones de lo que se hizo de verdad en un registro: las de calentamiento y las vacías no cuentan. */
export function trabajoDeSeries(series: { weight?: string; reps?: string; tipo?: TipoSerie }[]): TrabajoSerie {
  const t: TrabajoSerie = { series: 0, reps: 0 }
  for (const s of series) {
    if (!s || !hecha(s) || esCalentamiento(s)) continue
    t.series++
    t.reps += parseInt(String(s.reps ?? '')) || 0
  }
  return t
}
const vacio = (): TrabajoSerie => ({ series: 0, reps: 0 })

export interface TrabajoSemana {
  /** Por levantamiento: lo de competición y lo de variantes. */
  porLevantamiento: Record<Levantamiento, { competicion: TrabajoSerie; variante: TrabajoSerie }>
  /** Todo el trabajo accesorio de la semana, sea del levantamiento que sea (o de ninguno). */
  accesorio: TrabajoSerie
}

export const semanaVacia = (): TrabajoSemana => ({
  porLevantamiento: {
    sentadilla: { competicion: vacio(), variante: vacio() },
    banca: { competicion: vacio(), variante: vacio() },
    peso_muerto: { competicion: vacio(), variante: vacio() },
  },
  accesorio: vacio(),
})

/**
 * Suma una tanda de series al trabajo de la semana según su papel. Lo marcado como competición o variante cuenta
 * para su levantamiento; si el nombre no se parece a ninguno de los tres (p. ej. un «Press militar» marcado como
 * variante) no hay levantamiento al que asignarlo y se queda en el cajón de accesorios, para no perderlo.
 */
export function sumarTrabajo(semana: TrabajoSemana, ex: ConPapel, series: number, reps: number): void {
  if (series <= 0) return
  const papel = papelDe(ex)
  const lev = levantamientoDe(ex.name)
  const destino = papel === 'accesorio' || !lev ? semana.accesorio : semana.porLevantamiento[lev][papel]
  destino.series += series
  destino.reps += reps
}

/** Series y repeticiones totales de una semana por papel (para el resumen de una línea). */
export function totalesPorPapel(semana: TrabajoSemana): Record<PapelEjercicio, TrabajoSerie> {
  const t: Record<PapelEjercicio, TrabajoSerie> = { competicion: vacio(), variante: vacio(), accesorio: { ...semana.accesorio } }
  for (const l of LEVANTAMIENTOS) {
    for (const p of ['competicion', 'variante'] as const) {
      t[p].series += semana.porLevantamiento[l.id][p].series
      t[p].reps += semana.porLevantamiento[l.id][p].reps
    }
  }
  return t
}
