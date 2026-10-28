import { Component, lazy, useEffect, type ReactNode } from 'react'

// Pestañas que no hacen falta para enseñar Hoy (Entreno, Dieta) y pantallas que casi nadie ve (consentimiento,
// instalar la app): se descargan aparte para que la app abra antes. Entreno y Dieta se precargan en cuanto el
// navegador está libre, como el entreno en vivo (ActiveWorkoutLazy), para que al tocarlas ya estén y para que
// queden en la caché del service worker y funcionen sin conexión.

const cargarEntreno = () => import('../TrainingPlanView')
const cargarDieta = () => import('../../shared/DietEditor')

export const TrainingPlanView = lazy(() => cargarEntreno().then(m => ({ default: m.TrainingPlanView })))
export const DietEditor = lazy(() => cargarDieta().then(m => ({ default: m.DietEditor })))
export const ConsentGate = lazy(() => import('../ConsentGate').then(m => ({ default: m.ConsentGate })))
export const PWAInstallBanner = lazy(() => import('../PWAInstallBanner').then(m => ({ default: m.PWAInstallBanner })))

let precargado = false

/** Precarga Entreno y Dieta cuando el navegador está libre; no lo hace sin conexión ni con el ahorro de datos. */
export function usePrecargarPestanas() {
  useEffect(() => {
    if (precargado || !navigator.onLine || (navigator as { connection?: { saveData?: boolean } }).connection?.saveData) return
    const run = () => { precargado = true; Promise.all([cargarEntreno(), cargarDieta()]).catch(() => { precargado = false }) }
    if ('requestIdleCallback' in window) { const id = window.requestIdleCallback(run, { timeout: 3000 }); return () => window.cancelIdleCallback(id) }
    const t = setTimeout(run, 1500)
    return () => clearTimeout(t)
  }, [])
}

/**
 * Si una pestaña no se puede descargar (sin conexión y sin haberla precargado), se avisa ahí mismo en vez de
 * romper la app entera. Reintentar recarga: el navegador no repite en la misma página una descarga que falló.
 */
export class PestanaSinDescargar extends Component<{ children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false }
  static getDerivedStateFromError() { return { fallo: true } }
  render() {
    if (!this.state.fallo) return this.props.children
    return (
      <div className="px-6 py-16 text-center space-y-3" role="alert">
        <p className="font-serif text-lg font-bold">Esta parte aún no está descargada</p>
        <p className="text-sm text-muted max-w-xs mx-auto">Ahora mismo no hay conexión. Conéctate un momento y pulsa Reintentar (se recarga la app; no pierdes nada).</p>
        <button onClick={() => window.location.reload()} className="px-5 py-3 rounded-2xl bg-ink text-white text-sm font-semibold">Reintentar</button>
      </div>
    )
  }
}
