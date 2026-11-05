import type { Exercise } from '../../../types'
import { PCT_MAX, PCT_MIN } from '../../../lib/backoff'
import { parseSets } from '../../../lib/quickLog'

// Opciones del ejercicio → "Top set + back-off": la 1ª serie es la pesada del día y las demás bajan a un % de lo que se
// mueva en ella, con sus propias reps (lib/backoff.ts). El nº de series sigue siendo el del ejercicio ("4x3" = 1 + 3).
export function BackoffEditor({ exercise, onChange }: { exercise: Exercise; onChange: (patch: Partial<Exercise>) => void }) {
  const b = exercise.backoff
  const { numSets, numReps } = parseSets(exercise.sets)
  const bajadas = Math.max(0, numSets - 1)
  const campo = 'w-16 text-xs text-center bg-bg border border-border/50 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-accent/20'

  return (
    <div className="space-y-2">
      <button type="button" aria-pressed={!!b} onClick={() => onChange({ backoff: b ? undefined : { pct: 85 } })}
        title="Powerlifting: una serie pesada del día y bajadas calculadas sobre el peso que de verdad ha movido"
        className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
          b ? 'bg-accent/10 border-accent/30 text-accent' : 'border-border/50 text-muted hover:border-accent/40 hover:text-accent'
        }`}>
        <span>🏋️</span>
        {b ? '✓ Top set + back-off' : 'Top set + back-off'}
      </button>
      {b && (
        <div className="px-3 py-2.5 rounded-lg bg-accent/5 border border-accent/20 space-y-2" role="group" aria-label={`Back-off de ${exercise.name || 'este ejercicio'}`}>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-muted">Bajadas al</span>
            <input type="number" min={PCT_MIN} max={PCT_MAX} step={1} value={b.pct} aria-label="Porcentaje del top set"
              onChange={e => { const p = Math.round(Number(e.target.value)); if (p >= PCT_MIN && p <= PCT_MAX) onChange({ backoff: { ...b, pct: p } }) }}
              className={campo} />
            <span className="text-muted">% del top set, de</span>
            <input value={b.reps ?? ''} maxLength={12} placeholder={String(numReps)} aria-label="Repeticiones de las bajadas"
              onChange={e => onChange({ backoff: { ...b, reps: e.target.value.trim() || undefined } })}
              className={campo} />
            <span className="text-muted">reps</span>
          </div>
          <p className="text-[11px] text-muted leading-snug">
            {bajadas > 0
              ? `1ª serie: el top set (${numReps} reps${exercise.rir ? ` @${exercise.rir}` : ''}). Las ${bajadas} siguientes, al ${b.pct} % del peso que mueva en ella: se le calcula sola al terminarla.`
              : 'Pon al menos 2 series (por ejemplo 4x3): la primera es el top set y las demás, las bajadas.'}
          </p>
        </div>
      )}
    </div>
  )
}
