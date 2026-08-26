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

export function SyncIndicator({ syncState }: { syncState: SyncState }) {
  if (syncState === 'idle') return null
  return (
    <div className={`fixed top-14 left-0 right-0 z-20 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold ${
      syncState === 'saving' ? 'bg-accent/10 text-accent' :
      syncState === 'saved' ? 'bg-ok/10 text-ok' : 'bg-warn/10 text-warn'
    }`}>
      {syncState === 'saving' && <><span className="w-2 h-2 bg-accent rounded-full animate-pulse" />Guardando...</>}
      {syncState === 'saved' && <><CheckCircle2 className="w-3.5 h-3.5" />Guardado</>}
      {syncState === 'offline' && <><WifiOff className="w-3.5 h-3.5" />Sin conexión — guardado localmente</>}
      {syncState === 'error' && <><AlertCircle className="w-3.5 h-3.5" />Error al guardar</>}
    </div>
  )
}
