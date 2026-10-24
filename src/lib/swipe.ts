import { useRef, type TouchEvent } from 'react'

// Deslizar con el dedo para cambiar de ejercicio. Un gesto cuenta como "deslizar" solo si es
// claramente horizontal y rápido: así no se confunde con desplazar la pantalla hacia abajo, ni con
// arrastrar a mitad de un ajuste de peso, ni con un toque largo.
export const SWIPE_MIN_DISTANCE = 60   // px
export const SWIPE_MAX_DURATION = 700  // ms
export const SWIPE_HORIZONTAL_RATIO = 1.8 // lo horizontal tiene que ser al menos 1,8 veces lo vertical

export type SwipeDirection = 'left' | 'right'

export function detectSwipe(dx: number, dy: number, durationMs: number): SwipeDirection | null {
  if (durationMs > SWIPE_MAX_DURATION) return null
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return null
  if (Math.abs(dx) < Math.abs(dy) * SWIPE_HORIZONTAL_RATIO) return null
  return dx < 0 ? 'left' : 'right'
}

// Dónde no se desliza: campos de texto y números (el dedo arrastra para colocar el cursor o
// seleccionar) y lo que se marque expresamente.
const NO_SWIPE = 'input, textarea, select, [contenteditable="true"], [data-no-swipe]'

export function startsOnNoSwipe(target: EventTarget | null): boolean {
  const t = target as { closest?: (selector: string) => unknown } | null
  return typeof t?.closest === 'function' && t.closest(NO_SWIPE) !== null
}

/** Props táctiles para un contenedor: `onLeft` (dedo hacia la izquierda) y `onRight` (hacia la derecha). */
export function useSwipe(onLeft: () => void, onRight: () => void) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null)

  return {
    onTouchStart: (e: TouchEvent) => {
      if (e.touches.length !== 1 || startsOnNoSwipe(e.target)) { start.current = null; return }
      const t = e.touches[0]
      start.current = { x: t.clientX, y: t.clientY, t: Date.now() }
    },
    onTouchEnd: (e: TouchEvent) => {
      const s = start.current
      start.current = null
      if (!s) return
      const t = e.changedTouches[0]
      const dir = detectSwipe(t.clientX - s.x, t.clientY - s.y, Date.now() - s.t)
      if (dir === 'left') onLeft()
      else if (dir === 'right') onRight()
    },
    onTouchCancel: () => { start.current = null },
  }
}
