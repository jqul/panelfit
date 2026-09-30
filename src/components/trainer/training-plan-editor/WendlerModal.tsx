import { useState } from 'react'
import { Dumbbell } from 'lucide-react'
import { generateWendlerCycle, WendlerLift } from '../../../lib/wendler531'

const DEFAULT_LIFTS = ['Sentadilla', 'Press banca', 'Peso muerto', 'Press militar']

export function WendlerModal({ onGenerate, onClose }: {
  onGenerate: (weeks: ReturnType<typeof generateWendlerCycle>) => void
  onClose: () => void
}) {
  const [lifts, setLifts] = useState<WendlerLift[]>(DEFAULT_LIFTS.map(name => ({ name, trainingMax: 0 })))

  const updateLift = (i: number, updates: Partial<WendlerLift>) => {
    setLifts(ls => ls.map((l, idx) => idx === i ? { ...l, ...updates } : l))
  }

  const validCount = lifts.filter(l => l.name.trim() && l.trainingMax > 0).length

  const handleGenerate = () => {
    const weeks = generateWendlerCycle(lifts)
    if (!weeks.length) return
    onGenerate(weeks)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Genera un ciclo de 4 semanas (5s / 3s / 1s / descarga) con los porcentajes clásicos de 5/3/1 sobre el <strong>Training Max</strong> (normalmente ~90% de tu 1RM real) de cada levantamiento. Déjalo en blanco para omitirlo.
      </p>

      <div className="space-y-2">
        {lifts.map((lift, i) => (
          <div key={i} className="flex items-center gap-2">
            <Dumbbell className="w-3.5 h-3.5 text-muted flex-shrink-0" />
            <input value={lift.name} onChange={e => updateLift(i, { name: e.target.value })}
              placeholder="Nombre del ejercicio"
              className="flex-1 px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
            <input type="number" value={lift.trainingMax || ''} onChange={e => updateLift(i, { trainingMax: parseFloat(e.target.value) || 0 })}
              placeholder="TM kg" min={0} step={2.5}
              className="w-24 px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
          </div>
        ))}
      </div>

      <button onClick={handleGenerate} disabled={validCount === 0}
        className="w-full py-3.5 bg-ink text-white rounded-2xl text-sm font-bold disabled:opacity-40">
        Generar ciclo de 4 semanas {validCount > 0 ? `(${validCount} levantamiento${validCount > 1 ? 's' : ''})` : ''}
      </button>
      <button onClick={onClose} className="w-full py-2 text-sm text-muted hover:text-ink">Cancelar</button>
    </div>
  )
}
