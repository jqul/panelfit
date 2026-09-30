import { Zap } from 'lucide-react'

interface Props {
  exerciseName: string
  oneRM: number
  weight: number
  reps: number
  deltaKg: number | null
}

// Insignia de récord — sobria a propósito. Nada de confeti ni trofeo de cómic:
// en alto rendimiento (TrainHeroic, Whoop, TeamBuildr) el registro de un PR se
// trata como un dato de competición, no como una recompensa de videojuego.
// Fondo oscuro, acento metálico (el mismo tono "accent" de marca), números en
// monoespaciada — la misma sensación de rigor que un marcador de récord real.
export function PrAlert({ exerciseName, oneRM, weight, reps, deltaKg }: Props) {
  return (
    <div className="fixed inset-x-0 top-20 z-[60] flex justify-center pointer-events-none px-4">
      <div className="bg-ink text-white rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 border-t-2 border-accent animate-pr-pop">
        <Zap className="w-4 h-4 text-accent flex-shrink-0" fill="currentColor" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-accent leading-tight">Nuevo PR · {exerciseName}</p>
          <p className="text-sm font-mono font-bold tabular-nums leading-tight mt-0.5">
            {weight}kg × {reps} <span className="text-white/50 font-sans font-normal">·</span> e1RM {oneRM}kg
            {deltaKg !== null && deltaKg > 0 && <span className="text-white/60"> (+{deltaKg}kg)</span>}
          </p>
        </div>
      </div>
    </div>
  )
}
