// Estado de forma con su frase, separado de loadRisk: loadRisk se carga con el panel (lo usa la
// lista de clientes) y estas frases solo hacen falta al abrir Progreso.
import { FITNESS_DIAS, LoadTrendPoint } from './loadRisk'

/** Semanas con carga registrada antes de dar un estado de forma. */
export const SEMANAS_MIN_FORMA = Math.ceil(FITNESS_DIAS / 7)

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
