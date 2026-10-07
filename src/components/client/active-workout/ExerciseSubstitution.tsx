import { CheckCircle2, X, Repeat } from 'lucide-react'
import { ZONAS_DOLOR } from '../../../lib/clientPain'

interface Suggestion { id: string; name: string; category?: string }
interface Alternative { id: string; name: string }

interface Props {
  substitutionName?: string
  isEditing: boolean
  draft: string
  onDraftChange: (text: string) => void
  suggestions: Suggestion[]
  onStartEdit: () => void
  onConfirmEdit: (name: string) => void
  onCancelEdit: () => void
  isMolestiaOpen: boolean
  onOpenMolestia: () => void
  onCloseMolestia: () => void
  molestiaZona: string | null
  onSetMolestiaZona: (zona: string) => void
  alternatives: Alternative[]
  onPickAlternative: (altName: string) => void
  onJustNotify: () => void
}

// Dos formas de cambiar de plan en mitad de la sesión: "Sustitúyelo" es libre
// (ej. el material estaba ocupado); "Me molesta" propone alternativas del
// mismo grupo muscular que no cargan la zona que duele, en vez de parar la
// sesión del todo o forzar la molestia.
export function ExerciseSubstitution({
  substitutionName, isEditing, draft, onDraftChange, suggestions, onStartEdit, onConfirmEdit, onCancelEdit,
  isMolestiaOpen, onOpenMolestia, onCloseMolestia, molestiaZona, onSetMolestiaZona, alternatives, onPickAlternative, onJustNotify,
}: Props) {
  return (
    <div className="px-4 mb-3">
      {isEditing ? (
        <div className="relative">
          <div className="flex items-center gap-2">
            <input autoFocus value={draft}
              onChange={e => onDraftChange(e.target.value)}
              placeholder="Busca el ejercicio que has hecho..." aria-label="Buscar ejercicio sustituto"
              onKeyDown={e => {
                if (e.key === 'Enter') onConfirmEdit(draft)
                if (e.key === 'Escape') onCancelEdit()
              }}
              className="flex-1 px-3 py-2 bg-card border border-warn/40 rounded-xl text-sm outline-none focus:ring-2 focus:ring-warn/20" />
            <button onClick={() => onConfirmEdit(draft)}
              title="Usar tal cual lo has escrito, si no está en la lista"
              className="p-2 bg-warn text-white rounded-xl flex-shrink-0"><CheckCircle2 className="w-4 h-4" /></button>
            <button onClick={onCancelEdit} aria-label="Cancelar"
              className="p-2 border border-border rounded-xl text-muted flex-shrink-0"><X className="w-4 h-4" /></button>
          </div>
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-12 top-full mt-1 bg-card border border-border rounded-xl shadow-lg z-10 overflow-hidden">
              {suggestions.map(s => (
                <button key={s.id} onClick={() => onConfirmEdit(s.name)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-bg-alt transition-colors">
                  <span className="flex-1 truncate">{s.name}</span>
                  {s.category && <span className="text-[11px] text-muted flex-shrink-0">{s.category}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : substitutionName ? (
        <div className="flex items-center gap-3">
          <button onClick={onStartEdit} className="flex items-center gap-1.5 text-xs font-semibold text-warn hover:underline">
            <Repeat className="w-3.5 h-3.5" /> Cambiar sustitución
          </button>
          <button onClick={onOpenMolestia} className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-warn">
            🤕 Me molesta
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button onClick={onStartEdit} className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent">
            <Repeat className="w-3.5 h-3.5" /> ¿Has hecho otro ejercicio? Sustitúyelo
          </button>
          <button onClick={onOpenMolestia} className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-warn">
            🤕 Me molesta
          </button>
        </div>
      )}

      {/* Sustitución inteligente por molestia — el cliente dice qué zona le
          duele ahora mismo y se le proponen ejercicios del mismo grupo
          muscular que no cargan esa zona, sin tener que parar la sesión ni
          forzar la molestia. */}
      {isMolestiaOpen && (
        <div className="mt-2 border border-warn/30 bg-warn/5 rounded-2xl p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">🤕 ¿Dónde te molesta?</p>
            <button onClick={onCloseMolestia} aria-label="Cerrar" className="p-1 -m-1 text-muted"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ZONAS_DOLOR.filter(z => z !== 'Otro').map(z => (
              <button key={z} onClick={() => onSetMolestiaZona(z)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  molestiaZona === z ? 'bg-warn text-white border-warn' : 'border-border hover:border-warn hover:bg-warn/5'
                }`}>{z}</button>
            ))}
          </div>
          {molestiaZona && (
            <div className="space-y-1.5 pt-1 border-t border-warn/20">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                {alternatives.length > 0 ? 'Alternativas seguras para hoy' : 'Sin alternativa clara en tu lista'}
              </p>
              {alternatives.length > 0 ? alternatives.map(alt => (
                <button key={alt.id} onClick={() => onPickAlternative(alt.name)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl text-left text-sm font-semibold hover:border-ok hover:bg-ok/5 transition-colors">
                  <Repeat className="w-3.5 h-3.5 text-ok flex-shrink-0" /> {alt.name}
                </button>
              )) : (
                <p className="text-xs text-muted">No hay nada en tu lista que trabaje lo mismo sin cargar esa zona — avisamos a tu entrenador.</p>
              )}
              <button onClick={onJustNotify} className="w-full text-center py-1.5 text-xs font-semibold text-warn hover:underline">
                Solo avisar a mi entrenador
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
