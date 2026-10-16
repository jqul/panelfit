import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { inject } from '@vercel/analytics'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { reloadOnceForNewVersion } from './lib/staleChunk'

inject()

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
