import { Video } from 'lucide-react'
import type { Exercise } from '../../../types'
import { IDEAS_LIBRE } from '../../../lib/sesionLibre'

const campo = 'w-full text-sm bg-bg border border-border/50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-accent/20'

// Panel de una sesión libre en el editor del plan: qué tiene que hacer (texto) y un vídeo, sin series (lib/sesionLibre).
export function LibreEditor({ exercise, onChange }: { exercise: Exercise; onChange: (patch: Partial<Exercise>) => void }) {
  return (
    <div className="p-4 space-y-3" role="group" aria-label={`Sesión libre ${exercise.name}`}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-accent">📝 Sesión libre: texto y vídeo, sin series</p>
      <div className="flex flex-wrap gap-1.5">
        {IDEAS_LIBRE.filter(i => i !== exercise.name).map(i => (
          <button key={i} type="button" onClick={() => onChange({ name: i })}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-bg-alt text-muted hover:text-ink">{i}</button>
        ))}
      </div>
      <textarea value={exercise.comment} rows={5} maxLength={3000} aria-label="Qué tiene que hacer"
        onChange={e => onChange({ comment: e.target.value })}
        placeholder={'Qué tiene que hacer, como se lo contarías:\n\n10 min de movilidad de cadera\n3 rondas: 30 s de plancha, 10 puentes de glúteo…'}
        className={`${campo} resize-y`} />
      <label className="flex items-center gap-2">
        <Video className="w-4 h-4 text-muted flex-shrink-0" aria-hidden />
        <input value={exercise.videoUrl || ''} aria-label="Vídeo de la sesión" onChange={e => onChange({ videoUrl: e.target.value })}
          placeholder="Enlace de YouTube (opcional)" className={campo} />
      </label>
    </div>
  )
}
