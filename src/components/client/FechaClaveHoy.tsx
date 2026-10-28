import { Flag } from 'lucide-react'
import { useAusenciasEventos } from '../../hooks/useAusenciasEventos'
import { eventoClave, ausenciaActiva, cuentaAtras, diasHasta, motivoDe } from '../../lib/ausencias'
import { localDateKey } from '../../lib/dates'

// En Hoy: la cuenta atrás a la fecha clave (como las "semanas hasta tu evento A" de TrainingPeaks) y,
// si hoy está fuera, que sepa que su entrenador ya lo ve.
export function FechaClaveHoy({ clientId }: { clientId: string }) {
  const { ausencias, eventos, cargando } = useAusenciasEventos(clientId, 'cliente')
  if (cargando) return null
  const hoy = localDateKey()
  const evento = eventoClave(eventos, hoy)
  const fuera = ausenciaActiva(ausencias, hoy)
  if (!evento && !fuera) return null
  const hasta = fuera && new Date(fuera.hasta + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

  return (
    <div className="space-y-2">
      {evento && (
        <div className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3">
          <span className="w-9 h-9 rounded-xl bg-ink text-white flex items-center justify-center flex-shrink-0" aria-hidden><Flag className="w-4 h-4" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold truncate">{evento.nombre}</span>
            <span className="block text-xs text-muted">{new Date(evento.fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </span>
          {/* Número grande y unidad debajo: deja sitio al nombre y se lee de un vistazo */}
          <span className="text-right flex-shrink-0" aria-label={cuentaAtras(evento.fecha, hoy)}>
            {(() => {
              const d = diasHasta(evento.fecha, hoy)
              if (d <= 1) return <span className="font-serif font-bold text-base">{d <= 0 ? '¡Hoy!' : 'Mañana'}</span>
              const [n, unidad] = d < 21 ? [d, 'días'] : [Math.floor(d / 7), 'semanas']
              return <><span className="block font-serif font-bold text-2xl leading-none tabular-nums">{n}</span><span className="block text-[11px] text-muted mt-0.5">{unidad}</span></>
            })()}
          </span>
        </div>
      )}
      {fuera && (
        <p className="rounded-2xl border border-attn/30 bg-attn/10 px-4 py-3 text-sm" role="status">
          {motivoDe(fuera.motivo).emoji} <span className="font-semibold">{motivoDe(fuera.motivo).label} hasta el {hasta}.</span> Tu entrenador lo sabe.
        </p>
      )}
    </div>
  )
}
