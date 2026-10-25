import { useState } from 'react'
import { X, Plus, Wand2 } from 'lucide-react'
import { rankByQuery } from '../../../lib/exerciseSearch'
import { opcionesPorMaterial } from '../../../lib/sustitucion'
import { normNombre } from '../../../lib/sustitucionPlan'
import type { Exercise, ExerciseAlternative, LibraryExercise } from '../../../types'

interface Props {
  exercise: Exercise
  library: LibraryExercise[]
  libraryMap?: Map<string, string>
  onChange: (patch: { alternativas?: ExerciseAlternative[]; dolorSinSustituir?: boolean }) => void
}

// Plan B de un ejercicio, junto al ejercicio y no en la biblioteca: qué puede hacer el cliente si no puede hacer este
// (banco ocupado, falta de material...) y qué hacer si le duele. El cliente solo verá estas alternativas, no la
// biblioteca entera, y lo que elija queda aprobado de antemano.
export function PlanBEditor({ exercise, library, libraryMap, onChange }: Props) {
  const [query, setQuery] = useState('')
  const alternativas = exercise.alternativas ?? []
  const yaEstan = new Set([normNombre(exercise.name), ...alternativas.map(a => normNombre(a.name))])
  const sugerencias = query.trim().length >= 2 ? rankByQuery(library.filter(l => !yaEstan.has(normNombre(l.name))), query).slice(0, 5) : []
  const textoLibre = query.trim()
  const hayExacta = !!textoLibre && library.some(l => normNombre(l.name) === normNombre(textoLibre))

  const añadir = (a: ExerciseAlternative) => { onChange({ alternativas: [...alternativas, a] }); setQuery('') }
  const sugerir = () => {
    const propuestas = opcionesPorMaterial({ ...exercise, alternativas: [] }, library, libraryMap)
    if (propuestas.length) onChange({ alternativas: propuestas.map(o => ({ name: o.name, ...(o.exerciseId ? { exerciseId: o.exerciseId } : {}) })) })
  }

  return (
    <div className="rounded-lg border border-border/50 p-2.5 space-y-2" role="group" aria-label={`Plan B de ${exercise.name}`}>
      <div>
        <p className="text-xs font-semibold">🔄 Plan B · si no puede hacerlo</p>
        <p className="text-[11px] text-muted leading-snug">El cliente solo verá estas alternativas (material ocupado) y quedan aprobadas de antemano. Vale para todas las semanas.</p>
      </div>

      {alternativas.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {alternativas.map(a => (
            <li key={a.name} className="flex items-center gap-1 pl-2.5 pr-1 py-1 bg-ok/10 border border-ok/30 rounded-full text-xs font-semibold">
              {a.name}
              <button onClick={() => onChange({ alternativas: alternativas.filter(x => x.name !== a.name) })} aria-label={`Quitar ${a.name} del plan B`}
                className="p-0.5 rounded-full text-muted hover:text-warn"><X className="w-3 h-3" /></button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <input value={query} onChange={e => setQuery(e.target.value)} aria-label={`Añadir alternativa a ${exercise.name}`}
          placeholder="Añadir alternativa de tu biblioteca..."
          className="w-full text-xs bg-bg border border-border/50 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-accent/20" />
        {(sugerencias.length > 0 || (textoLibre.length >= 2 && !hayExacta && !yaEstan.has(normNombre(textoLibre)))) && (
          <div className="mt-1 bg-card border border-border rounded-lg overflow-hidden">
            {sugerencias.map(s => (
              <button key={s.id} onClick={() => añadir({ name: s.name, exerciseId: s.id })}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-left text-xs hover:bg-bg-alt">
                <Plus className="w-3 h-3 text-ok flex-shrink-0" /><span className="flex-1 truncate">{s.name}</span>
                {s.category && <span className="text-[11px] text-muted flex-shrink-0">{s.category}</span>}
              </button>
            ))}
            {textoLibre.length >= 2 && !hayExacta && !yaEstan.has(normNombre(textoLibre)) && (
              <button onClick={() => añadir({ name: textoLibre })} className="w-full px-2.5 py-2 text-left text-xs text-muted hover:bg-bg-alt border-t border-border/50">
                Añadir «{textoLibre}» (no está en tu biblioteca)
              </button>
            )}
          </div>
        )}
      </div>

      {alternativas.length === 0 && library.length > 0 && (
        <button onClick={sugerir} className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
          <Wand2 className="w-3.5 h-3.5" /> Sugerir 3 del mismo grupo muscular
        </button>
      )}

      <label className="flex items-start gap-2 text-xs cursor-pointer pt-1">
        <input type="checkbox" checked={!!exercise.dolorSinSustituir} onChange={e => onChange({ dolorSinSustituir: e.target.checked })} className="mt-0.5" />
        <span><span className="font-semibold">Con dolor, no sustituir:</span> que pare y me avise, sin proponerle cambiar de ejercicio</span>
      </label>
    </div>
  )
}
