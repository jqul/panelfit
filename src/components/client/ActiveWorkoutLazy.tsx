import { Component, lazy, Suspense, useEffect, type ComponentProps, type ReactNode } from 'react'

// El entreno en vivo pesa ~37 kB (gzip) y no hace falta para ver el panel: se descarga cuando se
// abre una sesión, y el navegador lo precarga cuando está libre (usePrefetchActiveWorkout) para que al
// pulsar "Empezar" ya esté, y para que quede en la caché del service worker y funcione sin conexión.
const load = () => import('./ActiveWorkout')
const ActiveWorkoutChunk = lazy(() => load().then(m => ({ default: m.ActiveWorkout })))

type Props = ComponentProps<Awaited<ReturnType<typeof load>>['ActiveWorkout']>

// Si el trozo no se puede descargar (sin conexión y sin haberlo precargado), React lanzaría el error hasta
// el límite de errores de toda la app. Aquí se avisa con claridad y se deja volver o reintentar. Reintentar
// recarga la app: el navegador recuerda que esa descarga falló y no la repite en la misma carga de la página.
class ChunkErrorBoundary extends Component<{ children: ReactNode; onClose: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="fixed inset-0 z-[80] bg-bg flex flex-col items-center justify-center gap-4 p-8 text-center" role="alert">
        <p className="font-serif text-xl font-bold">No se pudo abrir el entreno</p>
        <p className="text-sm text-muted max-w-xs">Todavía no está descargado en este móvil y ahora mismo no hay conexión. Conéctate un momento y pulsa Reintentar (se recarga la app; no pierdes nada).</p>
        <div className="flex gap-3">
          <button onClick={this.props.onClose} className="px-5 py-3 rounded-2xl border border-border text-sm font-semibold">Volver</button>
          <button onClick={() => window.location.reload()} className="px-5 py-3 rounded-2xl bg-ink text-white text-sm font-semibold">Reintentar</button>
        </div>
      </div>
    )
  }
}

export function ActiveWorkout(props: Props) {
  return (
    <ChunkErrorBoundary onClose={props.onFinish}>
      <Suspense fallback={
        <div className="fixed inset-0 z-[80] bg-bg flex items-center justify-center text-sm text-muted" role="status">Cargando entreno…</div>
      }>
        <ActiveWorkoutChunk {...props} />
      </Suspense>
    </ChunkErrorBoundary>
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
