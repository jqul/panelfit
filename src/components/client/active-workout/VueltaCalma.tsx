import { Wind } from 'lucide-react'
import type { Exercise } from '../../../types'

// Vuelta a la calma del día (estiramientos, movilidad, caminar suave...): la pone el entrenador en el editor, como el
// calentamiento. En el entreno sale al final; no lleva series que marcar.
export function VueltaCalma({ ejercicios }: { ejercicios?: Exercise[] }) {
  if (!ejercicios?.length) return null
  return (
    <section aria-label="Vuelta a la calma" className="bg-ok/5 border border-ok/20 rounded-2xl px-4 py-3">
      <p className="text-xs font-bold text-ok uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Wind className="w-3.5 h-3.5" /> Vuelta a la calma
      </p>
      <div className="space-y-1.5">
        {ejercicios.map((ex, i) => (
          <div key={i} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium">{ex.name}</span>
            {ex.sets && <span className="text-xs text-muted flex-shrink-0">{ex.sets}{ex.weight ? ` · ${ex.weight}` : ''}</span>}
          </div>
        ))}
      </div>
    </section>
  )
}
