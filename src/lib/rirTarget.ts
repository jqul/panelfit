// RIR objetivo de un ejercicio (repeticiones en reserva): lo fija el entrenador en el plan ("2-3", "1", "0-1") y el
// cliente lo ve al hacer la serie. Antes solo se podía escribir dentro del comentario, donde se pierde.

export interface RirTarget { min: number; max: number }

/** "2-3" → {2,3}; "1" → {1,1}; "0-1" → {0,1}. Rango 0-10, mínimo ≤ máximo; cualquier otra cosa → null. */
export function parseRirTarget(input?: string | null): RirTarget | null {
  const m = (input ?? '').trim().match(/^(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?$/)
  if (!m) return null
  const min = parseInt(m[1]), max = m[2] !== undefined ? parseInt(m[2]) : min
  if (min > 10 || max > 10 || min > max) return null
  return { min, max }
}

/** Texto normalizado para guardar: "2 - 3" → "2-3"; un valor no válido → "" (el campo queda vacío). */
export function normalizeRirTarget(input?: string | null): string {
  const t = parseRirTarget(input)
  return t ? (t.min === t.max ? String(t.min) : `${t.min}-${t.max}`) : ''
}

export function describeRirTarget(t: RirTarget): { label: string; hint: string } {
  const label = t.min === t.max ? `RIR ${t.min}` : `RIR ${t.min}-${t.max}`
  const hint = t.max === 0 ? 'hasta el fallo técnico'
    : t.min === t.max ? (t.min === 1 ? 'te debe quedar 1 repetición en reserva' : `te deben quedar ${t.min} repeticiones en reserva`)
    : `te deben quedar entre ${t.min} y ${t.max} repeticiones en reserva`
  return { label, hint }
}

/** ¿El RIR que se anotó está dentro del objetivo (con 1 de margen hacia arriba, que es ir con margen, no un fallo)? */
export function rirVsTarget(actual: number | undefined, t: RirTarget | null): 'sin-dato' | 'en-objetivo' | 'mas-duro' | 'mas-facil' {
  if (actual === undefined || t === null) return 'sin-dato'
  if (actual < t.min) return 'mas-duro'
  if (actual > t.max + 1) return 'mas-facil'
  return 'en-objetivo'
}

export const RIR_PRESETS = ['0-1', '1-2', '2-3', '3-4']
