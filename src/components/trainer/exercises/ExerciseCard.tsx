import type { ReactNode } from 'react'
import { Star, Pencil, Copy, Archive, ArchiveRestore, Trash2, Play } from 'lucide-react'
import { ActionMenu } from '../../shared/ActionMenu'
import { MuscleDiagram } from '../MuscleDiagram'
import type { LibraryExercise } from '../../../types'
import { exerciseOrigin, ORIGEN_LABEL, estadoFicha, materialOf } from '../../../lib/exerciseLibrary'

function ytId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

interface Props {
  ex: LibraryExercise
  fav: boolean
  /** Recomendados: la tarjeta va en una cuadrícula y no en la lista. */
  tile?: boolean
  extra?: ReactNode
  onOpen: () => void
  onToggleFav: () => void
  onDuplicate: () => void
  onArchive: () => void
  onRestore: () => void
  onDelete: () => void
}

/** Miniatura: el fotograma de YouTube si lo hay; si no, el pictograma del grupo muscular (con ▶ si tiene un vídeo propio). */
function Thumb({ ex }: { ex: LibraryExercise }) {
  const first = ex.videos?.[0]
  const yt = first ? ytId(first.url) : null
  return (
    <div className="relative w-12 h-12 rounded-xl bg-bg-alt border border-border/60 flex items-center justify-center overflow-hidden flex-shrink-0">
      {yt
        ? <img src={`https://img.youtube.com/vi/${yt}/default.jpg`} alt="" loading="lazy" className="w-full h-full object-cover" />
        : <MuscleDiagram category={ex.category} name={ex.name} size={30} />}
      {first && !yt && <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-ink/80 text-white flex items-center justify-center"><Play className="w-2.5 h-2.5 fill-current" /></span>}
    </div>
  )
}

export function ExerciseCard({ ex, fav, tile, extra, onOpen, onToggleFav, onDuplicate, onArchive, onRestore, onDelete }: Props) {
  const estado = estadoFicha(ex)
  const origen = exerciseOrigin(ex)
  const archivado = !!ex.archivedAt
  const material = materialOf(ex)
  const sub = [ex.category, material].filter(Boolean).join(' · ')
  const usos = ex.useCount ?? 0

  return (
    <div className={`bg-card border border-border rounded-2xl flex items-center gap-3 px-3 py-2.5 ${archivado ? 'opacity-70' : ''} ${tile ? 'shadow-sm' : ''}`}>
      <button onClick={onOpen} aria-label={`Editar ${ex.name}`} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <Thumb ex={ex} />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold truncate">{ex.name}</span>
          {sub && <span className="block text-xs text-muted truncate">{sub}</span>}
          <span className="flex items-center gap-1.5 flex-wrap mt-1">
            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full border ${estado.completo ? 'bg-ok/10 text-ok border-ok/20' : 'bg-warn/10 text-warn border-warn/20'}`}>
              {archivado ? 'Archivado' : estado.label}
            </span>
            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full border ${origen === 'base' ? 'bg-bg-alt text-muted border-border' : 'bg-accent/10 text-accent border-accent/20'}`}>
              {ORIGEN_LABEL[origen]}
            </span>
            {usos > 0 && <span className="text-[11px] text-muted">Usado {usos} {usos === 1 ? 'vez' : 'veces'}</span>}
            {extra}
          </span>
        </span>
      </button>
      <div className="flex items-center flex-shrink-0">
        <button onClick={onToggleFav} aria-pressed={fav} aria-label={fav ? `Quitar ${ex.name} de favoritos` : `Marcar ${ex.name} como favorito`} className="p-2 rounded-lg">
          <Star className={`w-4 h-4 transition-colors ${fav ? 'fill-amber-400 text-amber-400' : 'text-border hover:text-amber-300'}`} />
        </button>
        <ActionMenu title={`Acciones de ${ex.name}`}>
          <button onClick={onOpen} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-bg-alt"><Pencil className="w-3.5 h-3.5 text-muted flex-shrink-0" /> Editar</button>
          <button onClick={onDuplicate} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-bg-alt"><Copy className="w-3.5 h-3.5 text-muted flex-shrink-0" /> Duplicar</button>
          {archivado
            ? <button onClick={onRestore} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-bg-alt"><ArchiveRestore className="w-3.5 h-3.5 text-muted flex-shrink-0" /> Restaurar</button>
            : <button onClick={onArchive} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-bg-alt"><Archive className="w-3.5 h-3.5 text-muted flex-shrink-0" /> Archivar</button>}
          <button onClick={onDelete} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-warn hover:bg-warn/5"><Trash2 className="w-3.5 h-3.5 flex-shrink-0" /> Eliminar</button>
        </ActionMenu>
      </div>
    </div>
  )
}
