import { Target } from 'lucide-react'
import { parseRirTarget, describeRirTarget } from '../../../lib/rirTarget'

// "🎯 RIR 2-3": cuántas repeticiones deben quedarte en reserva al terminar cada serie de este ejercicio.
// Lo fija el entrenador en el plan; si no hay un valor válido no se pinta nada.
export function RirTargetChip({ rir }: { rir?: string }) {
  const t = parseRirTarget(rir)
  if (!t) return null
  const { label, hint } = describeRirTarget(t)
  return (
    <div className="px-4 mb-3">
      <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-xl px-3 py-2" data-testid="rir-objetivo">
        <Target className="w-3.5 h-3.5 text-accent flex-shrink-0" aria-hidden />
        <p className="text-xs"><span className="font-bold text-accent">{label}</span> <span className="text-muted">· {hint}</span></p>
      </div>
    </div>
  )
}
