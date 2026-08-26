import { Trophy } from 'lucide-react'

const CONFETTI = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 5) * 0.08,
  color: ['#e0a854', '#4caf7d', '#e07b54', '#3b82f6', '#ec4899'][i % 5],
  duration: 0.9 + (i % 4) * 0.15,
}))

// Insignia flotante animada al detectar un nuevo récord estimado (1RM) en
// tiempo real, en cuanto se marca la serie — con microconfeti sutil.
export function PrAlert({ exerciseName, oneRM }: { exerciseName: string; oneRM: number }) {
  return (
    <div className="fixed inset-x-0 top-20 z-[60] flex justify-center pointer-events-none px-4">
      <div className="relative">
        {CONFETTI.map((c, i) => (
          <span key={i} className="absolute w-1.5 h-1.5 rounded-full"
            style={{ left: `${c.left}%`, top: 0, backgroundColor: c.color, animation: `confettiFall ${c.duration}s ease-in ${c.delay}s forwards` }} />
        ))}
        <div className="bg-ink text-white rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3 animate-pr-pop">
          <Trophy className="w-6 h-6 text-warn flex-shrink-0" />
          <div>
            <p className="font-bold text-sm leading-tight">¡Nuevo récord estimado!</p>
            <p className="text-xs text-white/70 leading-tight">{exerciseName} · 1RM: {oneRM}kg</p>
          </div>
        </div>
      </div>
    </div>
  )
}
