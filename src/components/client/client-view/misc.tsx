import { Dumbbell, CheckCircle2, AlertCircle, WifiOff } from 'lucide-react'

type SyncState = 'idle' | 'saving' | 'saved' | 'error' | 'offline'

export function NoPlanView() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center text-muted">
      <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-20" />
      <p className="font-serif text-xl font-bold mb-2">Sin plan asignado</p>
      <p className="text-sm">Tu entrenador aún no ha creado tu programa. ¡Pronto lo tendrás!</p>
    </div>
  )
}

// Estado del guardado de los entrenos. Se queda visible mientras haya ejercicios sin subir al
// servidor (aunque ya haya vuelto la conexión) y deja reintentar a mano.
export function SyncIndicator({ syncState, pendingCount = 0, onRetry }: { syncState: SyncState; pendingCount?: number; onRetry?: () => void }) {
  if (syncState === 'idle' && pendingCount === 0) return null
  const sinSubir = `${pendingCount} ejercicio${pendingCount !== 1 ? 's' : ''} sin subir`
  const tone = syncState === 'saving' ? 'bg-accent/10 text-accent' : syncState === 'saved' ? 'bg-ok/10 text-ok' : 'bg-warn/10 text-warn'
  return (
    <div role="status" className={`fixed top-14 left-0 right-0 z-20 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold ${tone}`}>
      {syncState === 'saving' && <><span className="w-2 h-2 bg-accent rounded-full animate-pulse" />Guardando...</>}
      {syncState === 'saved' && <><CheckCircle2 className="w-3.5 h-3.5" />Guardado</>}
      {syncState === 'offline' && <><WifiOff className="w-3.5 h-3.5" />
        {pendingCount > 0 ? `Sin conexión · ${sinSubir}: se subirán al recuperar señal` : 'Sin conexión — guardado en este dispositivo'}
      </>}
      {syncState === 'error' && <><AlertCircle className="w-3.5 h-3.5" />
        {pendingCount > 0 ? `No se pudo guardar · ${sinSubir}` : 'Error al guardar'}
      </>}
      {syncState === 'idle' && <><AlertCircle className="w-3.5 h-3.5" />{sinSubir}</>}
      {pendingCount > 0 && onRetry && syncState !== 'saving' && syncState !== 'offline' && (
        <button onClick={onRetry} className="ml-1 px-2 py-0.5 rounded-md border border-current underline-offset-2">Reintentar</button>
      )}
    </div>
  )
}
