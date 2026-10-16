import { Check, Trophy, Flame } from 'lucide-react'

interface Props {
  title: string
  trainerMode?: boolean
  clientName?: string
  elapsedLabel: string
  totalVolume: number
  newRecords: { name: string; best: number }[]
  streak: number
  onContinue: () => void
}

// Lo último que ve el cliente: la sesión ya está guardada, esto es el cierre.
export function FinishedScreen({ title, trainerMode, clientName, elapsedLabel, totalVolume, newRecords, streak, onContinue }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-ok text-white flex items-center justify-center mb-6 shadow-lg shadow-ok/30">
        <Check className="w-10 h-10" />
      </div>
      <h2 className="font-serif font-bold text-3xl">{trainerMode ? 'Sesión guardada' : '¡Buen trabajo!'}</h2>
      <p className="text-muted mt-2 max-w-xs">
        {trainerMode ? `La sesión de ${clientName || 'tu cliente'} (${title}) ya está registrada.` : 'Tu entrenador verá tu sesión.'}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 w-full max-w-xs">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="font-serif font-bold text-xl">{elapsedLabel}</p>
          <p className="text-[11px] text-muted uppercase tracking-wider mt-0.5">Duración</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="font-serif font-bold text-xl">{totalVolume > 0 ? Math.round(totalVolume).toLocaleString() : 0} kg</p>
          <p className="text-[11px] text-muted uppercase tracking-wider mt-0.5">Volumen</p>
        </div>
      </div>

      {(newRecords.length > 0 || streak >= 2) && (
        <div className="mt-4 space-y-2 w-full max-w-xs">
          {newRecords.length > 0 && (
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-warn">
              <Trophy className="w-4 h-4" /> {newRecords.length} {newRecords.length === 1 ? 'récord nuevo' : 'récords nuevos'}
            </p>
          )}
          {streak >= 2 && (
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-accent">
              <Flame className="w-4 h-4" /> Racha de {streak} días
            </p>
          )}
        </div>
      )}

      <button onClick={onContinue}
        className="mt-10 w-full max-w-xs py-4 rounded-2xl bg-ink text-white font-bold text-base hover:opacity-90 active:scale-[0.98] transition-all">
        Volver al inicio
      </button>
    </div>
  )
}
