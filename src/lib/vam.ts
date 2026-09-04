// Generador de series por %VAM (Velocidad Aeróbica Máxima / MAS — Maximal
// Aerobic Speed). Pensado para deportes de campo (fútbol, rugby, baloncesto,
// atletismo de fondo) donde el trabajo interválico se prescribe como
// porcentaje de la VAM, no como un peso o un RPE.
//
// La VAM en sí se obtiene fuera de esta función — con el test 30-15 IFT (da
// la velocidad directamente en km/h), el Course Navette / beep test
// (palier -> km/h por tabla, aprox. 8 + 0.5 × palier, Léger & Gadoury 1989),
// o un 1000m lanzado (velocidad media = distancia/tiempo, válido como
// estimación de campo). El resultado que el entrenador registra en el
// catálogo de pruebas ya viene en km/h independientemente del protocolo
// usado — esta función solo convierte esa VAM en objetivos de ritmo.

export interface VamInterval {
  pct: number
  label: string
  speedKmh: number
  paceMinPerKm: string   // "m:ss" por km a esa velocidad
  secPer400m: number
  secPer300m: number
  secPer200m: number
  secPer100m: number
}

// Zonas de entrenamiento habituales por %VAM en deportes de campo — de
// recuperación activa a velocidad pura. No son series de trabajo:real
// (eso lo decide el entrenador), solo el ritmo objetivo de la parte activa.
const PRESETS: { pct: number; label: string }[] = [
  { pct: 70, label: 'Recuperación activa' },
  { pct: 80, label: 'Aeróbico extensivo' },
  { pct: 90, label: 'Umbral' },
  { pct: 100, label: 'VO2max (referencia)' },
  { pct: 110, label: 'VO2max (series cortas)' },
  { pct: 120, label: 'Capacidad anaeróbica' },
  { pct: 130, label: 'Velocidad / potencia' },
]

function formatPace(minPerKm: number): string {
  const mins = Math.floor(minPerKm)
  const secs = Math.round((minPerKm - mins) * 60)
  const carrySecs = secs === 60 ? 0 : secs
  const carryMins = secs === 60 ? mins + 1 : mins
  return `${carryMins}:${String(carrySecs).padStart(2, '0')}`
}

function secondsForDistance(distanceM: number, speedKmh: number): number {
  return Math.round((distanceM * 3.6 / speedKmh) * 10) / 10
}

/** Una fila de la tabla para un %VAM concreto. */
export function vamIntervalAt(masKmh: number, pct: number, label = `${pct}% VAM`): VamInterval {
  const speedKmh = Math.round(masKmh * (pct / 100) * 100) / 100
  return {
    pct,
    label,
    speedKmh,
    paceMinPerKm: formatPace(60 / speedKmh),
    secPer400m: secondsForDistance(400, speedKmh),
    secPer300m: secondsForDistance(300, speedKmh),
    secPer200m: secondsForDistance(200, speedKmh),
    secPer100m: secondsForDistance(100, speedKmh),
  }
}

/**
 * Tabla completa de series por %VAM a partir de la VAM del atleta. Si se
 * pasan porcentajes propios se usan esos; si no, las zonas estándar de
 * campo (70% a 130%).
 */
export function generateVamIntervals(masKmh: number, percentages?: number[]): VamInterval[] {
  if (!masKmh || masKmh <= 0) return []
  if (percentages && percentages.length) {
    return percentages.map(pct => vamIntervalAt(masKmh, pct))
  }
  return PRESETS.map(p => vamIntervalAt(masKmh, p.pct, p.label))
}

/** Convierte un palier de Course Navette (beep test) a VAM estimada en km/h. */
export function courseNavetteToVam(palier: number): number {
  return Math.round((8 + 0.5 * palier) * 10) / 10
}

/** Velocidad media de un test lanzado (p.ej. 1000m) — estimación de campo de la VAM. */
export function timedRunToVam(distanceM: number, timeSec: number): number {
  if (!timeSec || timeSec <= 0) return 0
  return Math.round((distanceM * 3.6 / timeSec) * 100) / 100
}
