import { Clock, Dumbbell, Flame, Trophy, Zap } from 'lucide-react'
import { ZONAS_DOLOR } from '../../../lib/clientPain'
import { REACTION_EMOJIS, MOLESTIA_EMOJI } from './utils'

interface IncompleteExercise { name: string; done: number; total: number }
interface NewRecord { name: string; best: number }

interface Props {
  allComplete: boolean
  totalExs: number
  doneExs: number
  incompleteExercises: IncompleteExercise[]
  elapsedLabel: string
  totalVolume: number
  newRecords: NewRecord[]
  avgRir: number | null
  sessionRpe: number | null
  sessionRpeHalf: boolean
  onSetSessionRpe: (rpe: number) => void
  onToggleSessionRpeHalf: () => void
  reactionEmoji: string | null
  onPickReaction: (emoji: string) => void
  showReactionComment: boolean
  reactionComment: string
  onSetReactionComment: (text: string) => void
  molestiaZona: string | null
  onSetMolestiaZona: (zona: string) => void
  onShare: () => void
  onConfirm: () => void
  onClose: () => void
}

// Modal de confirmación al terminar la sesión: resumen (duración/volumen/
// récords), RPE de la sesión, cómo le ha sentado (con zona si hay molestia),
// y compartir el logro por WhatsApp si se completó todo.
export function FinishWorkoutModal({
  allComplete, totalExs, doneExs, incompleteExercises, elapsedLabel, totalVolume, newRecords, avgRir,
  sessionRpe, sessionRpeHalf, onSetSessionRpe, onToggleSessionRpeHalf,
  reactionEmoji, onPickReaction, showReactionComment, reactionComment, onSetReactionComment,
  molestiaZona, onSetMolestiaZona, onShare, onConfirm, onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm flex items-end">
      <div className="w-full bg-card rounded-t-3xl p-6 space-y-4">
        <div className="w-10 h-1 bg-border rounded-full mx-auto" />
        <h3 className="font-serif font-bold text-xl text-center">
          {allComplete ? '¡Sesión completada! 🏆' : '¿Terminar entrenamiento?'}
        </h3>
        {!allComplete && (
          <>
            <p className="text-sm text-muted text-center">
              Te quedan <span className="font-bold text-warn">{totalExs - doneExs} ejercicio{totalExs - doneExs !== 1 ? 's' : ''}</span> sin completar
            </p>
            <div className="bg-warn/5 border border-warn/20 rounded-2xl p-3 space-y-1.5">
              {incompleteExercises.map((ex, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-warn text-xs">⚠</span>
                  <span className="flex-1 truncate font-medium">{ex.name}</span>
                  <span className="text-xs text-warn flex-shrink-0">{ex.total - ex.done} serie{ex.total - ex.done !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Clock className="w-4 h-4 text-accent" />, value: elapsedLabel, label: 'Duración' },
            { icon: <Dumbbell className="w-4 h-4 text-ok" />, value: `${doneExs}/${totalExs}`, label: 'Ejercicios' },
            { icon: <Flame className="w-4 h-4 text-warn" />, value: `${totalVolume > 0 ? Math.round(totalVolume).toLocaleString() : 0} kg`, label: 'Volumen' },
          ].map((s, i) => (
            <div key={i} className="bg-bg rounded-2xl p-3 text-center">
              <div className="flex justify-center mb-1">{s.icon}</div>
              <p className="font-serif font-bold text-base">{s.value}</p>
              <p className="text-[10px] text-muted">{s.label}</p>
            </div>
          ))}
        </div>
        {newRecords.length > 0 && (
          <div className="bg-gradient-to-br from-warn/10 to-warn/5 border border-warn/20 rounded-2xl px-4 py-3 space-y-2">
            <p className="text-xs font-bold text-warn uppercase tracking-wider flex items-center gap-1.5">
              🏆 {newRecords.length} récord{newRecords.length > 1 ? 's' : ''} batido{newRecords.length > 1 ? 's' : ''}
            </p>
            {newRecords.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-warn flex-shrink-0" />
                <p className="text-sm flex-1 truncate"><span className="font-semibold">{r.name}</span></p>
                <p className="text-sm font-bold text-warn">{r.best}kg</p>
              </div>
            ))}
          </div>
        )}
        {avgRir !== null && (
          <div className="flex items-center gap-2 bg-bg rounded-2xl px-4 py-3">
            <Zap className="w-4 h-4 text-accent flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted">RIR medio de la sesión</p>
              <p className="text-sm font-bold">{avgRir} — {avgRir <= 1.5 ? 'Sesión muy intensa' : avgRir <= 3 ? 'Buena intensidad' : 'Margen de mejora'}</p>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted text-center">¿Cómo de duro se sintió en general? (RPE)</p>
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => onSetSessionRpe(n + (sessionRpeHalf && n < 10 ? 0.5 : 0))}
                className={`py-2 rounded-xl text-sm font-bold transition-all ${
                  sessionRpe !== null && Math.floor(sessionRpe) === n ? 'bg-ink text-white' : 'bg-bg text-muted hover:bg-bg-alt'
                }`}>
                {sessionRpe !== null && Math.floor(sessionRpe) === n && sessionRpeHalf && n < 10 ? `${n}.5` : n}
              </button>
            ))}
          </div>
          <button onClick={onToggleSessionRpeHalf}
            className={`w-full py-1.5 rounded-xl text-xs font-semibold border transition-all ${sessionRpeHalf ? 'bg-accent/15 border-accent text-accent' : 'border-border text-muted'}`}>
            {sessionRpeHalf ? '✓ ' : ''}+0.5 (precisión powerlifting/halterofilia)
          </button>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted text-center">¿Cómo te ha sentado?</p>
          <div className="flex justify-center gap-2">
            {REACTION_EMOJIS.map(emoji => (
              <button key={emoji} onClick={() => onPickReaction(emoji)}
                className={`w-11 h-11 rounded-2xl text-xl flex items-center justify-center transition-all ${reactionEmoji === emoji ? 'bg-accent/15 ring-2 ring-accent' : 'bg-bg hover:bg-bg-alt'}`}>
                {emoji}
              </button>
            ))}
          </div>
          {/* Con 🤕 vamos directos a la zona — el emoji ya nos dice que es
              molestia, no agujetas normales, así que no hace falta el
              clasificador que sí usa el check-in diario (ahí "agujetas" es ambiguo) */}
          {reactionEmoji === MOLESTIA_EMOJI && (
            <div className="bg-warn/5 border border-warn/20 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-center">¿En qué zona?</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {ZONAS_DOLOR.filter(z => z !== 'Otro').map(z => (
                  <button key={z} onClick={() => onSetMolestiaZona(z)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                      molestiaZona === z ? 'bg-warn text-white border-warn' : 'border-border hover:border-warn hover:bg-warn/5'
                    }`}>
                    {z}
                  </button>
                ))}
              </div>
            </div>
          )}
          {showReactionComment && (
            <textarea value={reactionComment} onChange={e => onSetReactionComment(e.target.value)} rows={2}
              placeholder="¿Algo que comentar? (opcional)" aria-label="Comentario sobre la sesión"
              className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none resize-none" />
          )}
        </div>
        {allComplete && (
          <button onClick={onShare}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white hover:opacity-90 active:scale-[0.98] transition-all"
            style={{ backgroundColor: '#25D366' }}>
            📤 Compartir logro
          </button>
        )}
        <button onClick={onConfirm}
          className={`w-full py-4 rounded-2xl font-bold text-base hover:opacity-90 active:scale-[0.98] transition-all ${
            allComplete ? 'bg-ok text-white' : 'bg-ink text-white'
          }`}>
          {allComplete ? '✓ Guardar y terminar' : 'Terminar igual'}
        </button>
        <button onClick={onClose}
          className="w-full py-3 border border-border rounded-2xl text-sm font-medium text-muted hover:bg-bg-alt transition-colors">
          Seguir entrenando
        </button>
      </div>
    </div>
  )
}
