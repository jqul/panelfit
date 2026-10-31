import type { WeekPlan } from '../types'

// Mesociclos: semanas seguidas con un mismo objetivo (un bloque de fuerza, de hipertrofia...). Cada semana guarda su
// `objetivo` y, si sale de aplicar un bloque, el nombre del bloque (`bloque`). Un bloque es la racha de semanas
// consecutivas con el mismo nombre y objetivo; así el cliente ve «Bloque de fuerza · semana 2 de 4» y para qué sirve.

export type ObjetivoBloque = 'fuerza' | 'hipertrofia' | 'potencia' | 'resistencia' | 'peaking' | 'tecnica'

export const OBJETIVOS_BLOQUE: { id: ObjetivoBloque; label: string; paraQue: string }[] = [
  { id: 'fuerza', label: 'Fuerza', paraQue: 'Subir tus máximos: pocas repeticiones con mucho peso y descansos largos.' },
  { id: 'hipertrofia', label: 'Hipertrofia', paraQue: 'Ganar músculo: más series y repeticiones, cerca del fallo.' },
  { id: 'potencia', label: 'Potencia', paraQue: 'Moverte más rápido y explosivo: cargas medias a toda velocidad.' },
  { id: 'resistencia', label: 'Resistencia', paraQue: 'Aguantar más: muchas repeticiones con poco descanso.' },
  { id: 'peaking', label: 'Puesta a punto', paraQue: 'Llegar a tu mejor marca: menos volumen y más intensidad cada semana.' },
  { id: 'tecnica', label: 'Técnica', paraQue: 'Afinar cómo te mueves: cargas cómodas y atención a cada repetición.' },
]

export const objetivoInfo = (o?: ObjetivoBloque) => OBJETIVOS_BLOQUE.find(x => x.id === o)

/** El objetivo que sugiere el nombre de un bloque («Bloque de fuerza · 4 semanas» → fuerza), para los que no lo dicen. */
export function objetivoPorNombre(nombre: string): ObjetivoBloque | undefined {
  const n = nombre.toLowerCase()
  if (/hipertrofia|volumen|masa/.test(n)) return 'hipertrofia'
  if (/peaking|puesta a punto|competici/.test(n)) return 'peaking'
  if (/potencia|explosiv/.test(n)) return 'potencia'
  if (/resistencia/.test(n)) return 'resistencia'
  if (/t[ée]cnica/.test(n)) return 'tecnica'
  if (/fuerza/.test(n)) return 'fuerza'
  return undefined
}

export interface BloqueDeSemana { nombre: string; objetivo?: ObjetivoBloque; semana: number; total: number; descarga: boolean }

/** El bloque al que pertenece la semana `wi`: su nombre, objetivo y en qué semana de cuántas está. null si no tiene. */
export function bloqueDeSemana(weeks: WeekPlan[] | undefined, wi: number): BloqueDeSemana | null {
  const w = weeks?.[wi]
  if (!w || (!w.objetivo && !w.bloque)) return null
  const mismo = (x?: WeekPlan) => !!x && (x.bloque ?? '') === (w.bloque ?? '') && x.objetivo === w.objetivo
  let ini = wi, fin = wi
  while (mismo(weeks![ini - 1])) ini--
  while (mismo(weeks![fin + 1])) fin++
  const info = objetivoInfo(w.objetivo)
  return {
    nombre: w.bloque || (info ? `Bloque de ${info.label.toLowerCase()}` : 'Bloque'),
    objetivo: w.objetivo,
    semana: wi - ini + 1,
    total: fin - ini + 1,
    descarga: !!w.isDeload,
  }
}
