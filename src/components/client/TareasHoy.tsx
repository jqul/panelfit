import { CheckSquare, Square, ExternalLink } from 'lucide-react'
import { useTareasCliente } from '../../hooks/useTareasCliente'
import { tareasDelDia, ICONO_TAREA } from '../../lib/tareas'
import { localDateKey } from '../../lib/dates'

// En Hoy: las tareas sueltas que le ha puesto su entrenador para hoy (caminar, movilidad, un vídeo…), para
// marcarlas. Sin tareas hoy no pinta nada. Se carga aparte (lazy): la carga inicial de la app no crece.
export function TareasHoy({ clientId }: { clientId: string }) {
  const hoy = localDateKey()
  const { tareas, cargando, estaHecha, alternarHecha } = useTareasCliente(clientId, hoy)
  const deHoy = tareasDelDia(tareas, hoy)
  if (cargando || !deHoy.length) return null
  const hechas = deHoy.filter(t => estaHecha(t.id, hoy)).length

  return (
    <div className="px-4 pt-4">
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Tareas de hoy</p>
        <span className="text-[11px] font-bold text-accent">{hechas}/{deHoy.length}</span>
      </div>
      <div className="divide-y divide-border">
        {deHoy.map(t => {
          const hecha = estaHecha(t.id, hoy)
          return (
            <div key={t.id} className="flex items-start gap-3 px-4 py-3">
              <button onClick={() => alternarHecha(t.id, hoy)} role="checkbox" aria-checked={hecha} aria-label={t.titulo}
                className="flex-shrink-0 -m-2 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
                {hecha ? <CheckSquare className="w-5 h-5 text-ok" /> : <Square className="w-5 h-5 text-muted" />}
              </button>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className={`text-sm font-medium ${hecha ? 'text-muted line-through' : ''}`}><span aria-hidden>{ICONO_TAREA[t.tipo]} </span>{t.titulo}</p>
                {t.nota && <p className="text-xs text-muted mt-0.5 whitespace-pre-wrap">{t.nota}</p>}
                {t.enlace && (
                  <a href={t.enlace} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent font-semibold mt-1">
                    Abrir <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
    </div>
  )
}
