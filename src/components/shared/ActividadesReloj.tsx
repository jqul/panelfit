import { Trash2 } from 'lucide-react'
import { useActividades } from '../../hooks/useActividades'
import { DEPORTES, formatoDuracion, ritmoOVelocidad } from '../../lib/actividadReloj'
import { ImportarReloj } from './ImportarReloj'
import { localDateKey } from '../../lib/dates'
import { StravaConexion } from './StravaConexion'

// "Entrenos del reloj": lo importado de su reloj (tabla actividades), con distancia, tiempo, ritmo y pulso, y el botón
// para importar otro. En Progreso del cliente y en la ficha del entrenador (los dos pueden importar y borrar).
export function ActividadesReloj({ clientId, paraEntrenador = false }: { clientId: string; paraEntrenador?: boolean }) {
  const { actividades, cargando, guardar, borrar, recargar } = useActividades(clientId)
  if (cargando) return null
  const km = (m: number | null) => (m ? `${(m / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} km` : null)
  const semana = actividades.filter(a => a.fecha >= localDateKey(new Date(Date.now() - 6 * 86400000)))

  return (
    <section aria-label="Entrenos del reloj" className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">⌚ Entrenos del reloj</p>
        {semana.length > 0 && (
          <p className="text-[11px] text-muted">Últimos 7 días: {semana.length} · {formatoDuracion(semana.reduce((s, a) => s + a.duracionS, 0))}{semana.some(a => a.distanciaM) ? ` · ${km(semana.reduce((s, a) => s + (a.distanciaM || 0), 0))}` : ''}</p>
        )}
      </div>
      {actividades.length === 0 && (
        <p className="text-xs text-muted">{paraEntrenador
          ? 'Aún no ha importado ninguno. Puede hacerlo desde su app (Progreso) con el archivo que exporta su reloj, o súbelo tú aquí.'
          : 'Exporta el entreno desde la app de tu reloj (Garmin Connect, Coros, Polar, Suunto, Strava…) como .fit, .gpx o .tcx y súbelo aquí.'}</p>
      )}
      {actividades.length > 0 && (
        <ul className="divide-y divide-border/60" aria-label="Lista de entrenos del reloj">
          {actividades.slice(0, 10).map(a => (
            <li key={a.id} className="py-2 flex items-center gap-3">
              <span className="text-xl" aria-hidden>{DEPORTES[a.deporte].icono}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{a.nombre || DEPORTES[a.deporte].nombre}
                  {a.origen === 'strava' && <span className="ml-1 text-[11px] font-bold text-[#FC4C02] align-middle">STRAVA</span>}
                  <span className="font-normal text-muted"> · {new Date(a.fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span></p>
                <p className="text-xs text-muted">{[km(a.distanciaM), formatoDuracion(a.duracionS), ritmoOVelocidad(a), a.fcMedia ? `♥ ${a.fcMedia}` : null, a.desnivelM ? `↗ ${a.desnivelM} m` : null].filter(Boolean).join(' · ')}</p>
              </div>
              <button type="button" onClick={() => borrar(a.id)} aria-label={`Borrar ${a.nombre || DEPORTES[a.deporte].nombre} del ${a.fecha}`}
                className="p-1.5 text-muted hover:text-warn rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
      <ImportarReloj onGuardar={guardar} />
      {!paraEntrenador && <StravaConexion onNuevas={recargar} />}
    </section>
  )
}
