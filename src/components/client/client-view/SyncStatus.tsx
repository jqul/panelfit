import { createContext, useContext } from 'react'
import { CloudOff, WifiOff } from 'lucide-react'

// Estado del guardado de los entrenos, visible DENTRO de la sesión en vivo. La barra de estado y la
// cabecera del panel quedan tapadas por la pantalla del entreno, y es justo ahí, en el gimnasio sin
// cobertura, donde hay que saber qué falta por subir. El contexto atraviesa el portal del entreno.
export interface SyncStatus {
  state: 'idle' | 'saving' | 'saved' | 'error' | 'offline'
  pendingCount: number
  retry: () => void
}

export const SyncStatusContext = createContext<SyncStatus | null>(null)

/** Pastilla para la cabecera del entreno: "N sin subir" (toca para reintentar) o "Sin conexión". Nada si todo está subido. */
export function SyncBadge() {
  const s = useContext(SyncStatusContext)
  if (!s) return null
  if (s.pendingCount > 0) {
    const sinConexion = s.state === 'offline'
    return (
      <button type="button" onClick={s.retry} disabled={sinConexion || s.state === 'saving'}
        title={sinConexion ? 'Sin conexión: se subirán solos al recuperar señal' : 'Toca para reintentar'}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-warn/10 text-warn text-[11px] font-bold whitespace-nowrap disabled:opacity-90">
        {sinConexion ? <WifiOff className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
        {s.pendingCount} sin subir
      </button>
    )
  }
  if (s.state === 'offline') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-warn/10 text-warn text-[11px] font-bold whitespace-nowrap">
        <WifiOff className="w-3 h-3" /> Sin conexión
      </span>
    )
  }
  return null
}

export const useSyncStatus = () => useContext(SyncStatusContext)
