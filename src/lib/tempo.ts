// Tempo de ejecución: excéntrica-pausa abajo-concéntrica-pausa arriba, en
// segundos — el control de cadencia es sagrado en fuerza/rehab (ej. 3-1-1-0:
// 3s bajando, 1s de pausa isométrica abajo, subida explosiva, sin pausa
// arriba) pero hoy se lee en la nota del ejercicio y se olvida a mitad de
// serie. "X" en una fase = explosiva (máxima velocidad intencionada, no un
// tiempo fijo) — estándar en la notación de tempo de fuerza-potencia.

export interface TempoPhase {
  key: 'eccentric' | 'pauseBottom' | 'concentric' | 'pauseTop'
  label: string
  seconds: number      // 0 si es explosiva (no se cuenta, se marca el instante)
  explosive: boolean
  color: string
}

const LABELS: TempoPhase['label'][] = ['Bajada', 'Pausa abajo', 'Subida', 'Pausa arriba']
const KEYS: TempoPhase['key'][] = ['eccentric', 'pauseBottom', 'concentric', 'pauseTop']
const COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#f59e0b']

/**
 * Parsea un string de tempo tipo "3-1-1-0" o "3-0-X-0" en sus 4 fases.
 * Devuelve null si el string no tiene el formato esperado o si las 4 fases
 * son 0 (no hay nada que marcar).
 */
export function parseTempo(tempo?: string | null): TempoPhase[] | null {
  if (!tempo) return null
  const parts = tempo.trim().split('-')
  if (parts.length !== 4) return null

  const phases: TempoPhase[] = []
  for (let i = 0; i < 4; i++) {
    const raw = parts[i].trim().toUpperCase()
    if (raw === 'X') {
      phases.push({ key: KEYS[i], label: LABELS[i], seconds: 0, explosive: true, color: COLORS[i] })
      continue
    }
    const n = parseInt(raw, 10)
    if (isNaN(n) || n < 0 || String(n) !== raw) return null
    phases.push({ key: KEYS[i], label: LABELS[i], seconds: n, explosive: false, color: COLORS[i] })
  }
  if (phases.every(p => p.seconds === 0 && !p.explosive)) return null
  return phases
}
