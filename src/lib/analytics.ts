import { sinParametrosSensibles } from './analyticsUrl'

// Vercel Analytics se carga bajo demanda: no hace falta para pintar y pesa en el trozo de entrada.
// `track` y la inicialización pasan por aquí para que siempre se haga primero `inject` (si no, el
// evento se pierde) y para quitar el token del cliente de la URL antes de enviarla.
type Props = Record<string, string | number | boolean | null | undefined>

let loading: Promise<typeof import('@vercel/analytics')> | null = null

export function loadAnalytics() {
  return (loading ||= import('@vercel/analytics').then(m => {
    m.inject({ beforeSend: event => ({ ...event, url: sinParametrosSensibles(event.url) }) })
    return m
  }))
}

export function track(name: string, props?: Props) {
  loadAnalytics().then(m => m.track(name, props)).catch(() => {})
}

/** Arranca la analítica cuando el navegador está libre (como mucho a los 4 s). */
export function loadAnalyticsWhenIdle() {
  const run = () => { loadAnalytics().catch(() => {}) }
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 4000 })
  else setTimeout(run, 2000)
}
