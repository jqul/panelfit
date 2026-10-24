import { lazy, Suspense, useEffect, type ComponentProps } from 'react'

// El entreno en vivo pesa ~37 kB (gzip) y no hace falta para ver el panel: se descarga cuando se
// abre una sesión, y el navegador lo precarga cuando está libre (prefetchActiveWorkout) para que al
// pulsar "Empezar" ya esté, y para que quede en la caché del service worker y funcione sin conexión.
const load = () => import('./ActiveWorkout')
const ActiveWorkoutChunk = lazy(() => load().then(m => ({ default: m.ActiveWorkout })))

export function ActiveWorkout(props: ComponentProps<typeof ActiveWorkoutChunk>) {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-[80] bg-bg flex items-center justify-center text-sm text-muted" role="status">Cargando entreno…</div>
    }>
      <ActiveWorkoutChunk {...props} />
    </Suspense>
  )
}

let prefetched = false

/** Precarga el entreno cuando el navegador está libre; no lo hace sin conexión ni con el ahorro de datos activado. */
export function usePrefetchActiveWorkout() {
  useEffect(() => {
    if (prefetched || !navigator.onLine || (navigator as { connection?: { saveData?: boolean } }).connection?.saveData) return
    const run = () => { prefetched = true; load().catch(() => { prefetched = false }) }
    if ('requestIdleCallback' in window) { const id = window.requestIdleCallback(run, { timeout: 5000 }); return () => window.cancelIdleCallback(id) }
    const t = setTimeout(run, 2500)
    return () => clearTimeout(t)
  }, [])
}
