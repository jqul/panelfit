import { useEffect, useState } from 'react'
import { Play, Repeat } from 'lucide-react'
import { Exercise } from '../../../types'
import { Modal } from '../../shared/Modal'
import { supabase } from '../../../lib/supabase'
import { getYTId } from './utils'
import { HistorialDeEjercicio } from '../../../lib/historialEjercicio'
import { DetalleEjercicio } from '../HistorialEjercicio'

type Pestana = 'tecnica' | 'historial' | 'alternativas'

// Ficha del ejercicio durante el entreno (al tocar su nombre): cómo se hace (lo que pide el plan, la nota del
// entrenador, sus vídeos y la descripción de su biblioteca), lo que el cliente ha hecho otras veces y las alternativas
// que el entrenador dejó aprobadas. Solo consulta: cambiar el ejercicio sigue en «¿No puedes hacerlo?».
export function FichaEjercicio({ ex, open, onClose, historial, grupo, trainerId, restSecs }: {
  ex: Exercise | null
  open: boolean
  onClose: () => void
  historial: HistorialDeEjercicio | null
  grupo?: string
  trainerId?: string
  restSecs?: number
}) {
  const [pestana, setPestana] = useState<Pestana>('tecnica')
  const [descripcion, setDescripcion] = useState<string | null>(null)
  const nombre = ex?.name

  // La descripción vive en la biblioteca del entrenador: se pide solo al abrir la ficha
  useEffect(() => {
    setDescripcion(null)
    if (!open || !nombre || !trainerId) return
    let activo = true
    supabase.from('exercise_library').select('description').eq('trainer_id', trainerId).eq('name', nombre).is('deleted_at', null).limit(1)
      .then(({ data }) => { if (activo) setDescripcion(((data as { description?: string }[] | null)?.[0]?.description || '').trim() || null) })
    return () => { activo = false }
  }, [open, nombre, trainerId])

  useEffect(() => { if (open) setPestana('tecnica') }, [open, nombre])

  if (!ex) return null
  const alternativas = ex.alternativas || []
  const videos = [ex.videoUrl, ...(ex.videoUrls || [])].filter((u, i, a): u is string => !!u && a.indexOf(u) === i)
  const pestanas: [Pestana, string][] = [['tecnica', 'Cómo se hace'], ['historial', 'Historial'], ...(alternativas.length ? [['alternativas', 'Alternativas'] as [Pestana, string]] : [])]
  const dato = (label: string, valor?: string) => valor ? (
    <div className="bg-bg-alt/60 rounded-xl px-3 py-2"><p className="text-[11px] uppercase text-muted font-bold tracking-wider">{label}</p><p className="text-sm font-semibold">{valor}</p></div>
  ) : null
  const descanso = restSecs && !ex.hideRest && ex.kind !== 'run'
    ? `${Math.floor(restSecs / 60) ? `${Math.floor(restSecs / 60)} min ` : ''}${restSecs % 60 ? `${restSecs % 60} s` : ''}`.trim() : undefined

  return (
    <Modal open={open} onClose={onClose} title={ex.name} maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="flex gap-4 border-b border-border/70" role="tablist" aria-label={`Ficha de ${ex.name}`}>
          {pestanas.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={pestana === id} onClick={() => setPestana(id)}
              className={`pb-2 -mb-px text-sm font-medium border-b-2 transition-colors ${pestana === id ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </div>

        {pestana === 'tecnica' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {dato('Series', ex.sets)}
              {dato('Peso', ex.weight)}
              {dato('RIR objetivo', ex.rir)}
              {dato('Tempo', ex.tempo)}
              {dato('Descanso', descanso)}
              {dato('Grupo', grupo)}
            </div>
            {ex.comment && <p className="text-sm italic text-muted leading-relaxed">“{ex.comment}”</p>}
            {descripcion && <p className="text-sm leading-relaxed whitespace-pre-line">{descripcion}</p>}
            {videos.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {videos.map(u => {
                  const yt = getYTId(u)
                  return (
                    <a key={u} href={u} target="_blank" rel="noreferrer" aria-label={`Ver vídeo de ${ex.name}`}
                      className="relative aspect-video rounded-xl overflow-hidden bg-bg-alt flex items-center justify-center">
                      {yt && <img src={`https://img.youtube.com/vi/${yt}/mqdefault.jpg`} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                      <span className="relative w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center"><Play className="w-5 h-5" /></span>
                    </a>
                  )
                })}
              </div>
            )}
            {!ex.comment && !descripcion && videos.length === 0 && (
              <p className="text-sm text-muted">Tu entrenador no ha añadido explicación ni vídeo a este ejercicio. Si tienes dudas, pregúntale desde «¿No puedes hacerlo?».</p>
            )}
          </div>
        )}

        {pestana === 'historial' && (historial?.sesiones.length
          ? <DetalleEjercicio historial={historial} max={8} />
          : <p className="text-sm text-muted text-center py-6">Es la primera vez que haces este ejercicio. Lo que apuntes hoy saldrá aquí.</p>)}

        {pestana === 'alternativas' && (
          <div className="space-y-2">
            <p className="text-xs text-muted">Tu entrenador te deja cambiarlo por:</p>
            <ul className="divide-y divide-border/70 bg-bg-alt/40 rounded-xl">
              {alternativas.map(a => <li key={a.name} className="px-3 py-2.5 text-sm font-semibold flex items-center gap-2"><Repeat className="w-3.5 h-3.5 text-muted" /> {a.name}</li>)}
            </ul>
            <p className="text-[11px] text-muted">Para cambiarlo hoy, usa «¿No puedes hacerlo?» en el ejercicio.</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
