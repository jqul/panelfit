import type { Exercise } from '../types'

// Sesión libre (workout en modo sencillo): un bloque con texto e, si se quiere, un vídeo, sin tabla de series ni
// kilos. Para movilidad, una clase grabada, cardio libre, yoga... El cliente lo lee, ve el vídeo y lo marca como hecho.
// Es un ejercicio más del día (kind 'libre', "1x1"), así que el cumplimiento, el calendario y el historial lo cuentan
// como cualquier otro; las estadísticas de fuerza lo ignoran (no tiene kilos).

export const esLibre = (ex?: Pick<Exercise, 'kind'> | null) => ex?.kind === 'libre'

/** El bloque nuevo que añade el editor. */
export function nuevaSesionLibre(nombre = 'Sesión libre'): Exercise {
  return { name: nombre, sets: '1x1', weight: '', isMain: false, comment: '', videoUrl: '', kind: 'libre', hideRest: true }
}

/** Ideas de nombre para empezar. */
export const IDEAS_LIBRE = ['Movilidad', 'Cardio suave', 'Yoga', 'Estiramientos', 'Clase grabada']

/** El texto en párrafos (las líneas vacías separan párrafos; las demás se respetan). */
export const parrafos = (texto?: string) => (texto || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
