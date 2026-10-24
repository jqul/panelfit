import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { reloadOnceForNewVersion } from './lib/staleChunk'
import { loadAnalyticsWhenIdle } from './lib/analytics'

// La analítica no hace falta para pintar: se carga cuando el navegador está libre.
loadAnalyticsWhenIdle()

// Vite lanza este evento cuando falla la precarga de un chunk (típico tras un
// despliegue con la pestaña abierta): recargamos para traer la versión nueva.
window.addEventListener('vite:preloadError', event => {
  if (reloadOnceForNewVersion()) event.preventDefault()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
