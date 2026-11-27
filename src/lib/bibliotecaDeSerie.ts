// Qué ejercicios de serie hay que añadir a una cuenta que ya tiene biblioteca.
import type { DefaultExercise } from './defaultExerciseLibrary'

/**
 * Cuántos ejercicios trajo cada entrega de la biblioteca de serie, en el orden en que están en el fichero
 * (las primeras 220 son las versiones 1 a 4). Al añadir ejercicios, ponlos AL FINAL y declara aquí su tanda.
 */
export const TANDAS_DE_SERIE = [220, 1284, 75, 138, 165]

/** Sube sola con cada tanda: cada navegador vuelve a mirar si a la cuenta le falta la nueva. */
export const VERSION_DE_SERIE = TANDAS_DE_SERIE.length + 3

/**
 * Los de las tandas que la cuenta todavía no ha recibido. No basta con comparar nombres uno a uno: un ejercicio de
 * serie renombrado «faltaría» y volvería a crearse con su nombre original. Una tanda se da por recibida si la cuenta
 * conserva al menos la mitad de sus nombres (contando archivados y borrados), y entonces no se le añade nada de ella.
 */
export function ejerciciosDeSerieQueFaltan(serie: DefaultExercise[], nombresDeLaCuenta: string[], tandas = TANDAS_DE_SERIE): DefaultExercise[] {
  const hay = new Set(nombresDeLaCuenta.map(n => n.toLowerCase()))
  const faltan: DefaultExercise[] = []
  let desde = 0
  for (const cuantos of tandas) {
    const tanda = serie.slice(desde, desde + cuantos)
    desde += cuantos
    const sinEllos = tanda.filter(e => !hay.has(e.name.toLowerCase()))
    if (sinEllos.length * 2 > tanda.length) faltan.push(...sinEllos)
  }
  return faltan
}
