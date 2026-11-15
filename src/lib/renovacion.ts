// Renovación proactiva: el momento de proponer el siguiente bloque es antes de que termine el actual, no después.
// Si a un cliente le quedan 14 días o menos de plan y no tiene el siguiente preparado (planes.siguiente), la Bandeja lo
// avisa y la pestaña Plan ofrece un mensaje listo. Puro, para probarlo.

export const DIAS_RENOVAR = 14

export function tocaRenovar(diasParaFin: number | undefined, siguientePreparado: boolean): boolean {
  return typeof diasParaFin === 'number' && diasParaFin >= 0 && diasParaFin <= DIAS_RENOVAR && !siguientePreparado
}

export function mensajeRenovacion(nombre: string, finISO: string, marca?: string): string {
  const fin = new Date(finISO + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  return `Hola ${nombre.trim() || ''}! 👋 Tu bloque actual termina el ${fin}. ¿Seguimos? Te preparo el siguiente con lo que hemos visto en este para que no pierdas lo ganado 💪${marca ? `\n— ${marca}` : ''}`
}
